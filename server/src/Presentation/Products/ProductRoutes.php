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
    }
}
