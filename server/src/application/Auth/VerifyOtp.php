<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Users\TokenIssuer;
use App\Domain\Users\UserRepository;

final class VerifyOtp
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly TokenIssuer $tokenIssuer,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $otpCode = trim((string) ($input['otp_code'] ?? ''));

        if ($email === '' || $otpCode === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing email or verification code'];
        }

        $now = new \DateTimeImmutable('now');
        $user = $this->users->verifyOtp($email, $otpCode, $now);
        if ($user === null) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid or expired verification code'];
        }

        $this->users->markVerified((int) $user->id);
        $fresh = $this->users->findByEmail($email);
        if ($fresh === null) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to load verified account'];
        }

        $token = $this->tokenIssuer->issue([
            'user_id' => $fresh->id,
            'email' => $fresh->email,
            'role_id' => $fresh->roleId,
        ]);

        return [
            'ok' => true,
            'token' => $token,
            'user' => [
                'user_id' => $fresh->id,
                'firstname' => $fresh->firstname,
                'lastname' => $fresh->lastname,
                'email' => $fresh->email,
                'phone_number' => $fresh->phoneNumber,
                'role_id' => $fresh->roleId,
                'is_verified' => $fresh->isVerified,
                'created_at' => $fresh->createdAt?->format('c'),
            ],
        ];
    }
}
