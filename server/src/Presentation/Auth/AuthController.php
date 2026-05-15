<?php

declare(strict_types=1);

namespace App\Presentation\Auth;

use App\Application\Auth\LoginUser;
use App\Application\Auth\RequestOtp;
use App\Application\Auth\RequestPasswordReset;
use App\Application\Auth\RegisterUser;
use App\Application\Auth\ResetPassword;
use App\Application\Auth\VerifyOtp;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;
use App\Domain\Users\RoleRepository;
use App\Domain\Users\UserRepository;

final class AuthController
{
    public function __construct(
        private readonly RegisterUser $registerUser,
        private readonly LoginUser $loginUser,
        private readonly RequestOtp $requestOtp,
        private readonly VerifyOtp $verifyOtp,
        private readonly RequestPasswordReset $requestPasswordReset,
        private readonly ResetPassword $resetPassword,
        private readonly RoleRepository $roles,
        private readonly UserRepository $users,
    ) {
    }

    private function requireAdminRoleId(): int
    {
        $roleId = $this->roles->getRoleIdByName('admin');
        if ($roleId === null) {
            Response::json(['error' => 'Server roles not configured'], 500);
        }
        return (int) $roleId;
    }

    public function registerCustomer(Request $request): void
    {
        $data = $request->json();

        $phoneNumber = isset($data['phone_number']) ? (string) $data['phone_number'] : '';
        if (trim($phoneNumber) === '') {
            Response::json(['error' => 'Missing phone number'], 422);
        }

        $result = $this->registerUser->handle([
            'firstname' => (string) ($data['firstname'] ?? ''),
            'lastname' => (string) ($data['lastname'] ?? ''),
            'email' => (string) ($data['email'] ?? ''),
            'phone_number' => $phoneNumber,
            'password' => (string) ($data['password'] ?? ''),
            'role' => 'customer',
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        // Send OTP after successful registration.
        $otpResult = $this->requestOtp->handle(['email' => (string) ($data['email'] ?? '')]);
        if (!$otpResult['ok']) {
            Response::json(['error' => $otpResult['error']], $otpResult['status']);
        }

        Response::json(['ok' => true, 'user' => $result['user'], 'next' => 'otp'], 201);
    }

    public function registerAdmin(Request $request): void
    {
        $setupKey = $request->header('x-admin-setup-key');
        if ($setupKey === null || $setupKey !== Env::require('ADMIN_SETUP_KEY')) {
            Response::json(['error' => 'Forbidden'], 403);
        }

        $data = $request->json();

        $result = $this->registerUser->handle([
            'firstname' => (string) ($data['firstname'] ?? ''),
            'lastname' => (string) ($data['lastname'] ?? ''),
            'email' => (string) ($data['email'] ?? ''),
            'phone_number' => isset($data['phone_number']) ? (string) $data['phone_number'] : null,
            'password' => (string) ($data['password'] ?? ''),
            'role' => 'admin',
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        // Admin accounts should be usable immediately (no OTP flow).
        $userId = (int) ($result['user']['user_id'] ?? 0);
        if ($userId > 0) {
            $this->users->markVerified($userId);
            $result['user']['is_verified'] = true;
        }

        Response::json(['ok' => true, 'user' => $result['user']], 201);
    }

    public function login(Request $request): void
    {
        $data = $request->json();

        $result = $this->loginUser->handle([
            'email' => (string) ($data['email'] ?? ''),
            'password' => (string) ($data['password'] ?? ''),
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        Response::json([
            'ok' => true,
            'token' => $result['token'],
            'user' => $result['user'],
        ], 200);
    }

    public function adminLogin(Request $request): void
    {
        $data = $request->json();

        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');

        $result = $this->loginUser->handle([
            'email' => $email,
            'password' => $password,
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        $adminRoleId = $this->requireAdminRoleId();
        $roleId = $result['user']['role_id'] ?? null;
        $roleId = (is_int($roleId) || is_numeric($roleId)) ? (int) $roleId : 0;
        if ($roleId !== $adminRoleId) {
            Response::json(['error' => 'Forbidden'], 403);
        }

        Response::json([
            'ok' => true,
            'token' => $result['token'],
            'user' => $result['user'],
        ], 200);
    }

    public function requestOtp(Request $request): void
    {
        $data = $request->json();
        $result = $this->requestOtp->handle([
            'email' => (string) ($data['email'] ?? ''),
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        Response::json(['ok' => true], 200);
    }

    public function verifyOtp(Request $request): void
    {
        $data = $request->json();
        $result = $this->verifyOtp->handle([
            'email' => (string) ($data['email'] ?? ''),
            'otp_code' => (string) ($data['otp_code'] ?? ''),
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        Response::json([
            'ok' => true,
            'token' => $result['token'],
            'user' => $result['user'],
        ], 200);
    }

    public function requestPasswordReset(Request $request): void
    {
        $data = $request->json();
        $result = $this->requestPasswordReset->handle([
            'email' => (string) ($data['email'] ?? ''),
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        Response::json(['ok' => true], 200);
    }

    public function confirmPasswordReset(Request $request): void
    {
        $data = $request->json();
        $result = $this->resetPassword->handle([
            'email' => (string) ($data['email'] ?? ''),
            'otp_code' => (string) ($data['otp_code'] ?? ''),
            'new_password' => (string) ($data['new_password'] ?? ''),
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        Response::json(['ok' => true], 200);
    }
}
