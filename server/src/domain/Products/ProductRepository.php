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
}
