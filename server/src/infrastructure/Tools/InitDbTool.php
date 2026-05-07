<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;
use App\Infrastructure\Db\Setup\DatabaseInitializer;
use App\Infrastructure\Db\Setup\FileSchemaSource;
use App\Infrastructure\Db\Setup\PdoSchemaApplier;
use App\Infrastructure\Db\Setup\RoleSeedTask;

final class InitDbTool implements CliTool
{
    public function __construct(
        private readonly ConnectionFactory $connectionFactory,
        private readonly string $schemaPath,
    ) {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        (new DatabaseInitializer(
            connectionFactory: $this->connectionFactory,
            schemaSource: new FileSchemaSource($this->schemaPath),
            schemaApplier: new PdoSchemaApplier(),
            seedTasks: [new RoleSeedTask()],
        ))->initialize();

        $output->writeln('Database initialized successfully.');
        return 0;
    }
}
