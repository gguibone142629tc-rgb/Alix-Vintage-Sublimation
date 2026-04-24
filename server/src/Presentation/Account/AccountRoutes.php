<?php

declare(strict_types=1);

namespace App\Presentation\Account;

use App\Presentation\Http\Router;

final class AccountRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = AccountControllerFactory::create($pdo);
        $router->patch('/api/account/profile', [$controller, 'updateProfile']);
    }
}
