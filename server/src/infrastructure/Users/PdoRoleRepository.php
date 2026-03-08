<?php

declare(strict_types=1);

namespace App\Infrastructure\Users;

use App\Domain\Users\RoleRepository;

final class PdoRoleRepository implements RoleRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function getRoleIdByName(string $roleName): ?int
    {
        $stmt = $this->pdo->prepare('SELECT role_id FROM roles WHERE role_name = :name LIMIT 1');
        $stmt->execute(['name' => $roleName]);
        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['role_id'])) {
            return null;
        }
        return (int) $row['role_id'];
    }
}
