<?php

declare(strict_types=1);

namespace App\Presentation\Account;

use App\Application\Users\UpdateMyProfile;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Users\PdoUserRepository;
use App\Presentation\Http\Auth;

final class AccountControllerFactory
{
    public static function create(\PDO $pdo): AccountController
    {
        $repo = new PdoUserRepository($pdo);
        $updateMyProfile = new UpdateMyProfile($repo);
        $auth = new Auth(new JwtTokenVerifier());

        return new AccountController($auth, $updateMyProfile);
    }
}
