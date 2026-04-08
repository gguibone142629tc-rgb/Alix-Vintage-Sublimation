<?php

declare(strict_types=1);

use App\Infrastructure\Db\PdoConnectionFactory;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

$apply = in_array('--apply', $argv, true);

$where = "(lower(product_name) LIKE '%basketball%' AND (lower(product_name) LIKE '%jersey%' OR apparel_type = 'jersey'))";

try {
    $pdo = (new PdoConnectionFactory())->create();

    $schemaStmt = $pdo->prepare(
        "SELECT table_schema\n"
        . "FROM information_schema.tables\n"
        . "WHERE table_name = 'products' AND table_type = 'BASE TABLE'\n"
        . "ORDER BY (table_schema = 'public') DESC, table_schema ASC\n"
        . "LIMIT 1"
    );
    $schemaStmt->execute();
    $schema = (string) ($schemaStmt->fetchColumn() ?: '');
    if ($schema === '') {
        fwrite(STDERR, "ERROR: products table not found in this database.\n");
        exit(1);
    }

    // Hardening: only allow safe schema identifiers.
    if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $schema)) {
        fwrite(STDERR, "ERROR: Unsafe schema name detected: {$schema}\n");
        exit(1);
    }

    $qualifiedProducts = '"' . $schema . '"."products"';

    $colStmt = $pdo->prepare(
        "SELECT 1 FROM information_schema.columns\n"
        . "WHERE table_schema = :schema AND table_name = 'products' AND column_name = 'collection'\n"
        . "LIMIT 1"
    );
    $colStmt->execute(['schema' => $schema]);
    $hasCol = (bool) $colStmt->fetchColumn();

    if (!$hasCol) {
        fwrite(STDERR, "ERROR: products.collection column not found. Run: php server/tools/init-db.php\n");
        exit(1);
    }

    $stmt = $pdo->query(
        "SELECT product_id, product_name, apparel_type, collection\n"
        . "FROM {$qualifiedProducts}\n"
        . "WHERE {$where}\n"
        . "ORDER BY product_id ASC"
    );

    $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    if (!is_array($rows)) {
        $rows = [];
    }

    echo 'matches=' . count($rows) . PHP_EOL;
    foreach ($rows as $row) {
        $pid = (int) ($row['product_id'] ?? 0);
        $name = (string) ($row['product_name'] ?? '');
        $type = (string) ($row['apparel_type'] ?? '');
        $collection = (string) ($row['collection'] ?? '');
        echo sprintf('#%d | %s | %s | collection=%s', $pid, $name, $type, $collection) . PHP_EOL;
    }

    if (!$apply) {
        echo PHP_EOL;
        echo "Dry run only. To apply the categorization, run:\n";
        echo "php server/tools/categorize-basketball-jerseys.php --apply\n";
        exit(0);
    }

    $pdo->beginTransaction();

    $update = $pdo->prepare(
        "UPDATE {$qualifiedProducts}\n"
        . "SET collection = 'basketball'\n"
        . "WHERE {$where} AND (collection IS DISTINCT FROM 'basketball')"
    );
    $update->execute();
    $updated = (int) $update->rowCount();

    $pdo->commit();

    echo PHP_EOL;
    echo 'updated=' . $updated . PHP_EOL;
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . PHP_EOL);
    exit(1);
}
