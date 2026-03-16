<?php

declare(strict_types=1);

namespace App\Presentation\Orders;

use App\Application\Orders\AddOrderComment;
use App\Application\Orders\ListMyOrders;
use App\Application\Orders\RespondOrderProof;
use App\Application\Orders\UploadOrderReceipt;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class OrderController
{
    public function __construct(
        private readonly Auth $auth,
        private readonly ListMyOrders $listMyOrders,
        private readonly UploadOrderReceipt $uploadOrderReceipt,
        private readonly RespondOrderProof $respondOrderProof,
        private readonly AddOrderComment $addOrderComment,
    ) {
    }

    public function listMine(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);

        $limitRaw = $request->queryParam('limit');
        $offsetRaw = $request->queryParam('offset');
        $limit = is_numeric($limitRaw) ? (int) $limitRaw : 50;
        $offset = is_numeric($offsetRaw) ? (int) $offsetRaw : 0;

        $result = $this->listMyOrders->handle($userId, $limit, $offset);
        Response::json($result, 200);
    }

    public function uploadReceipt(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->uploadOrderReceipt->handle($userId, is_array($data) ? $data : []);
        if (!($result['ok'] ?? false)) {
            $status = (int) ($result['status'] ?? 400);
            $error = (string) ($result['error'] ?? 'Request failed');
            Response::json(['error' => $error], $status);
        }

        Response::json($result, 200);
    }

    public function respondProof(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->respondOrderProof->handle($userId, is_array($data) ? $data : []);
        if (!($result['ok'] ?? false)) {
            $status = (int) ($result['status'] ?? 400);
            $error = (string) ($result['error'] ?? 'Request failed');
            Response::json(['error' => $error], $status);
        }

        Response::json($result, 200);
    }

    public function addComment(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->addOrderComment->handle($userId, is_array($data) ? $data : []);
        if (!($result['ok'] ?? false)) {
            $status = (int) ($result['status'] ?? 400);
            $error = (string) ($result['error'] ?? 'Request failed');
            Response::json(['error' => $error], $status);
        }

        Response::json($result, 200);
    }
}
