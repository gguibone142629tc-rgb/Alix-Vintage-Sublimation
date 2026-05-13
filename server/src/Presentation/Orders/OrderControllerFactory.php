<?php

declare(strict_types=1);

namespace App\Presentation\Orders;

use App\Application\Orders\AddOrderComment;
use App\Application\Orders\CancelMyOrder;
use App\Application\Orders\ListMyOrders;
use App\Application\Orders\RespondOrderProof;
use App\Application\Orders\UploadOrderReceipt;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Orders\PdoOrderRepository;
use App\Presentation\Http\Auth;

final class OrderControllerFactory
{
    public static function create(\PDO $pdo): OrderController
    {
        $repo = new PdoOrderRepository($pdo);
        $useCase = new ListMyOrders($repo);
        $cancelMyOrder = new CancelMyOrder($repo);
        $uploadReceipt = new UploadOrderReceipt($repo);
        $respondProof = new RespondOrderProof($repo);
        $addComment = new AddOrderComment($repo);
        $auth = new Auth(new JwtTokenVerifier());

        return new OrderController($auth, $useCase, $cancelMyOrder, $uploadReceipt, $respondProof, $addComment);
    }
}
