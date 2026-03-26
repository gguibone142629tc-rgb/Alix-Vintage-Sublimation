<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

$pdo = (new PdoConnectionFactory())->create();
$count = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();

echo 'products_count=' . $count . PHP_EOL;

$stmt = $pdo->query('SELECT product_id, product_name, apparel_type, base_price, image_path FROM products ORDER BY product_id DESC LIMIT 20');
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    echo sprintf(
        '#%d | %s | %s | %.2f | %s',
        (int) ($row['product_id'] ?? 0),
        (string) ($row['product_name'] ?? ''),
        (string) ($row['apparel_type'] ?? ''),
        (float) ($row['base_price'] ?? 0),
        (string) ($row['image_path'] ?? '')
    ) . PHP_EOL;
}
