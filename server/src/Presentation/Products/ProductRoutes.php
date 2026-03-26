<?php

declare(strict_types=1);

namespace App\Presentation\Products;

use App\Presentation\Http\Router;

final class ProductRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = ProductControllerFactory::create($pdo);
        $router->get('/api/products', [$controller, 'list']);
        $router->post('/api/admin/products', [$controller, 'create']);
        $router->patch('/api/admin/products', [$controller, 'update']);
        $router->delete('/api/admin/products', [$controller, 'delete']);
    }
}
