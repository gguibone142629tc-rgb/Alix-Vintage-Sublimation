<?php

declare(strict_types=1);

namespace App\Domain\Users;

interface UserRepository
{
    public function findByEmail(string $email): ?User;

    public function create(User $user): User;

    public function setOtp(int $userId, string $otpCode, \DateTimeImmutable $expiry): void;

    public function verifyOtp(string $email, string $otpCode, \DateTimeImmutable $now): ?User;

    public function markVerified(int $userId): void;
}
