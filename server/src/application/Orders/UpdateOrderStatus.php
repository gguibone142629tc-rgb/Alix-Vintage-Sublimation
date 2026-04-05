<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class UpdateOrderStatus
{
    private const ALLOWED = ['pending', 'paid', 'proofing', 'processing', 'awaiting_final_payment', 'ready_to_ship', 'shipped', 'completed', 'cancelled'];

    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $orderId, string $status): array
    {
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 400, 'error' => 'Invalid order id'];
        }

        $status = strtolower(trim($status));
        if (!in_array($status, self::ALLOWED, true)) {
            return ['ok' => false, 'status' => 400, 'error' => 'Invalid status'];
        }

        $current = $this->orders->getOrderStatus($orderId);
        if ($current === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        $currentLower = strtolower((string) $current);

        // Enforce staged final payment when only a downpayment was verified.
        $meta = $this->orders->getOrderMeta($orderId);
        $paymentMeta = is_array($meta) && isset($meta['payment']) && is_array($meta['payment']) ? $meta['payment'] : [];
        $verifiedType = isset($paymentMeta['verified_type']) && is_string($paymentMeta['verified_type']) ? strtolower(trim($paymentMeta['verified_type'])) : null;
        $finalVerified = ($paymentMeta['final_verified'] ?? false) === true;

        if ($status === 'awaiting_final_payment') {
            if ($currentLower !== 'processing') {
                return ['ok' => false, 'status' => 409, 'error' => 'Order must be In Progress to request final payment'];
            }
            if ($verifiedType !== 'downpayment') {
                return ['ok' => false, 'status' => 409, 'error' => 'Final payment stage is only for downpayment orders'];
            }
            if ($finalVerified) {
                return ['ok' => false, 'status' => 409, 'error' => 'Final payment is already verified'];
            }
        }

        if ($status === 'ready_to_ship') {
            $needsFinal = $verifiedType === 'downpayment' && !$finalVerified;
            if ($needsFinal && ($currentLower === 'processing' || $currentLower === 'awaiting_final_payment')) {
                return ['ok' => false, 'status' => 409, 'error' => 'Final payment must be verified before Ready to Ship'];
            }
        }

        $ok = $this->orders->updateOrderStatus($orderId, $status);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
        }

        return ['ok' => true];
    }
}
