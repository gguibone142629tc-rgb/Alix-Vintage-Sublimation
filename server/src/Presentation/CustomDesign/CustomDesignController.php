<?php

declare(strict_types=1);

namespace App\Presentation\CustomDesign;

use App\Infrastructure\Orders\PdoOrderRepository;
use App\Presentation\Http\Auth;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;

final class CustomDesignController
{
    private const MAX_FILE_BYTES = 26214400; // 25MB

    public function __construct(
        private readonly \PDO $pdo,
        private readonly Auth $auth,
    ) {
    }

    private function requireUserId(Request $request): int
    {
        return $this->auth->requireUserId($request);
    }

    private function requireUserAddress(int $userId): string
    {
        $stmt = $this->pdo->prepare('SELECT address FROM users WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $raw = $stmt->fetchColumn();

        if ($raw === false) {
            Response::json(['error' => 'User not found'], 404);
        }

        $address = trim((string) ($raw ?? ''));
        if ($address === '') {
            Response::json(['error' => 'Please set your address in Account Settings before submitting a custom request'], 422);
        }

        return $address;
    }

    private function repoRoot(): string
    {
        // server/src/Presentation/CustomDesign -> repo root
        $root = dirname(__DIR__, 4);
        return is_string($root) && $root !== '' ? $root : '.';
    }

    private function ensureDir(string $path): void
    {
        if (is_dir($path)) {
            return;
        }

        if (!@mkdir($path, 0775, true) && !is_dir($path)) {
            Response::json(['error' => 'Failed to create upload directory'], 500);
        }
    }

    private function sanitizeFilename(string $name): string
    {
        $name = basename($name);
        $name = preg_replace('~[^a-zA-Z0-9._-]+~', '_', $name) ?? 'file';
        $name = trim($name, '._-');
        return $name === '' ? 'file' : $name;
    }

    private function fileExt(string $name): string
    {
        $pos = strrpos($name, '.');
        if ($pos === false) {
            return '';
        }
        return strtolower(substr($name, $pos + 1));
    }

    private function assertAllowedExt(string $ext): void
    {
        $allowed = ['png', 'jpg', 'jpeg', 'svg'];
        if (!in_array($ext, $allowed, true)) {
            Response::json(['error' => 'Unsupported file type'], 400);
        }
    }

    /** @return array<string,mixed> */
    private function moveOneFile(array $file, string $destDir, string $prefix): array
    {
        $err = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($err === UPLOAD_ERR_NO_FILE) {
            return [];
        }
        if ($err !== UPLOAD_ERR_OK) {
            Response::json(['error' => 'File upload failed'], 400);
        }

        $tmp = (string) ($file['tmp_name'] ?? '');
        $orig = (string) ($file['name'] ?? '');
        $size = (int) ($file['size'] ?? 0);

        if ($tmp === '' || !is_uploaded_file($tmp)) {
            Response::json(['error' => 'Invalid upload'], 400);
        }
        if ($size < 1 || $size > self::MAX_FILE_BYTES) {
            Response::json(['error' => 'File too large (max 25MB)'], 400);
        }

        $safeOrig = $this->sanitizeFilename($orig);
        $ext = $this->fileExt($safeOrig);
        $this->assertAllowedExt($ext);

        $finalName = $prefix . '_' . bin2hex(random_bytes(6)) . ($ext !== '' ? '.' . $ext : '');
        $destPath = rtrim($destDir, '/\\') . DIRECTORY_SEPARATOR . $finalName;

        if (!@move_uploaded_file($tmp, $destPath)) {
            Response::json(['error' => 'Failed to store uploaded file'], 500);
        }

        $relative = str_replace('\\', '/', $destPath);
        $root = str_replace('\\', '/', $this->repoRoot());
        if (str_starts_with($relative, $root . '/')) {
            $relative = substr($relative, strlen($root) + 1);
        }

        return [
            'original_name' => $safeOrig,
            'path' => $relative,
            'size' => $size,
        ];
    }

    /** @return array<int,array<string,mixed>> */
    private function moveManyFiles(array $files, string $destDir, string $prefix): array
    {
        $out = [];

        $names = $files['name'] ?? null;
        if (!is_array($names)) {
            // single file shape
            $moved = $this->moveOneFile($files, $destDir, $prefix);
            return $moved ? [$moved] : [];
        }

        $count = count($names);
        for ($i = 0; $i < $count; $i++) {
            $f = [
                'name' => $files['name'][$i] ?? '',
                'type' => $files['type'][$i] ?? '',
                'tmp_name' => $files['tmp_name'][$i] ?? '',
                'error' => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
                'size' => $files['size'][$i] ?? 0,
            ];
            $moved = $this->moveOneFile($f, $destDir, $prefix);
            if ($moved) {
                $out[] = $moved;
            }
        }

        return $out;
    }

    /** @return array<int,array<string,mixed>> */
    private function normalizeRoster(mixed $roster): array
    {
        if (is_array($roster)) {
            return $roster;
        }
        if (is_string($roster)) {
            $decoded = json_decode($roster, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    private function readPostedString(string $key, int $maxLen = 5000): string
    {
        $v = isset($_POST[$key]) ? (string) $_POST[$key] : '';
        $v = trim($v);
        if ($maxLen > 0 && strlen($v) > $maxLen) {
            $v = substr($v, 0, $maxLen);
        }
        return $v;
    }

    private function readPostedInt(string $key): ?int
    {
        if (!isset($_POST[$key])) {
            return null;
        }
        $raw = trim((string) $_POST[$key]);
        if ($raw === '') {
            return null;
        }
        if (!is_numeric($raw)) {
            return null;
        }
        return (int) $raw;
    }

    private function normalizeSizeEnum(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $v = strtoupper(trim($value));
        if ($v === '') {
            return null;
        }

        $map = [
            '2XL' => 'XXL',
            '3XL' => 'XXXL',
            '2X' => 'XXL',
            '3X' => 'XXXL',
        ];
        $v = $map[$v] ?? $v;

        $allowed = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        return in_array($v, $allowed, true) ? $v : null;
    }

    private function getOrCreateCustomDesignProductId(): int
    {
        $stmt = $this->pdo->prepare('SELECT product_id FROM products WHERE product_name = :name ORDER BY product_id ASC LIMIT 1');
        $stmt->execute(['name' => 'Custom Design']);
        $id = $stmt->fetchColumn();
        if ($id !== false && is_numeric($id)) {
            return (int) $id;
        }

        $insert = $this->pdo->prepare(
            'INSERT INTO products (product_name, apparel_type, collection, base_price, image_path, stock_status) '
            . 'VALUES (:name, :apparel_type::apparel_type, :collection, :base_price, :image_path, :stock_status) '
            . 'RETURNING product_id'
        );
        $insert->execute([
            'name' => 'Custom Design',
            'apparel_type' => 'other',
            'collection' => 'Custom',
            'base_price' => 0,
            'image_path' => null,
            'stock_status' => true,
        ]);
        $newId = $insert->fetchColumn();
        if ($newId === false || !is_numeric($newId)) {
            throw new \RuntimeException('Failed to create placeholder product for custom design');
        }
        return (int) $newId;
    }

    public function saveDraft(Request $request): void
    {
        $userId = $this->requireUserId($request);
        $body = $request->json();

        $draftIdRaw = $body['draft_id'] ?? null;
        $draftId = is_numeric($draftIdRaw) ? (int) $draftIdRaw : null;

        $designName = trim((string) ($body['design_name'] ?? ''));
        $productType = trim((string) ($body['product_type'] ?? ''));
        $designType = trim((string) ($body['design_type'] ?? 'final'));
        $personalization = trim((string) ($body['personalization'] ?? 'names_numbers'));
        $paymentPreference = trim((string) ($body['payment_preference'] ?? 'GCash'));
        $notes = (string) ($body['notes'] ?? '');
        $quantityRaw = $body['quantity'] ?? null;
        $quantity = is_numeric($quantityRaw) ? (int) $quantityRaw : 1;
        $roster = $this->normalizeRoster($body['roster'] ?? []);

        if ($designName === '') {
            $designName = 'Draft';
        }
        if ($productType === '') {
            $productType = 'Custom';
        }
        if (!in_array($designType, ['final', 'reference'], true)) {
            $designType = 'final';
        }
        if (!in_array($personalization, ['names_numbers', 'number_only', 'none'], true)) {
            $personalization = 'names_numbers';
        }
        if (!in_array($paymentPreference, ['GCash', 'COD'], true)) {
            $paymentPreference = 'GCash';
        }
        if ($quantity < 1) {
            $quantity = max(1, count($roster));
        }

        if ($draftId !== null && $draftId > 0) {
            $stmt = $this->pdo->prepare(
                'UPDATE custom_design_requests '
                . 'SET design_name = :design_name, product_type = :product_type, design_type = :design_type, quantity = :quantity, personalization = :personalization, payment_preference = :payment_preference, notes = :notes, roster = :roster, updated_at = NOW() '
                . 'WHERE request_id = :request_id AND user_id = :user_id AND status = :status '
                . 'RETURNING request_id'
            );
            $stmt->execute([
                'design_name' => $designName,
                'product_type' => $productType,
                'design_type' => $designType,
                'quantity' => $quantity,
                'personalization' => $personalization,
                'payment_preference' => $paymentPreference,
                'notes' => $notes,
                'roster' => json_encode($roster, JSON_UNESCAPED_UNICODE),
                'request_id' => $draftId,
                'user_id' => $userId,
                'status' => 'draft',
            ]);

            $updatedId = $stmt->fetchColumn();
            if ($updatedId !== false) {
                Response::json(['ok' => true, 'request_id' => (int) $updatedId], 200);
            }
        }

        $stmt = $this->pdo->prepare(
            'INSERT INTO custom_design_requests (user_id, status, design_name, product_type, design_type, quantity, personalization, payment_preference, notes, roster) '
            . 'VALUES (:user_id, :status, :design_name, :product_type, :design_type, :quantity, :personalization, :payment_preference, :notes, :roster) '
            . 'RETURNING request_id'
        );
        $stmt->execute([
            'user_id' => $userId,
            'status' => 'draft',
            'design_name' => $designName,
            'product_type' => $productType,
            'design_type' => $designType,
            'quantity' => $quantity,
            'personalization' => $personalization,
            'payment_preference' => $paymentPreference,
            'notes' => $notes,
            'roster' => json_encode($roster, JSON_UNESCAPED_UNICODE),
        ]);

        $newId = $stmt->fetchColumn();
        Response::json(['ok' => true, 'request_id' => (int) $newId], 201);
    }

    public function submit(Request $request): void
    {
        $userId = $this->requireUserId($request);

        $termsAck = strtolower($this->readPostedString('terms_ack', 20));
        if (!in_array($termsAck, ['1', 'true', 'yes', 'on'], true)) {
            Response::json(['error' => 'Please acknowledge the terms before submitting'], 400);
        }

        $designName = $this->readPostedString('design_name', 255);
        $productType = $this->readPostedString('product_type', 80);
        $designType = $this->readPostedString('design_type', 20);
        $personalization = $this->readPostedString('personalization', 30);
        $paymentPreference = $this->readPostedString('payment_preference', 20);
        $notes = $this->readPostedString('notes', 10000);
        $quantity = $this->readPostedInt('quantity') ?? 0;
        $roster = $this->normalizeRoster($_POST['roster'] ?? '[]');

        if ($designName === '') {
            Response::json(['error' => 'Design name is required'], 400);
        }
        if ($productType === '') {
            Response::json(['error' => 'Product type is required'], 400);
        }
        if (!in_array($designType, ['final', 'reference'], true)) {
            Response::json(['error' => 'Invalid design type'], 400);
        }
        if (!in_array($personalization, ['names_numbers', 'number_only', 'none'], true)) {
            Response::json(['error' => 'Invalid personalization option'], 400);
        }
        if (!in_array($paymentPreference, ['GCash', 'COD'], true)) {
            Response::json(['error' => 'Invalid payment preference'], 400);
        }

        $profileAddress = $this->requireUserAddress($userId);

        $effectiveQty = $quantity > 0 ? $quantity : max(1, count($roster));

        // Allow submitting from an existing draft to avoid duplicate rows.
        $draftId = $this->readPostedInt('draft_id');
        $requestId = null;
        if ($draftId !== null && $draftId > 0) {
            $stmt = $this->pdo->prepare(
                'UPDATE custom_design_requests '
                . 'SET status = :status, design_name = :design_name, product_type = :product_type, design_type = :design_type, quantity = :quantity, personalization = :personalization, payment_preference = :payment_preference, notes = :notes, roster = :roster, updated_at = NOW() '
                . 'WHERE request_id = :request_id AND user_id = :user_id AND status = :draft_status '
                . 'RETURNING request_id'
            );
            $stmt->execute([
                'status' => 'submitted',
                'design_name' => $designName,
                'product_type' => $productType,
                'design_type' => $designType,
                'quantity' => $effectiveQty,
                'personalization' => $personalization,
                'payment_preference' => $paymentPreference,
                'notes' => $notes,
                'roster' => json_encode($roster, JSON_UNESCAPED_UNICODE),
                'request_id' => $draftId,
                'user_id' => $userId,
                'draft_status' => 'draft',
            ]);

            $updated = $stmt->fetchColumn();
            if ($updated !== false) {
                $requestId = (int) $updated;
            }
        }

        if ($requestId === null) {
            $stmt = $this->pdo->prepare(
                'INSERT INTO custom_design_requests (user_id, status, design_name, product_type, design_type, quantity, personalization, payment_preference, notes, roster) '
                . 'VALUES (:user_id, :status, :design_name, :product_type, :design_type, :quantity, :personalization, :payment_preference, :notes, :roster) '
                . 'RETURNING request_id'
            );
            $stmt->execute([
                'user_id' => $userId,
                'status' => 'submitted',
                'design_name' => $designName,
                'product_type' => $productType,
                'design_type' => $designType,
                'quantity' => $effectiveQty,
                'personalization' => $personalization,
                'payment_preference' => $paymentPreference,
                'notes' => $notes,
                'roster' => json_encode($roster, JSON_UNESCAPED_UNICODE),
            ]);

            $requestId = (int) $stmt->fetchColumn();
        }

        $root = $this->repoRoot();
        $uploadRoot = $root . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'custom-design' . DIRECTORY_SEPARATOR . 'req-' . $requestId;
        $this->ensureDir($uploadRoot);

        $filesMeta = [
            'main' => [],
            'logo' => [],
            'references' => [],
        ];

        if (isset($_FILES['main_files'])) {
            $filesMeta['main'] = $this->moveManyFiles($_FILES['main_files'], $uploadRoot, 'main');
        } elseif (isset($_FILES['main_file'])) {
            // Backward compat with older clients.
            $m = $this->moveOneFile($_FILES['main_file'], $uploadRoot, 'main');
            if ($m) {
                $filesMeta['main'] = [$m];
            }
        }

        if (isset($_FILES['logo_files'])) {
            $filesMeta['logo'] = $this->moveManyFiles($_FILES['logo_files'], $uploadRoot, 'logo');
        } elseif (isset($_FILES['logo_file'])) {
            // Backward compat with older clients.
            $m = $this->moveOneFile($_FILES['logo_file'], $uploadRoot, 'logo');
            if ($m) {
                $filesMeta['logo'] = [$m];
            }
        }

        if (isset($_FILES['reference_files'])) {
            $refs = $this->moveManyFiles($_FILES['reference_files'], $uploadRoot, 'ref');
            $filesMeta['references'] = $refs;
        }

        $mainCount = is_array($filesMeta['main']) ? count($filesMeta['main']) : 0;

        if ($designType === 'final' && $mainCount < 1) {
            Response::json(['error' => 'Main design file is required (or select Reference image only)'], 400);
        }
        if ($designType === 'reference' && count($filesMeta['references']) < 1 && $mainCount < 1) {
            Response::json(['error' => 'Please upload at least one reference image'], 400);
        }

        $stmt = $this->pdo->prepare(
            'UPDATE custom_design_requests SET files = :files, updated_at = NOW() WHERE request_id = :request_id AND user_id = :user_id'
        );
        $stmt->execute([
            'files' => json_encode($filesMeta, JSON_UNESCAPED_UNICODE),
            'request_id' => $requestId,
            'user_id' => $userId,
        ]);

        // Create (or reuse) an order so the customer can see this request under Orders.
        $orderId = null;
        try {
            $existingStmt = $this->pdo->prepare(
                'SELECT order_id FROM custom_design_requests WHERE request_id = :request_id AND user_id = :user_id LIMIT 1'
            );
            $existingStmt->execute(['request_id' => $requestId, 'user_id' => $userId]);
            $existing = $existingStmt->fetchColumn();
            if ($existing !== false && $existing !== null && is_numeric($existing)) {
                $orderId = (int) $existing;
            }

            if ($orderId === null) {
                $productId = $this->getOrCreateCustomDesignProductId();

                $safeRoster = [];
                foreach ($roster as $r) {
                    if (!is_array($r)) {
                        continue;
                    }
                    $name = isset($r['name']) ? trim((string) $r['name']) : '';
                    $number = isset($r['number']) ? trim((string) $r['number']) : '';
                    $size = $this->normalizeSizeEnum($r['size'] ?? null);
                    if ($name === '' && $number === '' && $size === null) {
                        continue;
                    }
                    $safeRoster[] = [
                        'name' => $name,
                        'number' => $number,
                        'size' => $size,
                    ];
                }

                $notesTrim = trim($notes);
                $noteOnly = $notesTrim !== ''
                    ? (strlen($notesTrim) > 200 ? substr($notesTrim, 0, 200) . '…' : $notesTrim)
                    : '';

                $nowIso = (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(DATE_ATOM);
                $orderMeta = [
                    'source' => 'custom_design',
                    'custom_design_request_id' => $requestId,
                    'payment' => [
                        'method' => $paymentPreference,
                    ],
                    'delivery_address' => [
                        // Minimal required for admin display; stored in the same shape as checkout.
                        'street' => $profileAddress,
                    ],
                    'promo' => $effectiveQty >= 10 ? ['free_shipping_min_qty_10' => true] : [],
                    // Comments panel (customer + admin) reads from orders.meta.comments
                    'comments' => $noteOnly === '' ? [] : [[
                        'author' => 'Customer',
                        'message' => $noteOnly,
                        'at' => $nowIso,
                        'kind' => 'note',
                    ]],
                ];

                $itemMeta = [
                    'product_name' => 'Custom Design — ' . $designName,
                    'note' => $noteOnly,
                    'roster' => $safeRoster,
                    'custom_design' => [
                        'request_id' => $requestId,
                        'design_name' => $designName,
                        'product_type' => $productType,
                        'design_type' => $designType,
                        'personalization' => $personalization,
                        'payment_preference' => $paymentPreference,
                        'files' => $filesMeta,
                    ],
                ];

                $orderRepo = new PdoOrderRepository($this->pdo);
                $orderId = $orderRepo->createOrder(
                    $userId,
                    'individual',
                    0.0,
                    0.0,
                    [[
                        'product_id' => $productId,
                        'quantity' => $effectiveQty,
                        'total_amount' => 0.0,
                        'meta' => $itemMeta,
                    ]],
                    $orderMeta
                );

                $linkStmt = $this->pdo->prepare(
                    'UPDATE custom_design_requests SET order_id = :order_id, updated_at = NOW() WHERE request_id = :request_id AND user_id = :user_id'
                );
                $linkStmt->execute([
                    'order_id' => $orderId,
                    'request_id' => $requestId,
                    'user_id' => $userId,
                ]);
            }
        } catch (\Throwable $e) {
            // If order creation fails, keep the request (files + DB row) but surface an error.
            Response::json(['error' => 'Request saved but failed to create an order. Please contact support.'], 500);
        }

        Response::json([
            'ok' => true,
            'request_id' => $requestId,
            'order_id' => $orderId,
            'files' => $filesMeta,
        ], 201);
    }
}
