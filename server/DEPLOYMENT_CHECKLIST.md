# Production Deployment Checklist

Use this checklist before public launch.

## 1. Environment and Secrets

- [ ] Create `server/.env` from `server/.env.example` on the server.
- [ ] Set `APP_ENV=production`.
- [ ] Set `APP_DEBUG=false`.
- [ ] Set `APP_URL` to your real domain (for example: `https://alixvintage.com`).
- [ ] Set a strong random `JWT_SECRET`.
- [ ] Set strong values for `ADMIN_SETUP_KEY`, `ADMIN_API_KEY`, `ADMIN_LOGIN_PASSWORD`.
- [ ] Set production PostgreSQL credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`).

## 2. Database

- [ ] Run schema initialization once: `php tools/init-db.php`.
- [ ] Confirm required tables exist and app can read/write.
- [ ] Create a daily backup job for PostgreSQL.
- [ ] Test restore from backup on a staging copy.

## 3. Email and OTP

- [ ] Configure production mail transport (`MAIL_DRIVER=smtp`).
- [ ] Set valid sender identity (`MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`).
- [ ] Set SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_ENCRYPTION`).
- [ ] Verify registration OTP and forgot-password OTP are delivered successfully.
- [ ] If using SMS provider in production, verify approved sender settings.

## 4. Web Server and Routing

- [ ] Serve site over HTTPS with a valid TLS certificate.
- [ ] Ensure frontend and backend are served from the same origin or correct reverse proxy config.
- [ ] Ensure `/api/*` routes correctly to `server/public/index.php`.
- [ ] Confirm static assets (`/pages`, `/css`, `/js`, `/assets`, `/uploads`) are reachable.

## 5. Security Hardening

- [ ] Restrict admin-only endpoints with `X-Admin-Api-Key` where applicable.
- [ ] Ensure production secrets are never committed to git.
- [ ] Disable directory listing on web server.
- [ ] Set secure headers (at least `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`).
- [ ] Add request throttling/rate limiting for auth and OTP endpoints at reverse proxy or app layer.

## 6. Functional QA (Smoke Test)

- [ ] Customer register -> OTP verify -> login.
- [ ] Forgot password request -> OTP confirm -> new login works.
- [ ] Browse products, add to cart, place order.
- [ ] Order tracking and order history visible on mobile and desktop.
- [ ] Admin login works.
- [ ] Admin order flow updates status correctly.
- [ ] Admin activity logs load and paginate.

## 7. Monitoring and Ops

- [ ] Enable PHP and web server error logs.
- [ ] Monitor `server/storage/logs` and server-level logs.
- [ ] Define incident contact and rollback owner.
- [ ] Keep a rollback plan (last known good release + DB backup).

## 8. Launch Readiness Gate

Only launch when all checklist items above are complete and verified.
