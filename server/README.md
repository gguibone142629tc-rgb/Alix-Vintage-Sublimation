# Server Skeleton (Hybrid Layered N-Tier)

This folder is the backend side of the client-server architecture.

## Folder Layout

- `src/presentation` -> HTTP controllers/routes/middleware
- `src/application` -> use-cases/services
- `src/domain` -> entities/value objects/domain services
- `src/infrastructure` -> repositories, DB + storage adapters
- `src/shared` -> config, errors, utilities

## Suggested Next Build Order

1. Add API runtime (Express/Nest/Fastify).
2. Add PostgreSQL connection + migration tool.
3. Implement `auth` module (register/login/otp).
4. Implement `custom-design` module (request + roster + uploads metadata).
5. Implement `order` and `payment` module.
