# SSI ERP System - Setup Guide

## Deskripsi Proyek

SSI adalah sistem ERP sederhana berbasis web untuk perusahaan yang bergerak di bidang jasa pemasangan penghSSI ruangan. Sistem ini dibangun menggunakan:

- **Backend**: Laravel 13 (PHP 8.3)
- **Frontend**: Blade Templates + React + TailwindCSS
- **Database**: PostgreSQL 14 / MySQL
- **Authentication**: Laravel Breeze dengan session-based auth

## Fitur Utama (18 Modul)

1. **Authentication** - Login, Logout, Reset Password, Role Permission
2. **Dashboard** - Statistik realtime, grafik transaksi, list aktif
3. **Customer** - CRUD dengan pagination, search, filter
4. **Supplier** - CRUD dengan pagination, search, filter
5. **Product** - CRUD dengan kategori, pagination, search, filter
6. **Contract Management** - Kontrak dengan layanan dan material
7. **Sales Order** - SO dengan referensi kontrak dan invoice
8. **Work Order Service** - Penugasan teknisi dengan tracking material
9. **Payment Invoice** - Pembayaran dengan referensi invoice
10. **Stock Card** - Tabel stok dengan pagination, search, filter
11. **Transfer Stock** - Transfer antar lokasi
12. **Adjustment Stock** - Penyesuaian stok
13. **Stock Opname** - Perhitungan fisik stok
14. **Purchasing** - PO ke supplier terintegrasi stok
15. **Cash In/Out** - Transaksi kas dengan kategori
16. **Bank In/Out** - Transfer bank dengan rekonsiliasi
17. **User Management** - CRUD user dengan role & status
18. **Role Management** - Kelola role dan hak akses

## Persyaratan Sistem

- PHP 8.3+
- Composer 2.x
- Node.js 20+
- MySQL 8.0+ atau PostgreSQL 14+
- Git

## Instalasi

### 1. Clone/Extract Proyek
```bash
cd d:/1_PROJECT_APPLICATION/VIBE/SimpleERP
```

### 2. Install Dependencies
```bash
composer install
npm install
```

### 3. Setup Database

#### Opsi A: MySQL (Recommended untuk Development)
Pastikan MySQL berjalan, kemudian:

```bash
# Update .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=SSI
DB_USERNAME=root
DB_PASSWORD=

# Run migrations
php artisan migrate --seed

# Compile frontend assets
npm run dev
```

#### Opsi B: PostgreSQL
```bash
# Update .env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=SSI
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Run migrations
php artisan migrate --seed
```

### 4. Generate APP_KEY (jika belum)
```bash
php artisan key:generate
```

### 5. Build Frontend Assets
```bash
npm run dev      # For development
npm run build    # For production
```

### 6. Start Development Server
```bash
# Terminal 1: Laravel server
php artisan serve

# Terminal 2: Frontend build watcher
npm run dev
```

Akses aplikasi di: http://localhost:8000

## Default Login Credentials

| Role | Email | Password | Username |
|------|-------|----------|----------|
| Admin | admin@SSI.test | password | admin |
| Manager | manager@SSI.test | password | manager |
| Sales | budi@SSI.test | password | budi |
| Technician | rini@SSI.test | password | rini |
| Accountant | siti@SSI.test | password | siti |
| Warehouse | hendra@SSI.test | password | hendra |

## Struktur Database

### Core Infrastructure
- **users** - User login & profile
- **roles** - Role management
- **permissions** - Permission management
- **role_permission** - Role-Permission pivot

### Master Data
- **customers** - Data pelanggan
- **suppliers** - Data supplier
- **product_categories** - Kategori produk
- **products** - Data produk dengan harga & stok

### Operations
- **contracts** - Kontrak dengan layanan
- **contract_services** - Layanan dalam kontrak
- **contract_materials** - Material dalam layanan
- **sales_orders** - SO dari kontrak
- **sales_order_items** - Item dalam SO
- **work_orders** - Penugasan teknisi
- **work_order_materials** - Material digunakan

### Financial
- **invoices** - Invoice untuk SO
- **invoice_items** - Item dalam invoice
- **payments** - Pembayaran invoice
- **bank_accounts** - Rekening bank
- **bank_transactions** - Transaksi bank
- **cash_transactions** - Transaksi kas

### Inventory
- **stocks** - Stok produk
- **stock_movements** - Riwayat pergerakan stok
- **stock_transfers** - Transfer antar lokasi
- **stock_adjustments** - Penyesuaian stok
- **stock_opnames** - Perhitungan fisik stok
- **stock_opname_items** - Item dalam opname
- **purchase_orders** - PO ke supplier
- **purchase_order_items** - Item dalam PO

## Rute Aplikasi

```
GET  /                          → Redirect ke dashboard
GET  /dashboard                 → Dashboard utama

// Masters
GET    /customers               → List customers
POST   /customers               → Create customer
GET    /customers/{id}          → View customer
PUT    /customers/{id}          → Update customer
DELETE /customers/{id}          → Delete customer

// Operations (Similar untuk suppliers, products, contracts, dll)
GET    /sales-orders            → List sales orders
POST   /sales-orders            → Create sales order
GET    /sales-orders/{id}       → View sales order
PUT    /sales-orders/{id}       → Update sales order
DELETE /sales-orders/{id}       → Delete sales order

// Inventory
GET    /stocks                  → List stocks
GET    /stock-transfers         → Transfer management
GET    /stock-adjustments       → Adjustment management
GET    /stock-opnames           → Stock opname
GET    /purchase-orders         → Purchase orders

// Financial
GET    /invoices                → List invoices
GET    /payments                → Payment management
GET    /cash-transactions       → Cash transactions
GET    /bank-transactions       → Bank transactions

// Administration
GET    /users                   → User management
GET    /roles                   → Role management
GET    /profile                 → User profile
```

## Features Pending

Fitur-fitur berikut masih perlu dikembangkan:

1. **Frontend Views** - Blade templates & React components untuk setiap modul
2. **Business Logic** - Logic lengkap di setiap controller
3. **Validation** - Request validation untuk setiap form
4. **API Endpoints** - JSON API untuk mobile/desktop client
5. **Reports & Exports** - PDF reports dan Excel export
6. **Notifications** - Email & in-app notifications
7. **Audit Trail** - Tracking perubahan data
8. **Advanced Reporting** - Custom reports builder
9. **Mobile Responsive** - Optimasi untuk mobile devices
10. **API Documentation** - Swagger/OpenAPI docs

## Development Workflow

### Membuat Controller untuk Modul Baru
```bash
php artisan make:controller ModuleController --resource
```

### Membuat Model & Migration
```bash
php artisan make:model Module -m
```

### Membuat Seeder
```bash
php artisan make:seeder ModuleSeeder
```

### Running Migrations
```bash
php artisan migrate              # Run all pending migrations
php artisan migrate:refresh      # Rollback & re-run all
php artisan migrate:reset        # Rollback all
php artisan migrate --seed       # Run with seeders
```

### Frontend Development
```bash
npm run dev      # Watch mode dengan hot reload
npm run build    # Production build
npm run lint     # ESLint check
```

## Troubleshooting

### Database Connection Error
- Pastikan MySQL/PostgreSQL sudah running
- Verifikasi .env database settings
- Cek username & password database

### Migration Error dengan UUID
- Ensure PostgreSQL/MySQL version support UUID
- Untuk MySQL, gunakan CHAR(36) sebagai alternatif

### Node Modules Error
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Permission Error
```bash
php artisan cache:clear
php artisan config:clear
chmod -R 775 storage bootstrap/cache
```

## Deployment

### Production Checklist
- [ ] Set `APP_ENV=production` di .env
- [ ] Set `APP_DEBUG=false` di .env
- [ ] Run `php artisan config:cache`
- [ ] Run `php artisan route:cache`
- [ ] Run `npm run build` untuk frontend
- [ ] Configure database backup
- [ ] Setup monitoring & logging
- [ ] Configure SSL certificate
- [ ] Setup reverse proxy (Nginx/Apache)

## Support & Dokumentasi

Untuk informasi lebih lanjut:
- Laravel Docs: https://laravel.com/docs
- React Docs: https://react.dev
- TailwindCSS: https://tailwindcss.com
- PostgreSQL: https://www.postgresql.org/docs

## License

SSI ERP System - All Rights Reserved
