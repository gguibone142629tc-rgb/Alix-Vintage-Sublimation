<?php

declare(strict_types=1);

namespace App\Infrastructure\Auth;

use App\Domain\Users\TokenVerifier;
use App\Shared\Config\Env;

final class JwtTokenVerifier implements TokenVerifier
{
    /** @return array<string,mixed>|null */
    public function verify(string $token): ?array
    {
        $token = trim($token);
        if ($token === '') {
            return null;
        }

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$encodedHeader, $encodedPayload, $encodedSignature] = $parts;

        $headerJson = self::b64urlDecode($encodedHeader);
        $payloadJson = self::b64urlDecode($encodedPayload);
        if ($headerJson === null || $payloadJson === null) {
            return null;
        }

        $header = json_decode($headerJson, true);
        $payload = json_decode($payloadJson, true);
        if (!is_array($header) || !is_array($payload)) {
            return null;
        }

        if (($header['alg'] ?? null) !== 'HS256') {
            return null;
        }

        $secret = Env::require('JWT_SECRET');
        $signingInput = $encodedHeader . '.' . $encodedPayload;
        $expected = hash_hmac('sha256', $signingInput, $secret, true);
        $expectedEncoded = self::b64urlEncode($expected);

        if (!hash_equals($expectedEncoded, $encodedSignature)) {
            return null;
        }

        $now = time();
        if (isset($payload['nbf']) && is_numeric($payload['nbf']) && $now < (int) $payload['nbf']) {
            return null;
        }
        if (isset($payload['exp']) && is_numeric($payload['exp']) && $now >= (int) $payload['exp']) {
            return null;
        }

        return $payload;
    }

    private static function b64urlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64urlDecode(string $data): ?string
    {
        $data = strtr($data, '-_', '+/');
        $pad = strlen($data) % 4;
        if ($pad > 0) {
            $data .= str_repeat('=', 4 - $pad);
        }

        $decoded = base64_decode($data, true);
        return $decoded === false ? null : $decoded;
    }
}
