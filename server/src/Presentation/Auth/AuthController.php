<?php

declare(strict_types=1);

namespace App\Presentation\Auth;

use App\Application\ActivityLogs\LogActivity;
use App\Application\Auth\LoginUser;
use App\Application\Auth\RequestOtp;
use App\Application\Auth\RegisterUser;
use App\Application\Auth\VerifyOtp;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class AuthController
{
    public function __construct(
        private readonly RegisterUser $registerUser,
        private readonly LoginUser $loginUser,
        private readonly RequestOtp $requestOtp,
        private readonly VerifyOtp $verifyOtp,
        private readonly LogActivity $logActivity,
    ) {
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
            'address' => (string) ($data['address'] ?? ''),
            'password' => (string) ($data['password'] ?? ''),
            'role' => 'customer',
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error']], $result['status']);
        }

        $this->logActivity->handle([
            'action' => 'auth.register.customer',
            'actor_user_id' => $result['user']['user_id'] ?? null,
            'actor_role' => 'customer',
            'description' => 'Customer registered',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => $result['user']['email'] ?? null],
        ]);

        // Send OTP after successful registration.
        $otpResult = $this->requestOtp->handle(['email' => (string) ($data['email'] ?? '')]);
        if (!$otpResult['ok']) {
            Response::json(['error' => $otpResult['error']], $otpResult['status']);
        }

        $this->logActivity->handle([
            'action' => 'auth.otp.request',
            'actor_user_id' => $result['user']['user_id'] ?? null,
            'actor_role' => 'customer',
            'description' => 'Requested verification code',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => $result['user']['email'] ?? null],
        ]);

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

        $this->logActivity->handle([
            'action' => 'auth.register.admin',
            'actor_user_id' => $result['user']['user_id'] ?? null,
            'actor_role' => 'admin',
            'description' => 'Admin user registered',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => $result['user']['email'] ?? null],
        ]);

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

        $this->logActivity->handle([
            'action' => 'auth.login',
            'actor_user_id' => $result['user']['user_id'] ?? null,
            'actor_role' => 'customer',
            'description' => 'Customer logged in',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => $result['user']['email'] ?? null],
        ]);

        Response::json([
            'ok' => true,
            'token' => $result['token'],
            'user' => $result['user'],
        ], 200);
    }

    public function adminLogin(Request $request): void
    {
        $data = $request->json();

        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            Response::json(['error' => 'Missing credentials'], 422);
        }

        $expectedUsername = Env::require('ADMIN_LOGIN_USERNAME');
        $expectedPassword = Env::require('ADMIN_LOGIN_PASSWORD');

        $usernameOk = hash_equals($expectedUsername, $username);
        $passwordOk = hash_equals($expectedPassword, $password);

        if (!$usernameOk || !$passwordOk) {
            Response::json(['error' => 'Invalid admin credentials'], 401);
        }

        $this->logActivity->handle([
            'action' => 'auth.admin_login',
            'actor_user_id' => null,
            'actor_role' => 'admin',
            'description' => 'Admin logged in',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['username' => $username],
        ]);

        Response::json(['ok' => true], 200);
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

        $this->logActivity->handle([
            'action' => 'auth.otp.request',
            'actor_user_id' => null,
            'actor_role' => 'customer',
            'description' => 'Requested verification code',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => (string) ($data['email'] ?? '')],
        ]);

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

        $this->logActivity->handle([
            'action' => 'auth.otp.verify',
            'actor_user_id' => $result['user']['user_id'] ?? null,
            'actor_role' => 'customer',
            'description' => 'Verified account',
            'ip_address' => $request->ipAddress(),
            'user_agent' => $request->userAgent(),
            'meta' => ['email' => $result['user']['email'] ?? (string) ($data['email'] ?? '')],
        ]);

        Response::json([
            'ok' => true,
            'token' => $result['token'],
            'user' => $result['user'],
        ], 200);
    }
}
