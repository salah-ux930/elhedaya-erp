-- ============================================================================
-- ACCREDITATION FAMILY FILE HOUSING FIELDS MIGRATION
-- ============================================================================
-- Safe Additive Migration: Add required housing condition fields to family_files

ALTER TABLE family_files ADD COLUMN IF NOT EXISTS total_rooms INTEGER NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS sleeping_rooms INTEGER NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS ventilation TEXT NULL; -- 'good' | 'poor'
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS water_source TEXT NULL; -- 'public' | 'other'
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS sewage_system TEXT NULL; -- 'sanitary' | 'trench'
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS lighting_type TEXT NULL; -- 'electricity' | 'other'
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS has_animals_birds BOOLEAN NULL DEFAULT false;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS barn_location TEXT NULL; -- 'inside' | 'outside' | 'none'

COMMENT ON COLUMN family_files.total_rooms IS 'Total rooms in the household (عدد الحجرات الكلي)';
COMMENT ON COLUMN family_files.sleeping_rooms IS 'Rooms allocated for sleeping (الحجرات المخصصة للنوم)';
COMMENT ON COLUMN family_files.ventilation IS 'Ventilation condition: good/poor (التهوية جيدة أم غير جيدة)';
COMMENT ON COLUMN family_files.water_source IS 'Water source: public/other (مصدر المياه عام أم أخرى)';
COMMENT ON COLUMN family_files.sewage_system IS 'Sewage system: sanitary/trench (الصرف الصحي صحي أم طرنش)';
COMMENT ON COLUMN family_files.lighting_type IS 'Lighting type: electricity/other (نوع الإضاءة كهرباء أم أخرى)';
COMMENT ON COLUMN family_files.has_animals_birds IS 'Whether animals/birds are in the household (وجود حيوانات أو طيور بالمنزل)';
COMMENT ON COLUMN family_files.barn_location IS 'Barn/coop location: inside/outside/none (وجود حظيرة بالمنزل أم بالخارج)';

NOTIFY pgrst, 'reload schema';
