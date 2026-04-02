<?php

declare(strict_types=1);

namespace App\Domain\Cart;

interface CartRepository
{
    public function getOrCreateCartId(int $userId): int;

    /** @return CartItem[] */
    public function listItems(int $cartId): array;

    public function addItem(int $cartId, int $productId, int $quantity, array $meta): CartItem;

    public function updateItemQuantity(int $cartId, int $cartItemId, int $quantity): void;

    public function removeItem(int $cartId, int $cartItemId): void;

    public function clearCart(int $cartId): void;
}
