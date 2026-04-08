<?php

declare(strict_types=1);

namespace App\Presentation\Products;

use App\Application\Products\ListProducts;
use App\Domain\Products\Product;
use App\Domain\Products\ProductRepository;
use App\Presentation\Http\Request;
use App\Presentation\Http\Response;
use App\Shared\Config\Env;

final class ProductController
{
    private const MAX_PRODUCT_IMAGE_BYTES = 8_000_000; // 8MB
    private const ALLOWED_COLLECTIONS = [
        'basketball',
        'volleyball',
        'football-soccer',
        'corporate-event',
    ];

    public function __construct(
        private readonly ListProducts $listProducts,
        private readonly ProductRepository $products,
    )
    {
    }

    private function assertAdmin(Request $request): void
    {
        if (Env::bool('APP_DEBUG', false) && Env::get('APP_ENV') === 'local') {
            return;
        }

        $expected = Env::get('ADMIN_API_KEY') ?? Env::get('ADMIN_SETUP_KEY');
        if ($expected === null || trim($expected) === '') {
            if (!Env::bool('APP_DEBUG', false)) {
                Response::json(['error' => 'Server not configured for admin products'], 500);
            }
            return;
        }

        $provided = $request->header('x-admin-api-key');
        if ($provided === null || !hash_equals($expected, $provided)) {
            Response::json(['error' => 'Forbidden'], 403);
        }
    }

    /** @return array<string,mixed> */
    private function toPayload(Product $product): array
    {
        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'apparel_type' => $product->apparelType,
            'collection' => $product->collection,
            'base_price' => $product->basePrice,
            'image_path' => $product->imagePath,
            'images' => $product->images,
            'stock_status' => $product->stockStatus,
            'created_at' => $product->createdAt?->format('c'),
        ];
    }

    private function normalizeCollection(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $v = strtolower(trim($value));
        if ($v === '' || $v === 'none' || $v === 'null') {
            return null;
        }

        $v = str_replace(['_', ' '], '-', $v);

        $map = [
            'basketball-apparel' => 'basketball',
            'basketball' => 'basketball',
            'volleyball-uniforms' => 'volleyball',
            'volleyball' => 'volleyball',
            'football-and-soccer-kits' => 'football-soccer',
            'football-soccer-kits' => 'football-soccer',
            'football-soccer' => 'football-soccer',
            'football' => 'football-soccer',
            'soccer' => 'football-soccer',
            'corporate-and-event-wear' => 'corporate-event',
            'corporate-event-wear' => 'corporate-event',
            'corporate-event' => 'corporate-event',
            'corporate' => 'corporate-event',
            'event' => 'corporate-event',
        ];

        $normalized = $map[$v] ?? $v;
        if (!in_array($normalized, self::ALLOWED_COLLECTIONS, true)) {
            return '__invalid__';
        }

        return $normalized;
    }

    private function normalizeApparelType(string $value): string
    {
        $v = strtolower(trim($value));
        if ($v === '') {
            return '';
        }

        return match ($v) {
            'shirt', 'shirts', 'tshirt', 't-shirt', 'tee', 'polo', 'poloshirt', 'polo shirt' => 'shirt',
            'jersey', 'jerseys' => 'jersey',
            'hoodie', 'hoodies' => 'hoodie',
            default => 'other',
        };
    }

    /** @param array<string,mixed> $body
     *  @return array<string,string>
     */
    private function parseImageMap(array $body): array
    {
        $allowedViews = ['front', 'back', 'lower', 'full'];

        $rawMap = $body['image_map'] ?? $body['imageMap'] ?? null;
        $map = is_array($rawMap) ? $rawMap : [];

        // Backward-compat: a single image_data_url maps to full view.
        $singleRaw = $body['image_data_url'] ?? $body['imageDataUrl'] ?? null;
        if (is_string($singleRaw) && trim($singleRaw) !== '' && !isset($map['full'])) {
            $map['full'] = trim($singleRaw);
        }

        $out = [];
        foreach ($allowedViews as $view) {
            $val = $map[$view] ?? null;
            if (!is_string($val)) {
                continue;
            }

            $dataUrl = trim($val);
            if ($dataUrl === '') {
                continue;
            }

            $out[$view] = $dataUrl;
        }

        return $out;
    }

    /** @param array<string,string> $dataUrlsByView
     *  @return array<string,string>
     */
    private function saveImageMap(array $dataUrlsByView): array
    {
        $saved = [];
        foreach ($dataUrlsByView as $view => $dataUrl) {
            $saved[$view] = $this->saveDataUrlImage($dataUrl);
        }

        return $saved;
    }

    /** @param array<string,string> $savedByView */
    private function pickPrimaryImagePath(array $savedByView): ?string
    {
        foreach (['full', 'front', 'back', 'lower'] as $preferred) {
            if (isset($savedByView[$preferred]) && trim((string) $savedByView[$preferred]) !== '') {
                return (string) $savedByView[$preferred];
            }
        }

        return null;
    }

    private function saveDataUrlImage(string $dataUrl): string
    {
        if (!preg_match('#^data:(image/[^;]+);base64,(.+)$#', $dataUrl, $m)) {
            throw new \InvalidArgumentException('Image must be an image data URL');
        }

        $mime = strtolower(trim((string) ($m[1] ?? '')));
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

        if (strlen($binary) > self::MAX_PRODUCT_IMAGE_BYTES) {
            throw new \InvalidArgumentException('Image is too large (max 8MB)');
        }

        $root = dirname(__DIR__, 4);
        $dir = $root . '/uploads/products';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $name = 'product-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $full = $dir . '/' . $name;

        if (file_put_contents($full, $binary) === false) {
            throw new \RuntimeException('Failed to save image file');
        }

        return '/uploads/products/' . $name;
    }

    private function parseProductInput(array $body): array
    {
        $nameRaw = $body['product_name'] ?? $body['name'] ?? null;
        $apparelRaw = $body['apparel_type'] ?? $body['category'] ?? null;
        $collectionRaw = $body['collection'] ?? $body['product_collection'] ?? null;
        $priceRaw = $body['base_price'] ?? $body['price'] ?? null;

        $name = is_string($nameRaw) ? trim($nameRaw) : '';
        $apparelType = is_string($apparelRaw) ? $this->normalizeApparelType($apparelRaw) : '';
        $collection = is_string($collectionRaw) || $collectionRaw === null ? $this->normalizeCollection(is_string($collectionRaw) ? $collectionRaw : null) : '__invalid__';
        $basePrice = is_numeric($priceRaw) ? (float) $priceRaw : -1;

        if ($name === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing product_name'];
        }

        if ($apparelType === '') {
            return ['ok' => false, 'status' => 422, 'error' => 'Missing apparel_type'];
        }

        if ($basePrice < 0) {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid base_price'];
        }

        if ($collection === '__invalid__') {
            return ['ok' => false, 'status' => 422, 'error' => 'Invalid collection'];
        }

        $imageMap = $this->parseImageMap($body);

        return [
            'ok' => true,
            'name' => $name,
            'apparel_type' => $apparelType,
            'collection' => $collection,
            'base_price' => $basePrice,
            'image_map' => $imageMap,
        ];
    }

    public function list(Request $request): void
    {
        $result = $this->listProducts->handle();
        Response::json($result, 200);
    }

    public function create(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $parsed = $this->parseProductInput(is_array($body) ? $body : []);
        if (!($parsed['ok'] ?? false)) {
            Response::json(['error' => $parsed['error'] ?? 'Invalid request'], (int) ($parsed['status'] ?? 422));
        }

        $savedImageMap = [];
        try {
            $savedImageMap = $this->saveImageMap((array) ($parsed['image_map'] ?? []));
        } catch (\InvalidArgumentException $e) {
            Response::json(['error' => $e->getMessage()], 422);
        } catch (\Throwable) {
            Response::json(['error' => 'Failed to save image'], 500);
        }

        $imagePath = $this->pickPrimaryImagePath($savedImageMap);

        $created = $this->products->create(
            (string) $parsed['name'],
            (string) $parsed['apparel_type'],
            $parsed['collection'] !== null ? (string) $parsed['collection'] : null,
            (float) $parsed['base_price'],
            $imagePath,
        );

        if ($created->id !== null && count($savedImageMap) > 0) {
            $this->products->saveImagesByProductId($created->id, $savedImageMap);
            $fresh = $this->products->findById($created->id);
            if ($fresh !== null) {
                $created = $fresh;
            }
        }

        Response::json(['ok' => true, 'product' => $this->toPayload($created)], 201);
    }

    public function update(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $payload = is_array($body) ? $body : [];
        $idRaw = $payload['product_id'] ?? $payload['id'] ?? null;
        $productId = is_numeric($idRaw) ? (int) $idRaw : 0;
        if ($productId <= 0) {
            Response::json(['error' => 'Missing product_id'], 422);
        }

        $existing = $this->products->findById($productId);
        if ($existing === null) {
            Response::json(['error' => 'Product not found'], 404);
        }

        $parsed = $this->parseProductInput($payload);
        if (!($parsed['ok'] ?? false)) {
            Response::json(['error' => $parsed['error'] ?? 'Invalid request'], (int) ($parsed['status'] ?? 422));
        }

        $savedImageMap = [];
        try {
            $savedImageMap = $this->saveImageMap((array) ($parsed['image_map'] ?? []));
        } catch (\InvalidArgumentException $e) {
            Response::json(['error' => $e->getMessage()], 422);
        } catch (\Throwable) {
            Response::json(['error' => 'Failed to save image'], 500);
        }

        $imagePath = $existing->imagePath;
        $mergedForPrimary = [];
        foreach ($existing->images as $img) {
            if (!is_array($img)) {
                continue;
            }
            $view = isset($img['view_type']) ? trim((string) $img['view_type']) : '';
            $path = isset($img['image_path']) ? trim((string) $img['image_path']) : '';
            if ($view !== '' && $path !== '') {
                $mergedForPrimary[$view] = $path;
            }
        }
        foreach ($savedImageMap as $view => $path) {
            $mergedForPrimary[(string) $view] = (string) $path;
        }

        $primary = $this->pickPrimaryImagePath($mergedForPrimary);
        if ($primary !== null) {
            $imagePath = $primary;
        }

        $updated = $this->products->update(
            $productId,
            (string) $parsed['name'],
            (string) $parsed['apparel_type'],
            $parsed['collection'] !== null ? (string) $parsed['collection'] : null,
            (float) $parsed['base_price'],
            $imagePath,
        );

        if ($updated === null) {
            Response::json(['error' => 'Product not found'], 404);
        }

        if ($updated->id !== null && count($savedImageMap) > 0) {
            $this->products->saveImagesByProductId($updated->id, $savedImageMap);
            $fresh = $this->products->findById($updated->id);
            if ($fresh !== null) {
                $updated = $fresh;
            }
        }

        Response::json(['ok' => true, 'product' => $this->toPayload($updated)], 200);
    }

    public function delete(Request $request): void
    {
        $this->assertAdmin($request);

        $body = $request->json();
        $payload = is_array($body) ? $body : [];
        $idRaw = $payload['product_id'] ?? $payload['id'] ?? $request->queryParam('product_id') ?? $request->queryParam('id');
        $productId = is_numeric($idRaw) ? (int) $idRaw : 0;
        if ($productId <= 0) {
            Response::json(['error' => 'Missing product_id'], 422);
        }

        try {
            $deleted = $this->products->delete($productId);
        } catch (\PDOException $e) {
            // PostgreSQL FK violation when product is already referenced by order_items.
            if ($e->getCode() === '23503') {
                Response::json(['error' => 'Cannot delete product because it is used by existing orders'], 409);
            }
            Response::json(['error' => 'Failed to delete product'], 500);
        } catch (\Throwable) {
            Response::json(['error' => 'Failed to delete product'], 500);
        }

        if (!$deleted) {
            Response::json(['error' => 'Product not found'], 404);
        }

        Response::json(['ok' => true], 200);
    }
}
