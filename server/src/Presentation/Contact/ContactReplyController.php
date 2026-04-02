<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Application\ActivityLogs\LogActivity;
use App\Domain\Notifications\EmailSender;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ContactReplyController
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly EmailSender $emailSender,
        private readonly LogActivity $logActivity,
    ) {
    }

    private function assertAdmin(Request $request): void
    {
        // Local dev convenience: allow without a key in debug mode.
        if (Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local') {
            return;
        }

        $expected = Env::get('ADMIN_API_KEY') ?? Env::get('ADMIN_SETUP_KEY');
        if ($expected === null || trim($expected) === '') {
            if (!Env::bool('APP_DEBUG', false)) {
                Response::json(['error' => 'Server not configured for admin replies'], 500);
            }
            return;
        }

        $provided = $request->header('x-admin-api-key');
        if ($provided === null || !hash_equals($expected, $provided)) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    /** @return array<string,mixed> */
    private function normalizeMeta(mixed $meta): array
    {
        if (is_array($meta)) {
            return $meta;
        }

        if (is_string($meta)) {
            $decoded = json_decode($meta, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    public function reply(Request $request): void
    {
        $this->assertAdmin($request);

        $data = $request->json();

        $inquiryIdRaw = $data['inquiry_id'] ?? null;
        $inquiryId = is_numeric($inquiryIdRaw) ? (int) $inquiryIdRaw : 0;

        $replyMessage = trim((string) ($data['reply_message'] ?? $data['message'] ?? ''));

        if ($inquiryId <= 0) {
            Response::json(['error' => 'Missing inquiry_id'], 422);
        }

        if ($replyMessage === '') {
            Response::json(['error' => 'Missing reply_message'], 422);
        }

        $stmt = $this->pdo->prepare(
            'SELECT log_id, meta FROM activity_logs WHERE log_id = :id AND action = :action LIMIT 1'
        );
        $stmt->execute(['id' => $inquiryId, 'action' => 'contact.submit']);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            Response::json(['error' => 'Inquiry not found'], 404);
        }

        $meta = $this->normalizeMeta($row['meta'] ?? []);

        $toEmail = trim((string) ($meta['email'] ?? ''));
        if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Inquiry has no valid email'], 422);
        }

        $name = trim((string) ($meta['name'] ?? ''));
        $topic = trim((string) ($meta['topic'] ?? ''));
        $originalMessage = trim((string) ($meta['message'] ?? ''));

        $subject = $topic !== '' ? "Re: {$topic} - Alix Vintage" : 'Reply from Alix Vintage';

        $greeting = $name !== '' ? "Hi {$name}," : 'Hello,';

        $body = $greeting . "\n\n";
        $body .= $replyMessage . "\n\n";
        $body .= "— Alix Vintage\n";

        if ($originalMessage !== '') {
            $body .= "\n(Original message)\n";
            $body .= $originalMessage . "\n";
        }

        $driver = strtolower((string) Env::get('MAIL_DRIVER', 'log'));
        $sent = $driver !== 'log';
        $sendError = null;

        try {
            $this->emailSender->send($toEmail, $subject, $body);

            if ($driver === 'log') {
                $sendError = 'MAIL_DRIVER=log; email was written to server/storage/logs/mail.log';
            }
        } catch (\Throwable $e) {
            $sent = false;
            $sendError = $e->getMessage();

            // In local debug, allow continuing so admin can still "reply" during setup.
            if (!(Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local')) {
                Response::json(['error' => 'Failed to send reply: ' . $sendError], 502);
            }
        }

        $this->logActivity->handle([
            'action' => 'contact.reply',
            'actor_user_id' => null,
            'actor_role' => 'admin',
            'description' => 'Replied to contact inquiry',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => [
                'inquiry_id' => $inquiryId,
                'to_email' => $toEmail,
                'topic' => $topic === '' ? null : $topic,
                'subject' => $subject,
                'reply_message' => $replyMessage,
                'sent' => $sent,
                'send_error' => $sendError,
            ],
        ]);

        $payload = ['ok' => true, 'sent' => $sent];
        if (!$sent && $sendError !== null) {
            $payload['warning'] = $sendError;
        }

        Response::json($payload, 200);
    }
}
