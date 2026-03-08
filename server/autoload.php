<?php

declare(strict_types=1);

/**
 * Minimal PSR-4 style autoloader (no Composer required).
 * Maps the App\\ namespace to /src.
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $relativePath = str_replace('\\', DIRECTORY_SEPARATOR, $relative) . '.php';

    $file = __DIR__ . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . $relativePath;

    if (is_file($file)) {
        require $file;
        return;
    }

    // Repo uses mixed-case top-level folders under /src.
    // On case-sensitive OSes (Linux/macOS), map known segments to the actual folder casing.
    $parts = explode(DIRECTORY_SEPARATOR, $relativePath);
    $first = $parts[0] ?? '';
    $map = [
        'Application' => 'application',
        'Domain' => 'domain',
        'Infrastructure' => 'infrastructure',
    ];

    if (isset($map[$first])) {
        $parts[0] = $map[$first];
        $altRelativePath = implode(DIRECTORY_SEPARATOR, $parts);
        $altFile = __DIR__ . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . $altRelativePath;
        if (is_file($altFile)) {
            require $altFile;
        }
    }
});
