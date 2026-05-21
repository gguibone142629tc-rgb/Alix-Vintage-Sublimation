<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Users\PasswordHasher;
use App\Domain\Users\RoleRepository;
use App\Domain\Users\User;
use App\Domain\Users\UserRepository;

final class RegisterUser
{
    private const PASSWORD_REQUIREMENTS_MESSAGE =
        'Password must be at least 8 characters long and include an uppercase letter, lowercase letter, number, and special character.';

    public function __construct(
        private readonly UserRepository $users,
        private readonly RoleRepository $roles,
        private readonly PasswordHasher $passwordHasher,
    ) {
    }

    private static function isPasswordStrong(string $password): bool
    {
        if (strlen($password) < 8) {
            return false;
        }

        $hasUppercase = preg_match('/[A-Z]/', $password) === 1;
        $hasLowercase = preg_match('/[a-z]/', $password) === 1;
        $hasNumber = preg_match('/\d/', $password) === 1;
        $hasSpecial = preg_match('/[^A-Za-z0-9\s]/', $password) === 1;

        return $hasUppercase && $hasLowercase && $hasNumber && $hasSpecial;
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $firstname = trim((string) ($input['firstname'] ?? ''));
        $lastname = trim((string) ($input['lastname'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = isset($input['phone_number']) ? trim((string) $input['phone_number']) : null;
        $address = isset($input['address']) ? trim((string) $input['address']) : null;
        $password = (string) ($input['password'] ?? '');
        $roleName = (string) ($input['role'] ?? 'customer');

        if ($firstname === '' || $lastname === '' || $email === '' || $password === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing required fields'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid email'];
        }

        if (!self::isPasswordStrong($password)) {
            return ['ok' => false, 'status' => 422, 'error' => self::PASSWORD_REQUIREMENTS_MESSAGE];
        }

        if ($this->users->findByEmail($email) !== null) {
            return ['ok' => false, 'status' => 409, 'error' => 'Email already exists'];
        }

        $roleId = $this->roles->getRoleIdByName($roleName);
        if ($roleId === null) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid role'];
        }

        if (strtolower($roleName) === 'admin' && $this->users->countByRoleId($roleId) > 0) {
            return ['ok' => false, 'status' => 409, 'error' => 'Admin already exists'];
        }

        $user = User::new(
            firstname: $firstname,
            lastname: $lastname,
            email: $email,
            phoneNumber: $phone === '' ? null : $phone,
            address: $address === '' ? null : $address,
            passwordHash: $this->passwordHasher->hash($password),
            roleId: $roleId,
        );

        $created = $this->users->create($user);

        return [
            'ok' => true,
            'user' => [
                'user_id' => $created->id,
                'firstname' => $created->firstname,
                'lastname' => $created->lastname,
                'email' => $created->email,
                'phone_number' => $created->phoneNumber,
                'address' => $created->address,
                'role_id' => $created->roleId,
                'is_verified' => $created->isVerified,
                'created_at' => $created->createdAt?->format('c'),
            ],
        ];
    }
}
