-- ============================================================================
-- ACCREDITATION FAMILY FILE SOCIAL SEARCH FIELDS MIGRATION
-- ============================================================================
-- Safe Additive Migration: Add social search/assessment fields to family_files

ALTER TABLE family_files ADD COLUMN IF NOT EXISTS income_type TEXT NULL; -- 'fixed' | 'variable'
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS monthly_income NUMERIC NULL;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS has_chronic_diseases BOOLEAN NULL DEFAULT false;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS has_disabilities BOOLEAN NULL DEFAULT false;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS receives_pension BOOLEAN NULL DEFAULT false;
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS breadwinner_name TEXT NULL; -- العائل في حالة وفاة الأب
ALTER TABLE family_files ADD COLUMN IF NOT EXISTS eligible_for_free_service BOOLEAN NULL DEFAULT false;

COMMENT ON COLUMN family_files.income_type IS 'Income type: fixed/variable (دخل الأسرة ثابت أم متغير)';
COMMENT ON COLUMN family_files.monthly_income IS 'Average monthly income (متوسط الدخل الشهري)';
COMMENT ON COLUMN family_files.has_chronic_diseases IS 'Has chronic diseases (وجود أمراض مزمنة بالأسرة)';
COMMENT ON COLUMN family_files.has_disabilities IS 'Has disability cases (وجود حالات إعاقة)';
COMMENT ON COLUMN family_files.receives_pension IS 'Whether the family receives a pension/aid (الأسرة تحصل على معاش)';
COMMENT ON COLUMN family_files.breadwinner_name IS 'Breadwinner name if father is deceased (العائل في حالة وفاة الأب)';
COMMENT ON COLUMN family_files.eligible_for_free_service IS 'Whether the family is eligible for free services (الأسرة تستحق الخدمة المجانية)';

NOTIFY pgrst, 'reload schema';
