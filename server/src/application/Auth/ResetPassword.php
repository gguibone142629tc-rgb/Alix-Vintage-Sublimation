<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Users\PasswordHasher;
use App\Domain\Users\UserRepository;

final class ResetPassword
{
    private const PASSWORD_REQUIREMENTS_MESSAGE =
        'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.';

    public function __construct(
        private readonly UserRepository $users,
        private readonly PasswordHasher $passwordHasher,
    ) {
    }

    private static function isPasswordStrong(string $password): bool
    {
        if (strlen($password) < 8) {
            return false;
        }

        $hasUppercase = preg_match('/[A-Z]/', $password) === 1;
        $hasLowercase = preg_match('/[a-z]/', $password) === 1;
        $hasNumber = preg_match('/\d/', $password) === 1;
        $hasSpecial = preg_match('/[^A-Za-z0-9\s]/', $password) === 1;

        return $hasUppercase && $hasLowercase && $hasNumber && $hasSpecial;
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $otpCode = trim((string) ($input['otp_code'] ?? ''));
        $newPassword = (string) ($input['new_password'] ?? '');

        if ($email === '' || $otpCode === '' || $newPassword === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing email, code, or new_password'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid email'];
        }

        if (!self::isPasswordStrong($newPassword)) {
            return ['ok' => false, 'status' => 422, 'error' => self::PASSWORD_REQUIREMENTS_MESSAGE];
        }

        $now = new \DateTimeImmutable('now');
        $user = $this->users->verifyOtp($email, $otpCode, $now);
        if ($user === null) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid or expired verification code'];
        }

        $hash = $this->passwordHasher->hash($newPassword);
        $this->users->updatePasswordHash((int) $user->id, $hash);
        $this->users->clearOtp((int) $user->id);

        return ['ok' => true, 'status' => 200];
    }
}
