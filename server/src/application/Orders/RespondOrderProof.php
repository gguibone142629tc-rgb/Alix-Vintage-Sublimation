<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class RespondOrderProof
{
    private const ALLOWED = ['approve', 'revision'];

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

        $actionRaw = $input['action'] ?? null;
        $action = is_string($actionRaw) ? strtolower(trim($actionRaw)) : '';
        if (!in_array($action, self::ALLOWED, true)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid action'];
        }

        $messageRaw = $input['message'] ?? $input['comment'] ?? null;
        $message = is_string($messageRaw) ? trim($messageRaw) : '';
        if ($action === 'revision' && $message === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing revision message'];
        }
        if ($message !== '' && mb_strlen($message) > 2000) {
            return ['ok' => false, 'status' => 422, 'error' => 'Message too long'];
        }

        $orderItemIdRaw = $input['order_item_id'] ?? $input['orderItemId'] ?? null;
        $orderItemId = $orderItemIdRaw !== null && is_numeric($orderItemIdRaw) ? (int) $orderItemIdRaw : null;
        if ($orderItemId !== null && $orderItemId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid order_item_id'];
        }

        $status = $this->orders->getOrderStatusForUser($orderId, $userId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        if (strtolower($status) !== 'proofing') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not in proofing'];
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $patch = [
            'status' => $action === 'approve' ? 'Approved' : 'Revision Requested',
            'responded_at' => $now,
        ];

        $ok = $this->orders->mergeOrderProofMetaForUser($orderId, $userId, $patch);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to update proof'];
        }

        $proofStatus = $action === 'approve' ? 'approved' : 'rejected';
        $revisionNote = $action === 'revision' ? ($message !== '' ? $message : null) : null;
        $proofOk = $this->orders->updateLatestDesignProofStatusForOrderForUser($orderId, $userId, $proofStatus, $revisionNote, $orderItemId);
        if (!$proofOk) {
            return ['ok' => false, 'status' => 409, 'error' => 'No proof found for the selected order item'];
        }

        $comment = null;
        if ($action === 'revision' && $message !== '') {
            $commentOk = $this->orders->appendOrderCommentForUser(
                $orderId,
                $userId,
                'Customer',
                $message,
                $now,
                'revision',
            );
            if ($commentOk) {
                $comment = [
                    'author' => 'Customer',
                    'message' => $message,
                    'at' => $now,
                    'kind' => 'revision',
                ];
            }
        }

        if ($action === 'approve') {
            $allApproved = $this->orders->areAllLatestDesignProofsApprovedForOrderForUser($orderId, $userId);
            if ($allApproved) {
                $moved = $this->orders->updateOrderStatus($orderId, 'processing');
                if (!$moved) {
                    return ['ok' => false, 'status' => 500, 'error' => 'Failed to update status'];
                }
            }
        }

        return ['ok' => true, 'proof' => $patch, 'comment' => $comment];
    }
}
