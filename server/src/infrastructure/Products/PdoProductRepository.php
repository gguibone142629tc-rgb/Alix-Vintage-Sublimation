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

        $ids = [];
        $out = [];
        foreach ($rows as $row) {
            if (is_array($row)) {
                $p = Product::fromRow($row);
                $out[] = $p;
                if ($p->id !== null) {
                    $ids[] = $p->id;
                }
            }
        }

        $imagesByProductId = $this->listImagesByProductIds($ids);
        foreach ($out as $idx => $product) {
            $pid = $product->id;
            if ($pid === null) {
                continue;
            }
            $out[$idx] = $product->withImages($imagesByProductId[$pid] ?? []);
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

        return Product::fromRow($row)->withImages($this->listImagesByProductId($productId));
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

        return $this->create($name, $apparelType, $basePrice, $imagePath);
    }

    public function create(string $name, string $apparelType, float $basePrice, ?string $imagePath): Product
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO products (product_name, apparel_type, base_price, image_path, stock_status) '
            . 'VALUES (:name, :apparel_type, :base_price, :image_path, TRUE) '
            . 'RETURNING *'
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

        $product = Product::fromRow($row);
        return $product->withImages($product->id !== null ? $this->listImagesByProductId($product->id) : []);
    }

    public function update(int $productId, string $name, string $apparelType, float $basePrice, ?string $imagePath): ?Product
    {
        $stmt = $this->pdo->prepare(
            'UPDATE products '
            . 'SET product_name = :name, apparel_type = :apparel_type, base_price = :base_price, image_path = :image_path '
            . 'WHERE product_id = :id '
            . 'RETURNING *'
        );

        $stmt->execute([
            'name' => $name,
            'apparel_type' => $apparelType,
            'base_price' => $basePrice,
            'image_path' => $imagePath,
            'id' => $productId,
        ]);

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['product_id'])) {
            return null;
        }

        return Product::fromRow($row)->withImages($this->listImagesByProductId($productId));
    }

    public function delete(int $productId): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM products WHERE product_id = :id');
        $stmt->execute(['id' => $productId]);
        return $stmt->rowCount() > 0;
    }

    public function listImagesByProductId(int $productId): array
    {
        try {
            $stmt = $this->pdo->prepare('SELECT view_type, image_path FROM product_images WHERE product_id = :id ORDER BY product_image_id ASC');
            $stmt->execute(['id' => $productId]);
            $rows = $stmt->fetchAll();
        } catch (\PDOException $e) {
            // 42P01: undefined_table (schema not migrated yet)
            if ($e->getCode() === '42P01') {
                return [];
            }
            throw $e;
        }
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $view = isset($row['view_type']) ? trim((string) $row['view_type']) : '';
            $path = isset($row['image_path']) ? trim((string) $row['image_path']) : '';
            if ($view === '' || $path === '') {
                continue;
            }
            $out[] = ['view_type' => $view, 'image_path' => $path];
        }

        return $out;
    }

    public function saveImagesByProductId(int $productId, array $imagesByView): void
    {
        if ($productId <= 0 || count($imagesByView) === 0) {
            return;
        }

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO product_images (product_id, view_type, image_path) '
                . 'VALUES (:product_id, :view_type, :image_path) '
                . 'ON CONFLICT (product_id, view_type) DO UPDATE SET image_path = EXCLUDED.image_path'
            );
        } catch (\PDOException $e) {
            if ($e->getCode() === '42P01') {
                return;
            }
            throw $e;
        }

        foreach ($imagesByView as $view => $path) {
            $viewType = trim((string) $view);
            $imagePath = trim((string) $path);
            if ($viewType === '' || $imagePath === '') {
                continue;
            }

            $stmt->execute([
                'product_id' => $productId,
                'view_type' => $viewType,
                'image_path' => $imagePath,
            ]);
        }
    }

    /** @param array<int,int> $productIds
     *  @return array<int, array<int, array{view_type:string,image_path:string}>>
     */
    private function listImagesByProductIds(array $productIds): array
    {
        if (count($productIds) === 0) {
            return [];
        }

        $ids = array_values(array_unique(array_map('intval', $productIds)));
        $in = implode(',', $ids);
        try {
            $stmt = $this->pdo->query(
                'SELECT product_id, view_type, image_path '
                . 'FROM product_images WHERE product_id IN (' . $in . ') '
                . 'ORDER BY product_image_id ASC'
            );
            $rows = $stmt->fetchAll();
        } catch (\PDOException $e) {
            if ($e->getCode() === '42P01') {
                return [];
            }
            throw $e;
        }
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !isset($row['product_id'])) {
                continue;
            }

            $pid = (int) $row['product_id'];
            $view = isset($row['view_type']) ? trim((string) $row['view_type']) : '';
            $path = isset($row['image_path']) ? trim((string) $row['image_path']) : '';
            if ($view === '' || $path === '') {
                continue;
            }

            if (!isset($out[$pid])) {
                $out[$pid] = [];
            }

            $out[$pid][] = ['view_type' => $view, 'image_path' => $path];
        }

        return $out;
    }
}
