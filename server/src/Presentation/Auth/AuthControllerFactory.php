<?php

declare(strict_types=1);

namespace App\Presentation\Auth;

use App\Application\ActivityLogs\LogActivity;
use App\Application\Auth\LoginUser;
use App\Application\Auth\RequestOtp;
use App\Application\Auth\RequestPasswordReset;
use App\Application\Auth\RegisterUser;
use App\Application\Auth\ResetPassword;
use App\Application\Auth\VerifyOtp;
use App\Infrastructure\Auth\JwtTokenIssuer;
use App\Infrastructure\Auth\NativePasswordHasher;
use App\Infrastructure\ActivityLogs\PdoActivityLogRepository;
use App\Infrastructure\Notifications\PhpMailEmailSender;
use App\Infrastructure\Users\PdoRoleRepository;
use App\Infrastructure\Users\PdoUserRepository;

final class AuthControllerFactory
{
    public static function create(\PDO $pdo): AuthController
    {
        $userRepo = new PdoUserRepository($pdo);
        $roleRepo = new PdoRoleRepository($pdo);
        $passwordHasher = new NativePasswordHasher();
        $tokenIssuer = new JwtTokenIssuer();
        $emailSender = new PhpMailEmailSender();

        $activityRepo = new PdoActivityLogRepository($pdo);
        $logActivity = new LogActivity($activityRepo);

        $register = new RegisterUser($userRepo, $roleRepo, $passwordHasher);
        $login = new LoginUser($userRepo, $passwordHasher, $tokenIssuer);
        $requestOtp = new RequestOtp($userRepo, $emailSender);
        $verifyOtp = new VerifyOtp($userRepo, $tokenIssuer);

        $requestPasswordReset = new RequestPasswordReset($userRepo, $emailSender);
        $resetPassword = new ResetPassword($userRepo, $passwordHasher);

        return new AuthController($register, $login, $requestOtp, $verifyOtp, $requestPasswordReset, $resetPassword, $logActivity);
    }
}
