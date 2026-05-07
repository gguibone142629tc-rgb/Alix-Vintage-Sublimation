<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

interface SchemaSource
{
    /**
     * @throws \RuntimeException when schema cannot be loaded
     */
    public function loadSql(): string;
}
