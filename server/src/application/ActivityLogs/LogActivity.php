<?php

declare(strict_types=1);

namespace App\Application\ActivityLogs;

use App\Domain\ActivityLogs\ActivityLog;
use App\Domain\ActivityLogs\ActivityLogRepository;

final class LogActivity
{
    public function __construct(private readonly ActivityLogRepository $logs)
    {
    }

    /**
     * @param array<string,mixed> $input
     * @return array{ok:bool}
     */
    public function handle(array $input): array
    {
        $action = trim((string) ($input['action'] ?? ''));
        if ($action === '') {
            return ['ok' => false];
        }

        $actorUserId = isset($input['actor_user_id']) ? (int) $input['actor_user_id'] : null;
        $actorRole = isset($input['actor_role']) ? trim((string) $input['actor_role']) : null;
        $description = isset($input['description']) ? trim((string) $input['description']) : null;
        $ipAddress = isset($input['ip_address']) ? trim((string) $input['ip_address']) : null;
        $userAgent = isset($input['user_agent']) ? trim((string) $input['user_agent']) : null;

        $meta = $input['meta'] ?? [];
        $meta = is_array($meta) ? $meta : [];

        try {
            $this->logs->add(new ActivityLog(
                id: null,
                createdAt: new \DateTimeImmutable('now'),
                actorUserId: $actorUserId,
                actorRole: $actorRole === '' ? null : $actorRole,
                action: $action,
                description: $description === '' ? null : $description,
                ipAddress: $ipAddress === '' ? null : $ipAddress,
                userAgent: $userAgent === '' ? null : $userAgent,
                meta: $meta,
            ));
        } catch (\Throwable) {
            return ['ok' => false];
        }

        return ['ok' => true];
    }
}
