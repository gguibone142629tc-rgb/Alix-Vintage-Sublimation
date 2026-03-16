<?php

declare(strict_types=1);

namespace App\Presentation\Http;

use App\Domain\Users\TokenVerifier;

final class Auth
{
    public function __construct(private readonly TokenVerifier $tokens)
    {
    }

    /** @return array<string,mixed> */
    public function requireClaims(Request $request): array
    {
        $auth = $request->header('authorization');
        if ($auth === null) {
            Response::json(['error' => 'Unauthorized'], 401);
        }

        $auth = trim($auth);
        $prefix = 'Bearer ';
        if (!str_starts_with($auth, $prefix)) {
            Response::json(['error' => 'Unauthorized'], 401);
        }

        $token = trim(substr($auth, strlen($prefix)));
        $claims = $this->tokens->verify($token);
        if ($claims === null) {
            Response::json(['error' => 'Unauthorized'], 401);
        }

        return $claims;
    }

    public function requireUserId(Request $request): int
    {
        $claims = $this->requireClaims($request);
        $userId = $claims['user_id'] ?? null;
        if (!is_int($userId) && !is_numeric($userId)) {
            Response::json(['error' => 'Unauthorized'], 401);
        }

        return (int) $userId;
    }
}
