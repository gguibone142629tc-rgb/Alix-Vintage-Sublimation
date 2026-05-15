<?php

declare(strict_types=1);

namespace App\Presentation\AdminOrders;

use App\Application\Orders\ListAllOrders;
use App\Application\Orders\ListOrderDesignProofs;
use App\Application\Orders\ListPaymentTransactions;
use App\Application\Orders\MarkCodFinalPaymentReceived;
use App\Application\Orders\SendOrderProof;
use App\Application\Orders\SetOrderOnTransit;
use App\Application\Orders\UpdateOrderPricing;
use App\Application\Orders\UpdateOrderStatus;
use App\Application\Orders\VerifyOrderPayment;
use App\Infrastructure\Auth\JwtTokenVerifier;
use App\Infrastructure\Orders\PdoOrderRepository;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Presentation\Http\Auth;

final class AdminOrderControllerFactory
{
    public static function create(\PDO $pdo): AdminOrderController
    {
        $repo = new PdoOrderRepository($pdo);
        $list = new ListAllOrders($repo);
        $update = new UpdateOrderStatus($repo);
        $updatePricing = new UpdateOrderPricing($repo);
        $verifyPayment = new VerifyOrderPayment($repo);
        $markCodFinal = new MarkCodFinalPaymentReceived($repo);
        $setOnTransit = new SetOrderOnTransit($repo);
        $sendProof = new SendOrderProof($repo);
        $listProofs = new ListOrderDesignProofs($repo);
        $listTransactions = new ListPaymentTransactions($repo);

        $roleRepo = new PdoRoleRepository($pdo);
        $adminRoleId = $roleRepo->getRoleIdByName('admin');
        if ($adminRoleId === null) {
            throw new \RuntimeException('Admin role not configured');
        }
        $auth = new Auth(new JwtTokenVerifier());

        return new AdminOrderController($pdo, $auth, (int) $adminRoleId, $list, $update, $updatePricing, $verifyPayment, $markCodFinal, $setOnTransit, $sendProof, $listProofs, $listTransactions);
    }
}
