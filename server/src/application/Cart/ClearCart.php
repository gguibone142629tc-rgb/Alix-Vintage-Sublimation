<?php

declare(strict_types=1);

namespace App\Application\Cart;

use App\Domain\Cart\CartRepository;

final class ClearCart
{
    public function __construct(private readonly CartRepository $carts)
    {
    }

    public function handle(int $userId): array
    {
        $cartId = $this->carts->getOrCreateCartId($userId);
        $this->carts->clearCart($cartId);
        return ['ok' => true];
    }
}
