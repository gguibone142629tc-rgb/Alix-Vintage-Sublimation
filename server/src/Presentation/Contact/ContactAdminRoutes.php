<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Presentation\Http\Router;

final class ContactAdminRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $controller = new ContactAdminController($pdo);
        $replyController = ContactReplyControllerFactory::create($pdo);
        $router->get('/api/admin/contact-inquiries', [$controller, 'list']);
        $router->post('/api/admin/contact-inquiries/reply', [$replyController, 'reply']);
    }
}
