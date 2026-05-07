<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

interface SchemaApplier
{
    public function apply(\PDO $pdo, string $sql): void;
}
