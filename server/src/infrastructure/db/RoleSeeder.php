<?php

declare(strict_types=1);

namespace App\Infrastructure\Db;

final class RoleSeeder
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function ensureDefaultRoles(): void
    {
        $this->pdo->exec("INSERT INTO roles (role_name) VALUES ('admin') ON CONFLICT (role_name) DO NOTHING");
        $this->pdo->exec("INSERT INTO roles (role_name) VALUES ('customer') ON CONFLICT (role_name) DO NOTHING");
    }
}
