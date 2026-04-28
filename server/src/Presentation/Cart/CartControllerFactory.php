<?php

declare(strict_types=1);

namespace App\Presentation\Cart;

use App\Application\Cart\AddCartItem;
use App\Application\Cart\ClearCart;
use App\Application\Cart\CheckoutCart;
use App\Application\Cart\GetCart;
use App\Application\Cart\RemoveCartItem;
use App\Application\Cart\UpdateCartItemQuantity;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Cart\PdoDraftOrderCartRepository;
use App\Infrastructure\Orders\PdoOrderRepository;
use App\Infrastructure\Products\PdoProductRepository;
use App\Infrastructure\Users\PdoUserRepository;
use App\Presentation\Http\Auth;

final class CartControllerFactory
{
    public static function create(\PDO $pdo): CartController
    {
        $cartRepo = new PdoDraftOrderCartRepository($pdo);
        $productRepo = new PdoProductRepository($pdo);
        $orderRepo = new PdoOrderRepository($pdo);
        $userRepo = new PdoUserRepository($pdo);

        $auth = new Auth(new JwtTokenVerifier());

        $get = new GetCart($cartRepo, $productRepo);
        $add = new AddCartItem($cartRepo, $productRepo);
        $remove = new RemoveCartItem($cartRepo);
        $updateQty = new UpdateCartItemQuantity($cartRepo);
        $clear = new ClearCart($cartRepo);
        $checkout = new CheckoutCart($cartRepo, $productRepo, $orderRepo, $userRepo);

        return new CartController($auth, $get, $add, $remove, $updateQty, $clear, $checkout);
    }
}
