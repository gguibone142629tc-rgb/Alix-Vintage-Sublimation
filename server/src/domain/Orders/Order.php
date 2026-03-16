<?php

declare(strict_types=1);

namespace App\Domain\Orders;

final class Order
{
    /** @param array<string,mixed> $meta */
    public function __construct(
        public readonly int $id,
        public readonly int $userId,
        public readonly ?int $paymentId,
        public readonly string $status,
        public readonly string $orderType,
        public readonly float $basePrice,
        public readonly float $shippingFee,
        public readonly ?string $trackingNumber,
        public readonly array $meta,
        public readonly ?\DateTimeImmutable $createdAt,
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

        // Normalize meta shape: ensure a single associative array is exposed.
        // Some legacy rows used `[]` (array) for meta, and jsonb concatenation
        // can produce `[{...}]`. The frontend expects `meta.payment.*`.
        if (is_array($meta) && array_is_list($meta)) {
            $merged = [];
            foreach ($meta as $entry) {
                if (is_array($entry)) {
                    $merged = array_replace_recursive($merged, $entry);
                }
            }
            $meta = $merged;
        }

        return new self(
            (int) $row['order_id'],
            (int) $row['user_id'],
            isset($row['payment_id']) ? (int) $row['payment_id'] : null,
            (string) ($row['status'] ?? 'pending'),
            (string) ($row['order_type'] ?? 'individual'),
            (float) ($row['base_price'] ?? 0),
            (float) ($row['shipping_fee'] ?? 0),
            isset($row['tracking_number']) ? (string) $row['tracking_number'] : null,
            $meta,
            isset($row['created_at']) ? new \DateTimeImmutable((string) $row['created_at']) : null,
        );
    }
}
