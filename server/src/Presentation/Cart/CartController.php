<?php

declare(strict_types=1);

namespace App\Presentation\Cart;

use App\Application\Cart\AddCartItem;
use App\Application\Cart\ClearCart;
use App\Application\Cart\CheckoutCart;
use App\Application\Cart\GetCart;
use App\Application\Cart\RemoveCartItem;
use App\Application\Cart\UpdateCartItemQuantity;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class CartController
{
    public function __construct(
        private readonly Auth $auth,
        private readonly GetCart $getCart,
        private readonly AddCartItem $addCartItem,
        private readonly RemoveCartItem $removeCartItem,
        private readonly UpdateCartItemQuantity $updateCartItemQuantity,
        private readonly ClearCart $clearCart,
        private readonly CheckoutCart $checkoutCart,
    ) {
    }

    public function get(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $result = $this->getCart->handle($userId);
        Response::json($result, 200);
    }

    public function addItem(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->addCartItem->handle($userId, $data);
        if (!$result['ok']) {
            Response::json(['error' => $result['error']], (int) $result['status']);
        }

        Response::json($result, 201);
    }

    public function removeItem(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();
        $idRaw = $data['cart_item_id'] ?? null;
        $id = is_numeric($idRaw) ? (int) $idRaw : 0;
        if ($id <= 0) {
            Response::json(['error' => 'Missing cart_item_id'], 422);
        }

        $result = $this->removeCartItem->handle($userId, $id);
        Response::json($result, 200);
    }

    public function updateItemQuantity(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $idRaw = $data['cart_item_id'] ?? null;
        $id = is_numeric($idRaw) ? (int) $idRaw : 0;

        $qtyRaw = $data['quantity'] ?? null;
        $qty = is_numeric($qtyRaw) ? (int) $qtyRaw : 0;

        $result = $this->updateCartItemQuantity->handle($userId, $id, $qty);
        if (!$result['ok']) {
            Response::json(['error' => $result['error']], (int) $result['status']);
        }

        Response::json($result, 200);
    }

    public function checkout(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->checkoutCart->handle($userId, $data);
        if (!$result['ok']) {
            Response::json(['error' => $result['error']], (int) $result['status']);
        }

        Response::json($result, 201);
    }

    public function clear(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $result = $this->clearCart->handle($userId);
        Response::json($result, 200);
    }
}
