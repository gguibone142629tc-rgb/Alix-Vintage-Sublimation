<?php

declare(strict_types=1);

namespace App\Presentation\Contact;
use App\Infrastructure\Notifications\PhpMailEmailSender;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Presentation\Http\Auth;

final class ContactReplyControllerFactory
{
    public static function create(\PDO $pdo): ContactReplyController
    {
        $emailSender = new PhpMailEmailSender();

        $roleRepo = new PdoRoleRepository($pdo);
        $adminRoleId = $roleRepo->getRoleIdByName('admin');
        if ($adminRoleId === null) {
            throw new \RuntimeException('Admin role not configured');
        }
        $auth = new Auth(new JwtTokenVerifier());

        return new ContactReplyController($pdo, $auth, (int) $adminRoleId, $emailSender);
    }
}
