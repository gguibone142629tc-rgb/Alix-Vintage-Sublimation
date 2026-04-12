<?php

declare(strict_types=1);

namespace App\Presentation\AdminOrders;

use App\Application\Orders\ListAllOrders;
use App\Application\Orders\ListOrderDesignProofs;
use App\Application\Orders\ListPaymentTransactions;
use App\Application\Orders\SendOrderProof;
use App\Application\Orders\SetOrderOnTransit;
use App\Application\Orders\UpdateOrderPricing;
use App\Application\Orders\UpdateOrderStatus;
use App\Application\Orders\VerifyOrderPayment;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class AdminOrderController
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly ListAllOrders $listAllOrders,
        private readonly UpdateOrderStatus $updateOrderStatus,
        private readonly UpdateOrderPricing $updateOrderPricing,
        private readonly VerifyOrderPayment $verifyOrderPayment,
        private readonly SetOrderOnTransit $setOrderOnTransit,
        private readonly SendOrderProof $sendOrderProof,
        private readonly ListOrderDesignProofs $listOrderDesignProofs,
        private readonly ListPaymentTransactions $listPaymentTransactions,
    ) {
    }

    private function assertAdmin(Request $request): void
    {
        // Local dev convenience: allow without a key in debug mode.
        if (Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local') {
            return;
        }

        $expected = Env::get('ADMIN_API_KEY') ?? Env::get('ADMIN_SETUP_KEY');
        if ($expected === null || trim($expected) === '') {
            if (!Env::bool('APP_DEBUG', false)) {
                Response::json(['error' => 'Server not configured for admin orders'], 500);
            }
            return;
        }

        $provided = $request->header('x-admin-api-key');
        if ($provided === null || !hash_equals($expected, $provided)) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    public function list(Request $request): void
    {
        $this->assertAdmin($request);

        $limitRaw = $request->queryParam('limit');
        $offsetRaw = $request->queryParam('offset');
        $limit = is_numeric($limitRaw) ? (int) $limitRaw : 50;
        $offset = is_numeric($offsetRaw) ? (int) $offsetRaw : 0;

        $result = $this->listAllOrders->handle($limit, $offset);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        $orders = is_array($result['orders'] ?? null) ? $result['orders'] : [];

        // Attach user details (name/email/phone) for admin UI.
        $userIds = [];
        foreach ($orders as $row) {
            $uid = $row['order']['user_id'] ?? null;
            if (is_int($uid) || is_numeric($uid)) {
                $userIds[] = (int) $uid;
            }
        }

        $userById = [];
        $userIds = array_values(array_unique($userIds));
        if (count($userIds) > 0) {
            $in = implode(',', array_map('intval', $userIds));
            $stmt = $this->pdo->query('SELECT user_id, firstname, lastname, email, phone_number FROM users WHERE user_id IN (' . $in . ')');
            $rows = $stmt->fetchAll();
            if (is_array($rows)) {
                foreach ($rows as $u) {
                    if (!is_array($u) || !isset($u['user_id'])) continue;
                    $id = (int) $u['user_id'];
                    $userById[$id] = [
                        'user_id' => $id,
                        'firstname' => (string) ($u['firstname'] ?? ''),
                        'lastname' => (string) ($u['lastname'] ?? ''),
                        'email' => (string) ($u['email'] ?? ''),
                        'phone_number' => $u['phone_number'] !== null ? (string) $u['phone_number'] : null,
                    ];
                }
            }
        }

        $out = [];
        foreach ($orders as $row) {
            $uid = $row['order']['user_id'] ?? null;
            $uid = (is_int($uid) || is_numeric($uid)) ? (int) $uid : null;
            $row['user'] = $uid !== null ? ($userById[$uid] ?? null) : null;
            $out[] = $row;
        }

        Response::json([
            'ok' => true,
            'limit' => max(1, min(200, $limit)),
            'offset' => max(0, $offset),
            'orders' => $out,
        ], 200);
    }

    public function updateStatus(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $orderIdRaw = $body['order_id'] ?? null;
        $statusRaw = $body['status'] ?? null;

        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        $status = is_string($statusRaw) ? $statusRaw : '';

        $result = $this->updateOrderStatus->handle($orderId, $status);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json(['ok' => true], 200);
    }

    public function updatePricing(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->updateOrderPricing->handle(is_array($body) ? $body : []);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json(['ok' => true], 200);
    }

    public function verifyPayment(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->verifyOrderPayment->handle(is_array($body) ? $body : []);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json(['ok' => true], 200);
    }

    public function setOnTransit(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->setOrderOnTransit->handle(is_array($body) ? $body : []);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json(['ok' => true], 200);
    }

    public function sendProof(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->sendOrderProof->handle(is_array($body) ? $body : []);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json($result, 200);
    }

    public function listProofs(Request $request): void
    {
        $this->assertAdmin($request);

        $orderIdRaw = $request->queryParam('order_id');
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;

        $result = $this->listOrderDesignProofs->handle($orderId);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json($result, 200);
    }

    public function listTransactions(Request $request): void
    {
        $this->assertAdmin($request);

        $limitRaw = $request->queryParam('limit');
        $offsetRaw = $request->queryParam('offset');
        $limit = is_numeric($limitRaw) ? (int) $limitRaw : 50;
        $offset = is_numeric($offsetRaw) ? (int) $offsetRaw : 0;

        $result = $this->listPaymentTransactions->handle($limit, $offset);
        Response::json($result, 200);
    }
}
