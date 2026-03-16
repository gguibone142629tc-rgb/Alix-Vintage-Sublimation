<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class ListOrderDesignProofs
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $orderId): array
    {
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $proofs = $this->orders->getDesignProofHistoryForOrder($orderId);

        return [
            'ok' => true,
            'order_id' => $orderId,
            'proofs' => $proofs,
        ];
    }
}
