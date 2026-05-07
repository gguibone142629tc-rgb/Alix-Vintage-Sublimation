<?php

declare(strict_types=1);

namespace App\Infrastructure\Cli;

interface CliTool
{
    /**
     * @param string[] $argv
     */
    public function run(array $argv, ConsoleOutput $output): int;
}
