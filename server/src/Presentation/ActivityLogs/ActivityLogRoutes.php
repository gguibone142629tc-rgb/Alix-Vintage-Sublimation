<?php

declare(strict_types=1);

namespace App\Presentation\ActivityLogs;

use App\Presentation\Http\Router;

final class ActivityLogRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = ActivityLogControllerFactory::create($pdo);
        $router->get('/api/admin/activity-logs', [$controller, 'list']);
    }
}
