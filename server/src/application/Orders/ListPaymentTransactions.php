<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class ListPaymentTransactions
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    public function handle(int $limit = 50, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        $rows = $this->orders->listPaymentTransactions($limit, $offset);

        return [
            'ok' => true,
            'limit' => $limit,
            'offset' => $offset,
            'transactions' => $rows,
        ];
    }
}
