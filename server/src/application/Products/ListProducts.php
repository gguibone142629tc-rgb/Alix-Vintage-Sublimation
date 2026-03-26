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

        return [
            'ok' => true,
            'products' => array_map(static fn($p) => [
                'product_id' => $p->id,
                'product_name' => $p->name,
                'apparel_type' => $p->apparelType,
                'base_price' => $p->basePrice,
                'image_path' => $p->imagePath,
                'images' => $p->images,
                'stock_status' => $p->stockStatus,
                'created_at' => $p->createdAt?->format('c'),
            ], $items),
        ];
    }
}
