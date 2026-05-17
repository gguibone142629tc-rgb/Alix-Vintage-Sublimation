<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class RejectOrderReceipt
{
    private const ALLOWED_STAGE = ['initial', 'final'];

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

        $stageRaw = $input['receipt_stage'] ?? $input['stage'] ?? null;
        $stage = is_string($stageRaw) ? strtolower(trim($stageRaw)) : '';
        if ($stage === '') {
            // Infer from workflow status when not explicitly provided.
            $status = $this->orders->getOrderStatus($orderId);
            if ($status === null) {
                return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
            }
            $stage = strtolower($status) === 'awaiting_final_payment' ? 'final' : 'initial';
        }

        if (!in_array($stage, self::ALLOWED_STAGE, true)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid receipt_stage'];
        }

        $reasonRaw = $input['reason'] ?? $input['message'] ?? null;
        $reason = is_string($reasonRaw) ? trim($reasonRaw) : '';
        if (mb_strlen($reason) > 500) {
            return ['ok' => false, 'status' => 422, 'error' => 'Reason too long'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $meta = $this->orders->getOrderMeta($orderId);
        $paymentMeta = is_array($meta) && isset($meta['payment']) && is_array($meta['payment']) ? $meta['payment'] : [];

        $methodRaw = isset($paymentMeta['method']) && is_string($paymentMeta['method'])
            ? strtoupper(trim($paymentMeta['method']))
            : '';

        $statusLower = strtolower($status);
        if ($stage === 'initial') {
            if ($statusLower !== 'paid') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting payment'];
            }

            $receipt = isset($paymentMeta['receipt_data_url']) && is_string($paymentMeta['receipt_data_url'])
                ? trim($paymentMeta['receipt_data_url'])
                : '';
            if ($receipt === '') {
                return ['ok' => false, 'status' => 409, 'error' => 'No receipt uploaded yet'];
            }
        } else {
            if ($statusLower !== 'awaiting_final_payment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting final payment'];
            }

            if ($methodRaw === 'COD') {
                return ['ok' => false, 'status' => 409, 'error' => 'COD orders do not require a final receipt'];
            }

            $verifiedType = isset($paymentMeta['verified_type']) && is_string($paymentMeta['verified_type'])
                ? strtolower(trim($paymentMeta['verified_type']))
                : null;
            if ($verifiedType !== 'downpayment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Final receipt rejection is only available after downpayment verification'];
            }

            $receipt = isset($paymentMeta['final_receipt_data_url']) && is_string($paymentMeta['final_receipt_data_url'])
                ? trim($paymentMeta['final_receipt_data_url'])
                : '';
            if ($receipt === '') {
                return ['ok' => false, 'status' => 409, 'error' => 'No final payment receipt uploaded yet'];
            }
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $paymentPatch = [];
        if ($stage === 'initial') {
            $paymentPatch = [
                'verified' => false,
                'verified_type' => null,
                'verified_at' => null,
                'receipt_status' => 'rejected',
                'receipt_rejected_at' => $now,
                'receipt_rejection_reason' => $reason !== '' ? $reason : null,
            ];
        } else {
            $paymentPatch = [
                'final_verified' => false,
                'final_verified_at' => null,
                'final_receipt_status' => 'rejected',
                'final_receipt_rejected_at' => $now,
                'final_receipt_rejection_reason' => $reason !== '' ? $reason : null,
            ];
        }

        $ok = $this->orders->mergeOrderPaymentMeta($orderId, $paymentPatch);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update receipt status'];
        }

        // Add a comment so the customer sees what to do next.
        $existingMeta = is_array($meta) ? $meta : [];
        $comments = isset($existingMeta['comments']) && is_array($existingMeta['comments']) ? $existingMeta['comments'] : [];

        $defaultMsg = $stage === 'final'
            ? 'Final payment receipt was not verifiable. Please upload a new receipt screenshot.'
            : 'Payment receipt was not verifiable. Please upload a new receipt screenshot.';

        $commentMsg = $reason !== '' ? ($defaultMsg . ' Reason: ' . $reason) : $defaultMsg;

        $comments[] = [
            'author' => 'Admin',
            'message' => $commentMsg,
            'at' => $now,
            'kind' => 'payment',
        ];

        $this->orders->patchOrderMeta($orderId, ['comments' => $comments]);

        return ['ok' => true];
    }
}
