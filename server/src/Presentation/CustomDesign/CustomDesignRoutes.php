<?php

declare(strict_types=1);

namespace App\Presentation\CustomDesign;

use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Router;

final class CustomDesignRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = CustomDesignControllerFactory::create($pdo);

        $roleRepo = new PdoRoleRepository($pdo);
        $adminRoleId = $roleRepo->getRoleIdByName('admin');
        if ($adminRoleId === null) {
            throw new \RuntimeException('Admin role not configured');
        }
        $auth = new Auth(new JwtTokenVerifier());

        $adminController = new CustomDesignAdminController($pdo, $auth, (int) $adminRoleId);

        // Customer
        $router->post('/api/custom-design/drafts', [$controller, 'saveDraft']);
        $router->post('/api/custom-design/requests', [$controller, 'submit']);
        $router->patch('/api/custom-design/requests/payment-preference', [$controller, 'setPaymentPreference']);

        // Admin
        $router->get('/api/admin/custom-design/requests', [$adminController, 'list']);
    }
}
