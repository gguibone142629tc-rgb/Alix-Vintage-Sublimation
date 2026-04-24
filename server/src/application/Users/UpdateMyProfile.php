<?php

declare(strict_types=1);

namespace App\Application\Users;

use App\Domain\Users\UserRepository;

final class UpdateMyProfile
{
    public function __construct(private readonly UserRepository $users)
    {
    }

    /** @param array<string,mixed> $input */
    public function handle(int $userId, array $input): array
    {
        $firstname = trim((string) ($input['firstname'] ?? ''));
        $lastname = trim((string) ($input['lastname'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $phoneNumberRaw = trim((string) ($input['phone_number'] ?? ''));
        $addressRaw = trim((string) ($input['address'] ?? ''));

        $phoneNumber = $phoneNumberRaw === '' ? null : $phoneNumberRaw;
        $address = $addressRaw === '' ? null : $addressRaw;

        if ($firstname === '' || $lastname === '' || $email === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing required fields'];
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid email address'];
        }

        $current = $this->users->findById($userId);
        if ($current === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'User not found'];
        }

        $existingByEmail = $this->users->findByEmail($email);
        if ($existingByEmail !== null && $existingByEmail->id !== $userId) {
            return ['ok' => false, 'status' => 409, 'error' => 'Email is already in use'];
        }

        $this->users->updateProfile($userId, $firstname, $lastname, $email, $phoneNumber, $address);

        $updated = $this->users->findById($userId);
        if ($updated === null) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to load updated profile'];
        }

        return [
            'ok' => true,
            'user' => [
                'user_id' => $updated->id,
                'firstname' => $updated->firstname,
                'lastname' => $updated->lastname,
                'email' => $updated->email,
                'phone_number' => $updated->phoneNumber,
                'address' => $updated->address,
                'role_id' => $updated->roleId,
                'is_verified' => $updated->isVerified,
                'created_at' => $updated->createdAt?->format('c'),
            ],
        ];
    }
}
