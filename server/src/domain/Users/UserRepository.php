<?php

declare(strict_types=1);

namespace App\Domain\Users;

interface UserRepository
{
    public function findById(int $userId): ?User;

    public function findByEmail(string $email): ?User;

    public function countByRoleId(int $roleId): int;

    public function create(User $user): User;

    public function setOtp(int $userId, string $otpCode, \DateTimeImmutable $expiry): void;

    public function verifyOtp(string $email, string $otpCode, \DateTimeImmutable $now): ?User;

    public function markVerified(int $userId): void;

    public function updatePasswordHash(int $userId, string $passwordHash): void;

    public function updateProfile(int $userId, string $firstname, string $lastname, string $email, ?string $phoneNumber, ?string $address): void;

    public function clearOtp(int $userId): void;
}
