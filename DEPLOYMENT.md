# Dokumentasi Build & Deployment — SimpleERP (ARUM)

> **Stack:** Laravel 13.8 · PHP 8.3 · React 18 + TypeScript · Inertia.js · Vite · MySQL 8.0  
> **Target OS Server:** Ubuntu 22.04 LTS  
> **Web Server:** Nginx + PHP-FPM 8.3

---

## Daftar Isi

1. [Spesifikasi Server Minimum](#1-spesifikasi-server-minimum)
2. [Persiapan VPS — Install Dependencies](#2-persiapan-vps--install-dependencies)
3. [Konfigurasi Database MySQL](#3-konfigurasi-database-mysql)
4. [Upload Source Code](#4-upload-source-code)
5. [Konfigurasi Environment (.env)](#5-konfigurasi-environment-env)
6. [Build Aplikasi](#6-build-aplikasi)
7. [Konfigurasi Nginx](#7-konfigurasi-nginx)
8. [Konfigurasi PHP-FPM](#8-konfigurasi-php-fpm)
9. [Hak Akses & Storage](#9-hak-akses--storage)
10. [SSL Certificate — Let's Encrypt](#10-ssl-certificate--lets-encrypt)
11. [Queue Worker — Supervisor](#11-queue-worker--supervisor)
12. [Cron Job — Laravel Scheduler](#12-cron-job--laravel-scheduler)
13. [Script Deploy Ulang (Re-deploy)](#13-script-deploy-ulang-re-deploy)
14. [Checklist Sebelum Go-Live](#14-checklist-sebelum-go-live)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Spesifikasi Server Minimum

| Komponen | Minimum | Rekomendasi |
|---|---|---|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB | 2 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| Bandwidth | 100 Mbps | 100 Mbps |

**Provider yang direkomendasikan:** DigitalOcean, Vultr, Contabo, Biznet Gio, IDCloudHost

---

## 2. Persiapan VPS — Install Dependencies

### 2.1 Login ke VPS & Update Sistem

```bash
ssh root@<IP_SERVER>

apt update && apt upgrade -y
apt install -y curl wget git unzip zip nano ufw
```

### 2.2 Konfigurasi Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 2.3 Install PHP 8.3 + Ekstensi yang Dibutuhkan

```bash
# Tambah repository PHP Ondrej
apt install -y software-properties-common
add-apt-repository ppa:ondrej/php -y
apt update

# Install PHP 8.3 dan semua ekstensi yang dibutuhkan Laravel
apt install -y \
    php8.3-fpm \
    php8.3-cli \
    php8.3-common \
    php8.3-mysql \
    php8.3-pgsql \
    php8.3-mbstring \
    php8.3-xml \
    php8.3-bcmath \
    php8.3-curl \
    php8.3-zip \
    php8.3-gd \
    php8.3-intl \
    php8.3-readline \
    php8.3-tokenizer \
    php8.3-dom \
    php8.3-fileinfo \
    php8.3-redis

# Verifikasi
php8.3 -v
```

### 2.4 Install Composer

```bash
curl -sS https://getcomposer.org/installer | php
mv composer.phar /usr/local/bin/composer
chmod +x /usr/local/bin/composer
composer --version
```

### 2.5 Install Node.js 20 (LTS) + npm

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # harus: v20.x.x
npm -v    # harus: 10.x.x
```

### 2.6 Install Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
nginx -v
```

### 2.7 Install MySQL 8.0

```bash
apt install -y mysql-server
systemctl enable mysql
systemctl start mysql

# Amankan instalasi MySQL
mysql_secure_installation
# - Validate password plugin: Y
# - Password strength: 2 (STRONG)
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y
```

### 2.8 Buat User Deploy (Opsional tapi Disarankan)

```bash
# Buat user deploy non-root untuk keamanan
adduser deploy
usermod -aG www-data deploy
# Copy SSH key agar bisa login tanpa password
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

---

## 3. Konfigurasi Database MySQL

```bash
mysql -u root -p
```

```sql
-- Buat database
CREATE DATABASE simpleerp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user khusus aplikasi (ganti password_kuat dengan password yang aman)
CREATE USER 'erp_user'@'localhost' IDENTIFIED BY 'password_kuat_di_sini';
GRANT ALL PRIVILEGES ON simpleerp.* TO 'erp_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> **Catat:** `DB_DATABASE=simpleerp`, `DB_USERNAME=erp_user`, `DB_PASSWORD=password_kuat_di_sini`

---

## 4. Upload Source Code

### Opsi A — Git Clone (Rekomendasi)

```bash
# Masuk ke direktori web
cd /var/www

# Clone repository
git clone https://github.com/<username>/<repo>.git simpleerp
# atau dengan SSH key:
# git clone git@github.com:<username>/<repo>.git simpleerp

cd simpleerp
```

### Opsi B — Upload via SCP/SFTP

```bash
# Dari mesin lokal (Windows PowerShell / Terminal):
scp -r "D:\1_PROJECT_APPLICATION\VIBE\SimpleERP" deploy@<IP_SERVER>:/var/www/simpleerp
```

> Setelah upload, masuk ke server: `ssh deploy@<IP_SERVER>` lalu `cd /var/www/simpleerp`

### Kepemilikan Direktori

```bash
chown -R deploy:www-data /var/www/simpleerp
find /var/www/simpleerp -type f -exec chmod 664 {} \;
find /var/www/simpleerp -type d -exec chmod 775 {} \;
```

---

## 5. Konfigurasi Environment (.env)

```bash
cd /var/www/simpleerp

# Salin file env contoh
cp .env.example .env
nano .env
```

Edit file `.env` dengan konfigurasi production:

```dotenv
APP_NAME="SimpleERP ARUM"
APP_ENV=production
APP_KEY=                          # akan diisi oleh artisan key:generate
APP_DEBUG=false
APP_URL=https://erp.namadomain.com

APP_LOCALE=id
APP_FALLBACK_LOCALE=id
APP_FAKER_LOCALE=id_ID

LOG_CHANNEL=daily
LOG_LEVEL=error

# ─── Database ────────────────────────────────────────────
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=simpleerp
DB_USERNAME=erp_user
DB_PASSWORD=password_kuat_di_sini

# ─── Session & Cache ─────────────────────────────────────
SESSION_DRIVER=database
SESSION_LIFETIME=480
SESSION_ENCRYPT=true
SESSION_DOMAIN=erp.namadomain.com
SESSION_SECURE_COOKIE=true

CACHE_STORE=database

# ─── Queue ───────────────────────────────────────────────
QUEUE_CONNECTION=database

# ─── Storage ─────────────────────────────────────────────
FILESYSTEM_DISK=local

# ─── Mail (sesuaikan provider) ───────────────────────────
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="noreply@namadomain.com"
MAIL_FROM_NAME="${APP_NAME}"
```

Simpan file lalu generate application key:

```bash
php8.3 artisan key:generate
```

---

## 6. Build Aplikasi

### 6.1 Install PHP Dependencies (Production)

```bash
cd /var/www/simpleerp

# Install tanpa dev dependencies, dengan optimasi autoloader
composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist
```

### 6.2 Build Frontend (React + TypeScript + Vite)

```bash
# Install npm packages
npm ci --omit=dev

# Build untuk production (TypeScript check + Vite bundling)
npm run build
```

Output build akan masuk ke `public/build/`. Proses ini perlu **Node.js di server** hanya saat deploy. Setelah build selesai, Node.js tidak dibutuhkan lagi untuk menjalankan aplikasi.

### 6.3 Jalankan Migrasi Database

```bash
php8.3 artisan migrate --force
```

Flag `--force` diperlukan karena environment `production` — tanpa flag ini artisan akan meminta konfirmasi interaktif.

### 6.4 Optimasi Cache Laravel

```bash
# Cache semua konfigurasi dalam satu file PHP (lebih cepat)
php8.3 artisan config:cache

# Cache semua route definitions
php8.3 artisan route:cache

# Cache semua Blade/view templates yang dicompile
php8.3 artisan view:cache

# Optimasi PSR-4 autoloader classmap
php8.3 artisan optimize
```

### 6.5 Buat Symbolic Link Storage

```bash
php8.3 artisan storage:link
```

---

## 7. Konfigurasi Nginx

Buat file konfigurasi virtual host:

```bash
nano /etc/nginx/sites-available/simpleerp
```

Isi dengan konfigurasi berikut (ganti `erp.namadomain.com` dengan domain Anda):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name erp.namadomain.com www.erp.namadomain.com;

    # Redirect semua HTTP ke HTTPS (akan aktif setelah SSL dipasang)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name erp.namadomain.com www.erp.namadomain.com;

    root /var/www/simpleerp/public;
    index index.php;

    # ─── SSL (diisi otomatis oleh Certbot) ─────────────────
    # ssl_certificate     /etc/letsencrypt/live/erp.namadomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/erp.namadomain.com/privkey.pem;

    # ─── Security Headers ───────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ─── Gzip Compression ───────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json
               application/javascript application/xml+rss
               application/atom+xml image/svg+xml;

    # ─── Static Assets Cache (Vite build dengan hash nama file) ─
    location ~* /build/assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }

    location ~* \.(ico|css|js|gif|jpeg|jpg|png|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
        try_files $uri =404;
    }

    # ─── PHP via FPM ────────────────────────────────────────
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_read_timeout 300;
    }

    # ─── Blokir akses file sensitif ─────────────────────────
    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~* \.(env|log|sh|sql|bak)$ {
        deny all;
    }

    client_max_body_size 50M;

    error_log  /var/log/nginx/simpleerp_error.log;
    access_log /var/log/nginx/simpleerp_access.log;
}
```

Aktifkan konfigurasi:

```bash
# Aktifkan site
ln -s /etc/nginx/sites-available/simpleerp /etc/nginx/sites-enabled/

# Hapus default site jika ada
rm -f /etc/nginx/sites-enabled/default

# Tes konfigurasi nginx
nginx -t

# Reload nginx
systemctl reload nginx
```

---

## 8. Konfigurasi PHP-FPM

Edit pool konfigurasi untuk performa optimal:

```bash
nano /etc/php/8.3/fpm/pool.d/www.conf
```

Sesuaikan baris-baris berikut:

```ini
; Jalankan sebagai user www-data
user = www-data
group = www-data

; Process manager: dynamic (lebih efisien untuk VPS kecil)
pm = dynamic
pm.max_children = 20
pm.start_servers = 4
pm.min_spare_servers = 2
pm.max_spare_servers = 6
pm.max_requests = 500

; Timeout request
request_terminate_timeout = 300
```

Edit juga `php.ini` untuk production:

```bash
nano /etc/php/8.3/fpm/php.ini
```

Ubah nilai berikut:

```ini
memory_limit = 256M
upload_max_filesize = 50M
post_max_size = 55M
max_execution_time = 300
max_input_time = 300
expose_php = Off
display_errors = Off
log_errors = On
error_log = /var/log/php8.3-fpm-errors.log
date.timezone = Asia/Jakarta
```

Restart PHP-FPM:

```bash
systemctl restart php8.3-fpm
systemctl status php8.3-fpm
```

---

## 9. Hak Akses & Storage

```bash
cd /var/www/simpleerp

# Semua file milik deploy, group www-data (agar PHP-FPM bisa baca)
chown -R deploy:www-data .

# Direktori storage dan cache harus writable oleh PHP-FPM (www-data)
chmod -R 775 storage
chmod -R 775 bootstrap/cache

# Pastikan subdirektori storage ada
mkdir -p storage/logs
mkdir -p storage/app/public
mkdir -p storage/framework/{cache,sessions,views}

# Pastikan .env tidak bisa dibaca publik
chmod 640 .env
```

---

## 10. SSL Certificate — Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Generate SSL certificate (ganti dengan domain Anda)
certbot --nginx -d erp.namadomain.com -d www.erp.namadomain.com \
    --email admin@namadomain.com \
    --agree-tos \
    --non-interactive \
    --redirect

# Certbot akan otomatis:
# 1. Generate sertifikat SSL
# 2. Mengisi baris ssl_certificate di nginx config
# 3. Mengaktifkan redirect HTTP → HTTPS

# Test auto-renewal
certbot renew --dry-run

# Verifikasi timer renewal otomatis
systemctl status certbot.timer
```

> Sertifikat Let's Encrypt berlaku **90 hari** dan diperbarui otomatis oleh `certbot.timer` systemd.

---

## 11. Queue Worker — Supervisor

Queue worker memproses job antrean (notifikasi, laporan, dll.) secara background.

### 11.1 Install Supervisor

```bash
apt install -y supervisor
systemctl enable supervisor
systemctl start supervisor
```

### 11.2 Buat Konfigurasi Worker

```bash
nano /etc/supervisor/conf.d/simpleerp-worker.conf
```

```ini
[program:simpleerp-worker]
process_name=%(program_name)s_%(process_num)02d
command=php8.3 /var/www/simpleerp/artisan queue:work database \
        --sleep=3 \
        --tries=3 \
        --max-time=3600 \
        --timeout=90
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/simpleerp/storage/logs/worker.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=5
stopwaitsecs=3600
```

### 11.3 Aktifkan Worker

```bash
supervisorctl reread
supervisorctl update
supervisorctl start simpleerp-worker:*
supervisorctl status
```

---

## 12. Cron Job — Laravel Scheduler

```bash
crontab -e -u www-data
```

Tambahkan baris berikut:

```cron
* * * * * cd /var/www/simpleerp && php8.3 artisan schedule:run >> /dev/null 2>&1
```

---

## 13. Script Deploy Ulang (Re-deploy)

Simpan script ini sebagai `/var/www/simpleerp/deploy.sh` untuk memudahkan update aplikasi:

```bash
nano /var/www/simpleerp/deploy.sh
```

```bash
#!/usr/bin/env bash
set -e

APP_DIR="/var/www/simpleerp"
PHP="php8.3"

echo "======================================"
echo "  SimpleERP — Deploy Script"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

cd "$APP_DIR"

# ── 1. Aktifkan Maintenance Mode ─────────────────────────
echo "[1/10] Mengaktifkan maintenance mode..."
$PHP artisan down --secret="deploy-secret-token"

# ── 2. Pull perubahan terbaru dari Git ───────────────────
echo "[2/10] Pull dari Git..."
git pull origin main

# ── 3. Install/update PHP dependencies ───────────────────
echo "[3/10] Composer install..."
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

# ── 4. Build frontend assets ─────────────────────────────
echo "[4/10] npm install & build..."
npm ci --omit=dev
npm run build

# ── 5. Jalankan migrasi database ─────────────────────────
echo "[5/10] Migrasi database..."
$PHP artisan migrate --force

# ── 6. Clear & rebuild semua cache ───────────────────────
echo "[6/10] Clear cache..."
$PHP artisan optimize:clear

echo "[7/10] Cache konfigurasi & route..."
$PHP artisan config:cache
$PHP artisan route:cache
$PHP artisan view:cache
$PHP artisan optimize

# ── 7. Set ulang hak akses ───────────────────────────────
echo "[8/10] Set permissions..."
chown -R deploy:www-data "$APP_DIR"
chmod -R 775 "$APP_DIR/storage"
chmod -R 775 "$APP_DIR/bootstrap/cache"

# ── 8. Restart queue worker ──────────────────────────────
echo "[9/10] Restart queue workers..."
supervisorctl restart simpleerp-worker:*

# ── 9. Matikan Maintenance Mode ──────────────────────────
echo "[10/10] Menonaktifkan maintenance mode..."
$PHP artisan up

echo ""
echo "======================================"
echo "  Deploy SELESAI - $(date '+%H:%M:%S')"
echo "======================================"
```

```bash
# Beri izin eksekusi
chmod +x /var/www/simpleerp/deploy.sh

# Jalankan deploy
bash /var/www/simpleerp/deploy.sh
```

> **Tip:** Selama maintenance mode aktif, user yang mengakses URL  
> `https://erp.namadomain.com/?secret=deploy-secret-token` tetap bisa masuk (bypass maintenance).

---

## 14. Checklist Sebelum Go-Live

Jalankan semua perintah ini satu per satu dan pastikan tidak ada error:

```bash
cd /var/www/simpleerp

# ✅ APP_KEY terisi di .env
grep APP_KEY .env

# ✅ APP_DEBUG = false di production
grep APP_DEBUG .env

# ✅ Database terhubung
php8.3 artisan db:show

# ✅ Semua migrasi sudah dijalankan
php8.3 artisan migrate:status

# ✅ Cache berjalan
php8.3 artisan tinker --execute="cache()->put('test', 'ok', 60); echo cache('test');"

# ✅ Queue berjalan
php8.3 artisan queue:monitor

# ✅ Storage link ada
ls -la public/storage

# ✅ Nginx config valid
nginx -t

# ✅ SSL valid (cek tanggal expired)
certbot certificates

# ✅ PHP-FPM berjalan
systemctl status php8.3-fpm

# ✅ Supervisor worker berjalan
supervisorctl status simpleerp-worker:*

# ✅ Log aplikasi bersih (tidak ada ERROR)
tail -n 50 storage/logs/laravel.log

# ✅ Hak akses storage benar
ls -la storage/logs/
ls -la bootstrap/cache/
```

---

## 15. Troubleshooting

### Error 500 / Halaman Putih

```bash
# Cek log Laravel
tail -f /var/www/simpleerp/storage/logs/laravel.log

# Cek log Nginx
tail -f /var/log/nginx/simpleerp_error.log

# Cek log PHP-FPM
tail -f /var/log/php8.3-fpm.log

# Pastikan APP_DEBUG=false (jangan true di production!)
# Kalau debug sementara diperlukan, gunakan:
php8.3 artisan config:clear  # clear dulu cache config
```

### Error Permission Denied

```bash
chown -R deploy:www-data /var/www/simpleerp
chmod -R 775 /var/www/simpleerp/storage
chmod -R 775 /var/www/simpleerp/bootstrap/cache
```

### Migrasi Gagal

```bash
# Cek koneksi database
php8.3 artisan db:show

# Lihat status migrasi
php8.3 artisan migrate:status

# Jalankan satu migrasi spesifik (jika rollback diperlukan)
php8.3 artisan migrate:rollback --step=1
```

### Queue Worker Tidak Jalan

```bash
supervisorctl status
supervisorctl restart simpleerp-worker:*
tail -f /var/www/simpleerp/storage/logs/worker.log
```

### Build Frontend Gagal (npm run build Error)

```bash
# Pastikan Node.js versi minimal 20
node -v

# Bersihkan cache npm dan node_modules lalu build ulang
rm -rf node_modules package-lock.json
npm install
npm run build

# Jika masalah TypeScript
npx tsc --noEmit  # cek error TS tanpa build
```

### SSL Certificate Expired

```bash
# Perbarui manual
certbot renew

# Jika gagal, cek log certbot
journalctl -u certbot
```

### Aplikasi Lambat

```bash
# Pastikan semua cache sudah dibuat
php8.3 artisan optimize

# Cek apakah OPcache aktif
php8.3 -r "echo opcache_get_status()['opcache_enabled'] ? 'OPcache ON' : 'OPcache OFF';"

# Aktifkan OPcache jika belum
nano /etc/php/8.3/fpm/php.ini
# opcache.enable=1
# opcache.memory_consumption=256
# opcache.max_accelerated_files=20000
# opcache.validate_timestamps=0  ← set 0 di production
systemctl restart php8.3-fpm
```

---

## Ringkasan Struktur Direktori di Server

```
/var/www/simpleerp/
├── app/                    ← PHP source code
├── bootstrap/cache/        ← Laravel cache (writable)
├── config/                 ← Konfigurasi
├── database/migrations/    ← Migrasi database
├── public/                 ← Document root Nginx
│   ├── build/              ← Hasil build Vite (React)
│   ├── index.php           ← Entry point
│   └── storage -> ...      ← Symbolic link storage
├── resources/js/           ← Source React/TypeScript
├── routes/web.php          ← Definisi route
├── storage/
│   ├── app/                ← Upload file user
│   ├── framework/          ← Cache, session, views
│   └── logs/               ← Log aplikasi & worker
├── .env                    ← Konfigurasi environment (RAHASIA)
├── deploy.sh               ← Script deploy
└── DEPLOYMENT.md           ← Dokumen ini
```

---

## Informasi Versi Stack

| Komponen | Versi |
|---|---|
| PHP | 8.3.x |
| Laravel | 13.8.x |
| Composer | 2.x |
| Node.js | 20.x LTS |
| npm | 10.x |
| React | 18.x |
| TypeScript | 5.x |
| Vite | 8.x |
| Inertia.js | 2.x |
| MySQL | 8.0.x |
| Nginx | 1.18+ |
| Ubuntu | 22.04 LTS |

---

*Dokumen ini dibuat khusus untuk project SimpleERP ARUM — 2026*
