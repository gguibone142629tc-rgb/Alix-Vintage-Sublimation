<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Router;

final class ContactAdminRoutes
{
    public static function register(Router $router, \PDO $pdo): void
    {
        $roleRepo = new PdoRoleRepository($pdo);
        $adminRoleId = $roleRepo->getRoleIdByName('admin');
        if ($adminRoleId === null) {
            throw new \RuntimeException('Admin role not configured');
        }
        $auth = new Auth(new JwtTokenVerifier());

        $controller = new ContactAdminController($pdo, $auth, (int) $adminRoleId);
        $replyController = ContactReplyControllerFactory::create($pdo);
        $router->get('/api/admin/contact-inquiries', [$controller, 'list']);
        $router->post('/api/admin/contact-inquiries/reply', [$replyController, 'reply']);
    }
}
