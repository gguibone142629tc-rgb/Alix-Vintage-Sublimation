<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class AddOrderComment
{
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

        $messageRaw = $input['message'] ?? null;
        $message = is_string($messageRaw) ? trim($messageRaw) : '';
        if ($message === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing message'];
        }

        if (mb_strlen($message) > 2000) {
            return ['ok' => false, 'status' => 422, 'error' => 'Message too long'];
        }

        $status = $this->orders->getOrderStatusForUser($orderId, $userId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        if (strtolower($status) !== 'proofing') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not in proofing'];
        }

        $now = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);

        $author = 'Customer';
        $kind = 'revision';

        $ok = $this->orders->appendOrderCommentForUser($orderId, $userId, $author, $message, $now, $kind);
        if (!$ok) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to add comment'];
        }

        return [
            'ok' => true,
            'comment' => [
                'author' => $author,
                'message' => $message,
                'at' => $now,
                'kind' => $kind,
            ],
        ];
    }
}
