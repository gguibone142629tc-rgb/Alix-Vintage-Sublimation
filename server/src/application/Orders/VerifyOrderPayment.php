<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class VerifyOrderPayment
{
    private const ALLOWED = ['downpayment', 'final'];

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

        $statusLower = strtolower($status);
        if ($type === 'final') {
            if ($statusLower !== 'awaiting_final_payment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting final payment'];
            }
        } else {
            if ($statusLower !== 'paid') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting payment'];
            }
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $paymentPatch = [];

        if ($type === 'final') {
            $meta = $this->orders->getOrderMeta($orderId);
            $paymentMeta = is_array($meta) && isset($meta['payment']) && is_array($meta['payment']) ? $meta['payment'] : [];

            $methodRaw = isset($paymentMeta['method']) && is_string($paymentMeta['method'])
                ? strtoupper(trim($paymentMeta['method']))
                : '';
            if ($methodRaw === 'COD') {
                return ['ok' => false, 'status' => 409, 'error' => 'COD orders do not require a final receipt verification'];
            }

            $verifiedType = isset($paymentMeta['verified_type']) && is_string($paymentMeta['verified_type'])
                ? strtolower(trim($paymentMeta['verified_type']))
                : null;

            if ($verifiedType !== 'downpayment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Final payment is only available after downpayment verification'];
            }

            $finalReceipt = isset($paymentMeta['final_receipt_data_url']) && is_string($paymentMeta['final_receipt_data_url'])
                ? trim($paymentMeta['final_receipt_data_url'])
                : '';
            if ($finalReceipt === '') {
                return ['ok' => false, 'status' => 409, 'error' => 'No final payment receipt uploaded yet'];
            }

            $paymentPatch = [
                'final_verified' => true,
                'final_verified_at' => $now,
                'final_receipt_status' => 'verified',
            ];
        } else {
            $paymentPatch = [
                'verified' => true,
                'verified_type' => $type,
                'verified_at' => $now,
                'receipt_status' => 'verified',
            ];
        }

        $orderTotal = $this->orders->getOrderComputedTotal($orderId);
        if ($orderTotal === null) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to compute order total'];
        }

        $amountPaid = ($type === 'final')
            ? $orderTotal
            : round($orderTotal * 0.5, 2);

        $paymentType = ($type === 'final') ? 'full' : 'partial';
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

        // After verification, move forward.
        if ($type === 'final') {
            $moved = $this->orders->updateOrderStatus($orderId, 'ready_to_ship');
            if (!$moved) {
                return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
            }
        } else {
            // Production starts after proof approval.
            $moved = $this->orders->updateOrderStatus($orderId, 'proofing');
            if (!$moved) {
                return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
            }
        }

        return ['ok' => true];
    }
}
