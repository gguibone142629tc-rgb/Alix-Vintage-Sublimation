<?php

declare(strict_types=1);

namespace App\Presentation\Http;

final class Router
{
    /** @var array<string, array<string, callable(Request): void>> */
    private array $routes = [];

    public function post(string $path, callable $handler): void
    {
        $this->map('POST', $path, $handler);
    }

    public function options(string $path, callable $handler): void
    {
        $this->map('OPTIONS', $path, $handler);
    }

    private function map(string $method, string $path, callable $handler): void
    {
        $method = strtoupper($method);
        $this->routes[$method][$path] = $handler;
    }

    public function dispatch(): void
    {
        $request = new Request();
        $method = $request->method();
        $path = $request->path();

        if ($method === 'OPTIONS') {
            Response::noContent();
        }

        $handler = $this->routes[$method][$path] ?? null;
        if ($handler === null) {
            Response::json(['error' => 'Not found'], 404);
        }

        $handler($request);
    }
}
