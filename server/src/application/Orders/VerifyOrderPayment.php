<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class VerifyOrderPayment
{
    private const ALLOWED = ['downpayment', 'full'];

    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $typeRaw = $input['verify_type'] ?? null;
        $type = is_string($typeRaw) ? strtolower(trim($typeRaw)) : '';
        if (!in_array($type, self::ALLOWED, true)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid verify_type'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        if (strtolower($status) !== 'paid') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting payment'];
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $paymentPatch = [
            'verified' => true,
            'verified_type' => $type,
            'verified_at' => $now,
            'receipt_status' => 'verified',
        ];

        $orderTotal = $this->orders->getOrderComputedTotal($orderId);
        if ($orderTotal === null) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to compute order total'];
        }

        $amountPaid = $type === 'full'
            ? $orderTotal
            : round($orderTotal * 0.5, 2);

        $paymentType = $type === 'full' ? 'full' : 'partial';
        $paymentId = $this->orders->upsertOrderPaymentRecord(
            $orderId,
            $amountPaid,
            $paymentType,
            'gcash',
            null,
            true,
        );
        if ($paymentId === null || $paymentId <= 0) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update payment record'];
        }
        $paymentPatch['payment_id'] = $paymentId;
        $paymentPatch['amount_paid'] = $amountPaid;

        $ok = $this->orders->mergeOrderPaymentMeta($orderId, $paymentPatch);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update payment'];
        }

        // After verification, move forward to proofing (production starts after proof approval).
        $moved = $this->orders->updateOrderStatus($orderId, 'proofing');
        if (!$moved) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
        }

        return ['ok' => true];
    }
}
