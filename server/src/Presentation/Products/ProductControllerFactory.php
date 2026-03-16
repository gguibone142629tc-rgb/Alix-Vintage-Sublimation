<?php

declare(strict_types=1);

namespace App\Presentation\Products;

use App\Application\Products\ListProducts;
use App\Infrastructure\Products\PdoProductRepository;

final class ProductControllerFactory
{
    public static function create(\PDO $pdo): ProductController
    {
        $repo = new PdoProductRepository($pdo);
        $useCase = new ListProducts($repo);
        return new ProductController($useCase);
    }
}
