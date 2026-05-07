<?php

declare(strict_types=1);

namespace App\Infrastructure\Cli;

use App\Shared\Config\Env;

final class CliRunner
{
    public function __construct(
        private readonly string $basePath,
        private readonly ConsoleOutput $output,
    ) {
    }

    public function run(CliTool $tool, array $argv): int
    {
        Env::load($this->basePath);

        try {
            return $tool->run($argv, $this->output);
        } catch (\Throwable $e) {
            $this->output->errorln('ERROR: ' . $e->getMessage());
            return 1;
        }
    }
}
