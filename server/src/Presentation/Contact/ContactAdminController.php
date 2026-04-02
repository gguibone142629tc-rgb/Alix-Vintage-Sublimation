<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ContactAdminController
{
    public function __construct(private readonly \PDO $pdo)
    {
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
                Response::json(['error' => 'Server not configured for admin messages'], 500);
            }
            return;
        }

        $provided = $request->header('x-admin-api-key');
        if ($provided === null || !hash_equals($expected, $provided)) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    /** @return array<string,mixed> */
    private function normalizeMeta(mixed $meta): array
    {
        if (is_array($meta)) {
            return $meta;
        }

        if (is_string($meta)) {
            $decoded = json_decode($meta, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /** @return array<string,mixed> */
    private function toPayload(array $row): array
    {
        $createdAtRaw = (string) ($row['created_at'] ?? '');
        $createdAt = new \DateTimeImmutable($createdAtRaw === '' ? 'now' : $createdAtRaw);

        $meta = $this->normalizeMeta($row['meta'] ?? []);

        return [
            'inquiry_id' => isset($row['log_id']) ? (int) $row['log_id'] : null,
            'created_at' => $createdAt->format('c'),
            'name' => (string) ($meta['name'] ?? ''),
            'email' => (string) ($meta['email'] ?? ''),
            'phone' => $meta['phone'] ?? null,
            'topic' => (string) ($meta['topic'] ?? ''),
            'message' => (string) ($meta['message'] ?? ''),
            'ip_address' => isset($row['ip_address']) ? (string) $row['ip_address'] : null,
            'user_agent' => isset($row['user_agent']) ? (string) $row['user_agent'] : null,
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
            'SELECT log_id, created_at, ip_address, user_agent, meta '
            . 'FROM activity_logs '
            . 'WHERE action = :action '
            . 'ORDER BY created_at DESC '
            . 'LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('action', 'contact.submit');
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
