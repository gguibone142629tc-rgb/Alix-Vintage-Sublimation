<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

interface SeedTask
{
    public function run(\PDO $pdo): void;
}
