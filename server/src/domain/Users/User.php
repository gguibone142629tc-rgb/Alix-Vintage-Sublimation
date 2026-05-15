<?php

declare(strict_types=1);

namespace App\Domain\Users;

final class User
{
    private function __construct(
        public readonly ?int $id,
        public readonly string $firstname,
        public readonly string $lastname,
        public readonly string $email,
        public readonly ?string $phoneNumber,
        public readonly ?string $address,
        public readonly string $passwordHash,
        public readonly int $roleId,
        public readonly bool $isVerified,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?string $otpCode = null,
        public readonly ?\DateTimeImmutable $otpExpiry = null,
    ) {
    }

    public static function new(
        string $firstname,
        string $lastname,
        string $email,
        ?string $phoneNumber,
        ?string $address,
        string $passwordHash,
        int $roleId,
    ): self {
        return new self(
            id: null,
            firstname: $firstname,
            lastname: $lastname,
            email: $email,
            phoneNumber: $phoneNumber,
            address: $address,
            passwordHash: $passwordHash,
            roleId: $roleId,
            isVerified: false,
            createdAt: null,
            otpCode: null,
            otpExpiry: null,
        );
    }

    /** @param array<string,mixed> $row */
    public static function fromRow(array $row): self
    {
        $createdAt = null;
        if (!empty($row['created_at'])) {
            $createdAt = new \DateTimeImmutable((string) $row['created_at']);
        }

        $otpExpiry = null;
        if (!empty($row['otp_expiry'])) {
            $otpExpiry = new \DateTimeImmutable((string) $row['otp_expiry']);
        }

        return new self(
            id: isset($row['user_id']) ? (int) $row['user_id'] : null,
            firstname: (string) $row['firstname'],
            lastname: (string) $row['lastname'],
            email: (string) $row['email'],
            phoneNumber: isset($row['phone_number']) ? (string) $row['phone_number'] : null,
            address: isset($row['address']) ? (string) $row['address'] : null,
            passwordHash: (string) $row['password_hash'],
            roleId: (int) $row['role_id'],
            isVerified: (bool) $row['is_verified'],
            createdAt: $createdAt,
            otpCode: isset($row['otp_code']) ? (string) $row['otp_code'] : null,
            otpExpiry: $otpExpiry,
        );
    }

    public function withIdAndCreatedAt(int $id, \DateTimeImmutable $createdAt): self
    {
        return new self(
            id: $id,
            firstname: $this->firstname,
            lastname: $this->lastname,
            email: $this->email,
            phoneNumber: $this->phoneNumber,
            address: $this->address,
            passwordHash: $this->passwordHash,
            roleId: $this->roleId,
            isVerified: $this->isVerified,
            createdAt: $createdAt,
            otpCode: $this->otpCode,
            otpExpiry: $this->otpExpiry,
        );
    }
}
