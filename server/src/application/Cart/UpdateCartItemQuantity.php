<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;

final class UpdateCartItemQuantity
{
    public function __construct(private readonly CartRepository $carts)
    {
    }

    public function handle(int $userId, int $cartItemId, int $quantity): array
    {
        if ($cartItemId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing cart_item_id'];
        }

        if ($quantity < 1) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid quantity'];
        }

        $quantity = min($quantity, 999);

        $cartId = $this->carts->getOrCreateCartId($userId);
        $this->carts->updateItemQuantity($cartId, $cartItemId, $quantity);

        return ['ok' => true];
    }
}
