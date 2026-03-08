<?php

declare(strict_types=1);

namespace App\Domain\ActivityLogs;

final class ActivityLog
{
    /**
     * @param array<string,mixed> $meta
     */
    public function __construct(
        public readonly ?int $id,
        public readonly \DateTimeImmutable $createdAt,
        public readonly ?int $actorUserId,
        public readonly ?string $actorRole,
        public readonly string $action,
        public readonly ?string $description,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
        public readonly array $meta,
    ) {
    }

    /** @param array<string,mixed> $row */
    public static function fromRow(array $row): self
    {
        $createdAtRaw = (string) ($row['created_at'] ?? '');
        $createdAt = new \DateTimeImmutable($createdAtRaw === '' ? 'now' : $createdAtRaw);

        $metaRaw = $row['meta'] ?? [];
        if (is_string($metaRaw)) {
            $decoded = json_decode($metaRaw, true);
            $metaRaw = is_array($decoded) ? $decoded : [];
        }

        return new self(
            id: isset($row['log_id']) ? (int) $row['log_id'] : null,
            createdAt: $createdAt,
            actorUserId: isset($row['actor_user_id']) ? (int) $row['actor_user_id'] : null,
            actorRole: isset($row['actor_role']) ? (string) $row['actor_role'] : null,
            action: (string) ($row['action'] ?? ''),
            description: isset($row['description']) ? (string) $row['description'] : null,
            ipAddress: isset($row['ip_address']) ? (string) $row['ip_address'] : null,
            userAgent: isset($row['user_agent']) ? (string) $row['user_agent'] : null,
            meta: is_array($metaRaw) ? $metaRaw : [],
        );
    }

    /** @return array<string,mixed> */
    public function toArray(): array
    {
        return [
            'log_id' => $this->id,
            'created_at' => $this->createdAt->format('c'),
            'actor_user_id' => $this->actorUserId,
            'actor_role' => $this->actorRole,
            'action' => $this->action,
            'description' => $this->description,
            'ip_address' => $this->ipAddress,
            'user_agent' => $this->userAgent,
            'meta' => $this->meta,
        ];
    }
}
