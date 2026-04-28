<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;
use App\Domain\Orders\OrderRepository;
use App\Domain\Products\ProductRepository;
use App\Domain\Users\UserRepository;

final class CheckoutCart
{
    public function __construct(
        private readonly CartRepository $carts,
        private readonly ProductRepository $products,
        private readonly OrderRepository $orders,
        private readonly UserRepository $users,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(int $userId, array $input): array
    {
        $user = $this->users->findById($userId);
        if ($user === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'User not found'];
        }

        $profileAddress = trim((string) ($user->address ?? ''));
        if ($profileAddress === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Please set your address in Account Settings before placing an order'];
        }

        $cartId = $this->carts->getOrCreateCartId($userId);
        $items = $this->carts->listItems($cartId);

        if (count($items) === 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Cart is empty'];
        }

        $orderMeta = $input['meta'] ?? [];
        if (!is_array($orderMeta)) {
            $orderMeta = [];
        }

        $paymentMethodRaw = $input['payment_method'] ?? $input['paymentMethod'] ?? $input['payment_preference'] ?? $input['paymentPreference'] ?? null;
        $paymentMethodIn = is_string($paymentMethodRaw) ? trim($paymentMethodRaw) : '';
        $paymentMethodUpper = strtoupper($paymentMethodIn);
        $paymentMethod = $paymentMethodUpper === 'COD' ? 'COD' : 'GCash';

        $orderMeta['payment'] = is_array($orderMeta['payment'] ?? null) ? $orderMeta['payment'] : [];
        $orderMeta['payment']['method'] = $paymentMethod;

        // Always source delivery address from the customer's profile.
        $orderMeta['delivery_address'] = [
            'street' => $profileAddress,
        ];

        $orderItems = [];
        $basePriceTotal = 0.0;
        $totalQty = 0;

        foreach ($items as $item) {
            $product = $this->products->findById($item->productId);
            $unitPrice = $product?->basePrice ?? 0.0;
            $lineTotal = $unitPrice * $item->quantity;
            $basePriceTotal += $lineTotal;
            $totalQty += (int) $item->quantity;

            $orderItems[] = [
                'product_id' => $item->productId,
                'quantity' => $item->quantity,
                'total_amount' => $lineTotal,
                'meta' => $item->meta,
            ];
        }

        $orderType = count($orderItems) > 1 ? 'mixed' : self::guessOrderType($orderItems[0]['meta'] ?? []);

        if ($totalQty >= 10) {
            $orderMeta['promo'] = is_array($orderMeta['promo'] ?? null) ? $orderMeta['promo'] : [];
            $orderMeta['promo']['free_shipping_min_qty_10'] = true;
        }

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
