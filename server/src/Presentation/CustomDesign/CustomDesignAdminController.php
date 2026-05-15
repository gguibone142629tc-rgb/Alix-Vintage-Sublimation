<?php

declare(strict_types=1);

namespace App\Presentation\CustomDesign;

use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class CustomDesignAdminController
{
    public function __construct(
        private readonly \PDO $pdo,
        private readonly Auth $auth,
        private readonly int $adminRoleId,
    )
    {
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

    /** @return array<string,mixed> */
    private function normalizeJson(mixed $value, array $fallback): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : $fallback;
        }
        return $fallback;
    }

    /** @return array<string,mixed> */
    private function toPayload(array $row): array
    {
        $createdAtRaw = (string) ($row['created_at'] ?? '');
        $createdAt = new \DateTimeImmutable($createdAtRaw === '' ? 'now' : $createdAtRaw);

        return [
            'request_id' => isset($row['request_id']) ? (int) $row['request_id'] : null,
            'order_id' => isset($row['order_id']) && $row['order_id'] !== null ? (int) $row['order_id'] : null,
            'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
            'status' => (string) ($row['status'] ?? ''),
            'design_name' => (string) ($row['design_name'] ?? ''),
            'product_type' => (string) ($row['product_type'] ?? ''),
            'design_type' => (string) ($row['design_type'] ?? ''),
            'quantity' => isset($row['quantity']) ? (int) $row['quantity'] : null,
            'personalization' => (string) ($row['personalization'] ?? ''),
            'payment_preference' => (string) ($row['payment_preference'] ?? ''),
            'notes' => (string) ($row['notes'] ?? ''),
            'roster' => $this->normalizeJson($row['roster'] ?? '[]', []),
            'files' => $this->normalizeJson($row['files'] ?? '{}', []),
            'created_at' => $createdAt->format('c'),
        ];
    }

    public function list(Request $request): void
    {
        $this->assertAdmin($request);

        $limitRaw = $request->queryParam('limit');
        $offsetRaw = $request->queryParam('offset');

        $limit = $limitRaw !== null ? (int) $limitRaw : 50;
        $offset = $offsetRaw !== null ? (int) $offsetRaw : 0;

        if ($limit < 1) {
            $limit = 1;
        }
        if ($limit > 200) {
            $limit = 200;
        }
        if ($offset < 0) {
            $offset = 0;
        }

        $stmt = $this->pdo->prepare(
            'SELECT request_id, order_id, user_id, status, design_name, product_type, design_type, quantity, personalization, payment_preference, notes, roster, files, created_at '
            . 'FROM custom_design_requests '
            . 'ORDER BY created_at DESC '
            . 'LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        $rows = is_array($rows) ? $rows : [];

        $items = array_map(fn(array $r) => $this->toPayload($r), $rows);

        Response::json([
            'ok' => true,
            'limit' => $limit,
            'offset' => $offset,
            'requests' => $items,
        ], 200);
    }
}
