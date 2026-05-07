<?php

declare(strict_types=1);

namespace App\Infrastructure\Db;

interface ConnectionFactory
{
    public function create(): \PDO;
}
