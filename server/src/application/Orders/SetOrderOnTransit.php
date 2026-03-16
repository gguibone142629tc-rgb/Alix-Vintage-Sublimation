<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class SetOrderOnTransit
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $trackingRaw = $input['tracking_number'] ?? $input['trackingNumber'] ?? null;
        $tracking = is_string($trackingRaw) ? trim($trackingRaw) : '';
        if ($tracking === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing tracking_number'];
        }

        if (strlen($tracking) > 100) {
            return ['ok' => false, 'status' => 422, 'error' => 'Tracking number is too long'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $statusLower = strtolower($status);
        if (!in_array($statusLower, ['ready_to_ship', 'processing'], true)) {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not ready for shipping'];
        }

        $ok = $this->orders->markOrderShipped($orderId, $tracking);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to set order on transit'];
        }

        return ['ok' => true];
    }
}
