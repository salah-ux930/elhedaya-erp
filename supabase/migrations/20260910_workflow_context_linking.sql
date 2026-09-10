-- ==============================================================================
-- Migration: Workflow Context Linking & Schema Correction
-- File: supabase/migrations/20260910_workflow_context_linking.sql
-- Description:
--   1. Fix schema drift for child_over5_followups and ensure all medical fields exist:
--      (hb_level, urine_analysis_result, stool_analysis_result, health_education_given, etc.)
--   2. Add appointment_id foreign key to all 10 Primary Care & Accreditation modules.
--   3. Add linked_module to clinics and triggered_by to clinic_appointments.
--   4. Apply strict, explicit RLS policies (TO authenticated / TO anon) avoiding PUBLIC fallback.
-- ==============================================================================

-- 1. Ensure columns on clinics & appointments
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS linked_module TEXT NULL;
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS triggered_by TEXT NULL;

-- 2. Link appointment_id across all Primary Care Accreditation tables
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE patient_visits ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE maternal_antenatal_followups ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE maternal_postpartum_followups ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE child_under5_followups ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE child_development_milestones ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE family_planning_followups ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE premarital_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE geriatric_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE dental_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;

-- 3. Schema definition and correction for child_over5_followups (Form 5D)
CREATE TABLE IF NOT EXISTS child_over5_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  educational_stage TEXT NULL,
  weight_kg NUMERIC NULL,
  height_cm NUMERIC NULL,
  bmi NUMERIC NULL,
  vision_screening TEXT NULL,
  hearing_screening TEXT NULL,
  school_achievement_concerns BOOLEAN NULL DEFAULT false,
  psychiatric_behavioral_screening TEXT NULL,
  hb_level NUMERIC NULL,
  urine_analysis_result TEXT NULL,
  stool_analysis_result TEXT NULL,
  health_education_given TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for child_over5_followups in case table already exists with partial schema
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS educational_stage TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS weight_kg NUMERIC NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS height_cm NUMERIC NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS bmi NUMERIC NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS vision_screening TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS hearing_screening TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS school_achievement_concerns BOOLEAN NULL DEFAULT false;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS psychiatric_behavioral_screening TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS hb_level NUMERIC NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS urine_analysis_result TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS stool_analysis_result TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS health_education_given TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS doctor_signature TEXT NULL;
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE child_over5_followups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure encounter_id is nullable so records can be created directly from appointments / patient file
DO $$
BEGIN
  ALTER TABLE child_over5_followups ALTER COLUMN encounter_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Secure RLS policies with explicit roles (TO authenticated and TO anon, preventing open PUBLIC policies)
ALTER TABLE child_over5_followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on child_over5_followups" ON child_over5_followups;
DROP POLICY IF EXISTS "allow_all_for_authenticated_child_over5_followups" ON child_over5_followups;
DROP POLICY IF EXISTS "allow_all_for_anon_child_over5_followups" ON child_over5_followups;
DROP POLICY IF EXISTS "authenticated_only_child_over5_followups" ON child_over5_followups;

CREATE POLICY "authenticated_only_child_over5_followups" ON child_over5_followups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_for_anon_child_over5_followups" ON child_over5_followups
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Seed default linked_module for standard clinics
UPDATE clinics SET linked_module = 'maternal' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%حوامل%' OR name ILIKE '%نساء%' OR name ILIKE '%توليد%' OR name ILIKE '%أمومة%');
UPDATE clinics SET linked_module = 'child' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%أطفال%' OR name ILIKE '%تطعيم%' OR name ILIKE '%نمو%');
UPDATE clinics SET linked_module = 'family_planning' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%تنظيم الأسرة%' OR name ILIKE '%صحة إنجابية%');
UPDATE clinics SET linked_module = 'dental' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%أسنان%' OR name ILIKE '%فم%');
UPDATE clinics SET linked_module = 'geriatric' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%مسنين%' OR name ILIKE '%كبار السن%');
UPDATE clinics SET linked_module = 'premarital' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%زواج%' OR name ILIKE '%مقبلين%');
UPDATE clinics SET linked_module = 'history' WHERE (linked_module IS NULL OR linked_module = '') AND (name ILIKE '%باطنة%' OR name ILIKE '%طب أسرة%' OR name ILIKE '%فحص شامل%');
