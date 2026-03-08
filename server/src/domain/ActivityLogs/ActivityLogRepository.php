<?php

declare(strict_types=1);

namespace App\Domain\ActivityLogs;

interface ActivityLogRepository
{
    public function add(ActivityLog $log): void;

    /** @return ActivityLog[] */
    public function list(int $limit, int $offset): array;
}
