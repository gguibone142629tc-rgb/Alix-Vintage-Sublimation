<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

final class PdoSchemaApplier implements SchemaApplier
{
    public function apply(\PDO $pdo, string $sql): void
    {
        // schema.sql is expected to be idempotent (CREATE IF NOT EXISTS / guarded blocks).
        $pdo->exec($sql);
    }
}
