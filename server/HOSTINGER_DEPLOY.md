# Deploy to Hostinger VPS — Alix Vintage Sublimation

> **Domain:** `alixvintagesublimation.com`
> **Stack:** PHP 8.1+ / PostgreSQL / Nginx / Ubuntu
> **Purpose:** Production business launch

This guide is a complete, copy-paste walkthrough. Follow every step in order.

---

## Table of Contents

1. [Purchase Hostinger VPS](#1-purchase-hostinger-vps)
2. [Connect via SSH](#2-connect-via-ssh)
3. [Secure the Server](#3-secure-the-server)
4. [Install Required Software](#4-install-required-software)
5. [Set Up PostgreSQL](#5-set-up-postgresql)
6. [Deploy the Code](#6-deploy-the-code)
7. [Create Production .env](#7-create-production-env)
8. [Initialize Database Schema](#8-initialize-database-schema)
9. [Configure Nginx](#9-configure-nginx)
10. [Point Your Domain](#10-point-your-domain)
11. [Enable HTTPS (SSL)](#11-enable-https-ssl)
12. [Smoke Test](#12-smoke-test)
13. [Set Up Backups](#13-set-up-backups)
14. [Updating (Redeploy)](#14-updating-redeploy)
15. [Troubleshooting](#15-troubleshooting)

---

## 1) Purchase Hostinger VPS

1. Go to [hostinger.com/vps-hosting](https://www.hostinger.com/vps-hosting)
2. Choose a plan:

   | Plan | RAM | vCPU | Storage | Recommended? |
   |------|-----|------|---------|-------------|
   | **KVM 1** | 4 GB | 1 vCPU | 50 GB | ✅ Best value |
   | **KVM 2** | 8 GB | 2 vCPU | 100 GB | For growth |

3. During setup:
   - **Operating System:** Ubuntu 22.04 (or 24.04)
   - **Server Location:** Singapore (closest to Philippines)
   - **Set a root password** — save it somewhere safe!

4. After purchase, Hostinger will give you:
   - **VPS IP address** (example: `103.45.67.89`)
   - **Root password**

> **Write down your VPS IP address — you'll need it throughout this guide.**

---

## 2) Connect via SSH

### From Windows (PowerShell or Command Prompt)

```powershell
ssh root@YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with your actual IP (e.g., `ssh root@103.45.67.89`).

- Type `yes` when asked about fingerprint
- Enter your root password

### From Hostinger Dashboard

You can also use Hostinger's **Browser Terminal** in the VPS dashboard if SSH doesn't work.

---

## 3) Secure the Server

Run these commands **one by one** after connecting:

### Update packages
```bash
apt update && apt -y upgrade
```

### Create a non-root user
```bash
adduser alix
```
(Set a password when prompted, press Enter for the rest)

```bash
usermod -aG sudo alix
```

### Set up firewall
```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```
Type `y` when asked.

### Install Fail2Ban (blocks brute-force attacks)
```bash
apt -y install fail2ban
systemctl enable --now fail2ban
```

### Add swap space (helps on lower RAM plans)
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 4) Install Required Software

### Install Nginx
```bash
apt -y install nginx
systemctl enable --now nginx
```

### Install PHP 8.1+ with required extensions
```bash
apt -y install php-fpm php-cli php-pgsql php-mbstring php-xml php-curl php-zip
```

### Verify PHP-FPM socket
```bash
ls /run/php/
```

Note the socket name. You'll see something like:
- `php8.1-fpm.sock` or `php8.3-fpm.sock`

> **Write down the exact socket name** — you'll use it in the Nginx config later.

### Install Git
```bash
apt -y install git
```

---

## 5) Set Up PostgreSQL

### Install PostgreSQL
```bash
apt -y install postgresql
systemctl enable --now postgresql
```

### Create database and user

Enter the PostgreSQL console:
```bash
sudo -u postgres psql
```

Run these SQL commands inside `psql` (replace `YOUR_STRONG_DB_PASSWORD` with a real password):

```sql
CREATE DATABASE alix_vintage;
CREATE USER alix_user WITH PASSWORD 'YOUR_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE alix_vintage TO alix_user;

-- Required for PostgreSQL 15+
\c alix_vintage
GRANT ALL ON SCHEMA public TO alix_user;

\q
```

> **Save the database password** — you'll need it for the `.env` file.

---

## 6) Deploy the Code

### Create the project directory
```bash
mkdir -p /var/www/alix
chown -R alix:alix /var/www/alix
```

### Switch to the alix user and clone the repo
```bash
su - alix
cd /var/www/alix
git clone https://github.com/gguibone142629tc-rgb/Alix-Vintage-Sublimation.git current
exit
```

### Set proper permissions
```bash
sudo mkdir -p /var/www/alix/current/server/storage/logs
sudo mkdir -p /var/www/alix/current/uploads/products
sudo mkdir -p /var/www/alix/current/uploads/proofs
sudo mkdir -p /var/www/alix/current/uploads/receipts
sudo mkdir -p /var/www/alix/current/uploads/custom-design

sudo chown -R www-data:www-data /var/www/alix/current/server/storage
sudo chown -R www-data:www-data /var/www/alix/current/uploads
```

---

## 7) Create Production .env

Create the production environment file:

```bash
sudo nano /var/www/alix/current/server/.env
```

Paste this entire block, **then replace all the placeholder values**:

```env
# ── Production Settings ──────────────────────────────
APP_ENV=production
APP_DEBUG=false
APP_URL=https://alixvintagesublimation.com

# ── JWT (generate a random 64-character string) ──────
# Generate one with: openssl rand -hex 32
JWT_SECRET=REPLACE_WITH_64_CHAR_RANDOM_STRING
JWT_ISSUER=alix-vintage
JWT_AUDIENCE=alix-vintage-web
JWT_TTL_SECONDS=86400

# ── Admin ────────────────────────────────────────────
ADMIN_SETUP_KEY=REPLACE_WITH_RANDOM_STRING
ADMIN_API_KEY=REPLACE_WITH_RANDOM_STRING
ADMIN_LOGIN_USERNAME=admin
ADMIN_LOGIN_PASSWORD=REPLACE_WITH_STRONG_PASSWORD

# ── PostgreSQL ───────────────────────────────────────
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=alix_vintage
DB_USER=alix_user
DB_PASSWORD=YOUR_STRONG_DB_PASSWORD

# ── Email (Gmail SMTP) ──────────────────────────────
MAIL_DRIVER=smtp
MAIL_FROM_ADDRESS=sharkpog270@gmail.com
MAIL_FROM_NAME="Alix Vintage"

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USERNAME=sharkpog270@gmail.com
SMTP_PASSWORD=REPLACE_WITH_GMAIL_APP_PASSWORD
SMTP_TIMEOUT_SECONDS=15

# ── Supabase Storage (optional) ─────────────────────
SUPABASE_STORAGE_ENABLED=false
# SUPABASE_URL=
# SUPABASE_SERVICE_ROLE_KEY=
# SUPABASE_STORAGE_BUCKET=
# SUPABASE_STORAGE_PUBLIC=true
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Generate the JWT secret
```bash
openssl rand -hex 32
```
Copy the output and paste it as `JWT_SECRET`.

### Generate admin keys
```bash
openssl rand -hex 16
```
Run this twice — use one for `ADMIN_SETUP_KEY` and one for `ADMIN_API_KEY`.

---

## 8) Initialize Database Schema

```bash
cd /var/www/alix/current/server
sudo -u www-data php tools/init-db.php
```

You should see output confirming tables were created. If it fails, check:
- PostgreSQL is running: `systemctl status postgresql`
- Credentials match: `cat .env | grep DB_`

---

## 9) Configure Nginx

### Remove default site
```bash
sudo rm /etc/nginx/sites-enabled/default
```

### Create the Alix Vintage site config
```bash
sudo nano /etc/nginx/sites-available/alix
```

Paste this entire config. **Replace `php8.1-fpm.sock`** with your actual socket name from Step 4:

```nginx
server {
    listen 80;
    server_name alixvintagesublimation.com www.alixvintagesublimation.com;

    # Project root (static frontend: pages/, css/, js/, assets/)
    root /var/www/alix/current;
    index pages/homepage.html;

    # ── Security: block server internals ──
    location ^~ /server/ { deny all; }
    location ^~ /tools/  { deny all; }
    location ^~ /.git/   { deny all; }
    location ^~ /.venv/  { deny all; }
    location ~ /\.       { deny all; }

    # ── Root redirect → homepage ──
    location = / {
        return 302 /pages/homepage.html;
    }

    # ── Static assets (cached 7 days) ──
    location ~* ^/(pages|css|js|assets)/ {
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── Uploads (images, receipts, proofs) ──
    location ^~ /uploads/ {
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── API: route /api/* to PHP backend ──
    location ^~ /api/ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;

        fastcgi_param SCRIPT_FILENAME /var/www/alix/current/server/public/index.php;
        fastcgi_param DOCUMENT_ROOT   /var/www/alix/current/server/public;
        fastcgi_param PATH_INFO       $uri;
        fastcgi_param QUERY_STRING    $query_string;

        # Allow file uploads up to 25MB
        client_max_body_size 25m;
    }

    # ── Security headers ──
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Enable the site and test
```bash
sudo ln -s /etc/nginx/sites-available/alix /etc/nginx/sites-enabled/alix
sudo nginx -t
```

If `nginx -t` says **"syntax is ok"**, reload:
```bash
sudo systemctl reload nginx
```

---

## 10) Point Your Domain

### In Hostinger DNS Manager (hPanel)

1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com/)
2. Go to **Domains** → select `alixvintagesublimation.com`
3. Go to **DNS / Nameservers** → **DNS Records**
4. Add/edit these records:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | **A** | `@` | `YOUR_VPS_IP` | 14400 |
   | **A** | `www` | `YOUR_VPS_IP` | 14400 |

5. Save and wait for DNS propagation (usually 5–30 minutes, can take up to 48 hours)

### Verify DNS is working
```bash
# Run this on your local PC or on the VPS
ping alixvintagesublimation.com
```

You should see your VPS IP in the response.

---

## 11) Enable HTTPS (SSL)

### Install Certbot
```bash
sudo apt -y install certbot python3-certbot-nginx
```

### Get SSL certificate
```bash
sudo certbot --nginx -d alixvintagesublimation.com -d www.alixvintagesublimation.com
```

- Enter your email when asked
- Agree to terms
- Choose to **redirect HTTP to HTTPS** when asked (option 2)

Certbot will automatically:
- Get a free Let's Encrypt certificate
- Update your Nginx config for HTTPS
- Set up auto-renewal

### Verify auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## 12) Smoke Test

Open these URLs in your browser:

| Test | URL |
|------|-----|
| **Homepage** | `https://alixvintagesublimation.com` |
| **Login page** | `https://alixvintagesublimation.com/pages/login.html` |
| **Admin login** | `https://alixvintagesublimation.com/pages/admin-login.html` |
| **API check** | `https://alixvintagesublimation.com/api/products` |

### Full flow test checklist

- [ ] Customer register → OTP email arrives → verify → login
- [ ] Browse products → add to cart → checkout → order created
- [ ] View order history and tracking
- [ ] Admin login → see orders → update status
- [ ] Upload product images (admin)
- [ ] Contact form submission

---

## 13) Set Up Backups

### Create daily PostgreSQL backup

```bash
sudo mkdir -p /var/backups/alix
sudo chown postgres:postgres /var/backups/alix
```

Create the backup script:
```bash
sudo nano /etc/cron.daily/alix-pg-backup
```

Paste:
```bash
#!/bin/sh
set -eu
OUT="/var/backups/alix/alix_vintage_$(date +%F).sql.gz"
sudo -u postgres pg_dump alix_vintage | gzip > "$OUT"
# Keep only last 14 days
find /var/backups/alix -type f -name 'alix_vintage_*.sql.gz' -mtime +14 -delete
```

Make it executable:
```bash
sudo chmod +x /etc/cron.daily/alix-pg-backup
```

### Test backup manually
```bash
sudo /etc/cron.daily/alix-pg-backup
ls -lh /var/backups/alix/
```

---

## 14) Updating (Redeploy)

When you push new code to GitHub, update the server:

```bash
cd /var/www/alix/current
sudo -u alix git pull

# If you changed PHP files:
sudo systemctl reload php8.1-fpm

# If you changed Nginx config:
sudo systemctl reload nginx

# If you changed the database schema:
cd server
sudo -u www-data php tools/init-db.php
```

---

## 15) Troubleshooting

### Common Issues

| Problem | Fix |
|---------|-----|
| **502 Bad Gateway on /api/** | Wrong PHP-FPM socket. Run `ls /run/php/` and update Nginx config |
| **403 Forbidden** | Permission issue. Run `sudo chown -R www-data:www-data /var/www/alix/current/uploads` |
| **OTP email not arriving** | Check SMTP password. View logs: `cat /var/www/alix/current/server/storage/logs/mail.log` |
| **Database connection error** | Verify `.env` credentials match. Test: `sudo -u postgres psql -d alix_vintage` |
| **Redirects loop / auth fails** | Ensure `APP_URL` in `.env` matches `https://alixvintagesublimation.com` exactly |
| **Uploads failing** | Check permissions: `ls -la /var/www/alix/current/uploads/` |
| **CSS/JS not loading** | Clear browser cache or append `?v=5` to CSS links |
| **Site shows Nginx default page** | Run `sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx` |

### View logs

```bash
# Nginx error log
sudo tail -50 /var/log/nginx/error.log

# PHP-FPM log
sudo tail -50 /var/log/php8.1-fpm.log

# App logs
cat /var/www/alix/current/server/storage/logs/*.log

# PostgreSQL log
sudo tail -50 /var/log/postgresql/postgresql-*-main.log
```

### Restart services

```bash
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm
sudo systemctl restart postgresql
```

---

## Quick Reference

| Item | Value |
|------|-------|
| **Domain** | `alixvintagesublimation.com` |
| **Project path** | `/var/www/alix/current` |
| **Nginx config** | `/etc/nginx/sites-available/alix` |
| **Production .env** | `/var/www/alix/current/server/.env` |
| **PHP-FPM socket** | `/run/php/php8.X-fpm.sock` |
| **Database** | `alix_vintage` |
| **DB user** | `alix_user` |
| **Uploads** | `/var/www/alix/current/uploads/` |
| **Logs** | `/var/www/alix/current/server/storage/logs/` |
| **Backups** | `/var/backups/alix/` |
| **SSL auto-renew** | Managed by Certbot |
