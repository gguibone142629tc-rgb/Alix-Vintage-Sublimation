<?php

declare(strict_types=1);

namespace App\Infrastructure\Db;

use App\Shared\Config\Env;

final class PdoConnectionFactory
{
    public function create(): \PDO
    {
        $host = Env::require('DB_HOST');
        $port = Env::int('DB_PORT', 5432);
        $db = Env::require('DB_NAME');
        $user = Env::require('DB_USER');
        $pass = Env::get('DB_PASSWORD', '');

        $dsn = "pgsql:host={$host};port={$port};dbname={$db}";
        $pdo = new \PDO($dsn, $user, $pass, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return $pdo;
    }
}
