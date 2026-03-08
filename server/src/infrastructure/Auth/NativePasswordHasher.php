<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Users\PasswordHasher;

final class NativePasswordHasher implements PasswordHasher
{
    public function hash(string $plain): string
    {
        $hash = password_hash($plain, PASSWORD_BCRYPT);
        if ($hash === false) {
            throw new \RuntimeException('Failed to hash password');
        }
        return $hash;
    }

    public function verify(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }
}
