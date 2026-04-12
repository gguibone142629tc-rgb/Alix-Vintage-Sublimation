<?php

declare(strict_types=1);

namespace App\Domain\Orders;

interface OrderRepository
{
    /**
     * @param array<int, array{product_id:int, quantity:int, total_amount:float, meta:array<string,mixed>}> $items
     * @param array<string,mixed> $meta
     */
    public function createOrder(int $userId, string $orderType, float $basePrice, float $shippingFee, array $items, array $meta): int;

    /** @return array<int, array{order: Order, items: OrderItem[]}> */
    public function listOrdersForUser(int $userId, int $limit, int $offset): array;

    /** @return array<int, array{order: Order, items: OrderItem[]}> */
    public function listAllOrders(int $limit, int $offset): array;

    public function updateOrderStatus(int $orderId, string $status): bool;

    public function updateOrderPricing(int $orderId, float $basePrice, float $shippingFee): bool;

    public function markOrderShipped(int $orderId, string $trackingNumber): bool;

    public function getOrderStatus(int $orderId): ?string;

    /** @return array<string,mixed>|null */
    public function getOrderMeta(int $orderId): ?array;

    /** @param array<string,mixed> $metaPatch */
    public function patchOrderMeta(int $orderId, array $metaPatch): bool;

    /** @param array<string,mixed> $paymentPatch */
    public function mergeOrderPaymentMeta(int $orderId, array $paymentPatch): bool;

    public function getOrderComputedTotal(int $orderId): ?float;

    public function upsertOrderPaymentRecord(
        int $orderId,
        float $amountPaid,
        string $paymentType,
        string $paymentMethod,
        ?string $receiptPath,
        bool $isVerified,
    ): ?int;

    /** @return array<int,array<string,mixed>> */
    public function listPaymentTransactions(int $limit, int $offset): array;

    /** @param array<string,mixed> $proofPatch */
    public function mergeOrderProofMeta(int $orderId, array $proofPatch): bool;

    public function getOrderStatusForUser(int $orderId, int $userId): ?string;

    /** @return array<string,mixed>|null */
    public function getOrderMetaForUser(int $orderId, int $userId): ?array;

    /** @param array<string,mixed> $metaPatch */
    public function patchOrderMetaForUser(int $orderId, int $userId, array $metaPatch): bool;

    /** @param array<string,mixed> $proofPatch */
    public function mergeOrderProofMetaForUser(int $orderId, int $userId, array $proofPatch): bool;

    public function appendOrderCommentForUser(
        int $orderId,
        int $userId,
        string $author,
        string $message,
        string $at,
        string $kind,
    ): bool;

    public function getLatestDesignProofForOrder(int $orderId): ?array;

    /** @return array<int, array<string,mixed>> */
    public function getDesignProofHistoryForOrder(int $orderId): array;

    /** @param array<int,int> $orderItemIds */
    public function getLatestDesignProofsForOrderItems(array $orderItemIds): array;

    public function createDesignProof(int $orderId, string $filePath, ?int $orderItemId = null): ?array;

    public function updateLatestDesignProofStatusForOrderForUser(
        int $orderId,
        int $userId,
        string $proofStatus,
        ?string $revisionNote,
        ?int $orderItemId = null,
    ): bool;

    public function areAllLatestDesignProofsApprovedForOrderForUser(int $orderId, int $userId): bool;
}
