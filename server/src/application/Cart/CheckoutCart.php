<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;
use App\Domain\Orders\OrderRepository;
use App\Domain\Products\ProductRepository;

final class CheckoutCart
{
    public function __construct(
        private readonly CartRepository $carts,
        private readonly ProductRepository $products,
        private readonly OrderRepository $orders,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(int $userId, array $input): array
    {
        $cartId = $this->carts->getOrCreateCartId($userId);
        $items = $this->carts->listItems($cartId);

        if (count($items) === 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Cart is empty'];
        }

        $orderMeta = $input['meta'] ?? [];
        if (!is_array($orderMeta)) {
            $orderMeta = [];
        }

        $deliveryRaw = $orderMeta['delivery_address'] ?? $orderMeta['deliveryAddress'] ?? null;
        $delivery = is_array($deliveryRaw) ? $deliveryRaw : [];

        $country = trim((string) ($delivery['country'] ?? ''));
        $province = trim((string) ($delivery['province'] ?? ''));
        $city = trim((string) ($delivery['city'] ?? ''));
        $street = trim((string) ($delivery['street'] ?? ''));
        $postalCode = trim((string) ($delivery['postal_code'] ?? $delivery['postalCode'] ?? ''));

        $missing = [];
        if ($country === '') $missing[] = 'country';
        if ($province === '') $missing[] = 'province';
        if ($city === '') $missing[] = 'city';
        if ($street === '') $missing[] = 'street';
        if ($postalCode === '') $missing[] = 'postal_code';

        if (count($missing) > 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing delivery address fields: ' . implode(', ', $missing)];
        }

        // Normalize meta key names.
        $orderMeta['delivery_address'] = [
            'country' => $country,
            'province' => $province,
            'city' => $city,
            'street' => $street,
            'postal_code' => $postalCode,
        ];

        $orderItems = [];
        $basePriceTotal = 0.0;

        foreach ($items as $item) {
            $product = $this->products->findById($item->productId);
            $unitPrice = $product?->basePrice ?? 0.0;
            $lineTotal = $unitPrice * $item->quantity;
            $basePriceTotal += $lineTotal;

            $orderItems[] = [
                'product_id' => $item->productId,
                'quantity' => $item->quantity,
                'total_amount' => $lineTotal,
                'meta' => $item->meta,
            ];
        }

        $orderType = count($orderItems) > 1 ? 'mixed' : self::guessOrderType($orderItems[0]['meta'] ?? []);

        $orderId = $this->orders->createOrder(
            $userId,
            $orderType,
            $basePriceTotal,
            0.0,
            $orderItems,
            $orderMeta,
        );

        $this->carts->clearCart($cartId);

        return [
            'ok' => true,
            'order_id' => $orderId,
        ];
    }

    /** @param array<string,mixed> $meta */
    private static function guessOrderType(array $meta): string
    {
        $roster = $meta['roster'] ?? null;
        if (is_array($roster) && count($roster) > 1) {
            return 'group';
        }
        return 'individual';
    }
}
