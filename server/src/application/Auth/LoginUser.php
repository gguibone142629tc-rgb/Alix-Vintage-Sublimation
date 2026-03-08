<?php

declare(strict_types=1);

namespace App\Application\Auth;

use App\Domain\Users\PasswordHasher;
use App\Domain\Users\TokenIssuer;
use App\Domain\Users\UserRepository;

final class LoginUser
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly PasswordHasher $passwordHasher,
        private readonly TokenIssuer $tokenIssuer,
    ) {
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');

        if ($email === '' || $password === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing email or password'];
        }

        $user = $this->users->findByEmail($email);
        if ($user === null) {
            return ['ok' => false, 'status' => 401, 'error' => 'Invalid credentials'];
        }

        if (!$user->isVerified) {
            return ['ok' => false, 'status' => 403, 'error' => 'Account not verified'];
        }

        if (!$this->passwordHasher->verify($password, $user->passwordHash)) {
            return ['ok' => false, 'status' => 401, 'error' => 'Invalid credentials'];
        }

        $token = $this->tokenIssuer->issue([
            'user_id' => $user->id,
            'email' => $user->email,
            'role_id' => $user->roleId,
        ]);

        return [
            'ok' => true,
            'token' => $token,
            'user' => [
                'user_id' => $user->id,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'email' => $user->email,
                'phone_number' => $user->phoneNumber,
                'role_id' => $user->roleId,
                'is_verified' => $user->isVerified,
                'created_at' => $user->createdAt?->format('c'),
            ],
        ];
    }
}
