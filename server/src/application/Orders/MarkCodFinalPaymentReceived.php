<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class MarkCodFinalPaymentReceived
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? $input['orderId'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $statusLower = strtolower((string) $status);
        if ($statusLower !== 'shipped') {
            return ['ok' => false, 'status' => 409, 'error' => 'COD final payment can only be marked received after shipping'];
        }

        $meta = $this->orders->getOrderMeta($orderId);
        $paymentMeta = is_array($meta) && isset($meta['payment']) && is_array($meta['payment']) ? $meta['payment'] : [];

        $methodRaw = isset($paymentMeta['method']) && is_string($paymentMeta['method']) ? strtoupper(trim($paymentMeta['method'])) : '';
        if ($methodRaw !== 'COD') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not a COD order'];
        }

        $verified = ($paymentMeta['verified'] ?? false) === true;
        $verifiedType = isset($paymentMeta['verified_type']) && is_string($paymentMeta['verified_type']) ? strtolower(trim($paymentMeta['verified_type'])) : null;
        if (!$verified || $verifiedType !== 'downpayment') {
            return ['ok' => false, 'status' => 409, 'error' => 'Downpayment must be verified before COD final payment'];
        }

        $finalVerified = ($paymentMeta['final_verified'] ?? false) === true;
        if ($finalVerified) {
            return ['ok' => false, 'status' => 409, 'error' => 'COD final payment is already marked received'];
        }

        $orderTotal = $this->orders->getOrderComputedTotal($orderId);
        if ($orderTotal === null) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to compute order total'];
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $amountPaid = (float) $orderTotal;
        $paymentId = $this->orders->upsertOrderPaymentRecord(
            $orderId,
            $amountPaid,
            'full',
            'cash',
            null,
            true,
        );
        if ($paymentId === null || $paymentId <= 0) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update payment record'];
        }

        $paymentPatch = [
            'payment_id' => $paymentId,
            'amount_paid' => $amountPaid,
            'final_verified' => true,
            'final_verified_at' => $now,
            'final_receipt_status' => 'verified',
            'cod_final_received' => true,
            'cod_final_received_at' => $now,
        ];

        $ok = $this->orders->mergeOrderPaymentMeta($orderId, $paymentPatch);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update payment'];
        }

        return ['ok' => true, 'order_id' => $orderId, 'payment' => $paymentPatch];
    }
}
