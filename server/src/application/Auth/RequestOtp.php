<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Notifications\EmailSender;
use App\Domain\Users\UserRepository;

final class RequestOtp
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

        $user = $this->users->findByEmail($email);
        if ($user === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Account not found'];
        }

        // If a valid (unexpired) OTP already exists, allow resending after a short cooldown.
        // When resending, we overwrite the OTP so any previously sent code becomes invalid.
        $now = new \DateTimeImmutable('now');
        if ($user->otpCode !== null && $user->otpExpiry !== null && $user->otpExpiry > $now) {
            $issuedAt = $user->otpExpiry->modify('-5 minutes');
            $secondsSinceIssued = max(0, $now->getTimestamp() - $issuedAt->getTimestamp());
            if ($secondsSinceIssued < 60) {
                $remaining = 60 - $secondsSinceIssued;
                return [
                    'ok' => true,
                    'status' => 200,
                    'message' => 'Please wait ' . $remaining . ' second(s) before resending a new verification code.',
                ];
            }
        }

        $otpCode = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiry = $now->modify('+5 minutes');

        $this->users->setOtp((int) $user->id, $otpCode, $expiry);

        $subject = 'Your Alix Vintage verification code';
        $message = "Your Alix Vintage verification code is {$otpCode}. It expires in 5 minutes.";
        try {
            $this->emailSender->send($user->email, $subject, $message);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 502,
                'error' => 'Failed to send verification email: ' . $e->getMessage(),
            ];
        }

        return [
            'ok' => true,
            'status' => 200,
        ];
    }
}
