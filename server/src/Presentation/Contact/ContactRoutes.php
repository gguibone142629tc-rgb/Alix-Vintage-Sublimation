<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Presentation\Http\Router;

final class ContactRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = ContactControllerFactory::create($pdo);
        $router->post('/api/contact', [$controller, 'submit']);
    }
}
