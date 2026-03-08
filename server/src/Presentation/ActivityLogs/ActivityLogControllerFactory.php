<?php

declare(strict_types=1);

namespace App\Presentation\ActivityLogs;

use App\Application\ActivityLogs\ListActivityLogs;
use App\Infrastructure\ActivityLogs\PdoActivityLogRepository;

final class ActivityLogControllerFactory
{
    public static function create(\PDO $pdo): ActivityLogController
    {
        $repo = new PdoActivityLogRepository($pdo);
        $list = new ListActivityLogs($repo);
        return new ActivityLogController($list);
    }
}
