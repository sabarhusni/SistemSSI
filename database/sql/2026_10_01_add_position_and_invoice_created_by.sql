-- =====================================================================
-- PostgreSQL script, setara dengan migration:
--   2026_10_01_000001_add_position_to_users_table
--   2026_10_01_000002_add_created_by_to_invoices_table
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------

-- 2026_10_01_000001_add_position_to_users_table
-- Jabatan user, dipakai pada tanda tangan dokumen (mis. print invoice).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS position VARCHAR(100) NULL;

-- 2026_10_01_000002_add_created_by_to_invoices_table
-- User pembuat invoice, ditampilkan sebagai penanda tangan pada print invoice.
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS created_by UUID NULL;

ALTER TABLE invoices
    ADD CONSTRAINT invoices_created_by_foreign
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;

-- Catat ke tabel migrations agar `php artisan migrate` tidak menjalankannya lagi.
INSERT INTO migrations (migration, batch)
SELECT m.migration, (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations)
FROM (VALUES
    ('2026_10_01_000001_add_position_to_users_table'),
    ('2026_10_01_000002_add_created_by_to_invoices_table')
) AS m(migration)
WHERE NOT EXISTS (
    SELECT 1 FROM migrations x WHERE x.migration = m.migration
);

COMMIT;


-- ---------------------------------------------------------------------
-- DOWN (rollback) — jalankan manual jika perlu
-- ---------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_created_by_foreign;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS created_by;
-- ALTER TABLE users DROP COLUMN IF EXISTS position;
-- DELETE FROM migrations WHERE migration IN (
--     '2026_10_01_000001_add_position_to_users_table',
--     '2026_10_01_000002_add_created_by_to_invoices_table'
-- );
-- COMMIT;
