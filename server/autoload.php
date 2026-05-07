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

    // Repo has had casing inconsistencies across OSes/clones.
    // On case-sensitive OSes (Linux/macOS), try a few targeted fallbacks.
    $parts = explode(DIRECTORY_SEPARATOR, $relativePath);

    $topLevelMap = [
        'Application' => 'application',
        'Domain' => 'domain',
        'Infrastructure' => 'infrastructure',
        'Presentation' => 'presentation',
        'Shared' => 'shared',
    ];
    $nestedMap = [
        'Db' => 'db',
    ];

    $mapSets = [
        $nestedMap,
        $topLevelMap,
        $topLevelMap + $nestedMap,
    ];

    foreach ($mapSets as $map) {
        $altParts = $parts;
        $changed = false;

        foreach ($altParts as $i => $part) {
            if (isset($map[$part])) {
                $altParts[$i] = $map[$part];
                $changed = true;
            }
        }

        if (!$changed) {
            continue;
        }

        $altRelativePath = implode(DIRECTORY_SEPARATOR, $altParts);
        $altFile = __DIR__ . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . $altRelativePath;
        if (is_file($altFile)) {
            require $altFile;
            return;
        }
    }
});
