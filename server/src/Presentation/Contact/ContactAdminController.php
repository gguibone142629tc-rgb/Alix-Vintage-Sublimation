<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ContactAdminController
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
    private function toPayload(array $row): array
    {
        $createdAtRaw = (string) ($row['created_at'] ?? '');
        $createdAt = new \DateTimeImmutable($createdAtRaw === '' ? 'now' : $createdAtRaw);

        return [
            'inquiry_id' => isset($row['inquiry_id']) ? (int) $row['inquiry_id'] : null,
            'created_at' => $createdAt->format('c'),
            'name' => (string) ($row['name'] ?? ''),
            'email' => (string) ($row['email'] ?? ''),
            'phone' => $row['phone'] ?? null,
            'topic' => (string) ($row['topic'] ?? ''),
            'message' => (string) ($row['message'] ?? ''),
            'ip_address' => isset($row['ip_address']) ? (string) ($row['ip_address'] ?? '') : null,
            'user_agent' => isset($row['user_agent']) ? (string) ($row['user_agent'] ?? '') : null,
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
            'SELECT inquiry_id, created_at, name, email, phone, topic, message, ip_address, user_agent '
            . 'FROM contact_inquiries '
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
            'inquiries' => $items,
        ], 200);
    }
}
