<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;
use App\Domain\Products\ProductRepository;

final class AddCartItem
{
    public function __construct(
        private readonly CartRepository $carts,
        private readonly ProductRepository $products,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(int $userId, array $input): array
    {
        $quantityRaw = $input['quantity'] ?? 1;
        $quantity = is_numeric($quantityRaw) ? (int) $quantityRaw : 1;
        $quantity = max(1, min(999, $quantity));

        $productIdRaw = $input['product_id'] ?? null;
        $productId = is_numeric($productIdRaw) ? (int) $productIdRaw : null;

        $meta = $input['meta'] ?? [];
        if (!is_array($meta)) {
            $meta = [];
        }

        $resolvedProduct = null;

        if ($productId === null || $productId <= 0) {
            $name = trim((string) ($input['product_name'] ?? ''));
            if ($name === '') {
                return ['ok' => false, 'status' => 422, 'error' => 'Missing product'];
            }

            $apparelType = trim((string) ($input['apparel_type'] ?? 'other'));
            if ($apparelType === '') {
                $apparelType = 'other';
            }

            $basePriceRaw = $input['base_price'] ?? 0;
            $basePrice = is_numeric($basePriceRaw) ? (float) $basePriceRaw : 0.0;
            if ($basePrice < 0) {
                $basePrice = 0.0;
            }

            $imagePath = isset($input['image_path']) ? (string) $input['image_path'] : null;

            $resolvedProduct = $this->products->findOrCreate($name, $apparelType, null, $basePrice, $imagePath);
            $productId = (int) ($resolvedProduct->id ?? 0);
        }

        if ($productId <= 0) {
            return ['ok' => false, 'status' => 500, 'error' => 'Invalid product'];
        }

        if ($resolvedProduct === null) {
            $resolvedProduct = $this->products->findById($productId);
        }

        if ($resolvedProduct !== null) {
            $meta = [
                'product_name' => $meta['product_name'] ?? $resolvedProduct->name,
                'apparel_type' => $meta['apparel_type'] ?? $resolvedProduct->apparelType,
                'base_price' => $meta['base_price'] ?? $resolvedProduct->basePrice,
                'image_path' => $meta['image_path'] ?? $resolvedProduct->imagePath,
                ...$meta,
            ];
        }

        $cartId = $this->carts->getOrCreateCartId($userId);
        $item = $this->carts->addItem($cartId, $productId, $quantity, $meta);

        return [
            'ok' => true,
            'cart_item' => [
                'cart_item_id' => $item->id,
                'product_id' => $item->productId,
                'quantity' => $item->quantity,
                'meta' => $item->meta,
            ],
        ];
    }
}
