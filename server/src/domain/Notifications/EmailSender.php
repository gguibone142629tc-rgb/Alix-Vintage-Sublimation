<?php

declare(strict_types=1);

namespace App\Domain\Notifications;

interface EmailSender
{
    public function send(string $toEmail, string $subject, string $body): void;
}
