<?php

declare(strict_types=1);

namespace App\Presentation\AdminOrders;

use App\Presentation\Http\Router;

final class AdminOrderRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = AdminOrderControllerFactory::create($pdo);
        $router->get('/api/admin/orders', [$controller, 'list']);
        $router->get('/api/admin/orders/proofs', [$controller, 'listProofs']);
        $router->get('/api/admin/transactions', [$controller, 'listTransactions']);
        $router->patch('/api/admin/orders/status', [$controller, 'updateStatus']);
        $router->patch('/api/admin/orders/pricing', [$controller, 'updatePricing']);
        $router->patch('/api/admin/orders/payment/verify', [$controller, 'verifyPayment']);
        $router->patch('/api/admin/orders/payment/cod-final-received', [$controller, 'markCodFinalReceived']);
        $router->patch('/api/admin/orders/shipping', [$controller, 'setOnTransit']);
        $router->patch('/api/admin/orders/proof', [$controller, 'sendProof']);
    }
}
