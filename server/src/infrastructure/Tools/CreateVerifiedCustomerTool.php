<?php

declare(strict_types=1);

namespace App\Infrastructure\Tools;

use App\Application\Auth\RegisterUser;
use App\Infrastructure\Auth\NativePasswordHasher;
use App\Infrastructure\Cli\CliTool;
use App\Infrastructure\Cli\ConsoleOutput;
use App\Infrastructure\Db\ConnectionFactory;
use App\Infrastructure\Db\RoleSeeder;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Infrastructure\Users\PdoUserRepository;

final class CreateVerifiedCustomerTool implements CliTool
{
    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $pdo = $this->connectionFactory->create();
        (new RoleSeeder($pdo))->ensureDefaultRoles();

        $email = 'verified' . time() . mt_rand(100, 999) . '@example.com';
        $password = 'Test12345!';

        $userRepo = new PdoUserRepository($pdo);
        $roleRepo = new PdoRoleRepository($pdo);
        $register = new RegisterUser($userRepo, $roleRepo, new NativePasswordHasher());

        $result = $register->handle([
            'firstname' => 'Test',
            'lastname' => 'Verified',
            'email' => $email,
            'phone_number' => '09123456789',
            'address' => 'Test address',
            'password' => $password,
            'role' => 'customer',
        ]);

        if (!($result['ok'] ?? false) || !isset($result['user']['user_id'])) {
            $err = (string) ($result['error'] ?? 'Failed to create user');
            throw new \RuntimeException($err);
        }

        $userId = (int) $result['user']['user_id'];
        $userRepo->markVerified($userId);

        $output->writeln((string) json_encode([
            'user_id' => $userId,
            'email' => $email,
            'password' => $password,
        ], JSON_UNESCAPED_SLASHES));

        return 0;
    }
}
