<?php

declare(strict_types=1);

namespace App\Infrastructure\Cart;

use App\Domain\Cart\CartItem;
use App\Domain\Cart\CartRepository;

/**
 * Implements CartRepository using Orders + Order Items.
 *
 * A user's "cart" is represented as a single draft order (orders.status = 'draft').
 * Cart items are stored as rows in order_items for that draft order.
 */
final class PdoDraftOrderCartRepository implements CartRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function getOrCreateCartId(int $userId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT order_id FROM orders WHERE user_id = :user_id AND status = :status::order_status ORDER BY created_at DESC, order_id DESC LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId, 'status' => 'draft']);
        $row = $stmt->fetch();
        if (is_array($row) && isset($row['order_id'])) {
            return (int) $row['order_id'];
        }

        $insert = $this->pdo->prepare(
            'INSERT INTO orders (user_id, status, order_type, base_price, shipping_fee, meta) '
            . 'VALUES (:user_id, :status::order_status, :order_type::order_type, 0, 0, :meta::jsonb) '
            . 'RETURNING order_id'
        );

        $insert->execute([
            'user_id' => $userId,
            'status' => 'draft',
            'order_type' => 'mixed',
            'meta' => '{}',
        ]);

        $created = $insert->fetch();
        if (!is_array($created) || !isset($created['order_id'])) {
            throw new \RuntimeException('Failed to create draft order cart');
        }

        return (int) $created['order_id'];
    }

    public function listItems(int $cartId): array
    {
        $stmt = $this->pdo->prepare('SELECT order_item_id, product_id, quantity, meta FROM order_items WHERE order_id = :order_id ORDER BY order_item_id ASC');
        $stmt->execute(['order_id' => $cartId]);
        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !isset($row['order_item_id'])) {
                continue;
            }

            $metaRaw = $row['meta'] ?? [];
            $meta = [];
            if (is_array($metaRaw)) {
                $meta = $metaRaw;
            } elseif (is_string($metaRaw)) {
                $decoded = json_decode($metaRaw, true);
                $meta = is_array($decoded) ? $decoded : [];
            }

            $out[] = new CartItem(
                (int) $row['order_item_id'],
                $cartId,
                (int) $row['product_id'],
                (int) $row['quantity'],
                $meta,
                null,
                null,
            );
        }

        return $out;
    }

    public function addItem(int $cartId, int $productId, int $quantity, array $meta): CartItem
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO order_items (order_id, product_id, quantity, total_amount, meta) '
            . 'VALUES (:order_id, :product_id, :quantity, 0, :meta::jsonb) '
            . 'RETURNING order_item_id'
        );

        $stmt->execute([
            'order_id' => $cartId,
            'product_id' => $productId,
            'quantity' => $quantity,
            'meta' => json_encode($meta, JSON_UNESCAPED_SLASHES),
        ]);

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['order_item_id'])) {
            throw new \RuntimeException('Failed to add draft order item');
        }

        return new CartItem(
            (int) $row['order_item_id'],
            $cartId,
            $productId,
            $quantity,
            $meta,
            null,
            null,
        );
    }

    public function updateItemQuantity(int $cartId, int $cartItemId, int $quantity): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE order_items SET quantity = :quantity, updated_at = NOW() '
            . 'WHERE order_id = :order_id AND order_item_id = :id'
        );

        $stmt->execute([
            'quantity' => $quantity,
            'order_id' => $cartId,
            'id' => $cartItemId,
        ]);
    }

    public function removeItem(int $cartId, int $cartItemId): void
    {
        $stmt = $this->pdo->prepare('DELETE FROM order_items WHERE order_id = :order_id AND order_item_id = :id');
        $stmt->execute(['order_id' => $cartId, 'id' => $cartItemId]);
    }

    public function clearCart(int $cartId): void
    {
        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare('DELETE FROM order_items WHERE order_id = :order_id');
            $stmt->execute(['order_id' => $cartId]);

            // Remove the draft order row itself to keep orders clean.
            $orderStmt = $this->pdo->prepare('DELETE FROM orders WHERE order_id = :order_id AND status = :status::order_status');
            $orderStmt->execute(['order_id' => $cartId, 'status' => 'draft']);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }
}
