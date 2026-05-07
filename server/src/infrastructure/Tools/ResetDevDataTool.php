<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;

final class ResetDevDataTool implements CliTool
{
    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $pdo = $this->connectionFactory->create();

        $sql = <<<'SQL'
BEGIN;
TRUNCATE TABLE design_proofs RESTART IDENTITY CASCADE;
TRUNCATE TABLE roster_details RESTART IDENTITY CASCADE;
TRUNCATE TABLE order_items RESTART IDENTITY CASCADE;
TRUNCATE TABLE orders RESTART IDENTITY CASCADE;
TRUNCATE TABLE product_images RESTART IDENTITY CASCADE;
TRUNCATE TABLE products RESTART IDENTITY CASCADE;
COMMIT;
SQL;

        $pdo->exec($sql);

        $output->writeln('Dev data reset complete.');

        $tables = ['orders', 'order_items', 'design_proofs', 'roster_details', 'products', 'product_images'];
        foreach ($tables as $table) {
            $count = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
            $output->writeln($table . '_count=' . $count);
        }

        return 0;
    }
}
