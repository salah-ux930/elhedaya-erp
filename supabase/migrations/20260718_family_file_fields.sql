-- ============================================================================
-- ACCREDITATION FAMILY FILE FIELDS MIGRATION
-- ============================================================================
-- Safe Additive Migration: Add required accreditation demographics to family_files

ALTER TABLE family_files ADD COLUMN IF NOT EXISTS national_id TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS governorate TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS administration TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS village_city TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS health_unit TEXT NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS head_name TEXT NULL;

COMMENT ON COLUMN family_files.national_id IS 'National ID of the household head for accreditation validation.';
COMMENT ON COLUMN family_files.governorate IS 'Governorate (المحافظة) of the family household.';
COMMENT ON COLUMN family_files.administration IS 'Health Administration (الإدارة الصحية) of the family health unit.';
COMMENT ON COLUMN family_files.village_city IS 'Village or City (القرية أو المدينة) of the family household.';
COMMENT ON COLUMN family_files.health_unit IS 'Family Health Unit/Center (وحدة طب الأسرة) where the family is registered.';
COMMENT ON COLUMN family_files.head_name IS 'Name of the Head of the Family (اسم رب العائلة).';

NOTIFY pgrst, 'reload schema';
