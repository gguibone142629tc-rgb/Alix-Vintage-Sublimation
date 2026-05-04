<?php

declare(strict_types=1);

namespace App\Application\Orders;

use App\Domain\Orders\OrderRepository;

final class SendOrderProof
{
    public function __construct(private readonly OrderRepository $orders)
    {
    }

    private function saveDataUrlImage(string $dataUrl): array
    {
        if (!preg_match('#^data:(image/[^;]+);base64,(.+)$#', $dataUrl, $m)) {
            throw new \InvalidArgumentException('Mockup must be an image data URL');
        }

        $mime = strtolower(trim($m[1] ?? ''));
        $b64 = (string) ($m[2] ?? '');

        $ext = match ($mime) {
            'image/png' => 'png',
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/webp' => 'webp',
            default => null,
        };
        if ($ext === null) {
            throw new \InvalidArgumentException('Unsupported image type');
        }

        $binary = base64_decode($b64, true);
        if ($binary === false) {
            throw new \InvalidArgumentException('Invalid image encoding');
        }

        // Keep files reasonably sized.
        if (strlen($binary) > 20_000_000) {
            throw new \InvalidArgumentException('Mockup image is too large (max 20MB)');
        }

        $root = dirname(__DIR__, 4);
        $dir = $root . '/uploads/proofs';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $name = 'proof-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $full = $dir . '/' . $name;

        if (file_put_contents($full, $binary) === false) {
            throw new \RuntimeException('Failed to save proof file');
        }

        return [
            'path' => '/uploads/proofs/' . $name,
            'mime' => $mime,
            'bytes' => strlen($binary),
        ];
    }

    /** @param array<string,mixed> $input */
    public function handle(array $input): array
    {
        $orderIdRaw = $input['order_id'] ?? null;
        $orderId = is_numeric($orderIdRaw) ? (int) $orderIdRaw : 0;
        if ($orderId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing order_id'];
        }

        $dataUrlRaw = $input['mockup_data_url'] ?? $input['mockupDataUrl'] ?? null;
        $dataUrl = is_string($dataUrlRaw) ? trim($dataUrlRaw) : '';
        if ($dataUrl === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing mockup_data_url'];
        }

        if (!str_starts_with($dataUrl, 'data:image/')) {
            return ['ok' => false, 'status' => 422, 'error' => 'Mockup must be an image data URL'];
        }

        $orderItemIdRaw = $input['order_item_id'] ?? $input['orderItemId'] ?? null;
        $orderItemId = $orderItemIdRaw !== null && is_numeric($orderItemIdRaw) ? (int) $orderItemIdRaw : null;
        if ($orderItemId !== null && $orderItemId <= 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid order_item_id'];
        }

        $status = $this->orders->getOrderStatus($orderId);
        if ($status === null) {
            return ['ok' => false, 'status' => 404, 'error' => 'Order not found'];
        }

        if (strtolower($status) !== 'proofing') {
            return ['ok' => false, 'status' => 409, 'error' => 'Order is not in proofing'];
        }

        try {
            $saved = $this->saveDataUrlImage($dataUrl);
        } catch (\InvalidArgumentException $e) {
            return ['ok' => false, 'status' => 422, 'error' => $e->getMessage()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 500, 'error' => 'Failed to save proof file'];
        }

        $created = $this->orders->createDesignProof($orderId, (string) $saved['path'], $orderItemId);
        if ($created === null) {
            return ['ok' => false, 'status' => 422, 'error' => 'Failed to create proof for selected item'];
        }

        return ['ok' => true, 'design_proof' => $created];
    }
}
