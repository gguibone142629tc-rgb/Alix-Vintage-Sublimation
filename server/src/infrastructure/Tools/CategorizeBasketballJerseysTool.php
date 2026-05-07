<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;

final class CategorizeBasketballJerseysTool implements CliTool
{
    private const MATCH_WHERE = "(lower(product_name) LIKE '%basketball%' AND (lower(product_name) LIKE '%jersey%' OR apparel_type = 'jersey'))";

    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $apply = in_array('--apply', $argv, true);

        $pdo = $this->connectionFactory->create();

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
            throw new \RuntimeException('products table not found in this database.');
        }

        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $schema)) {
            throw new \RuntimeException("Unsafe schema name detected: {$schema}");
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
            throw new \RuntimeException('products.collection column not found. Run: php server/tools/init-db.php');
        }

        $stmt = $pdo->query(
            "SELECT product_id, product_name, apparel_type, collection\n"
            . "FROM {$qualifiedProducts}\n"
            . 'WHERE ' . self::MATCH_WHERE . "\n"
            . 'ORDER BY product_id ASC'
        );

        $rows = $stmt ? $stmt->fetchAll(\PDO::FETCH_ASSOC) : [];
        if (!is_array($rows)) {
            $rows = [];
        }

        $output->writeln('matches=' . count($rows));
        foreach ($rows as $row) {
            $pid = (int) ($row['product_id'] ?? 0);
            $name = (string) ($row['product_name'] ?? '');
            $type = (string) ($row['apparel_type'] ?? '');
            $collection = (string) ($row['collection'] ?? '');
            $output->writeln(sprintf('#%d | %s | %s | collection=%s', $pid, $name, $type, $collection));
        }

        if (!$apply) {
            $output->writeln();
            $output->writeln('Dry run only. To apply the categorization, run:');
            $output->writeln('php server/tools/categorize-basketball-jerseys.php --apply');
            return 0;
        }

        $pdo->beginTransaction();
        try {
            $update = $pdo->prepare(
                "UPDATE {$qualifiedProducts}\n"
                . "SET collection = 'basketball'\n"
                . 'WHERE ' . self::MATCH_WHERE . " AND (collection IS DISTINCT FROM 'basketball')"
            );
            $update->execute();
            $updated = (int) $update->rowCount();

            $pdo->commit();

            $output->writeln();
            $output->writeln('updated=' . $updated);

            return 0;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }
}
