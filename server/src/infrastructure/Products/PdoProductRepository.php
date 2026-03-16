<?php

declare(strict_types=1);

namespace App\Infrastructure\Products;

use App\Domain\Products\Product;
use App\Domain\Products\ProductRepository;

final class PdoProductRepository implements ProductRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function listAll(): array
    {
        $stmt = $this->pdo->query('SELECT * FROM products ORDER BY created_at DESC, product_id DESC');
        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $out[] = Product::fromRow($row);
            }
        }

        return $out;
    }

    public function findById(int $productId): ?Product
    {
        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE product_id = :id LIMIT 1');
        $stmt->execute(['id' => $productId]);
        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return Product::fromRow($row);
    }

    public function findByNameAndPrice(string $name, float $basePrice): ?Product
    {
        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE lower(product_name) = lower(:name) AND base_price = :base_price LIMIT 1');
        $stmt->execute([
            'name' => $name,
            'base_price' => $basePrice,
        ]);

        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        return Product::fromRow($row);
    }

    public function findOrCreate(string $name, string $apparelType, float $basePrice, ?string $imagePath): Product
    {
        $existing = $this->findByNameAndPrice($name, $basePrice);
        if ($existing !== null) {
            return $existing;
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO products (product_name, apparel_type, base_price, image_path, stock_status) '
            . 'VALUES (:name, :apparel_type, :base_price, :image_path, TRUE) '
            . 'RETURNING product_id, created_at'
        );

        $stmt->execute([
            'name' => $name,
            'apparel_type' => $apparelType,
            'base_price' => $basePrice,
            'image_path' => $imagePath,
        ]);

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['product_id'])) {
            throw new \RuntimeException('Failed to create product');
        }

        return new Product(
            (int) $row['product_id'],
            $name,
            $apparelType,
            $basePrice,
            $imagePath,
            true,
            isset($row['created_at']) ? new \DateTimeImmutable((string) $row['created_at']) : null,
        );
    }
}
