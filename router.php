<?php

declare(strict_types=1);

// Run from project root:
//   php -S localhost:5500 router.php
//
// This router serves static frontend files from the repo root (pages/, css/, js/, assets/)
// and forwards API requests (/api/*) to the backend front controller (server/public/index.php).

$uriPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// 1) Forward API calls to backend.
if (preg_match('#^/api/#', $uriPath) === 1) {
    require __DIR__ . '/server/public/index.php';
    return;
}

// 2) If the requested static file exists, let PHP's built-in server serve it.
$fullPath = __DIR__ . $uriPath;
if ($uriPath !== '/' && is_file($fullPath)) {
    return false;
}

// 3) Convenience: redirect root to landing page.
if ($uriPath === '/' || $uriPath === '') {
    header('Location: /pages/landing-page.html', true, 302);
    exit;
}

// 4) Fallback: if a bare name was requested, try to serve from /pages.
$pagesFallback = __DIR__ . '/pages' . $uriPath;
if (is_file($pagesFallback)) {
    $_SERVER['REQUEST_URI'] = '/pages' . $uriPath;
    return false;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo "Not found";
