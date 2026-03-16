<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class ListAllOrders
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $limit = 50, int $offset = 0): array
    {
        $rows = $this->orders->listAllOrders($limit, $offset);

        $allItemIds = [];
        foreach ($rows as $row) {
            $items = $row['items'];
            foreach ($items as $it) {
                $allItemIds[] = $it->id;
            }
        }
        $proofByItemId = $this->orders->getLatestDesignProofsForOrderItems($allItemIds);

        $out = [];
        foreach ($rows as $row) {
            $order = $row['order'];
            $items = $row['items'];

            $latestProof = null;
            foreach ($items as $it) {
                $p = $proofByItemId[$it->id] ?? null;
                if (!is_array($p)) {
                    continue;
                }
                if ($latestProof === null) {
                    $latestProof = $p;
                    continue;
                }
                $vA = (int) ($latestProof['version_number'] ?? 0);
                $vB = (int) ($p['version_number'] ?? 0);
                if ($vB > $vA) {
                    $latestProof = $p;
                }
            }

            $out[] = [
                'order' => [
                    'order_id' => $order->id,
                    'user_id' => $order->userId,
                    'status' => $order->status,
                    'order_type' => $order->orderType,
                    'base_price' => $order->basePrice,
                    'shipping_fee' => $order->shippingFee,
                    'tracking_number' => $order->trackingNumber,
                    'meta' => $order->meta,
                    'created_at' => $order->createdAt?->format('c'),
                ],
                'items' => array_map(static fn($it) => [
                    'order_item_id' => $it->id,
                    'product_id' => $it->productId,
                    'quantity' => $it->quantity,
                    'total_amount' => $it->totalAmount,
                    'meta' => $it->meta,
                ], $items),
                'design_proof' => $latestProof,
            ];
        }

        return [
            'ok' => true,
            'orders' => $out,
        ];
    }
}
