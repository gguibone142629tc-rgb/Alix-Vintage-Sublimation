<?php

declare(strict_types=1);

namespace App\Presentation\Account;

use App\Application\Users\UpdateMyProfile;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class AccountController
{
    public function __construct(
        private readonly Auth $auth,
        private readonly UpdateMyProfile $updateMyProfile,
    ) {
    }

    public function updateProfile(Request $request): void
    {
        $userId = $this->auth->requireUserId($request);
        $data = $request->json();

        $result = $this->updateMyProfile->handle($userId, is_array($data) ? $data : []);
        if (!($result['ok'] ?? false)) {
            $status = (int) ($result['status'] ?? 400);
            $error = (string) ($result['error'] ?? 'Request failed');
            Response::json(['error' => $error], $status);
        }

        Response::json($result, 200);
    }
}
