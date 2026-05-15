# Deploy on a VPS (Ubuntu + Nginx + PHP-FPM + PostgreSQL)

This guide deploys the project so your frontend and backend share the same domain:

- Frontend: `https://yourdomain.com/pages/homepage.html`
- API: `https://yourdomain.com/api/*` (routed to `server/public/index.php`)

It matches the repo’s local router behavior in `router.php` but uses Nginx in production.

## Recommended VPS for ~₱500/mo

At this budget you’ll typically get **1 vCPU + 1GB RAM**. That’s okay for a school project / small store, but keep Postgres and PHP lean.

- **Pick a VPS with Ubuntu 22.04 LTS** (or 24.04) and a location near you (Singapore is common).
- If you can stretch to **2GB RAM**, it will feel much smoother (PostgreSQL + PHP-FPM + Nginx).

## 0) Before you start

You need:

- A domain name (from any registrar)
- Your VPS IP address
- SSH access

DNS:

- Set an `A` record: `@` → your VPS public IP
- Optional: `www` → your VPS public IP

Wait for DNS to propagate (minutes to hours).

## 1) SSH into the VPS and harden basics

```bash
ssh root@YOUR_SERVER_IP
```

Update packages:

```bash
apt update
apt -y upgrade
```

Create a non-root user (replace `alix`):

```bash
adduser alix
usermod -aG sudo alix
```

Basic firewall (allow SSH + HTTP/HTTPS):

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

(Optional but recommended) Install Fail2Ban:

```bash
apt -y install fail2ban
systemctl enable --now fail2ban
```

### Optional: add swap (helpful on 1GB RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
printf '\n/swapfile none swap sw 0 0\n' >> /etc/fstab
```

## 2) Install Nginx + PHP 8.1+ + required extensions

```bash
apt -y install nginx
systemctl enable --now nginx
```

Install PHP + extensions (PDO + Postgres driver are required):

```bash
apt -y install php-fpm php-cli php-pgsql php-mbstring php-xml php-curl php-zip
```

Check PHP-FPM socket path (we will use it in Nginx config):

```bash
ls /run/php/
```

You’ll typically see something like:

- `/run/php/php8.1-fpm.sock` or
- `/run/php/php8.2-fpm.sock`

## 3) Install PostgreSQL (on the same VPS to save cost)

```bash
apt -y install postgresql
systemctl enable --now postgresql
```

Create database + user (choose strong password):

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE DATABASE alix_vintage;
CREATE USER alix_user WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE alix_vintage TO alix_user;
\q
```

## 4) Put the project code on the server

Pick a deployment folder:

```bash
mkdir -p /var/www/alix
chown -R alix:alix /var/www/alix
```

As your non-root user (`alix`):

```bash
su - alix
cd /var/www/alix
```

### Option A (recommended): git clone

```bash
git clone YOUR_GIT_URL_HERE current
```

### Option B: upload via SFTP

Upload the repo contents to `/var/www/alix/current`.

## 5) Create production env file

On the VPS, create:

- `/var/www/alix/current/server/.env`

Start from `server/.env.example`.

Minimum production settings:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

JWT_SECRET=REPLACE_WITH_LONG_RANDOM
ADMIN_SETUP_KEY=REPLACE_WITH_LONG_RANDOM
ADMIN_API_KEY=REPLACE_WITH_LONG_RANDOM
ADMIN_LOGIN_USERNAME=admin
ADMIN_LOGIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=alix_vintage
DB_USER=alix_user
DB_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

MAIL_DRIVER=smtp
MAIL_FROM_ADDRESS=yourgmail@gmail.com
MAIL_FROM_NAME="Alix Vintage"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USERNAME=yourgmail@gmail.com
SMTP_PASSWORD=GMAIL_APP_PASSWORD
SMTP_TIMEOUT_SECONDS=15
```

Notes:

- For Gmail: use **App Password**, not your normal password.
- Never commit `server/.env`.

### Optional: enable Supabase Storage (recommended for uploads)

If you want product images, order proofs, custom designs, and receipts to be stored in Supabase Storage (instead of writing into the VPS `uploads/` folder), do this:

1. In Supabase Dashboard, create a Storage bucket (example: `alix-uploads`).
2. Make the bucket **public** (simplest), or keep it private and implement signed URLs later.
3. Add these env vars to `/var/www/alix/current/server/.env`:

```env
SUPABASE_STORAGE_ENABLED=true
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co

# IMPORTANT: service role key must stay on the server only.
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

SUPABASE_STORAGE_BUCKET=alix-uploads
SUPABASE_STORAGE_PUBLIC=true
```

If `SUPABASE_STORAGE_ENABLED` is false/missing, the app falls back to saving files under the local `uploads/` folder.

## 6) Ensure writable directories exist

Uploads + logs must be writable by the web server.

If you enabled Supabase Storage, local `uploads/` becomes a fallback only (still safe to keep).

```bash
sudo mkdir -p /var/www/alix/current/server/storage/logs
sudo mkdir -p /var/www/alix/current/uploads
sudo chown -R www-data:www-data /var/www/alix/current/server/storage
sudo chown -R www-data:www-data /var/www/alix/current/uploads
```

## 7) Initialize DB schema

From the `server/` folder:

```bash
cd /var/www/alix/current/server
php tools/init-db.php
```

## 8) Nginx configuration (same domain, `/api/*` routed to PHP)

Create a site file:

```bash
sudo nano /etc/nginx/sites-available/alix
```

Paste this (replace `yourdomain.com` and the PHP-FPM socket if needed):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve the repo-root static frontend (pages/, css/, js/, assets/, uploads/)
    root /var/www/alix/current;
    index pages/homepage.html;

    # Prevent leaking server-only folders/files
    location ^~ /server/ { deny all; }
    location ^~ /tools/ { deny all; }
    location ~ /\. { deny all; }

    # Convenience: domain root redirects to homepage
    location = / {
        return 302 /pages/homepage.html;
    }

    # Static files
    location ~* ^/(pages|css|js|assets)/ {
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # Uploads should be readable but never executable
    location ^~ /uploads/ {
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # API: route everything under /api/ to the front controller
    location ^~ /api/ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;

        # Force a single entrypoint (front controller)
        fastcgi_param SCRIPT_FILENAME /var/www/alix/current/server/public/index.php;
        fastcgi_param DOCUMENT_ROOT /var/www/alix/current/server/public;
        fastcgi_param PATH_INFO $uri;
        fastcgi_param QUERY_STRING $query_string;

        # Optional: raise upload limit if needed
        client_max_body_size 25m;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/alix /etc/nginx/sites-enabled/alix
sudo nginx -t
sudo systemctl reload nginx
```

At this point you can test:

- `http://yourdomain.com/pages/homepage.html`
- `http://yourdomain.com/api/health` (or any known endpoint)

## 9) HTTPS (Let’s Encrypt)

Install Certbot:

```bash
sudo apt -y install certbot python3-certbot-nginx
```

Get a certificate:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will also set up auto-renew.

## 10) Production smoke test

Run these from a browser:

- Register customer → OTP email arrives → verify → login
- Add to cart → checkout → order created
- Order history, tracking
- Admin login + order details

## 11) Backups (minimum)

Create a daily `pg_dump` backup (simple, good enough for small projects):

```bash
sudo mkdir -p /var/backups/alix
sudo chown -R postgres:postgres /var/backups/alix
sudo nano /etc/cron.daily/alix-pg-backup
```

Paste:

```bash
#!/bin/sh
set -eu
OUT="/var/backups/alix/alix_vintage_$(date +%F).sql.gz"
sudo -u postgres pg_dump alix_vintage | gzip > "$OUT"
find /var/backups/alix -type f -name 'alix_vintage_*.sql.gz' -mtime +14 -delete
```

Enable:

```bash
sudo chmod +x /etc/cron.daily/alix-pg-backup
```

## 12) Updating (redeploy)

If you deployed via git:

```bash
cd /var/www/alix/current
git pull
sudo systemctl reload php8.1-fpm || true
sudo systemctl reload nginx
```

If you changed DB schema, re-run `php server/tools/init-db.php` only if it’s safe for your update.

---

### Common problems

- **Getting redirected / auth issues**: ensure `APP_URL` matches `https://yourdomain.com`.
- **OTP email not sending**: confirm SMTP credentials and check `server/storage/logs`.
- **Uploads failing**: check permissions on `/var/www/alix/current/uploads`.
- **502 on /api**: wrong PHP-FPM socket in Nginx config.
