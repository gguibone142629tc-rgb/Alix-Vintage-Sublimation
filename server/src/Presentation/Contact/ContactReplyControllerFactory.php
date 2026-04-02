<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

use App\Application\ActivityLogs\LogActivity;
use App\Infrastructure\ActivityLogs\PdoActivityLogRepository;
use App\Infrastructure\Notifications\PhpMailEmailSender;

final class ContactReplyControllerFactory
{
    public static function create(\PDO $pdo): ContactReplyController
    {
        $activityRepo = new PdoActivityLogRepository($pdo);
        $logActivity = new LogActivity($activityRepo);

        $emailSender = new PhpMailEmailSender();

        return new ContactReplyController($pdo, $emailSender, $logActivity);
    }
}
