<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

$pdo = (new PdoConnectionFactory())->create();

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

echo "Dev data reset complete." . PHP_EOL;

$tables = ['orders', 'order_items', 'design_proofs', 'roster_details', 'products', 'product_images'];
foreach ($tables as $table) {
    $count = (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
    echo $table . '_count=' . $count . PHP_EOL;
}
