<?php

declare(strict_types=1);

namespace App\Domain\Cart;

final class CartItem
{
    /** @param array<string,mixed> $meta */
    public function __construct(
        public readonly int $id,
        public readonly int $cartId,
        public readonly int $productId,
        public readonly int $quantity,
        public readonly array $meta,
        public readonly ?\DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $updatedAt,
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
            (int) $row['cart_item_id'],
            (int) $row['cart_id'],
            (int) $row['product_id'],
            (int) $row['quantity'],
            $meta,
            isset($row['created_at']) ? new \DateTimeImmutable((string) $row['created_at']) : null,
            isset($row['updated_at']) ? new \DateTimeImmutable((string) $row['updated_at']) : null,
        );
    }
}
