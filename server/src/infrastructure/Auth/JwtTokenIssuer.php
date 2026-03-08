<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Users\TokenIssuer;
use App\Shared\Config\Env;

final class JwtTokenIssuer implements TokenIssuer
{
    /** @param array<string,mixed> $claims */
    public function issue(array $claims): string
    {
        $now = time();
        $ttl = Env::int('JWT_TTL_SECONDS', 86400);

        $payload = array_merge($claims, [
            'iss' => Env::get('JWT_ISSUER', 'alix-vintage'),
            'aud' => Env::get('JWT_AUDIENCE', 'alix-vintage-web'),
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + $ttl,
        ]);

        $secret = Env::require('JWT_SECRET');

        $header = ['typ' => 'JWT', 'alg' => 'HS256'];
        $segments = [
            self::b64url(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::b64url(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $secret, true);
        $segments[] = self::b64url($signature);

        return implode('.', $segments);
    }

    private static function b64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
