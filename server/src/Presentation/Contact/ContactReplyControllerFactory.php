<?php

declare(strict_types=1);

namespace App\Presentation\Contact;
use App\Infrastructure\Notifications\PhpMailEmailSender;

final class ContactReplyControllerFactory
{
    public static function create(\PDO $pdo): ContactReplyController
    {
        $emailSender = new PhpMailEmailSender();
        return new ContactReplyController($pdo, $emailSender);
    }
}
