<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class UpdateOrderStatus
{
    private const ALLOWED = ['pending', 'paid', 'proofing', 'processing', 'ready_to_ship', 'shipped', 'completed', 'cancelled'];

    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $orderId, string $status): array
    {
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 400, 'error' => 'Invalid order id'];
        }

        $status = strtolower(trim($status));
        if (!in_array($status, self::ALLOWED, true)) {
            return ['ok' => false, 'status' => 400, 'error' => 'Invalid status'];
        }

        $current = $this->orders->getOrderStatus($orderId);
        if ($current === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $ok = $this->orders->updateOrderStatus($orderId, $status);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
        }

        return ['ok' => true];
    }
}
