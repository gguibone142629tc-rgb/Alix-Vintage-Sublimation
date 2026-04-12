<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class UpdateOrderPricing
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? null;
        $baseRaw = $input['base_price'] ?? $input['basePrice'] ?? null;
        $shipRaw = $input['shipping_fee'] ?? $input['shippingFee'] ?? null;

        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid order_id'];
        }

        $base = is_numeric($baseRaw) ? (float) $baseRaw : -1;
        $ship = is_numeric($shipRaw) ? (float) $shipRaw : -1;

        if ($base < 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid base_price'];
        }

        if ($ship < 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid shipping_fee'];
        }

        $ok = $this->orders->updateOrderPricing($orderId, $base, $ship);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update pricing'];
        }

        return ['ok' => true];
    }
}
