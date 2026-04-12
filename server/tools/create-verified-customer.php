<?php

declare(strict_types=1);

use App\Infrastructure\Auth\NativePasswordHasher;
use App\Infrastructure\Db\PdoConnectionFactory;
use App\Infrastructure\Db\RoleSeeder;
use App\Shared\Config\Env;

require __DIR__ . '/../autoload.php';

Env::load(__DIR__ . '/..');

$pdo = (new PdoConnectionFactory())->create();
(new RoleSeeder($pdo))->ensureDefaultRoles();

$roleId = (int) $pdo->query("SELECT role_id FROM roles WHERE role_name = 'customer' LIMIT 1")->fetchColumn();
if ($roleId < 1) {
    fwrite(STDERR, "ERROR: customer role not found\n");
    exit(1);
}

$email = 'verified' . time() . mt_rand(100, 999) . '@example.com';
$password = 'Test12345!';
$hash = (new NativePasswordHasher())->hash($password);

$stmt = $pdo->prepare(
    'INSERT INTO users(firstname, lastname, email, phone_number, address, password_hash, role_id, is_verified) '
    . 'VALUES (:fn, :ln, :email, :phone, :address, :hash, :role, true) '
    . 'RETURNING user_id'
);
$stmt->execute([
    'fn' => 'Test',
    'ln' => 'Verified',
    'email' => $email,
    'phone' => '09123456789',
    'address' => 'Test address',
    'hash' => $hash,
    'role' => $roleId,
]);

$userId = (int) $stmt->fetchColumn();

echo json_encode([
    'user_id' => $userId,
    'email' => $email,
    'password' => $password,
], JSON_UNESCAPED_SLASHES) . PHP_EOL;
