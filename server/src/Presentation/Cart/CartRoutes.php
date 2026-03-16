<?php

declare(strict_types=1);

namespace App\Presentation\Cart;

use App\Presentation\Http\Router;

final class CartRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = CartControllerFactory::create($pdo);

        $router->get('/api/cart', [$controller, 'get']);
        $router->delete('/api/cart', [$controller, 'clear']);
        $router->post('/api/cart/items', [$controller, 'addItem']);
        $router->delete('/api/cart/items', [$controller, 'removeItem']);
        $router->post('/api/cart/checkout', [$controller, 'checkout']);
    }
}
