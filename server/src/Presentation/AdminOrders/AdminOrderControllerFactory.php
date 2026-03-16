<?php

declare(strict_types=1);

namespace App\Presentation\AdminOrders;

use App\Application\Orders\ListAllOrders;
use App\Application\Orders\ListOrderDesignProofs;
use App\Application\Orders\ListPaymentTransactions;
use App\Application\Orders\SendOrderProof;
use App\Application\Orders\SetOrderOnTransit;
use App\Application\Orders\UpdateOrderStatus;
use App\Application\Orders\VerifyOrderPayment;
use App\Infrastructure\Orders\PdoOrderRepository;

final class AdminOrderControllerFactory
{
    public static function create(\PDO $pdo): AdminOrderController
    {
        $repo = new PdoOrderRepository($pdo);
        $list = new ListAllOrders($repo);
        $update = new UpdateOrderStatus($repo);
        $verifyPayment = new VerifyOrderPayment($repo);
        $setOnTransit = new SetOrderOnTransit($repo);
        $sendProof = new SendOrderProof($repo);
        $listProofs = new ListOrderDesignProofs($repo);
        $listTransactions = new ListPaymentTransactions($repo);
        return new AdminOrderController($pdo, $list, $update, $verifyPayment, $setOnTransit, $sendProof, $listProofs, $listTransactions);
    }
}
