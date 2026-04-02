<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Application\ActivityLogs\LogActivity;
use App\Infrastructure\ActivityLogs\PdoActivityLogRepository;

final class ContactControllerFactory
{
    public static function create(\PDO $pdo): ContactController
    {
        $activityRepo = new PdoActivityLogRepository($pdo);
        $logActivity = new LogActivity($activityRepo);

        return new ContactController($logActivity);
    }
}
