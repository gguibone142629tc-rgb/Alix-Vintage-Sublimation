<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

final class SupabaseStorageClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $apiKey,
        private readonly string $bucket,
        private readonly bool $publicBucket,
    ) {
        $this->baseUrl = rtrim($this->baseUrl, '/');
        $this->bucket = trim($this->bucket);
    }

    /**
     * @return array{object_path: string, public_url: string|null}
     */
    public function upload(string $objectPath, string $binary, string $contentType, bool $upsert = false): array
    {
        $objectPath = ltrim(str_replace('\\', '/', $objectPath), '/');
        if ($objectPath === '') {
            throw new \InvalidArgumentException('Missing objectPath');
        }

        $bucket = rawurlencode($this->bucket);
        $encodedPath = self::encodePath($objectPath);

        $url = $this->baseUrl . '/storage/v1/object/' . $bucket . '/' . $encodedPath;

        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'apikey: ' . $this->apiKey,
            'Content-Type: ' . $contentType,
        ];
        if ($upsert) {
            $headers[] = 'x-upsert: true';
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to init HTTP client');
        }

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $binary);

        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($body === false || $status < 200 || $status >= 300) {
            $detail = $err !== '' ? $err : (is_string($body) ? $body : '');
            throw new \RuntimeException('Supabase Storage upload failed (HTTP ' . $status . '): ' . $detail);
        }

        $publicUrl = null;
        if ($this->publicBucket) {
            $publicUrl = $this->baseUrl . '/storage/v1/object/public/' . $bucket . '/' . $encodedPath;
        }

        return [
            'object_path' => $objectPath,
            'public_url' => $publicUrl,
        ];
    }

    private static function encodePath(string $path): string
    {
        $path = ltrim($path, '/');
        $parts = array_values(array_filter(explode('/', $path), static fn ($p) => $p !== ''));
        return implode('/', array_map('rawurlencode', $parts));
    }
}
