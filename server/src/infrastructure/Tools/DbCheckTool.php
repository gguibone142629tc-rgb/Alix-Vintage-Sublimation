<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;

final class DbCheckTool implements CliTool
{
    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $pdo = $this->connectionFactory->create();

        $tables = ['products', 'orders', 'order_items'];
        foreach ($tables as $table) {
            $stmt = $pdo->query("SELECT to_regclass('public.' || '{$table}')");
            $reg = $stmt ? $stmt->fetchColumn() : null;
            $output->writeln($table . ':' . ($reg ? 'OK' : 'MISSING'));
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
            $output->writeln($check['table'] . '.' . $check['column'] . ':' . ($hasCol ? 'OK' : 'MISSING'));
        }

        $enumStmt = $pdo->query(
            "SELECT 1\n"
            . "FROM pg_enum e\n"
            . "JOIN pg_type t ON t.oid = e.enumtypid\n"
            . "WHERE t.typname = 'order_status' AND e.enumlabel = 'draft'\n"
            . "LIMIT 1"
        );
        $hasDraft = $enumStmt ? $enumStmt->fetchColumn() : null;
        $output->writeln('order_status:draft:' . ($hasDraft ? 'OK' : 'MISSING'));

        $enumStmt2 = $pdo->query(
            "SELECT 1\n"
            . "FROM pg_enum e\n"
            . "JOIN pg_type t ON t.oid = e.enumtypid\n"
            . "WHERE t.typname = 'order_status' AND e.enumlabel = 'awaiting_final_payment'\n"
            . "LIMIT 1"
        );
        $hasFinal = $enumStmt2 ? $enumStmt2->fetchColumn() : null;
        $output->writeln('order_status:awaiting_final_payment:' . ($hasFinal ? 'OK' : 'MISSING'));

        return 0;
    }
}
