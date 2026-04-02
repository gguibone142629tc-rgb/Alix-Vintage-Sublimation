<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class UploadOrderReceipt
{
    private const MAX_BYTES = 2_000_000; // 2MB

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
            return ['ok' => false, 'status' => 413, 'error' => 'Receipt image is too large (max 2MB)'];
        }

        $status = $this->orders->getOrderStatusForUser($orderId, $userId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        if (strtolower($status) !== 'paid') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not awaiting payment'];
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $payment = [
            'receipt_data_url' => $dataUrl,
            'receipt_mime' => $mime,
            'receipt_size' => $size,
            'receipt_uploaded_at' => $now,
            'receipt_status' => 'submitted',
        ];

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

        $ok = $this->orders->patchOrderMetaForUser($orderId, $userId, ['payment' => $payment]);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to save receipt'];
        }

        return ['ok' => true, 'order_id' => $orderId, 'payment' => $payment];
    }
}
