<?php

declare(strict_types=1);

use App\Shared\Config\Env;
use App\Presentation\Http\Router;
use App\Presentation\Http\Response;
use App\Presentation\Auth\AuthRoutes;
use App\Presentation\ActivityLogs\ActivityLogRoutes;
use App\Presentation\Products\ProductRoutes;
use App\Presentation\Cart\CartRoutes;
use App\Presentation\Orders\OrderRoutes;
use App\Presentation\AdminOrders\AdminOrderRoutes;
use App\Infrastructure\Db\PdoConnectionFactory;
use App\Infrastructure\Db\RoleSeeder;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/../');

// Basic JSON error handling
set_exception_handler(static function (Throwable $e): void {
    $debug = Env::bool('APP_DEBUG', false);

    $payload = ['error' => 'Server error'];
    if ($debug) {
        $payload['details'] = [
            'message' => $e->getMessage(),
            'type' => $e::class,
        ];
    }

    Response::json($payload, 500);
});

$pdo = (new PdoConnectionFactory())->create();
(new RoleSeeder($pdo))->ensureDefaultRoles();

$router = new Router();
AuthRoutes::register($router, $pdo);
ActivityLogRoutes::register($router, $pdo);
ProductRoutes::register($router, $pdo);
CartRoutes::register($router, $pdo);
OrderRoutes::register($router, $pdo);
AdminOrderRoutes::register($router, $pdo);

$router->dispatch();
