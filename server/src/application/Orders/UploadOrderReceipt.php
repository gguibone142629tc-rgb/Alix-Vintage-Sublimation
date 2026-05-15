<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;
use App\Infrastructure\Storage\AppStorage;

final class UploadOrderReceipt
{
    private const MAX_BYTES = 20_000_000; // 20MB

    public function __construct(private readonly OrderRepository $orders)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(int $userId, array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $dataUrlRaw = $input['receipt_data_url'] ?? null;
        $dataUrl = is_string($dataUrlRaw) ? trim($dataUrlRaw) : '';
        if ($dataUrl === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing receipt_data_url'];
        }

        if (!str_starts_with($dataUrl, 'data:image/')) {
            return ['ok' => false, 'status' => 422, 'error' => 'Receipt must be an image'];
        }

        $commaPos = strpos($dataUrl, ',');
        if ($commaPos === false) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid receipt format'];
        }

        $metaPrefix = substr($dataUrl, 0, $commaPos);
        $base64 = substr($dataUrl, $commaPos + 1);
        if (!str_contains($metaPrefix, ';base64')) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid receipt encoding'];
        }

        $mime = '';
        if (preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64$/', $metaPrefix, $m) === 1) {
            $mime = (string) ($m[1] ?? '');
        }

        $binary = base64_decode($base64, true);
        if ($binary === false) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid receipt image'];
        }

        $size = strlen($binary);
        if ($size <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Empty receipt image'];
        }

        if ($size > self::MAX_BYTES) {
            return ['ok' => false, 'status' => 413, 'error' => 'Receipt image is too large (max 20MB)'];
        }

        $stageRaw = $input['receipt_stage'] ?? null;
        $stage = is_string($stageRaw) ? strtolower(trim($stageRaw)) : 'initial';
        if ($stage === '') {
            $stage = 'initial';
        }
        if (!in_array($stage, ['initial', 'final'], true)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid receipt_stage'];
        }

        $status = $this->orders->getOrderStatusForUser($orderId, $userId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $statusLower = strtolower($status);
        if ($stage === 'initial') {
            if ($statusLower !== 'paid') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting payment'];
            }
        } else {
            if ($statusLower !== 'awaiting_final_payment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting final payment'];
            }

            $meta = $this->orders->getOrderMetaForUser($orderId, $userId);
            $paymentMeta = is_array($meta) && isset($meta['payment']) && is_array($meta['payment']) ? $meta['payment'] : [];
            $verifiedType = isset($paymentMeta['verified_type']) && is_string($paymentMeta['verified_type'])
                ? strtolower(trim($paymentMeta['verified_type']))
                : null;

            if ($verifiedType !== 'downpayment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Final receipt upload is only available for downpayment orders'];
            }
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        // If Supabase Storage is configured, store receipts as objects and save a public URL.
        $storedUrl = null;
        if (AppStorage::enabled()) {
            $ext = match (strtolower($mime)) {
                'image/png' => 'png',
                'image/jpeg', 'image/jpg' => 'jpg',
                'image/webp' => 'webp',
                default => null,
            };

            if ($ext !== null) {
                $prefix = $stage === 'final' ? 'final' : 'initial';
                $name = $prefix . '-receipt-' . bin2hex(random_bytes(8)) . '.' . $ext;
                $objectPath = 'uploads/receipts/order-' . $orderId . '/' . $name;
                try {
                    $storedUrl = AppStorage::uploadPublic($objectPath, $binary, $mime !== '' ? $mime : 'application/octet-stream', false);
                } catch (\Throwable) {
                    // Fall back to inline data URL storage.
                    $storedUrl = null;
                }
            }
        }

        // Store either the public URL (preferred) or the original data URL.
        $storedReceiptValue = is_string($storedUrl) && trim($storedUrl) !== '' ? $storedUrl : $dataUrl;

        $payment = [];
        if ($stage === 'initial') {
            $payment = [
                'receipt_data_url' => $storedReceiptValue,
                'receipt_mime' => $mime,
                'receipt_size' => $size,
                'receipt_uploaded_at' => $now,
                'receipt_status' => 'submitted',
            ];
        } else {
            $payment = [
                'final_receipt_data_url' => $storedReceiptValue,
                'final_receipt_mime' => $mime,
                'final_receipt_size' => $size,
                'final_receipt_uploaded_at' => $now,
                'final_receipt_status' => 'submitted',
            ];
        }

        // Keep payments table in sync with receipt submission.
        $paymentId = $this->orders->upsertOrderPaymentRecord(
            $orderId,
            0.0,
            'partial',
            'gcash',
            null,
            false,
        );
        if ($paymentId === null || $paymentId <= 0) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to save payment record'];
        }
        $payment['payment_id'] = $paymentId;

        // IMPORTANT: patchOrderMetaForUser merges only at the top-level.
        // If we patch {payment: {final_*}} directly, it overwrites the entire payment object
        // and can erase the initial receipt + verified_type fields.
        $existingMeta = $this->orders->getOrderMetaForUser($orderId, $userId);
        $existingPayment = is_array($existingMeta)
            && isset($existingMeta['payment'])
            && is_array($existingMeta['payment'])
            ? $existingMeta['payment']
            : [];

        /** @var array<string,mixed> $mergedPayment */
        $mergedPayment = array_merge($existingPayment, $payment);

        $ok = $this->orders->patchOrderMetaForUser($orderId, $userId, ['payment' => $mergedPayment]);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to save receipt'];
        }

        $metaOut = $this->orders->getOrderMetaForUser($orderId, $userId);
        $paymentOut = is_array($metaOut) && isset($metaOut['payment']) && is_array($metaOut['payment']) ? $metaOut['payment'] : $payment;

        return ['ok' => true, 'order_id' => $orderId, 'payment' => $paymentOut];
    }
}
