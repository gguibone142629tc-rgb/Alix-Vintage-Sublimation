<?php

declare(strict_types=1);

namespace App\Application\ActivityLogs;

use App\Domain\ActivityLogs\ActivityLogRepository;

final class ListActivityLogs
{
    public function __construct(private readonly ActivityLogRepository $logs)
    {
    }

    /**
     * @param array<string,mixed> $input
     * @return array{ok:bool, logs?:array<int,array<string,mixed>>, limit?:int, offset?:int, error?:string, status?:int}
     */
    public function handle(array $input): array
    {
        $limit = (int) ($input['limit'] ?? 50);
        $offset = (int) ($input['offset'] ?? 0);

        if ($limit <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid limit'];
        }
        if ($offset < 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid offset'];
        }

        $limit = min($limit, 200);

        try {
            $rows = $this->logs->list($limit, $offset);
        } catch (\Throwable) {
            return ['ok' => false, 'status' => 500, 'error' => 'Activity logs unavailable'];
        }

        return [
            'ok' => true,
            'limit' => $limit,
            'offset' => $offset,
            'logs' => array_map(static fn($l) => $l->toArray(), $rows),
        ];
    }
}
