-- =====================================================================
-- PostgreSQL script, setara dengan migration:
--   2026_10_03_000001_add_position_to_contract_premises_table
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- UP
-- ---------------------------------------------------------------------

-- 2026_10_03_000001_add_position_to_contract_premises_table
-- Jabatan PIC premis, ditampilkan pada print kontrak.
ALTER TABLE contract_premises
    ADD COLUMN IF NOT EXISTS position VARCHAR(100) NULL;

-- Catat ke tabel migrations agar `php artisan migrate` tidak menjalankannya lagi.
INSERT INTO migrations (migration, batch)
SELECT m.migration, (SELECT COALESCE(MAX(batch), 0) + 1 FROM migrations)
FROM (VALUES
    ('2026_10_03_000001_add_position_to_contract_premises_table')
) AS m(migration)
WHERE NOT EXISTS (
    SELECT 1 FROM migrations x WHERE x.migration = m.migration
);

COMMIT;


-- ---------------------------------------------------------------------
-- DOWN (rollback) — jalankan manual jika perlu
-- ---------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE contract_premises DROP COLUMN IF EXISTS position;
-- DELETE FROM migrations WHERE migration = '2026_10_03_000001_add_position_to_contract_premises_table';
-- COMMIT;
