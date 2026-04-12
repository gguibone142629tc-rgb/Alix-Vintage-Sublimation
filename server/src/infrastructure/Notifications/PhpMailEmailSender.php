<?php

declare(strict_types=1);

namespace App\Infrastructure\Notifications;

use App\Domain\Notifications\EmailSender;
use App\Shared\Config\Env;

final class PhpMailEmailSender implements EmailSender
{
    public function send(string $toEmail, string $subject, string $body): void
    {
        $toEmail = trim($toEmail);
        if ($toEmail === '') {
            throw new \InvalidArgumentException('Missing recipient email');
        }

        $subject = trim($subject);
        if ($subject === '') {
            $subject = 'Verification Code';
        }

        $fromAddress = Env::get('MAIL_FROM_ADDRESS', 'no-reply@localhost');
        $fromName = Env::get('MAIL_FROM_NAME', 'Alix Vintage');

        $driver = strtolower((string) Env::get('MAIL_DRIVER', 'log'));

        if ($driver === 'log') {
            $this->logEmail($toEmail, $subject, $body, $fromAddress, $fromName);
            return;
        }

        if ($driver === 'smtp') {
            $this->sendViaSmtp($toEmail, $subject, $body, $fromAddress, $fromName);
            return;
        }

        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = sprintf('From: %s <%s>', $this->sanitizeHeaderValue($fromName), $this->sanitizeHeaderValue($fromAddress));

        $ok = @mail($toEmail, $subject, $body, implode("\r\n", $headers));
        if (!$ok) {
            // Fall back to log so verification can continue during setup.
            $this->logEmail($toEmail, $subject, $body, $fromAddress, $fromName);
            throw new \RuntimeException('mail() failed; email was logged to server/storage/logs/mail.log');
        }
    }

    private function sendViaSmtp(string $toEmail, string $subject, string $body, string $fromAddress, string $fromName): void
    {
        $host = Env::require('SMTP_HOST');
        $port = (int) Env::get('SMTP_PORT', '587');
        $username = trim(Env::require('SMTP_USERNAME'));
        $password = Env::require('SMTP_PASSWORD');
        // Gmail app passwords are often copied with spaces (e.g. "abcd efgh ijkl mnop").
        // Strip all whitespace so AUTH LOGIN succeeds.
        $password = preg_replace('/\s+/', '', $password ?? '');
        $encryption = strtolower((string) Env::get('SMTP_ENCRYPTION', 'tls')); // tls|ssl|none
        $timeout = (int) Env::get('SMTP_TIMEOUT_SECONDS', '15');

        if (!function_exists('stream_socket_client')) {
            throw new \RuntimeException('SMTP requires stream_socket_client()');
        }

        $remote = ($encryption === 'ssl') ? "ssl://{$host}:{$port}" : "{$host}:{$port}";
        $socket = @stream_socket_client(
            $remote,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT
        );

        if (!is_resource($socket)) {
            throw new \RuntimeException("SMTP connection failed ({$errno}): {$errstr}");
        }

        stream_set_timeout($socket, $timeout);

        $this->smtpExpect($socket, [220]);

        $hostname = gethostname() ?: 'localhost';
        $this->smtpCommand($socket, "EHLO {$hostname}");
        $ehlo = $this->smtpReadResponse($socket);
        if (!in_array($ehlo['code'], [250], true)) {
            $this->smtpCommand($socket, "HELO {$hostname}");
            $this->smtpExpect($socket, [250]);
            $ehlo = ['message' => ''];
        }

        if ($encryption === 'tls') {
            $supportsStartTls = stripos($ehlo['message'] ?? '', 'STARTTLS') !== false;
            if (!$supportsStartTls) {
                throw new \RuntimeException('SMTP server does not support STARTTLS');
            }

            $this->smtpCommand($socket, 'STARTTLS');
            $this->smtpExpect($socket, [220]);

            $cryptoOk = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            if ($cryptoOk !== true) {
                throw new \RuntimeException('Failed to enable TLS encryption for SMTP');
            }

            $this->smtpCommand($socket, "EHLO {$hostname}");
            $this->smtpExpect($socket, [250]);
        }

        // AUTH LOGIN (works with Gmail App Passwords)
        $this->smtpCommand($socket, 'AUTH LOGIN');
        $this->smtpExpect($socket, [334]);
        $this->smtpCommand($socket, base64_encode($username));
        $this->smtpExpect($socket, [334]);
        $this->smtpCommand($socket, base64_encode($password));
        $this->smtpExpect($socket, [235]);

        $safeFromAddress = $this->sanitizeHeaderValue($fromAddress);
        $safeToEmail = $this->sanitizeHeaderValue($toEmail);

        $this->smtpCommand($socket, 'MAIL FROM:<' . $safeFromAddress . '>');
        $this->smtpExpect($socket, [250]);
        $this->smtpCommand($socket, 'RCPT TO:<' . $safeToEmail . '>');
        $this->smtpExpect($socket, [250, 251]);
        $this->smtpCommand($socket, 'DATA');
        $this->smtpExpect($socket, [354]);

        $headers = [];
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'From: ' . $this->sanitizeHeaderValue($fromName) . ' <' . $safeFromAddress . '>';
        $headers[] = 'To: <' . $safeToEmail . '>';
        $headers[] = 'Subject: ' . $this->sanitizeHeaderValue($subject);

        $data = implode("\r\n", $headers) . "\r\n\r\n";
        $data .= str_replace(["\r\n", "\r"], "\n", $body);
        $data = str_replace("\n", "\r\n", $data);
        // End of DATA must be <CRLF>.<CRLF>
        if (!str_ends_with($data, "\r\n")) {
            $data .= "\r\n";
        }
        $data .= ".\r\n";

        fwrite($socket, $data);
        $this->smtpExpect($socket, [250]);

        $this->smtpCommand($socket, 'QUIT');
        fclose($socket);
    }

    private function smtpCommand($socket, string $command): void
    {
        fwrite($socket, $command . "\r\n");
    }

    /** @return array{code:int,message:string} */
    private function smtpReadResponse($socket): array
    {
        $lines = [];
        $code = 0;

        while (!feof($socket)) {
            $line = fgets($socket, 8192);
            if ($line === false) {
                break;
            }
            $line = rtrim($line, "\r\n");
            $lines[] = $line;

            if (strlen($line) >= 3 && ctype_digit(substr($line, 0, 3))) {
                $code = (int) substr($line, 0, 3);
                // Multi-line responses use '-' after the code.
                if (isset($line[3]) && $line[3] !== '-') {
                    break;
                }
            }
        }

        return [
            'code' => $code,
            'message' => implode("\n", $lines),
        ];
    }

    private function smtpExpect($socket, array $expectedCodes): void
    {
        $resp = $this->smtpReadResponse($socket);
        if (!in_array($resp['code'], $expectedCodes, true)) {
            throw new \RuntimeException('SMTP error ' . $resp['code'] . ': ' . $resp['message']);
        }
    }

    private function sanitizeHeaderValue(string $value): string
    {
        // Prevent header injection
        return trim(str_replace(["\r", "\n"], '', $value));
    }

    private function logEmail(string $toEmail, string $subject, string $body, string $fromAddress, string $fromName): void
    {
        $base = dirname(__DIR__, 3); // server/
        $logDir = $base . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'logs';
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0777, true);
        }

        $line = "[" . (new \DateTimeImmutable('now'))->format('c') . "]";
        $line .= " TO={$toEmail}";
        $line .= " FROM={$fromName} <{$fromAddress}>";
        $line .= " SUBJECT={$subject}";
        $line .= "\n{$body}\n\n";

        @file_put_contents($logDir . DIRECTORY_SEPARATOR . 'mail.log', $line, FILE_APPEND);
    }
}
