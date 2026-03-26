<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Infrastructure\Db\RoleSeeder;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

$schemaPath = __DIR__ . '/../src/Infrastructure/db/schema.sql';
if (!is_file($schemaPath)) {
    fwrite(STDERR, "ERROR: Schema file not found: {$schemaPath}" . PHP_EOL);
    exit(1);
}

$sql = file_get_contents($schemaPath);
if ($sql === false || trim($sql) === '') {
    fwrite(STDERR, "ERROR: Schema file is empty or unreadable." . PHP_EOL);
    exit(1);
}

try {
    $pdo = (new PdoConnectionFactory())->create();

    // Apply schema idempotently (schema.sql uses CREATE IF NOT EXISTS / guarded enum blocks).
    $pdo->exec($sql);

    // Ensure required app roles exist for auth flows.
    (new RoleSeeder($pdo))->ensureDefaultRoles();

    echo "Database initialized successfully." . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
