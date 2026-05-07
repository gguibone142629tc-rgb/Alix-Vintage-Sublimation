<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Infrastructure\Cli\CliRunner;
use App\Infrastructure\Cli\StdConsoleOutput;
use App\Infrastructure\Tools\ResetDevDataTool;

require __DIR__ . '/../autoload.php';

$runner = new CliRunner(__DIR__ . '/..', new StdConsoleOutput());
exit($runner->run(new ResetDevDataTool(new PdoConnectionFactory()), $argv));
