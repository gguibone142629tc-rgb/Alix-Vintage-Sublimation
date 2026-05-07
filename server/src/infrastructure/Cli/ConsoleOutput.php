<?php

declare(strict_types=1);

namespace App\Infrastructure\Cli;

interface ConsoleOutput
{
    public function writeln(string $message = ''): void;

    public function errorln(string $message): void;
}
