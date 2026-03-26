<?php

declare(strict_types=1);

namespace App\Domain\Products;

final class Product
{
    public function __construct(
        public readonly ?int $id,
        public readonly string $name,
        public readonly string $apparelType,
        public readonly float $basePrice,
        public readonly ?string $imagePath,
        /** @var array<int, array{view_type:string,image_path:string}> */
        public readonly array $images,
        public readonly bool $stockStatus,
        public readonly ?\DateTimeImmutable $createdAt,
    ) {
    }

    /** @param array<string,mixed> $row */
    public static function fromRow(array $row): self
    {
        $id = isset($row['product_id']) ? (int) $row['product_id'] : null;
        $createdAt = isset($row['created_at']) ? new \DateTimeImmutable((string) $row['created_at']) : null;

        return new self(
            $id,
            (string) ($row['product_name'] ?? ''),
            (string) ($row['apparel_type'] ?? 'other'),
            (float) ($row['base_price'] ?? 0),
            isset($row['image_path']) ? (string) $row['image_path'] : null,
            [],
            (bool) ($row['stock_status'] ?? true),
            $createdAt,
        );
    }

    /** @param array<int, array{view_type:string,image_path:string}> $images */
    public function withImages(array $images): self
    {
        return new self(
            $this->id,
            $this->name,
            $this->apparelType,
            $this->basePrice,
            $this->imagePath,
            $images,
            $this->stockStatus,
            $this->createdAt,
        );
    }
}
