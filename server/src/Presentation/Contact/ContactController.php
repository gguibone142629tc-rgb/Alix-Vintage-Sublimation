<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class ContactController
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function submit(Request $request): void
    {
        $data = $request->json();

        $name = trim((string) ($data['name'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $topic = trim((string) ($data['topic'] ?? ''));
        $message = trim((string) ($data['message'] ?? ''));

        if ($name === '') {
            Response::json(['error' => 'Missing name'], 422);
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::json(['error' => 'Invalid email'], 422);
        }

        if ($topic === '') {
            Response::json(['error' => 'Missing topic'], 422);
        }

        if ($message === '') {
            Response::json(['error' => 'Missing message'], 422);
        }

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO contact_inquiries (name, email, phone, topic, message, ip_address, user_agent) '
                . 'VALUES (:name, :email, :phone, :topic, :message, :ip_address, :user_agent)'
            );

            $stmt->execute([
                'name' => $name,
                'email' => $email,
                'phone' => $phone === '' ? null : $phone,
                'topic' => $topic,
                'message' => $message,
                'ip_address' => $request->ipAddress(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Response::json(['error' => 'Failed to submit inquiry'], 500);
        }

        Response::json(['ok' => true], 201);
    }
}
