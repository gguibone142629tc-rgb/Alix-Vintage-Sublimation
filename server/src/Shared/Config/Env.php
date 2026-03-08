<?php

declare(strict_types=1);

namespace App\Shared\Config;

final class Env
{
    private static bool $loaded = false;

    public static function load(string $basePath): void
    {
        if (self::$loaded) {
            return;
        }

        $envPath = rtrim($basePath, DIRECTORY_SEPARATOR);
        $envFile = $envPath . DIRECTORY_SEPARATOR . '.env';
        if (is_dir($envPath) && file_exists($envFile)) {
            self::loadEnvFile($envFile);
        }

        self::$loaded = true;
    }

    private static function loadEnvFile(string $filePath): void
    {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }

            $key = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));

            if ($key === '') {
                continue;
            }

            // Strip surrounding quotes
            if ((str_starts_with($value, '"') && str_ends_with($value, '"'))
                || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            // Don't overwrite existing environment
            if ((isset($_ENV[$key]) && $_ENV[$key] !== '') || getenv($key) !== false) {
                continue;
            }

            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        $value = $_ENV[$key] ?? getenv($key);
        if ($value === false || $value === null || $value === '') {
            return $default;
        }
        return (string) $value;
    }

    public static function require(string $key): string
    {
        $value = self::get($key);
        if ($value === null) {
            throw new \RuntimeException("Missing env var: {$key}");
        }
        return $value;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = strtolower((string) self::get($key, $default ? 'true' : 'false'));
        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }

    public static function int(string $key, int $default): int
    {
        $value = self::get($key);
        return $value === null ? $default : (int) $value;
    }
}
