<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

use App\Infrastructure\Db\RoleSeeder;

final class RoleSeedTask implements SeedTask
{
    public function run(\PDO $pdo): void
    {
        (new RoleSeeder($pdo))->ensureDefaultRoles();
    }
}
