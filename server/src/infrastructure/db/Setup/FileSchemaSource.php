<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

final class FileSchemaSource implements SchemaSource
{
    public function __construct(private readonly string $schemaPath)
    {
    }

    public function loadSql(): string
    {
        if (!is_file($this->schemaPath)) {
            throw new \RuntimeException("Schema file not found: {$this->schemaPath}");
        }

        $sql = file_get_contents($this->schemaPath);
        if ($sql === false || trim($sql) === '') {
            throw new \RuntimeException('Schema file is empty or unreadable.');
        }

        return $sql;
    }
}
