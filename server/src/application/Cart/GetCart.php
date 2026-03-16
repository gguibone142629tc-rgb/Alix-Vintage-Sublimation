<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;
use App\Domain\Products\ProductRepository;

final class GetCart
{
    public function __construct(
        private readonly CartRepository $carts,
        private readonly ProductRepository $products,
    ) {
    }

    public function handle(int $userId): array
    {
        $cartId = $this->carts->getOrCreateCartId($userId);
        $items = $this->carts->listItems($cartId);

        $out = [];
        $total = 0.0;

        foreach ($items as $item) {
            $product = $this->products->findById($item->productId);
            $unitPrice = $product?->basePrice ?? 0.0;
            $lineTotal = $unitPrice * $item->quantity;
            $total += $lineTotal;

            $out[] = [
                'cart_item_id' => $item->id,
                'product' => $product ? [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'apparel_type' => $product->apparelType,
                    'base_price' => $product->basePrice,
                    'image_path' => $product->imagePath,
                ] : null,
                'quantity' => $item->quantity,
                'meta' => $item->meta,
                'line_total' => $lineTotal,
            ];
        }

        return [
            'ok' => true,
            'cart' => [
                'cart_id' => $cartId,
                'items' => $out,
                'total' => $total,
            ],
        ];
    }
}
