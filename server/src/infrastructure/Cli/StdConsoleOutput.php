<?php

declare(strict_types=1);

namespace App\Infrastructure\Cli;

final class StdConsoleOutput implements ConsoleOutput
{
    public function writeln(string $message = ''): void
    {
        fwrite(STDOUT, $message . PHP_EOL);
    }

    public function errorln(string $message): void
    {
        fwrite(STDERR, $message . PHP_EOL);
    }
}
