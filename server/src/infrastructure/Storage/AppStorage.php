<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use App\Shared\Config\Env;

final class AppStorage
{
    private static ?SupabaseStorageClient $client = null;
    private static bool $initialized = false;

    public static function enabled(): bool
    {
        return self::client() !== null;
    }

    public static function uploadPublic(string $objectPath, string $binary, string $contentType, bool $upsert = false): ?string
    {
        $client = self::client();
        if ($client === null) {
            return null;
        }

        $result = $client->upload($objectPath, $binary, $contentType, $upsert);
        return $result['public_url'] ?? null;
    }

    private static function client(): ?SupabaseStorageClient
    {
        if (self::$initialized) {
            return self::$client;
        }
        self::$initialized = true;

        $enabled = Env::bool('SUPABASE_STORAGE_ENABLED', false);
        if (!$enabled) {
            self::$client = null;
            return null;
        }

        $url = trim((string) Env::get('SUPABASE_URL', ''));
        $key = trim((string) Env::get('SUPABASE_SERVICE_ROLE_KEY', ''));
        $bucket = trim((string) Env::get('SUPABASE_STORAGE_BUCKET', ''));
        $publicBucket = Env::bool('SUPABASE_STORAGE_PUBLIC', true);

        if ($url === '' || $key === '' || $bucket === '') {
            self::$client = null;
            return null;
        }

        self::$client = new SupabaseStorageClient($url, $key, $bucket, $publicBucket);
        return self::$client;
    }
}
