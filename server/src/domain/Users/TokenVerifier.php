<?php

declare(strict_types=1);

namespace App\Domain\Users;

interface TokenVerifier
{
    /** @return array<string,mixed>|null */
    public function verify(string $token): ?array;
}
