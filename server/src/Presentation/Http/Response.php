<?php

declare(strict_types=1);

namespace App\Presentation\Http;

final class Response
{
    /** @param array<string,mixed> $payload */
    public static function json(array $payload, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Setup-Key');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        echo json_encode($payload, JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function noContent(int $statusCode = 204): void
    {
        http_response_code($statusCode);
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Setup-Key');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        exit;
    }
}
