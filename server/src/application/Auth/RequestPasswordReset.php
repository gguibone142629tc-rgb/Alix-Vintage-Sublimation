<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Notifications\EmailSender;
use App\Domain\Users\UserRepository;

final class RequestPasswordReset
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly EmailSender $emailSender,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));

        if ($email === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing email'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid email'];
        }

        // Avoid account enumeration: always return ok.
        $user = $this->users->findByEmail($email);
        if ($user === null) {
            return ['ok' => true, 'status' => 200];
        }

        $otpCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = (new \DateTimeImmutable('now'))->modify('+5 minutes');

        $this->users->setOtp((int) $user->id, $otpCode, $expiry);

        $subject = 'Your Alix Vintage password reset code';
        $message = "Your Alix Vintage password reset code is {$otpCode}. It expires in 5 minutes.";

        try {
            $this->emailSender->send($user->email, $subject, $message);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 502,
                'error' => 'Failed to send reset email: ' . $e->getMessage(),
            ];
        }

        return ['ok' => true, 'status' => 200];
    }
}
