<?php

declare(strict_types=1);

namespace App\Presentation\Orders;

use App\Presentation\Http\Router;

final class OrderRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = OrderControllerFactory::create($pdo);
        $router->get('/api/orders', [$controller, 'listMine']);
        $router->post('/api/orders/receipt', [$controller, 'uploadReceipt']);
        $router->patch('/api/orders/proof/respond', [$controller, 'respondProof']);
        $router->post('/api/orders/comments', [$controller, 'addComment']);
    }
}
