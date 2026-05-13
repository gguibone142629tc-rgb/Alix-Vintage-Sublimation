<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class CancelMyOrder
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $userId, int $orderId): array
    {
        if ($userId <= 0) {
            return ['ok' => false, 'status' => 401, 'error' => 'Login required'];
        }

        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 400, 'error' => 'Invalid order id'];
        }

        $current = $this->orders->getOrderStatusForUser($orderId, $userId);
        if ($current === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $currentLower = strtolower(trim((string) $current));
        if ($currentLower !== 'pending') {
            return ['ok' => false, 'status' => 409, 'error' => 'Only Pending Review orders can be cancelled'];
        }

        $ok = $this->orders->updateOrderStatus($orderId, 'cancelled');
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to cancel order'];
        }

        return ['ok' => true];
    }
}
