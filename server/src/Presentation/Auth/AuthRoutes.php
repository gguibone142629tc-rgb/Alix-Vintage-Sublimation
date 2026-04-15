<?php

declare(strict_types=1);

namespace App\Presentation\Auth;

use App\Presentation\Http\Router;

final class AuthRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = AuthControllerFactory::create($pdo);

        $router->post('/api/auth/register/customer', [$controller, 'registerCustomer']);
        $router->post('/api/auth/register/admin', [$controller, 'registerAdmin']);
        $router->post('/api/auth/login', [$controller, 'login']);

        $router->post('/api/admin/login', [$controller, 'adminLogin']);

        $router->post('/api/auth/otp/request', [$controller, 'requestOtp']);
        $router->post('/api/auth/otp/verify', [$controller, 'verifyOtp']);

        $router->post('/api/auth/password-reset/request', [$controller, 'requestPasswordReset']);
        $router->post('/api/auth/password-reset/confirm', [$controller, 'confirmPasswordReset']);
    }
}
