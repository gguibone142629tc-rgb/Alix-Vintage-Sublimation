# Server (PHP + PostgreSQL)

This folder contains the backend API for the client-server architecture.

## Architecture

Hybrid Layered N-Tier with clean separation:

- `src/Presentation` -> HTTP controllers/routes
- `src/Application` -> use-cases/services
- `src/Domain` -> entities + interfaces
- `src/Infrastructure` -> PDO repositories + adapters
- `src/Shared` -> config/utilities

This keeps SOLID boundaries:
- **Domain** depends on nothing.
- **Application** depends only on Domain interfaces.
- **Infrastructure/Presentation** depend on Application/Domain.

## Setup

1. Install PHP 8.1+ (XAMPP is fine).
2. Copy env:
	 - `copy .env.example .env`
3. Set PostgreSQL credentials in `.env`.

Composer is optional for this backend (it runs without external packages).

## Run

From this `server/` folder:

- `php -S localhost:8000 -t public`

### Run frontend + backend together (recommended for local)

If you want to avoid opening pages with `file:///...` (which can cause caching and JS/CORS differences), use the repo-root router:

From the repo root (`Alix-Vintage-Sublimation/`):

- `php -S localhost:5500 router.php`

Then open:

- `http://localhost:5500/pages/homepage.html`

Notes:
- Frontend static files are served from `/pages`, `/css`, `/js`, `/assets`.
- API calls to `/api/*` are forwarded to the backend (`server/public/index.php`).

## Auth endpoints

### Register customer

- `POST /api/auth/register/customer`

Body:
```json
{
	"firstname": "Juan",
	"lastname": "Dela Cruz",
	"email": "juan@example.com",
	"phone_number": "09123456789",
	"password": "password123"
}
```

This will:
- Create the account with `is_verified = false`
- Generate and send a 6-digit verification code via email
- Return `next: "otp"`

### Register admin (protected)

- `POST /api/auth/register/admin`

Header:
- `X-Admin-Setup-Key: <ADMIN_SETUP_KEY from .env>`

Body is the same as customer.

### Login (admin or customer)

- `POST /api/auth/login`

Body:
```json
{
	"email": "juan@example.com",
	"password": "password123"
}
```

Returns:
- `token` (JWT)
- `user`

If the account is not verified yet, login returns:
- `403` with `{ "error": "Account not verified" }`

## Verification code endpoints

### Request / resend code

- `POST /api/auth/otp/request`

Body:
```json
{
	"email": "juan@example.com"
}
```

### Verify code

- `POST /api/auth/otp/verify`

Body:
```json
{
	"email": "juan@example.com",
	"otp_code": "123456"
}
```

Returns:
- `token` (JWT)
- `user`

## Notes

- On startup, the API ensures default roles exist: `admin`, `customer`.
- Passwords are stored in `users.password_hash` using `password_hash()`.

### Email config

Set these in `.env`:
- `MAIL_DRIVER` (default `log`)
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`

When `MAIL_DRIVER=log` (default in local), emails are written to:
- `server/storage/logs/mail.log`

#### Gmail SMTP

Gmail is best used via SMTP with an **App Password** (not your normal Gmail password).

Set in `.env`:
- `MAIL_DRIVER=smtp`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_ENCRYPTION=tls`
- `SMTP_USERNAME=yourgmail@gmail.com`
- `SMTP_PASSWORD=<your app password>`
