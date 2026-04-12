<?php

declare(strict_types=1);

namespace App\Presentation\CustomDesign;

use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Presentation\Http\Auth;

final class CustomDesignControllerFactory
{
    public static function create(\PDO $pdo): CustomDesignController
    {
        $auth = new Auth(new JwtTokenVerifier());
        return new CustomDesignController($pdo, $auth);
    }
}
