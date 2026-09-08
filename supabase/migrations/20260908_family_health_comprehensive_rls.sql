-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: FAMILY HEALTH ACCREDITATION MODULE
-- COMPREHENSIVE RLS POLICIES & ENCOUNTER EXTENSIONS MIGRATION
-- ============================================================================

-- 1. Ensure family_file_members has family_individual_number and created_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_file_members' AND column_name = 'family_individual_number'
  ) THEN
    ALTER TABLE family_file_members ADD COLUMN family_individual_number INTEGER NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_file_members' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE family_file_members ADD COLUMN created_by TEXT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'family_files' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE family_files ADD COLUMN created_by TEXT NULL;
  END IF;
END $$;

-- 2. Make encounter_id NULLABLE on Phase 2 tables so records can be created directly or with encounter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maternal_antenatal_followups') THEN
    ALTER TABLE maternal_antenatal_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maternal_postpartum_followups') THEN
    ALTER TABLE maternal_postpartum_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_under5_followups') THEN
    ALTER TABLE child_under5_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_development_milestones') THEN
    ALTER TABLE child_development_milestones ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'child_over5_followups') THEN
    ALTER TABLE child_over5_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'family_planning_followups') THEN
    ALTER TABLE family_planning_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'premarital_assessments') THEN
    ALTER TABLE premarital_assessments ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geriatric_assessments') THEN
    ALTER TABLE geriatric_assessments ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_assessments') THEN
    ALTER TABLE dental_assessments ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hypertension_followups') THEN
    ALTER TABLE hypertension_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diabetes_followups') THEN
    ALTER TABLE diabetes_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chronic_disease_followups') THEN
    ALTER TABLE chronic_disease_followups ALTER COLUMN encounter_id DROP NOT NULL;
  END IF;
END $$;

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL FAMILY HEALTH TABLES
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'family_files',
    'family_file_members',
    'patient_deaths',
    'history_physical_exams',
    'patient_visits',
    'clinical_encounters',
    'patient_vitals',
    'patient_problem_list',
    'patient_risk_factors',
    'patient_screenings',
    'patient_referrals',
    'hypertension_followups',
    'diabetes_followups',
    'chronic_disease_followups',
    'encounter_orders',
    'maternal_antenatal_followups',
    'maternal_postpartum_followups',
    'child_under5_followups',
    'child_development_milestones',
    'child_over5_followups',
    'family_planning_followups',
    'premarital_assessments',
    'geriatric_assessments',
    'dental_assessments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      
      -- Drop existing policies if any to avoid duplicates
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'allow_all_for_authenticated_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'allow_all_for_anon_' || t, t);
      
      -- Create standard permissive policies for self-hosted/authenticated use
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
        'allow_all_for_authenticated_' || t, t
      );
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO anon USING (true) WITH CHECK (true);',
        'allow_all_for_anon_' || t, t
      );
    END IF;
  END LOOP;
END $$;

-- Reload Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
