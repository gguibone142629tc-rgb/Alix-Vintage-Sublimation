<?php

declare(strict_types=1);

namespace App\Domain\Products;

interface ProductRepository
{
    /** @return Product[] */
    public function listAll(): array;

    public function findById(int $productId): ?Product;

    public function findByNameAndPrice(string $name, float $basePrice): ?Product;

    /**
     * Used for the current static frontend pages that don't know product_id yet.
     * Creates a product record when it doesn't exist.
     */
    public function findOrCreate(string $name, string $apparelType, float $basePrice, ?string $imagePath): Product;

    public function create(string $name, string $apparelType, float $basePrice, ?string $imagePath): Product;

    public function update(int $productId, string $name, string $apparelType, float $basePrice, ?string $imagePath): ?Product;

    public function delete(int $productId): bool;

    /** @return array<int, array{view_type:string,image_path:string}> */
    public function listImagesByProductId(int $productId): array;

    /** @param array<string,string> $imagesByView */
    public function saveImagesByProductId(int $productId, array $imagesByView): void;
}
