<?php

declare(strict_types=1);

namespace App\Infrastructure\Orders;

use App\Domain\Orders\Order;
use App\Domain\Orders\OrderItem;
use App\Domain\Orders\OrderRepository;

final class PdoOrderRepository implements OrderRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function createOrder(int $userId, string $orderType, float $basePrice, float $shippingFee, array $items, array $meta): int
    {
        $this->pdo->beginTransaction();

        try {
            $orderStmt = $this->pdo->prepare(
                'INSERT INTO orders (user_id, status, order_type, base_price, shipping_fee, meta) '
                . 'VALUES (:user_id, :status::order_status, :order_type::order_type, :base_price, :shipping_fee, :meta::jsonb) '
                . 'RETURNING order_id'
            );

            $orderStmt->execute([
                'user_id' => $userId,
                'status' => 'pending',
                'order_type' => $orderType,
                'base_price' => $basePrice,
                'shipping_fee' => $shippingFee,
                'meta' => (function (array $meta): string {
                    $json = json_encode($meta, JSON_UNESCAPED_SLASHES);
                    if ($json === false || $json === '[]') {
                        return '{}';
                    }
                    return $json;
                })($meta),
            ]);

            $orderRow = $orderStmt->fetch();
            if (!is_array($orderRow) || !isset($orderRow['order_id'])) {
                throw new \RuntimeException('Failed to create order');
            }
            $orderId = (int) $orderRow['order_id'];

            $itemStmt = $this->pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, total_amount, meta) '
                . 'VALUES (:order_id, :product_id, :quantity, :total_amount, :meta::jsonb) '
                . 'RETURNING order_item_id'
            );

            $rosterStmt = $this->pdo->prepare(
                'INSERT INTO roster_details (order_item_id, team_name, player_name, jersey_number, size, logo) '
                . 'VALUES (:order_item_id, :team_name, :player_name, :jersey_number, :size::size_enum, :logo)'
            );

            foreach ($items as $item) {
                $itemMeta = $item['meta'] ?? [];
                if (!is_array($itemMeta)) {
                    $itemMeta = [];
                }

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'quantity' => (int) $item['quantity'],
                    'total_amount' => (float) $item['total_amount'],
                    'meta' => json_encode($itemMeta, JSON_UNESCAPED_SLASHES),
                ]);

                $itemRow = $itemStmt->fetch();
                if (!is_array($itemRow) || !isset($itemRow['order_item_id'])) {
                    throw new \RuntimeException('Failed to create order item');
                }

                $orderItemId = (int) $itemRow['order_item_id'];

                // Optional roster payload (for group orders or personalized items)
                $roster = $itemMeta['roster'] ?? null;
                if (is_array($roster)) {
                    foreach ($roster as $player) {
                        if (!is_array($player)) {
                            continue;
                        }

                        $size = isset($player['size']) ? (string) $player['size'] : '';
                        $size = strtoupper(trim($size));
                        $size = $size === '' ? null : $size;

                        $rosterStmt->execute([
                            'order_item_id' => $orderItemId,
                            'team_name' => isset($itemMeta['groupName']) ? (string) $itemMeta['groupName'] : null,
                            'player_name' => isset($player['name']) ? (string) $player['name'] : null,
                            'jersey_number' => isset($player['number']) ? (string) $player['number'] : null,
                            'size' => $size,
                            'logo' => isset($player['logo']) ? (string) $player['logo'] : null,
                        ]);
                    }
                } else {
                    // Individual personalization
                    $playerName = $itemMeta['playerName'] ?? $itemMeta['customerName'] ?? null;
                    $jerseyNumber = $itemMeta['jerseyNumber'] ?? $itemMeta['customerNumber'] ?? null;
                    $size = $itemMeta['size'] ?? null;
                    if ($playerName || $jerseyNumber || $size) {
                        $sizeValue = is_string($size) ? strtoupper(trim($size)) : '';
                        $sizeValue = $sizeValue === '' ? null : $sizeValue;

                        $rosterStmt->execute([
                            'order_item_id' => $orderItemId,
                            'team_name' => isset($itemMeta['groupName']) ? (string) $itemMeta['groupName'] : null,
                            'player_name' => is_string($playerName) ? $playerName : null,
                            'jersey_number' => is_string($jerseyNumber) ? $jerseyNumber : null,
                            'size' => $sizeValue,
                            'logo' => null,
                        ]);
                    }
                }
            }

            $this->pdo->commit();
            return $orderId;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function listOrdersForUser(int $userId, int $limit, int $offset): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $stmt = $this->pdo->prepare(
            'SELECT * FROM orders WHERE user_id = :user_id AND status <> :draft::order_status ORDER BY created_at DESC, order_id DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $orders = $stmt->fetchAll();
        if (!is_array($orders) || count($orders) === 0) {
            return [];
        }

        $orderIds = [];
        $orderById = [];
        foreach ($orders as $row) {
            if (!is_array($row) || !isset($row['order_id'])) {
                continue;
            }
            $order = Order::fromRow($row);
            $orderIds[] = $order->id;
            $orderById[$order->id] = $order;
        }

        if (count($orderIds) === 0) {
            return [];
        }

        $in = implode(',', array_map('intval', $orderIds));
        $itemsStmt = $this->pdo->query('SELECT * FROM order_items WHERE order_id IN (' . $in . ') ORDER BY order_item_id ASC');
        $itemRows = $itemsStmt->fetchAll();

        $itemsByOrder = [];
        if (is_array($itemRows)) {
            foreach ($itemRows as $row) {
                if (!is_array($row) || !isset($row['order_id'])) {
                    continue;
                }
                $item = OrderItem::fromRow($row);
                $itemsByOrder[$item->orderId] ??= [];
                $itemsByOrder[$item->orderId][] = $item;
            }
        }

        $out = [];
        foreach ($orderIds as $id) {
            $order = $orderById[$id] ?? null;
            if ($order === null) {
                continue;
            }
            $out[] = [
                'order' => $order,
                'items' => $itemsByOrder[$id] ?? [],
            ];
        }

        return $out;
    }

    public function listAllOrders(int $limit, int $offset): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $stmt = $this->pdo->prepare(
            'SELECT * FROM orders WHERE status <> :draft::order_status ORDER BY created_at DESC, order_id DESC LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $orders = $stmt->fetchAll();
        if (!is_array($orders) || count($orders) === 0) {
            return [];
        }

        $orderIds = [];
        $orderById = [];
        foreach ($orders as $row) {
            if (!is_array($row) || !isset($row['order_id'])) {
                continue;
            }
            $order = Order::fromRow($row);
            $orderIds[] = $order->id;
            $orderById[$order->id] = $order;
        }

        if (count($orderIds) === 0) {
            return [];
        }

        $in = implode(',', array_map('intval', $orderIds));
        $itemsStmt = $this->pdo->query('SELECT * FROM order_items WHERE order_id IN (' . $in . ') ORDER BY order_item_id ASC');
        $itemRows = $itemsStmt->fetchAll();

        $itemsByOrder = [];
        if (is_array($itemRows)) {
            foreach ($itemRows as $row) {
                if (!is_array($row) || !isset($row['order_id'])) {
                    continue;
                }
                $item = OrderItem::fromRow($row);
                $itemsByOrder[$item->orderId] ??= [];
                $itemsByOrder[$item->orderId][] = $item;
            }
        }

        $out = [];
        foreach ($orderIds as $id) {
            $order = $orderById[$id] ?? null;
            if ($order === null) {
                continue;
            }
            $out[] = [
                'order' => $order,
                'items' => $itemsByOrder[$id] ?? [],
            ];
        }

        return $out;
    }

    public function updateOrderStatus(int $orderId, string $status): bool
    {
        try {
            $stmt = $this->pdo->prepare(
                'UPDATE orders SET status = :status::order_status WHERE order_id = :order_id AND status <> :draft::order_status'
            );
            $stmt->bindValue('status', $status, \PDO::PARAM_STR);
            $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
            $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
            $stmt->execute();
            return $stmt->rowCount() > 0;
        } catch (\PDOException) {
            // Common cause: enum value missing in DB (e.g. proofing/ready_to_ship not migrated yet).
            return false;
        }
    }

    public function markOrderShipped(int $orderId, string $trackingNumber): bool
    {
        $trackingNumber = trim($trackingNumber);

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET tracking_number = :tracking_number, status = :status::order_status '
            . 'WHERE order_id = :order_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('tracking_number', $trackingNumber, \PDO::PARAM_STR);
        $stmt->bindValue('status', 'shipped', \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function getOrderStatus(int $orderId): ?string
    {
        $stmt = $this->pdo->prepare('SELECT status FROM orders WHERE order_id = :order_id AND status <> :draft::order_status');
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['status'])) {
            return null;
        }
        return is_string($row['status']) ? $row['status'] : null;
    }

    public function getOrderMeta(int $orderId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT meta FROM orders WHERE order_id = :order_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!is_array($row) || !array_key_exists('meta', $row)) {
            return null;
        }

        $meta = $row['meta'];
        if (is_string($meta)) {
            $decoded = json_decode($meta, true);
            return is_array($decoded) ? $decoded : null;
        }

        return is_array($meta) ? $meta : null;
    }

    public function patchOrderMeta(int $orderId, array $metaPatch): bool
    {
        $metaJson = json_encode($metaPatch, JSON_UNESCAPED_SLASHES);
        if ($metaJson === false) {
            $metaJson = '{}';
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END) || :meta_patch::jsonb '
            . 'WHERE order_id = :order_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('meta_patch', $metaJson, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function mergeOrderPaymentMeta(int $orderId, array $paymentPatch): bool
    {
        $paymentJson = json_encode($paymentPatch, JSON_UNESCAPED_SLASHES);
        if ($paymentJson === false) {
            $paymentJson = '{}';
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = jsonb_set('
            . '  (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END),'
            . '  \'{payment}\','
            . '  COALESCE((CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END)->\'payment\', \'{}\'::jsonb) || :payment_patch::jsonb,'
            . '  true'
            . ') '
            . 'WHERE order_id = :order_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('payment_patch', $paymentJson, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function getOrderComputedTotal(int $orderId): ?float
    {
        $stmt = $this->pdo->prepare(
            'SELECT o.base_price, o.shipping_fee, COALESCE(SUM(oi.total_amount), 0) AS items_total '
            . 'FROM orders o '
            . 'LEFT JOIN order_items oi ON oi.order_id = o.order_id '
            . 'WHERE o.order_id = :order_id AND o.status <> :draft::order_status '
            . 'GROUP BY o.base_price, o.shipping_fee'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!is_array($row)) {
            return null;
        }

        $basePrice = (float) ($row['base_price'] ?? 0);
        $shippingFee = (float) ($row['shipping_fee'] ?? 0);
        $itemsTotal = (float) ($row['items_total'] ?? 0);

        // Prefer explicit item totals when present, fallback to base price.
        $subtotal = $itemsTotal > 0 ? $itemsTotal : $basePrice;
        $total = $subtotal + $shippingFee;
        return $total >= 0 ? $total : 0.0;
    }

    public function upsertOrderPaymentRecord(
        int $orderId,
        float $amountPaid,
        string $paymentType,
        string $paymentMethod,
        ?string $receiptPath,
        bool $isVerified,
    ): ?int {
        $this->pdo->beginTransaction();

        try {
            $select = $this->pdo->prepare(
                'SELECT payment_id FROM orders WHERE order_id = :order_id AND status <> :draft::order_status FOR UPDATE'
            );
            $select->bindValue('order_id', $orderId, \PDO::PARAM_INT);
            $select->bindValue('draft', 'draft', \PDO::PARAM_STR);
            $select->execute();

            $orderRow = $select->fetch();
            if (!is_array($orderRow)) {
                $this->pdo->rollBack();
                return null;
            }

            $existingPaymentId = isset($orderRow['payment_id']) ? (int) $orderRow['payment_id'] : null;

            if ($existingPaymentId !== null && $existingPaymentId > 0) {
                $upd = $this->pdo->prepare(
                    'UPDATE payments '
                    . 'SET amount_paid = :amount_paid, '
                    . '    payment_type = :payment_type::payment_type, '
                    . '    payment_method = :payment_method::payment_method, '
                    . '    receipt_path = :receipt_path, '
                    . '    is_verified = :is_verified '
                    . 'WHERE payment_id = :payment_id'
                );
                $upd->bindValue('amount_paid', $amountPaid);
                $upd->bindValue('payment_type', $paymentType, \PDO::PARAM_STR);
                $upd->bindValue('payment_method', $paymentMethod, \PDO::PARAM_STR);
                $upd->bindValue('receipt_path', $receiptPath, $receiptPath === null ? \PDO::PARAM_NULL : \PDO::PARAM_STR);
                $upd->bindValue('is_verified', $isVerified, \PDO::PARAM_BOOL);
                $upd->bindValue('payment_id', $existingPaymentId, \PDO::PARAM_INT);
                $upd->execute();

                $this->pdo->commit();
                return $existingPaymentId;
            }

            $ins = $this->pdo->prepare(
                'INSERT INTO payments (amount_paid, payment_type, payment_method, receipt_path, is_verified) '
                . 'VALUES (:amount_paid, :payment_type::payment_type, :payment_method::payment_method, :receipt_path, :is_verified) '
                . 'RETURNING payment_id'
            );
            $ins->bindValue('amount_paid', $amountPaid);
            $ins->bindValue('payment_type', $paymentType, \PDO::PARAM_STR);
            $ins->bindValue('payment_method', $paymentMethod, \PDO::PARAM_STR);
            $ins->bindValue('receipt_path', $receiptPath, $receiptPath === null ? \PDO::PARAM_NULL : \PDO::PARAM_STR);
            $ins->bindValue('is_verified', $isVerified, \PDO::PARAM_BOOL);
            $ins->execute();

            $insRow = $ins->fetch();
            $paymentId = is_array($insRow) && isset($insRow['payment_id']) ? (int) $insRow['payment_id'] : null;
            if ($paymentId === null || $paymentId <= 0) {
                $this->pdo->rollBack();
                return null;
            }

            $link = $this->pdo->prepare('UPDATE orders SET payment_id = :payment_id WHERE order_id = :order_id');
            $link->bindValue('payment_id', $paymentId, \PDO::PARAM_INT);
            $link->bindValue('order_id', $orderId, \PDO::PARAM_INT);
            $link->execute();

            $this->pdo->commit();
            return $paymentId;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function listPaymentTransactions(int $limit, int $offset): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $stmt = $this->pdo->prepare(
            'SELECT '
            . 'p.payment_id, p.amount_paid, p.payment_type, p.payment_method, p.receipt_path, p.is_verified, '
            . 'o.order_id, o.created_at AS order_created_at, '
            . 'u.user_id, u.firstname, u.lastname, u.email '
            . 'FROM payments p '
            . 'LEFT JOIN orders o ON o.payment_id = p.payment_id '
            . 'LEFT JOIN users u ON u.user_id = o.user_id '
            . 'ORDER BY p.payment_id DESC '
            . 'LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !isset($row['payment_id'])) {
                continue;
            }

            $firstname = isset($row['firstname']) ? trim((string) $row['firstname']) : '';
            $lastname = isset($row['lastname']) ? trim((string) $row['lastname']) : '';
            $fullName = trim($firstname . ' ' . $lastname);

            $out[] = [
                'payment_id' => (int) $row['payment_id'],
                'amount_paid' => (float) ($row['amount_paid'] ?? 0),
                'payment_type' => (string) ($row['payment_type'] ?? ''),
                'payment_method' => (string) ($row['payment_method'] ?? ''),
                'receipt_path' => $row['receipt_path'] !== null ? (string) $row['receipt_path'] : null,
                'is_verified' => (bool) ($row['is_verified'] ?? false),
                'order_id' => isset($row['order_id']) ? (int) $row['order_id'] : null,
                'order_created_at' => $row['order_created_at'] !== null ? (string) $row['order_created_at'] : null,
                'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
                'customer_name' => $fullName !== '' ? $fullName : null,
                'customer_email' => $row['email'] !== null ? (string) $row['email'] : null,
            ];
        }

        return $out;
    }

    public function mergeOrderProofMeta(int $orderId, array $proofPatch): bool
    {
        $proofJson = json_encode($proofPatch, JSON_UNESCAPED_SLASHES);
        if ($proofJson === false) {
            $proofJson = '{}';
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = jsonb_set('
            . '  (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END),'
            . '  \'{proof}\','
            . '  COALESCE((CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END)->\'proof\', \'{}\'::jsonb) || :proof_patch::jsonb,'
            . '  true'
            . ') '
            . 'WHERE order_id = :order_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('proof_patch', $proofJson, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function getOrderStatusForUser(int $orderId, int $userId): ?string
    {
        $stmt = $this->pdo->prepare(
            'SELECT status FROM orders WHERE order_id = :order_id AND user_id = :user_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['status'])) {
            return null;
        }

        return is_string($row['status']) ? $row['status'] : null;
    }

    public function getOrderMetaForUser(int $orderId, int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT meta FROM orders WHERE order_id = :order_id AND user_id = :user_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch();
        if (!is_array($row) || !array_key_exists('meta', $row)) {
            return null;
        }

        $meta = $row['meta'];
        if (is_string($meta)) {
            $decoded = json_decode($meta, true);
            return is_array($decoded) ? $decoded : null;
        }

        return is_array($meta) ? $meta : null;
    }

    public function patchOrderMetaForUser(int $orderId, int $userId, array $metaPatch): bool
    {
        $metaJson = json_encode($metaPatch, JSON_UNESCAPED_SLASHES);
        if ($metaJson === false) {
            $metaJson = '{}';
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END) || :meta_patch::jsonb '
            . 'WHERE order_id = :order_id AND user_id = :user_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('meta_patch', $metaJson, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function mergeOrderProofMetaForUser(int $orderId, int $userId, array $proofPatch): bool
    {
        $proofJson = json_encode($proofPatch, JSON_UNESCAPED_SLASHES);
        if ($proofJson === false) {
            $proofJson = '{}';
        }

        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = jsonb_set('
            . '  (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END),'
            . '  \'{proof}\','
            . '  COALESCE((CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END)->\'proof\', \'{}\'::jsonb) || :proof_patch::jsonb,'
            . '  true'
            . ') '
            . 'WHERE order_id = :order_id AND user_id = :user_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('proof_patch', $proofJson, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function appendOrderCommentForUser(
        int $orderId,
        int $userId,
        string $author,
        string $message,
        string $at,
        string $kind,
    ): bool {
        $stmt = $this->pdo->prepare(
            'UPDATE orders '
            . 'SET meta = jsonb_set('
            . '  (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END),'
            . '  \'{comments}\','
            . '  (CASE '
            . '     WHEN jsonb_typeof((CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END)->\'comments\') = \'array\''
            . '     THEN (CASE WHEN jsonb_typeof(meta) = \'object\' THEN meta ELSE \'{}\'::jsonb END)->\'comments\''
            . '     ELSE \'[]\'::jsonb '
            . '   END)'
            . '    || jsonb_build_array(jsonb_build_object('
            . '      \'author\', :author::text,'
            . '      \'message\', :message::text,'
            . '      \'at\', :at::text,'
            . '      \'kind\', :kind::text'
            . '    )), '
            . '  true'
            . ') '
            . 'WHERE order_id = :order_id AND user_id = :user_id AND status <> :draft::order_status'
        );
        $stmt->bindValue('author', $author, \PDO::PARAM_STR);
        $stmt->bindValue('message', $message, \PDO::PARAM_STR);
        $stmt->bindValue('at', $at, \PDO::PARAM_STR);
        $stmt->bindValue('kind', $kind, \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function getLatestDesignProofForOrder(int $orderId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT dp.proof_id, dp.order_item_id, dp.version_number, dp.proof_file_path, dp.proof_status, dp.revision_note '
            . 'FROM design_proofs dp '
            . 'JOIN order_items oi ON oi.order_item_id = dp.order_item_id '
            . 'WHERE oi.order_id = :order_id '
            . 'ORDER BY dp.version_number DESC, dp.proof_id DESC '
            . 'LIMIT 1'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->execute();
        $row = $stmt->fetch();
        if (!is_array($row) || !isset($row['proof_id'])) {
            return null;
        }

        return [
            'proof_id' => (int) $row['proof_id'],
            'order_item_id' => (int) $row['order_item_id'],
            'version_number' => (int) $row['version_number'],
            'proof_file_path' => (string) $row['proof_file_path'],
            'proof_status' => (string) $row['proof_status'],
            'revision_note' => $row['revision_note'] !== null ? (string) $row['revision_note'] : null,
        ];
    }

    public function getDesignProofHistoryForOrder(int $orderId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT dp.proof_id, dp.order_item_id, dp.version_number, dp.proof_file_path, dp.proof_status, dp.revision_note '
            . 'FROM design_proofs dp '
            . 'JOIN order_items oi ON oi.order_item_id = dp.order_item_id '
            . 'WHERE oi.order_id = :order_id '
            . 'ORDER BY dp.order_item_id ASC, dp.version_number DESC, dp.proof_id DESC'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        if (!is_array($rows) || count($rows) === 0) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !isset($row['proof_id'])) {
                continue;
            }
            $out[] = [
                'proof_id' => (int) $row['proof_id'],
                'order_item_id' => (int) ($row['order_item_id'] ?? 0),
                'version_number' => (int) ($row['version_number'] ?? 0),
                'proof_file_path' => (string) ($row['proof_file_path'] ?? ''),
                'proof_status' => (string) ($row['proof_status'] ?? ''),
                'revision_note' => array_key_exists('revision_note', $row) && $row['revision_note'] !== null ? (string) $row['revision_note'] : null,
            ];
        }

        return $out;
    }

    public function getLatestDesignProofsForOrderItems(array $orderItemIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $orderItemIds)));
        if (count($ids) === 0) {
            return [];
        }

        $in = implode(',', $ids);
        $sql =
            'SELECT DISTINCT ON (dp.order_item_id) '
            . 'dp.order_item_id, dp.proof_id, dp.version_number, dp.proof_file_path, dp.proof_status, dp.revision_note '
            . 'FROM design_proofs dp '
            . 'WHERE dp.order_item_id IN (' . $in . ') '
            . 'ORDER BY dp.order_item_id, dp.version_number DESC, dp.proof_id DESC';

        $stmt = $this->pdo->query($sql);
        $rows = $stmt->fetchAll();
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row) || !isset($row['order_item_id'])) {
                continue;
            }
            $oid = (int) $row['order_item_id'];
            $out[$oid] = [
                'proof_id' => isset($row['proof_id']) ? (int) $row['proof_id'] : null,
                'order_item_id' => $oid,
                'version_number' => isset($row['version_number']) ? (int) $row['version_number'] : 0,
                'proof_file_path' => isset($row['proof_file_path']) ? (string) $row['proof_file_path'] : '',
                'proof_status' => isset($row['proof_status']) ? (string) $row['proof_status'] : '',
                'revision_note' => array_key_exists('revision_note', $row) && $row['revision_note'] !== null ? (string) $row['revision_note'] : null,
            ];
        }

        return $out;
    }

    public function createDesignProof(int $orderId, string $filePath, ?int $orderItemId = null): ?array
    {
        $this->pdo->beginTransaction();

        try {
            if ($orderItemId !== null && $orderItemId > 0) {
                $itemStmt = $this->pdo->prepare(
                    'SELECT order_item_id FROM order_items WHERE order_id = :order_id AND order_item_id = :order_item_id LIMIT 1'
                );
                $itemStmt->bindValue('order_item_id', $orderItemId, \PDO::PARAM_INT);
            } else {
                $itemStmt = $this->pdo->prepare(
                    'SELECT order_item_id FROM order_items WHERE order_id = :order_id ORDER BY order_item_id ASC LIMIT 1'
                );
            }
            $itemStmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
            $itemStmt->execute();
            $itemRow = $itemStmt->fetch();
            if (!is_array($itemRow) || !isset($itemRow['order_item_id'])) {
                $this->pdo->rollBack();
                return null;
            }
            $orderItemId = (int) $itemRow['order_item_id'];

            $verStmt = $this->pdo->prepare(
                'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM design_proofs WHERE order_item_id = :order_item_id'
            );
            $verStmt->bindValue('order_item_id', $orderItemId, \PDO::PARAM_INT);
            $verStmt->execute();
            $verRow = $verStmt->fetch();
            $nextVersion = is_array($verRow) && isset($verRow['next_version']) ? (int) $verRow['next_version'] : 1;
            if ($nextVersion <= 0) {
                $nextVersion = 1;
            }

            $ins = $this->pdo->prepare(
                'INSERT INTO design_proofs (order_item_id, version_number, proof_file_path, proof_status, revision_note) '
                . 'VALUES (:order_item_id, :version_number, :proof_file_path, :proof_status::proof_status, NULL) '
                . 'RETURNING proof_id'
            );
            $ins->bindValue('order_item_id', $orderItemId, \PDO::PARAM_INT);
            $ins->bindValue('version_number', $nextVersion, \PDO::PARAM_INT);
            $ins->bindValue('proof_file_path', $filePath, \PDO::PARAM_STR);
            $ins->bindValue('proof_status', 'submitted', \PDO::PARAM_STR);
            $ins->execute();

            $insRow = $ins->fetch();
            $proofId = is_array($insRow) && isset($insRow['proof_id']) ? (int) $insRow['proof_id'] : null;
            $this->pdo->commit();

            return [
                'proof_id' => $proofId,
                'order_item_id' => $orderItemId,
                'version_number' => $nextVersion,
                'proof_file_path' => $filePath,
                'proof_status' => 'submitted',
                'revision_note' => null,
            ];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function updateLatestDesignProofStatusForOrderForUser(
        int $orderId,
        int $userId,
        string $proofStatus,
        ?string $revisionNote,
        ?int $orderItemId = null,
    ): bool {
        $whereOrderItem = $orderItemId !== null ? ' AND dp2.order_item_id = :order_item_id ' : '';
        $stmt = $this->pdo->prepare(
            'UPDATE design_proofs dp '
            . 'SET proof_status = :proof_status::proof_status, revision_note = :revision_note '
            . 'WHERE dp.proof_id = ('
            . '  SELECT dp2.proof_id '
            . '  FROM design_proofs dp2 '
            . '  JOIN order_items oi ON oi.order_item_id = dp2.order_item_id '
            . '  JOIN orders o ON o.order_id = oi.order_id '
            . '  WHERE o.order_id = :order_id AND o.user_id = :user_id AND o.status <> :draft::order_status '
            . $whereOrderItem
            . '  ORDER BY dp2.version_number DESC, dp2.proof_id DESC '
            . '  LIMIT 1'
            . ')'
        );
        $stmt->bindValue('proof_status', $proofStatus, \PDO::PARAM_STR);
        $stmt->bindValue('revision_note', $revisionNote, $revisionNote === null ? \PDO::PARAM_NULL : \PDO::PARAM_STR);
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        if ($orderItemId !== null) {
            $stmt->bindValue('order_item_id', $orderItemId, \PDO::PARAM_INT);
        }
        $stmt->execute();

        return $stmt->rowCount() > 0;
    }

    public function areAllLatestDesignProofsApprovedForOrderForUser(int $orderId, int $userId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT oi.order_item_id, latest.proof_status '
            . 'FROM order_items oi '
            . 'JOIN orders o ON o.order_id = oi.order_id '
            . 'LEFT JOIN LATERAL ( '
            . '  SELECT dp.proof_status '
            . '  FROM design_proofs dp '
            . '  WHERE dp.order_item_id = oi.order_item_id '
            . '  ORDER BY dp.version_number DESC, dp.proof_id DESC '
            . '  LIMIT 1 '
            . ') latest ON TRUE '
            . 'WHERE o.order_id = :order_id AND o.user_id = :user_id AND o.status <> :draft::order_status'
        );
        $stmt->bindValue('order_id', $orderId, \PDO::PARAM_INT);
        $stmt->bindValue('user_id', $userId, \PDO::PARAM_INT);
        $stmt->bindValue('draft', 'draft', \PDO::PARAM_STR);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if (!is_array($rows) || count($rows) === 0) {
            return false;
        }

        foreach ($rows as $row) {
            $status = strtolower((string) ($row['proof_status'] ?? ''));
            if ($status !== 'approved') {
                return false;
            }
        }

        return true;
    }
}
