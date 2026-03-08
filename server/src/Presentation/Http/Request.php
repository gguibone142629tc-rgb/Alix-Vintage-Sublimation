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
    public function query(): array
    {
        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $query = parse_url($uri, PHP_URL_QUERY);
        if ($query === null || $query === '') {
            return [];
        }

        $out = [];
        parse_str($query, $out);

        $normalized = [];
        foreach ($out as $k => $v) {
            if (is_scalar($v)) {
                $normalized[(string) $k] = (string) $v;
            }
        }
        return $normalized;
    }

    public function queryParam(string $name): ?string
    {
        return $this->query()[$name] ?? null;
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

    public function ipAddress(): ?string
    {
        $xff = $this->header('x-forwarded-for');
        if ($xff !== null && trim($xff) !== '') {
            $first = trim(explode(',', $xff)[0] ?? '');
            if ($first !== '') {
                return $first;
            }
        }

        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        return trim($ip) === '' ? null : $ip;
    }

    public function userAgent(): ?string
    {
        $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
        return trim($ua) === '' ? null : $ua;
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
