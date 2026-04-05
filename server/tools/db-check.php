<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

try {
    $pdo = (new PdoConnectionFactory())->create();

    $tables = ['products', 'orders', 'order_items'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SELECT to_regclass('public.' || '{$table}')");
        $reg = $stmt ? $stmt->fetchColumn() : null;
        echo $table . ':' . ($reg ? 'OK' : 'MISSING') . PHP_EOL;
    }

    $columnsToCheck = [
        ['table' => 'orders', 'column' => 'meta'],
        ['table' => 'order_items', 'column' => 'meta'],
    ];

    $colStmt = $pdo->prepare(
        "SELECT 1\n"
        . "FROM information_schema.columns\n"
        . "WHERE table_schema = 'public' AND table_name = :table AND column_name = :column\n"
        . "LIMIT 1"
    );

    foreach ($columnsToCheck as $check) {
        $colStmt->execute(['table' => $check['table'], 'column' => $check['column']]);
        $hasCol = $colStmt->fetchColumn();
        echo $check['table'] . '.' . $check['column'] . ':' . ($hasCol ? 'OK' : 'MISSING') . PHP_EOL;
    }

    $enumStmt = $pdo->query(
        "SELECT 1\n"
        . "FROM pg_enum e\n"
        . "JOIN pg_type t ON t.oid = e.enumtypid\n"
        . "WHERE t.typname = 'order_status' AND e.enumlabel = 'draft'\n"
        . "LIMIT 1"
    );
    $hasDraft = $enumStmt ? $enumStmt->fetchColumn() : null;
    echo 'order_status:draft:' . ($hasDraft ? 'OK' : 'MISSING') . PHP_EOL;

    $enumStmt2 = $pdo->query(
        "SELECT 1\n"
        . "FROM pg_enum e\n"
        . "JOIN pg_type t ON t.oid = e.enumtypid\n"
        . "WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_final_payment'\n"
        . "LIMIT 1"
    );
    $hasFinal = $enumStmt2 ? $enumStmt2->fetchColumn() : null;
    echo 'order_status:awaiting_final_payment:' . ($hasFinal ? 'OK' : 'MISSING') . PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: " . $e->getMessage() . PHP_EOL);
    exit(1);
}
