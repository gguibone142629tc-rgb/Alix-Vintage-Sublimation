<?php

declare(strict_types=1);

namespace App\Infrastructure\Users;

use App\Domain\Users\User;
use App\Domain\Users\UserRepository;

final class PdoUserRepository implements UserRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function findById(int $userId): ?User
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return User::fromRow($row);
    }

    public function findByEmail(string $email): ?User
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }
        return User::fromRow($row);
    }

    public function countByRoleId(int $roleId): int
    {
        $stmt = $this->pdo->prepare('SELECT COUNT(*) AS c FROM users WHERE role_id = :role_id');
        $stmt->execute(['role_id' => $roleId]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return 0;
        }
        $count = $row['c'] ?? $row['count'] ?? null;
        return is_numeric($count) ? (int) $count : 0;
    }

    public function create(User $user): User
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO users (firstname, lastname, email, phone_number, address, password_hash, role_id) '
            . 'VALUES (:firstname, :lastname, :email, :phone_number, :address, :password_hash, :role_id) '
            . 'RETURNING user_id, created_at'
        );

        $stmt->execute([
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'phone_number' => $user->phoneNumber,
            'address' => $user->address,
            'password_hash' => $user->passwordHash,
            'role_id' => $user->roleId,
        ]);

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['user_id'], $row['created_at'])) {
            throw new \RuntimeException('Failed to create user');
        }

        return $user->withIdAndCreatedAt((int) $row['user_id'], new \DateTimeImmutable((string) $row['created_at']));
    }

    public function setOtp(int $userId, string $otpCode, \DateTimeImmutable $expiry): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET otp_code = :otp_code, otp_expiry = :otp_expiry WHERE user_id = :user_id'
        );
        $stmt->execute([
            'otp_code' => $otpCode,
            'otp_expiry' => $expiry->format('Y-m-d H:i:s'),
            'user_id' => $userId,
        ]);
    }

    public function verifyOtp(string $email, string $otpCode, \DateTimeImmutable $now): ?User
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM users WHERE email = :email AND otp_code = :otp_code AND otp_expiry IS NOT NULL AND otp_expiry >= :now LIMIT 1'
        );
        $stmt->execute([
            'email' => $email,
            'otp_code' => $otpCode,
            'now' => $now->format('Y-m-d H:i:s'),
        ]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return User::fromRow($row);
    }

    public function markVerified(int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expiry = NULL WHERE user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);
    }

    public function updatePasswordHash(int $userId, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET password_hash = :password_hash WHERE user_id = :user_id'
        );
        $stmt->execute([
            'password_hash' => $passwordHash,
            'user_id' => $userId,
        ]);
    }

    public function updateProfile(int $userId, string $firstname, string $lastname, string $email, ?string $phoneNumber, ?string $address): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET firstname = :firstname, lastname = :lastname, email = :email, phone_number = :phone_number, address = :address WHERE user_id = :user_id'
        );

        $stmt->execute([
            'firstname' => $firstname,
            'lastname' => $lastname,
            'email' => $email,
            'phone_number' => $phoneNumber,
            'address' => $address,
            'user_id' => $userId,
        ]);
    }

    public function clearOtp(int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE users SET otp_code = NULL, otp_expiry = NULL WHERE user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);
    }
}
