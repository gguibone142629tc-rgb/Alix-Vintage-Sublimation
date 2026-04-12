<?php

declare(strict_types=1);

namespace App\Application\Products;

use App\Domain\Products\ProductRepository;

final class ListProducts
{
    public function __construct(private readonly ProductRepository $products)
    {
    }

    public function handle(): array
    {
        $items = $this->products->listAll();

        // Hide the internal placeholder product used to attach custom design orders to a valid product_id.
        // It should not appear in the public catalog.
        $items = array_values(array_filter($items, static function ($p): bool {
            $name = strtolower(trim((string) ($p->name ?? '')));
            $collection = strtolower(trim((string) ($p->collection ?? '')));
            $price = (float) ($p->basePrice ?? 0);

            return !($name === 'custom design' && $price === 0.0 && ($collection === '' || $collection === 'custom'));
        }));

        return [
            'ok' => true,
            'products' => array_map(static fn($p) => [
                'product_id' => $p->id,
                'product_name' => $p->name,
                'apparel_type' => $p->apparelType,
                'collection' => $p->collection,
                'base_price' => $p->basePrice,
                'image_path' => $p->imagePath,
                'images' => $p->images,
                'stock_status' => $p->stockStatus,
                'created_at' => $p->createdAt?->format('c'),
            ], $items),
        ];
    }
}
