<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;

final class CheckProductsTool implements CliTool
{
    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $pdo = $this->connectionFactory->create();

        $count = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
        $output->writeln('products_count=' . $count);

        $stmt = $pdo->query(
            'SELECT product_id, product_name, apparel_type, base_price, image_path '
            . 'FROM products ORDER BY product_id DESC LIMIT 20'
        );
        $rows = $stmt ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [];
        if (!is_array($rows)) {
            $rows = [];
        }

        foreach ($rows as $row) {
            $output->writeln(sprintf(
                '#%d | %s | %s | %.2f | %s',
                (int) ($row['product_id'] ?? 0),
                (string) ($row['product_name'] ?? ''),
                (string) ($row['apparel_type'] ?? ''),
                (float) ($row['base_price'] ?? 0),
                (string) ($row['image_path'] ?? '')
            ));
        }

        return 0;
    }
}
