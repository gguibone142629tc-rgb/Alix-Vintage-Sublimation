<?php

declare(strict_types=1);

namespace App\Infrastructure\Db\Setup;

use App\Infrastructure\Db\ConnectionFactory;

final class DatabaseInitializer
{
    /**
     * @param SeedTask[] $seedTasks
     */
    public function __construct(
        private readonly ConnectionFactory $connectionFactory,
        private readonly SchemaSource $schemaSource,
        private readonly SchemaApplier $schemaApplier,
        private readonly array $seedTasks = [],
    ) {
    }

    public function initialize(): void
    {
        $pdo = $this->connectionFactory->create();

        $sql = $this->schemaSource->loadSql();
        $this->schemaApplier->apply($pdo, $sql);

        foreach ($this->seedTasks as $task) {
            $task->run($pdo);
        }
    }
}
