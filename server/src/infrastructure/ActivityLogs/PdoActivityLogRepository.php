<?php

declare(strict_types=1);

namespace App\Infrastructure\ActivityLogs;

use App\Domain\ActivityLogs\ActivityLog;
use App\Domain\ActivityLogs\ActivityLogRepository;

final class PdoActivityLogRepository implements ActivityLogRepository
{
    public function __construct(private readonly \PDO $pdo)
    {
    }

    public function add(ActivityLog $log): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO activity_logs (actor_user_id, actor_role, action, description, ip_address, user_agent, meta) '
            . 'VALUES (:actor_user_id, :actor_role, :action, :description, :ip_address, :user_agent, :meta::jsonb)'
        );

        $metaJson = json_encode($log->meta, JSON_UNESCAPED_SLASHES);
        if ($metaJson === false) {
            $metaJson = '{}';
        }

        $stmt->execute([
            'actor_user_id' => $log->actorUserId,
            'actor_role' => $log->actorRole,
            'action' => $log->action,
            'description' => $log->description,
            'ip_address' => $log->ipAddress,
            'user_agent' => $log->userAgent,
            'meta' => $metaJson,
        ]);
    }

    public function list(int $limit, int $offset): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT log_id, created_at, actor_user_id, actor_role, action, description, ip_address, user_agent, meta '
            . 'FROM activity_logs '
            . 'ORDER BY created_at DESC '
            . 'LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue('limit', $limit, \PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if (!is_array($rows)) {
            return [];
        }

        return array_map(static fn(array $row) => ActivityLog::fromRow($row), $rows);
    }
}
