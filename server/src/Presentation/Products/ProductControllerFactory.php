<?php

declare(strict_types=1);

namespace App\Presentation\Products;

use App\Application\Products\ListProducts;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Products\PdoProductRepository;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Presentation\Http\Auth;

final class ProductControllerFactory
{
    public static function create(\PDO $pdo): ProductController
    {
        $repo = new PdoProductRepository($pdo);
        $useCase = new ListProducts($repo);

        $roleRepo = new PdoRoleRepository($pdo);
        $adminRoleId = $roleRepo->getRoleIdByName('admin');
        if ($adminRoleId === null) {
            throw new \RuntimeException('Admin role not configured');
        }
        $auth = new Auth(new JwtTokenVerifier());

        return new ProductController($useCase, $repo, $auth, (int) $adminRoleId);
    }
}
