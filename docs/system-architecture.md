# Alix Vintage System Architecture

## Target Style
Hybrid Layered N-Tier Client-Server Architecture

- **Hybrid**: Layered architecture inside each service + n-tier deployment separation.
- **N-tier**: Client Tier, API Tier, Business Tier, Data Access Tier, Data Tier.
- **Client-Server**: Browser clients consume server APIs; server persists to database/storage.

## Proposed Tiers

1. **Client Tier (Presentation/UI)**
   - Current static pages in `pages/`
   - Handles rendering, client-side validation, and API requests.

2. **Edge/API Tier (Presentation Layer on Server)**
   - REST endpoints for auth, catalog, orders, custom design, uploads, approvals.
   - Request validation, auth middleware, response mapping.

3. **Application/Business Tier**
   - Use-case orchestration:
     - register/login/otp verification
     - create custom design request
     - roster validation and quantity computation
     - quote and payment state transitions

4. **Domain Tier**
   - Core entities and rules:
     - User, Product, Category, Order, OrderItem, CustomDesignRequest, RosterEntry, Payment, OtpSession
   - Business invariants and state changes.

5. **Infrastructure/Data Access Tier**
   - Repositories, DB adapters, file storage adapters, message/notification adapters.

6. **Data Tier**
   - PostgreSQL for relational data
   - Object storage for uploaded design files/references (S3-compatible)

## Current Page-to-Use-Case Mapping

- `pages/register.html` -> User registration
- `pages/login.html` -> User authentication
- `pages/otp.html` -> OTP verification
- `pages/categories.html` -> Product/category browsing
- `pages/product-order-individual.html` -> Single-item ordering
- `pages/product-order-group.html` -> Group ordering with roster
- `pages/upload-custom-design.html` -> Custom design request with file upload

## Suggested API Modules (v1)

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/otp/verify`
- `GET /api/v1/categories`
- `GET /api/v1/products`
- `POST /api/v1/orders`
- `POST /api/v1/custom-designs`
- `POST /api/v1/uploads/presign`
- `GET /api/v1/custom-designs/:id`

## Initial Data Model (PostgreSQL)

- `users`
- `otp_sessions`
- `categories`
- `products`
- `orders`
- `order_items`
- `custom_design_requests`
- `custom_design_files`
- `roster_entries`
- `payments`

## Cross-Cutting Concerns

- Authentication and authorization
- Input validation and sanitization
- Centralized error handling
- Logging and audit trail (especially admin approvals)
- Rate limiting for OTP and auth endpoints
- Configuration and secrets management

## Deployment View

- **Tier 1**: Browser/client (current HTML/CSS/JS)
- **Tier 2**: API server (stateless app instances)
- **Tier 3**: PostgreSQL + object storage

## Request Flow Example (Custom Design)

1. Client uploads design file using signed upload URL.
2. Client submits custom design request metadata + roster.
3. API validates payload and stores records.
4. Business rules set initial status: `PENDING_ADMIN_REVIEW`.
5. Admin updates quote/proof status.
6. Client pays required downpayment before production.

## Rollout Phases

1. Establish backend skeleton (auth, health, DB connection).
2. Implement auth + OTP module.
3. Implement custom design + uploads flow.
4. Implement order and payment workflow.
5. Add admin review and status transitions.
6. Add observability, hardening, and production deployment.

## Engineering Standards

- Naming conventions: see `docs/naming-conventions.md`
