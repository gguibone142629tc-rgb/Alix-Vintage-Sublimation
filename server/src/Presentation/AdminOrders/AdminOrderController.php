<?php

declare(strict_types=1);

namespace App\Presentation\AdminOrders;

use App\Application\Orders\ListAllOrders;
use App\Application\Orders\ListOrderDesignProofs;
use App\Application\Orders\ListPaymentTransactions;
use App\Application\Orders\MarkCodFinalPaymentReceived;
use App\Application\Orders\RejectOrderReceipt;
use App\Application\Orders\SendOrderProof;
use App\Application\Orders\SetOrderOnTransit;
use App\Application\Orders\UpdateOrderPricing;
use App\Application\Orders\UpdateOrderStatus;
use App\Application\Orders\VerifyOrderPayment;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class AdminOrderController
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly Auth $auth,
        private readonly int $adminRoleId,
        private readonly ListAllOrders $listAllOrders,
        private readonly UpdateOrderStatus $updateOrderStatus,
        private readonly UpdateOrderPricing $updateOrderPricing,
        private readonly VerifyOrderPayment $verifyOrderPayment,
        private readonly RejectOrderReceipt $rejectOrderReceipt,
        private readonly MarkCodFinalPaymentReceived $markCodFinalPaymentReceived,
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

        $claims = $this->auth->requireClaims($request);
        $roleId = $claims['role_id'] ?? null;
        $roleId = (is_int($roleId) || is_numeric($roleId)) ? (int) $roleId : 0;
        if ($roleId !== $this->adminRoleId) {
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

        $payload = is_array($body) ? $body : [];
        $orderIdRaw = $payload['order_id'] ?? $payload['orderId'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;

        if ($orderId > 0) {
            $existingStmt = $this->pdo->prepare('SELECT base_price, shipping_fee FROM orders WHERE order_id = :order_id');
            $existingStmt->execute(['order_id' => $orderId]);
            $existing = $existingStmt->fetch();
            if (!is_array($existing)) {
                Response::json(['error' => 'Order not found'], 404);
            }

            $baseRaw = $payload['base_price'] ?? $payload['basePrice'] ?? null;
            $shipRaw = $payload['shipping_fee'] ?? $payload['shippingFee'] ?? null;

            // Allow admin to update only Shipping Fee (for fixed orders) by defaulting
            // Base Price to the existing order value.
            if (!is_numeric($baseRaw)) {
                $payload['base_price'] = (float) ($existing['base_price'] ?? 0);
            }

            // Allow admin to update only Base Price (rare) by defaulting Shipping Fee.
            if (!is_numeric($shipRaw)) {
                $payload['shipping_fee'] = (float) ($existing['shipping_fee'] ?? 0);
                $shipRaw = $payload['shipping_fee'];
            }

            $qtyStmt = $this->pdo->prepare('SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_id = :order_id');
            $qtyStmt->execute(['order_id' => $orderId]);
            $totalQty = (int) $qtyStmt->fetchColumn();

            // Promo: 10+ pcs => shipping must be 0
            if ($totalQty >= 10) {
                $ship = is_numeric($shipRaw) ? (float) $shipRaw : 0.0;
                if ($ship > 0.0001) {
                    Response::json(['error' => 'Free shipping promo applies for orders with 10+ pcs. Set Shipping Fee to 0.'], 422);
                }
                // Prevent bypass by omitting shipping_fee.
                $payload['shipping_fee'] = 0.0;
            }
        }

        $result = $this->updateOrderPricing->handle($payload);
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

    public function rejectReceipt(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->rejectOrderReceipt->handle(is_array($body) ? $body : []);
        if (!($result['ok'] ?? false)) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json(['ok' => true], 200);
    }

    public function markCodFinalReceived(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $result = $this->markCodFinalPaymentReceived->handle(is_array($body) ? $body : []);
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
