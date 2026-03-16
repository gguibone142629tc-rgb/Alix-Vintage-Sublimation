<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;

final class RemoveCartItem
{
    public function __construct(private readonly CartRepository $carts)
    {
    }

    public function handle(int $userId, int $cartItemId): array
    {
        $cartId = $this->carts->getOrCreateCartId($userId);
        $this->carts->removeItem($cartId, $cartItemId);

        return ['ok' => true];
    }
}
