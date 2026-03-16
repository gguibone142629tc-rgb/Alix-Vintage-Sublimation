<?php

declare(strict_types=1);

namespace App\Domain\Orders;

final class OrderItem
{
    /** @param array<string,mixed> $meta */
    public function __construct(
        public readonly int $id,
        public readonly int $orderId,
        public readonly int $productId,
        public readonly int $quantity,
        public readonly float $totalAmount,
        public readonly array $meta,
    ) {
    }

    /** @param array<string,mixed> $row */
    public static function fromRow(array $row): self
    {
        $metaRaw = $row['meta'] ?? [];
        $meta = [];
        if (is_array($metaRaw)) {
            $meta = $metaRaw;
        } elseif (is_string($metaRaw)) {
            $decoded = json_decode($metaRaw, true);
            $meta = is_array($decoded) ? $decoded : [];
        }

        return new self(
            (int) $row['order_item_id'],
            (int) $row['order_id'],
            (int) $row['product_id'],
            (int) $row['quantity'],
            (float) ($row['total_amount'] ?? 0),
            $meta,
        );
    }
}
