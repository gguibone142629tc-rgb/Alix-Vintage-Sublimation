<?php

declare(strict_types=1);

namespace App\Presentation\Http;

final class Request
{
    public function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function path(): string
    {
        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH);
        return $path === null ? '/' : (string) $path;
    }

    /** @return array<string,string> */
    public function headers(): array
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (!str_starts_with($key, 'HTTP_')) {
                continue;
            }
            $name = str_replace('_', '-', strtolower(substr($key, 5)));
            $headers[$name] = (string) $value;
        }

        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        return $headers;
    }

    public function header(string $name): ?string
    {
        $key = strtolower($name);
        return $this->headers()[$key] ?? null;
    }

    /** @return array<string,mixed> */
    public function json(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }
}
