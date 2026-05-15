<?php

declare(strict_types=1);

namespace App\Presentation\Contact;
use App\Domain\Notifications\EmailSender;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ContactReplyController
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly Auth $auth,
        private readonly int $adminRoleId,
        private readonly EmailSender $emailSender,
    ) {
    }

    private function assertAdmin(Request $request): void
    {
        // Local dev convenience: allow without a key in debug mode.
        if (Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local') {
            return;
        }

        $claims = $this->auth->requireClaims($request);
        $roleId = $claims['role_id'] ?? null;
        $roleId = (is_int($roleId) || is_numeric($roleId)) ? (int) $roleId : 0;
        if ($roleId !== $this->adminRoleId) {
            Response::json(['error' => 'Forbidden'], 403);
        }
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
            'SELECT inquiry_id, name, email, topic, message '
            . 'FROM contact_inquiries '
            . 'WHERE inquiry_id = :id '
            . 'LIMIT 1'
        );
        $stmt->execute(['id' => $inquiryId]);

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($row)) {
            Response::json(['error' => 'Inquiry not found'], 404);
        }

        $toEmail = trim((string) ($row['email'] ?? ''));
        if ($toEmail === '' || !filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Inquiry has no valid email'], 422);
        }

        $name = trim((string) ($row['name'] ?? ''));
        $topic = trim((string) ($row['topic'] ?? ''));
        $originalMessage = trim((string) ($row['message'] ?? ''));

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

        $payload = ['ok' => true, 'sent' => $sent];
        if (!$sent && $sendError !== null) {
            $payload['warning'] = $sendError;
        }

        Response::json($payload, 200);
    }
}
