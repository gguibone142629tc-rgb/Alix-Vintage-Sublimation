<?php

declare(strict_types=1);

namespace App\Presentation\Products;

use App\Application\Products\ListProducts;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class ProductController
{
    public function __construct(private readonly ListProducts $listProducts)
    {
    }

    public function list(Request $request): void
    {
        $result = $this->listProducts->handle();
        Response::json($result, 200);
    }
}
