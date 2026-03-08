<?php

declare(strict_types=1);

namespace App\Domain\Users;

interface RoleRepository
{
    public function getRoleIdByName(string $roleName): ?int;
}
