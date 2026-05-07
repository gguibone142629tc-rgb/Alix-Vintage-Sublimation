<?php

declare(strict_types=1);

namespace App\Presentation\Contact;

final class ContactControllerFactory
{
    public static function create(\PDO $pdo): ContactController
    {
        return new ContactController($pdo);
    }
}
