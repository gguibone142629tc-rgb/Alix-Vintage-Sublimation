<?php

declare(strict_types=1);

namespace App\Presentation\ActivityLogs;

use App\Application\ActivityLogs\ListActivityLogs;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ActivityLogController
{
    public function __construct(private readonly ListActivityLogs $listActivityLogs)
    {
    }

    private function assertAdmin(Request $request): void
    {
        // Local dev convenience: allow without a key in debug mode.
        if (Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local') {
            return;
        }

        $expected = Env::get('ADMIN_API_KEY') ?? Env::get('ADMIN_SETUP_KEY');
        if ($expected === null || trim($expected) === '') {
            // If not configured, allow only in debug mode.
            if (!Env::bool('APP_DEBUG', false)) {
                Response::json(['error' => 'Server not configured for admin logs'], 500);
            }
            return;
        }

        $provided = $request->header('x-admin-api-key');
        if ($provided === null || !hash_equals($expected, $provided)) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    public function list(Request $request): void
    {
        $this->assertAdmin($request);

        $limit = $request->queryParam('limit');
        $offset = $request->queryParam('offset');

        $result = $this->listActivityLogs->handle([
            'limit' => $limit !== null ? (int) $limit : 50,
            'offset' => $offset !== null ? (int) $offset : 0,
        ]);

        if (!$result['ok']) {
            Response::json(['error' => $result['error'] ?? 'Request failed'], (int) ($result['status'] ?? 400));
        }

        Response::json([
            'ok' => true,
            'limit' => $result['limit'],
            'offset' => $result['offset'],
            'logs' => $result['logs'],
        ], 200);
    }
}
