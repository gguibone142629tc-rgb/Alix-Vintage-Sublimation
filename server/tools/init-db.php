<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Infrastructure\Cli\CliRunner;
use App\Infrastructure\Cli\StdConsoleOutput;
use App\Infrastructure\Tools\InitDbTool;

require __DIR__ . '/../autoload.php';

$schemaPath = __DIR__ . '/../src/Infrastructure/db/schema.sql';
$runner = new CliRunner(__DIR__ . '/..', new StdConsoleOutput());
exit($runner->run(new InitDbTool(new PdoConnectionFactory(), $schemaPath), $argv));
