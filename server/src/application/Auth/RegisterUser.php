<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Users\PasswordHasher;
use App\Domain\Users\RoleRepository;
use App\Domain\Users\User;
use App\Domain\Users\UserRepository;

final class RegisterUser
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly RoleRepository $roles,
        private readonly PasswordHasher $passwordHasher,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $firstname = trim((string) ($input['firstname'] ?? ''));
        $lastname = trim((string) ($input['lastname'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phone = isset($input['phone_number']) ? trim((string) $input['phone_number']) : null;
        $password = (string) ($input['password'] ?? '');
        $roleName = (string) ($input['role'] ?? 'customer');

        if ($firstname === '' || $lastname === '' || $email === '' || $password === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing required fields'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid email'];
        }

        if (strlen($password) < 8) {
            return ['ok' => false, 'status' => 422, 'error' => 'Password must be at least 8 characters'];
        }

        if ($this->users->findByEmail($email) !== null) {
            return ['ok' => false, 'status' => 409, 'error' => 'Email already exists'];
        }

        $roleId = $this->roles->getRoleIdByName($roleName);
        if ($roleId === null) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid role'];
        }

        $user = User::new(
            firstname: $firstname,
            lastname: $lastname,
            email: $email,
            phoneNumber: $phone === '' ? null : $phone,
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
                'role_id' => $created->roleId,
                'is_verified' => $created->isVerified,
                'created_at' => $created->createdAt?->format('c'),
            ],
        ];
    }
}
