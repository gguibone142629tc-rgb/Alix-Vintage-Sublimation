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

final class CreateAdminTool implements CliTool
{
    public function __construct(private readonly ConnectionFactory $connectionFactory)
    {
    }

    public function run(array $argv, ConsoleOutput $output): int
    {
        $args = $this->parseArgs($argv);

        $email = strtolower(trim((string) ($args['email'] ?? '')));
        if ($email === '') {
            throw new \InvalidArgumentException('Missing required --email');
        }

        $password = (string) ($args['password'] ?? '');
        if (trim($password) === '') {
            $password = 'Admin' . time() . '!';
        }

        $firstname = trim((string) ($args['firstname'] ?? 'Admin'));
        $lastname = trim((string) ($args['lastname'] ?? 'User'));

        $pdo = $this->connectionFactory->create();
        (new RoleSeeder($pdo))->ensureDefaultRoles();

        $userRepo = new PdoUserRepository($pdo);
        $roleRepo = new PdoRoleRepository($pdo);
        $register = new RegisterUser($userRepo, $roleRepo, new NativePasswordHasher());

        $result = $register->handle([
            'firstname' => $firstname !== '' ? $firstname : 'Admin',
            'lastname' => $lastname !== '' ? $lastname : 'User',
            'email' => $email,
            'phone_number' => null,
            'address' => null,
            'password' => $password,
            'role' => 'admin',
        ]);

        if (!($result['ok'] ?? false) || !isset($result['user']['user_id'])) {
            $err = (string) ($result['error'] ?? 'Failed to create admin');
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

    /**
     * @return array<string, string>
     */
    private function parseArgs(array $argv): array
    {
        $out = [];
        foreach ($argv as $i => $arg) {
            if ($i === 0) {
                continue;
            }
            $raw = (string) $arg;
            if (!str_starts_with($raw, '--')) {
                continue;
            }
            $raw = substr($raw, 2);
            if ($raw === '') {
                continue;
            }
            $parts = explode('=', $raw, 2);
            $key = trim((string) ($parts[0] ?? ''));
            $val = (string) ($parts[1] ?? '');
            if ($key === '') {
                continue;
            }
            $out[$key] = $val;
        }
        return $out;
    }
}
