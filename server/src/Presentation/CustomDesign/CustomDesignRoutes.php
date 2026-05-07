<?php

declare(strict_types=1);

namespace App\Presentation\CustomDesign;

use App\Presentation\Http\Router;

final class CustomDesignRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = CustomDesignControllerFactory::create($pdo);
        $adminController = new CustomDesignAdminController($pdo);

        // Customer
        $router->post('/api/custom-design/drafts', [$controller, 'saveDraft']);
        $router->post('/api/custom-design/requests', [$controller, 'submit']);
        $router->patch('/api/custom-design/requests/payment-preference', [$controller, 'setPaymentPreference']);

        // Admin
        $router->get('/api/admin/custom-design/requests', [$adminController, 'list']);
    }
}
