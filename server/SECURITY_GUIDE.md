# Security & DDoS Protection — Alix Vintage Sublimation

> **Domain:** `alixvintagesublimation.com`
> **Goal:** Protect the live site from DDoS attacks, bots, and abuse
> **Time to complete:** ~30 minutes

---

## Table of Contents

1. [Set Up Cloudflare (Free DDoS Shield)](#1-set-up-cloudflare-free-ddos-shield)
2. [Add Nginx Rate Limiting](#2-add-nginx-rate-limiting)
3. [Harden Fail2Ban for HTTP Floods](#3-harden-fail2ban-for-http-floods)
4. [Lock Down Your Real VPS IP](#4-lock-down-your-real-vps-ip)
5. [Additional Security Headers](#5-additional-security-headers)
6. [Monitoring & Alerts](#6-monitoring--alerts)
7. [Emergency: Under Active Attack](#7-emergency-under-active-attack)

---

## 1) Set Up Cloudflare (Free DDoS Shield)

This is the **single biggest security upgrade** you can make. Cloudflare sits between the internet and your VPS, absorbing attacks before they reach your server.

### What you get for FREE:

| Feature | Description |
|---------|-------------|
| **DDoS Mitigation** | Absorbs volumetric & application-layer attacks |
| **Global CDN** | Your CSS/JS/images served from 300+ edge servers worldwide |
| **WAF Rules** | 5 free custom firewall rules |
| **Bot Protection** | Blocks known bad bots automatically |
| **SSL Management** | Free universal SSL (works alongside Let's Encrypt) |
| **Analytics** | See all traffic, threats blocked, bandwidth saved |

### Step-by-step setup:

### 1.1 — Create a Cloudflare account

1. Go to [cloudflare.com](https://cloudflare.com) and click **Sign Up**
2. Use any email and create a strong password
3. After signing in, click **"Add a Site"**

### 1.2 — Add your domain

1. Type: `alixvintagesublimation.com`
2. Click **Add Site**
3. Select the **Free plan** → click **Continue**

### 1.3 — Verify DNS records

Cloudflare will automatically scan your existing DNS records. You should see:

| Type | Name | Content | Proxy Status |
|------|------|---------|-------------|
| **A** | `@` | `YOUR_VPS_IP` | ☁️ Proxied (orange cloud) |
| **A** | `www` | `YOUR_VPS_IP` | ☁️ Proxied (orange cloud) |

> ⚠️ **IMPORTANT:** Make sure the orange cloud icon (Proxied) is ON for both records. This is what hides your real IP and enables DDoS protection!

If any records are missing, add them manually:
- Click **Add Record**
- Type: `A`
- Name: `@` (or `www`)
- IPv4 address: your VPS IP
- Proxy status: **Proxied** (orange cloud ON)

Click **Continue**

### 1.4 — Change your nameservers

Cloudflare will give you **two nameservers**, like:

```
adam.ns.cloudflare.com
bella.ns.cloudflare.com
```

Now go to **Hostinger hPanel**:

1. Log in at [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **Domains** → select `alixvintagesublimation.com`
3. Click **DNS / Nameservers** (in the sidebar)
4. Click **Change Nameservers**
5. **Delete** the existing Hostinger nameservers
6. **Add** the two Cloudflare nameservers exactly as shown
7. Click **Save**

> ⏳ Nameserver changes take **5 minutes to 24 hours** to propagate. Cloudflare will email you when it's active.

### 1.5 — Configure Cloudflare security settings

Once Cloudflare shows your site as **Active**, configure these settings:

#### SSL/TLS Settings
1. Go to **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full (Strict)**
   - This ensures end-to-end encryption (Cloudflare → your Nginx with Let's Encrypt)

#### Security Settings
1. Go to **Security** → **Settings**
2. Set **Security Level** to: **Medium** (or **High** if you're being attacked)
3. Set **Challenge Passage** to: **30 minutes**
4. Turn ON **Browser Integrity Check**

#### Bot Fight Mode
1. Go to **Security** → **Bots**
2. Turn ON **Bot Fight Mode**

#### DDoS Protection
1. Go to **Security** → **DDoS**
2. DDoS protection is **automatically enabled** on all plans
3. For the free plan, you get full L3/L4 (network layer) and L7 (application layer) protection

#### Firewall Rules (5 free rules)
Go to **Security** → **WAF** → **Custom Rules**, and create these:

**Rule 1: Block known bad countries** (if your customers are only in Philippines)
```
Field: Country
Operator: is not in
Value: Philippines, United States
Action: Managed Challenge
```

**Rule 2: Protect admin pages**
```
Field: URI Path
Operator: contains
Value: /admin
AND
Field: Country
Operator: is not in
Value: Philippines
Action: Block
```

**Rule 3: Rate limit login/auth API**
```
Field: URI Path
Operator: starts with
Value: /api/auth
Action: Managed Challenge
```

#### Page Rules (3 free rules)
Go to **Rules** → **Page Rules**:

**Rule 1: Cache static assets aggressively**
```
URL: alixvintagesublimation.com/assets/*
Setting: Cache Level → Cache Everything
Edge Cache TTL: 1 month
```

**Rule 2: Cache CSS/JS**
```
URL: alixvintagesublimation.com/css/*
Setting: Cache Level → Cache Everything
Edge Cache TTL: 1 week
```

**Rule 3: Bypass cache for API**
```
URL: alixvintagesublimation.com/api/*
Setting: Cache Level → Bypass
```

### 1.6 — Verify it's working

```bash
# Check that your real IP is hidden
nslookup alixvintagesublimation.com
```

The IP should show **Cloudflare's IP** (like `104.x.x.x`), NOT your VPS IP. If you see your real VPS IP, Cloudflare proxy is not enabled — go back and make sure the orange cloud is on.

```bash
# Check HTTP headers
curl -I https://alixvintagesublimation.com
```

You should see headers like:
```
server: cloudflare
cf-ray: xxxxx
```

---

## 2) Add Nginx Rate Limiting

Even with Cloudflare, add rate limiting on Nginx as a second layer of defense.

### 2.1 — Edit the Nginx main config

```bash
sudo nano /etc/nginx/nginx.conf
```

Add these lines **inside the `http { }` block** (right after `http {`):

```nginx
    # ── Rate Limiting Zones ──────────────────────────────
    # 10 requests/second per IP for API endpoints
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # 30 requests/second per IP for static pages
    limit_req_zone $binary_remote_addr zone=page_limit:10m rate=30r/s;

    # 3 requests/second per IP for login/auth (strict)
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=3r/s;

    # Connection limiting — max 20 simultaneous connections per IP
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Custom error page for rate-limited requests
    limit_req_status 429;
    limit_conn_status 429;
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### 2.2 — Update the site config with rate limits

```bash
sudo nano /etc/nginx/sites-available/alix
```

Replace the **entire file** with this updated config:

```nginx
server {
    listen 80;
    server_name alixvintagesublimation.com www.alixvintagesublimation.com;

    # Project root (static frontend: pages/, css/, js/, assets/)
    root /var/www/alix/current;
    index pages/homepage.html;

    # ── Connection limit per IP ──
    limit_conn conn_limit 20;

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

    # ── Static assets (cached 7 days, rate limited) ──
    location ~* ^/(pages|css|js|assets)/ {
        limit_req zone=page_limit burst=50 nodelay;
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── Uploads (images, receipts, proofs) ──
    location ^~ /uploads/ {
        limit_req zone=page_limit burst=30 nodelay;
        try_files $uri =404;
        access_log off;
        expires 7d;
        add_header Cache-Control "public";
    }

    # ── Auth API: strict rate limit (login, register, OTP) ──
    location ~* ^/api/(auth|login|register|otp|verify) {
        limit_req zone=auth_limit burst=5 nodelay;

        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.1-fpm.sock;

        fastcgi_param SCRIPT_FILENAME /var/www/alix/current/server/public/index.php;
        fastcgi_param DOCUMENT_ROOT   /var/www/alix/current/server/public;
        fastcgi_param PATH_INFO       $uri;
        fastcgi_param QUERY_STRING    $query_string;

        client_max_body_size 1m;
    }

    # ── API: route /api/* to PHP backend (rate limited) ──
    location ^~ /api/ {
        limit_req zone=api_limit burst=20 nodelay;

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
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # ── Custom 429 error page ──
    error_page 429 /429.html;
    location = /429.html {
        internal;
        default_type text/html;
        return 429 '<!DOCTYPE html><html><head><title>Too Many Requests</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;color:#e0e0e0;margin:0}div{text-align:center;padding:40px;background:#16213e;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.3)}h1{color:#e94560;font-size:48px;margin:0}p{color:#a0a0b0;margin-top:16px}</style></head><body><div><h1>429</h1><p>Too many requests. Please slow down and try again shortly.</p></div></body></html>';
    }
}
```

### 2.3 — Test and reload

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3) Harden Fail2Ban for HTTP Floods

Fail2Ban can monitor Nginx logs and auto-ban IPs that flood your server.

### 3.1 — Create an Nginx flood filter

```bash
sudo nano /etc/fail2ban/filter.d/nginx-limit-req.conf
```

Paste:

```ini
[Definition]
failregex = limiting requests, excess:.* by zone .*, client: <HOST>
ignoreregex =
```

Save and exit.

### 3.2 — Create an Nginx 404 scanner filter

```bash
sudo nano /etc/fail2ban/filter.d/nginx-404.conf
```

Paste:

```ini
[Definition]
failregex = ^<HOST> .* "(GET|POST|HEAD).*" 404
ignoreregex = \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)
```

Save and exit.

### 3.3 — Configure the jails

```bash
sudo nano /etc/fail2ban/jail.local
```

Paste this entire file:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
banaction = ufw

# ── SSH brute force ──
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

# ── Nginx rate limit violations ──
[nginx-limit-req]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 60
bantime = 3600

# ── Nginx 404 scanners (bots probing for vulnerabilities) ──
[nginx-404]
enabled = true
port = http,https
filter = nginx-404
logpath = /var/log/nginx/access.log
maxretry = 30
findtime = 60
bantime = 7200

# ── PHP auth brute force ──
[nginx-auth]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 120
bantime = 14400
```

Save and exit.

### 3.4 — Restart Fail2Ban

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
```

You should see all 4 jails active.

---

## 4) Lock Down Your Real VPS IP

After Cloudflare is active, **only Cloudflare servers should be able to reach your Nginx**. This prevents attackers from bypassing Cloudflare if they discover your real IP.

### 4.1 — Allow only Cloudflare IPs in UFW

Run these commands to whitelist Cloudflare's IP ranges:

```bash
# Cloudflare IPv4 ranges (as of 2025 — verify at https://cloudflare.com/ips)
sudo ufw allow from 173.245.48.0/20 to any port 80,443 proto tcp
sudo ufw allow from 103.21.244.0/22 to any port 80,443 proto tcp
sudo ufw allow from 103.22.200.0/22 to any port 80,443 proto tcp
sudo ufw allow from 103.31.4.0/22 to any port 80,443 proto tcp
sudo ufw allow from 141.101.64.0/18 to any port 80,443 proto tcp
sudo ufw allow from 108.162.192.0/18 to any port 80,443 proto tcp
sudo ufw allow from 190.93.240.0/20 to any port 80,443 proto tcp
sudo ufw allow from 188.114.96.0/20 to any port 80,443 proto tcp
sudo ufw allow from 197.234.240.0/22 to any port 80,443 proto tcp
sudo ufw allow from 198.41.128.0/17 to any port 80,443 proto tcp
sudo ufw allow from 162.158.0.0/15 to any port 80,443 proto tcp
sudo ufw allow from 104.16.0.0/13 to any port 80,443 proto tcp
sudo ufw allow from 104.24.0.0/14 to any port 80,443 proto tcp
sudo ufw allow from 172.64.0.0/13 to any port 80,443 proto tcp
sudo ufw allow from 131.0.72.0/22 to any port 80,443 proto tcp
```

Then **remove** the old open port rules:

```bash
# List current rules with numbers
sudo ufw status numbered

# Delete the generic "allow 80" and "allow 443" rules
# (use the rule numbers shown — they'll shift as you delete)
sudo ufw delete allow 80
sudo ufw delete allow 443
```

Now **only Cloudflare** can reach your web server. Direct IP access = blocked.

### 4.2 — Restore real visitor IPs in Nginx

Since traffic now comes through Cloudflare, Nginx sees Cloudflare's IP instead of the visitor's. Fix this:

```bash
sudo nano /etc/nginx/conf.d/cloudflare-real-ip.conf
```

Paste:

```nginx
# Cloudflare IP ranges — restore real visitor IPs
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;

real_ip_header CF-Connecting-IP;
```

Save and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5) Additional Security Headers

These are already partially in your Nginx config, but here's the complete set. Add to your server block in `/etc/nginx/sites-available/alix`:

```nginx
    # ── Full security headers ──
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob: https:; connect-src 'self'; frame-ancestors 'self';" always;
```

---

## 6) Monitoring & Alerts

### 6.1 — Check Fail2Ban status anytime

```bash
# See all jails and banned IPs
sudo fail2ban-client status

# See details for a specific jail
sudo fail2ban-client status nginx-limit-req

# Unban an IP if needed (e.g., you locked yourself out)
sudo fail2ban-client set nginx-limit-req unbanip 123.45.67.89
```

### 6.2 — Monitor live traffic

```bash
# Watch Nginx access logs in real-time
sudo tail -f /var/log/nginx/access.log

# Watch for rate limit hits
sudo tail -f /var/log/nginx/error.log | grep "limiting"

# See top IPs hitting your server
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

### 6.3 — Cloudflare Analytics

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your site → **Analytics & Logs**
3. Check:
   - **Threats** — attacks blocked
   - **Requests** — total traffic
   - **Bandwidth** — saved by caching
   - **Top traffic countries** — spot anomalies

---

## 7) Emergency: Under Active Attack

If your site is being DDoS'd right now, do this immediately:

### Step 1: Enable Cloudflare "Under Attack" Mode (30 seconds)

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your site
3. On the overview page, find **Under Attack Mode**
4. Toggle it **ON**

This shows a 5-second JavaScript challenge to every visitor. Bots can't pass it.

### Step 2: Tighten Nginx on the VPS

```bash
# Temporarily drop connections from heavy hitters
# Find the top attacking IPs:
sudo awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Block the worst IPs immediately:
sudo ufw deny from ATTACKER_IP_1
sudo ufw deny from ATTACKER_IP_2
```

### Step 3: Tighten rate limits temporarily

```bash
# Edit nginx.conf — change rates to very strict
# rate=10r/s → rate=2r/s
# rate=30r/s → rate=5r/s
sudo nano /etc/nginx/nginx.conf

# Reload
sudo systemctl reload nginx
```

### Step 4: After the attack subsides

1. Turn OFF "Under Attack Mode" in Cloudflare
2. Restore normal rate limits in Nginx
3. Review Cloudflare analytics to understand the attack pattern
4. Add permanent firewall rules if the attack came from specific countries/IPs

---

## Security Checklist

| # | Task | Status |
|---|------|--------|
| 1 | Cloudflare account created | ☐ |
| 2 | Domain added to Cloudflare | ☐ |
| 3 | Nameservers changed to Cloudflare | ☐ |
| 4 | Cloudflare shows site as Active | ☐ |
| 5 | SSL set to Full (Strict) | ☐ |
| 6 | Bot Fight Mode enabled | ☐ |
| 7 | Firewall rules created | ☐ |
| 8 | Page rules configured | ☐ |
| 9 | Nginx rate limiting added | ☐ |
| 10 | Fail2Ban HTTP jails configured | ☐ |
| 11 | UFW locked to Cloudflare IPs only | ☐ |
| 12 | Real IP restoration configured | ☐ |
| 13 | Security headers verified | ☐ |
| 14 | `nslookup` confirms real IP is hidden | ☐ |

---

## Protection Summary

After completing this guide, your site has **4 layers of defense**:

```
Internet Traffic
      │
      ▼
┌─────────────────────────┐
│   Layer 1: CLOUDFLARE   │  ← Absorbs DDoS, blocks bots,
│   (CDN + WAF + Shield)  │     hides real IP, caches assets
└──────────┬──────────────┘
           │ Only clean traffic passes
           ▼
┌─────────────────────────┐
│   Layer 2: UFW FIREWALL │  ← Only accepts Cloudflare IPs
│   (Ubuntu Firewall)     │     on ports 80/443
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   Layer 3: NGINX        │  ← Rate limiting, connection limits,
│   (Rate Limiter)        │     security headers, blocks paths
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│   Layer 4: FAIL2BAN     │  ← Auto-bans IPs that trigger
│   (Auto IP Banning)     │     rate limits or scan for vulns
└──────────┬──────────────┘
           │
           ▼
      Your PHP App
```

> **This setup stops 99%+ of attacks for FREE.** For a small e-commerce site like Alix Vintage, this is more than enough. Enterprise-level protection (Cloudflare Pro at $20/month) is only needed if you're processing thousands of orders/day.
