<?php

declare(strict_types=1);

namespace App\Domain\Users;

interface TokenIssuer
{
    /** @param array<string,mixed> $claims */
    public function issue(array $claims): string;
}
