-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: FAMILY HEALTH ACCREDITATION MODULE
-- MIGRATION: CREATE MISSING ACCREDITATION TABLES & STRICT RLS SECURITY POLICIES
-- Date: 2026-09-11
-- Description: Creates 10 missing accreditation clinical tables that were defined
-- in Phase 1 / Phase 2 specifications but not yet provisioned in the live DB instance.
-- Security: Strict RLS enabled on all tables; access granted TO authenticated ONLY.
-- ZERO access granted to 'anon' role (strict adherence to Rule 2 & Rule 7).
-- ============================================================================

-- Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure trigger function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. maternal_postpartum_followups (Postpartum Protocol - Form 6 B)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maternal_postpartum_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  delivery_date DATE NULL,
  delivery_mode TEXT NULL,
  delivery_outcome TEXT NULL,
  delivery_complications TEXT NULL,
  vitamin_a_given BOOLEAN NULL DEFAULT false,
  delivery_place TEXT NULL,
  attended_by TEXT NULL,
  postpartum_visit_num INTEGER NULL,
  exclusive_breastfeeding BOOLEAN NULL,
  feeding_on_demand BOOLEAN NULL,
  breastfeeding_problems TEXT NULL,
  breastfeeding_position_latch TEXT NULL,
  depression_screening_done BOOLEAN NULL,
  social_adjustment_ok BOOLEAN NULL,
  maternal_concerns TEXT NULL,
  health_education_topics TEXT NULL,
  contraception_method TEXT NULL,
  contraception_start_date DATE NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE maternal_postpartum_followups IS 'Accreditation postpartum form capturing puerperal visits, lactation evaluation, mental health screening, and family planning initiation.';
CREATE INDEX IF NOT EXISTS idx_maternal_postpartum_patient ON maternal_postpartum_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_maternal_postpartum_encounter ON maternal_postpartum_followups(encounter_id);
CREATE INDEX IF NOT EXISTS idx_maternal_postpartum_appointment ON maternal_postpartum_followups(appointment_id);

DROP TRIGGER IF EXISTS set_maternal_postpartum_updated_at ON maternal_postpartum_followups;
CREATE TRIGGER set_maternal_postpartum_updated_at
BEFORE UPDATE ON maternal_postpartum_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2. family_planning_followups (Reproductive Health & Contraception - Form 7)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_planning_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  visit_reason TEXT NULL,
  current_method TEXT NULL,
  method_duration TEXT NULL,
  side_effects TEXT NULL,
  menstrual_regularity TEXT NULL,
  menstrual_amount TEXT NULL,
  dysmenorrhea BOOLEAN NULL,
  pelvic_exam_inspection TEXT NULL,
  vaginal_discharge BOOLEAN NULL,
  uterine_position_size TEXT NULL,
  adnexa_mass BOOLEAN NULL,
  cervix_appearance TEXT NULL,
  breast_self_exam_taught BOOLEAN NULL DEFAULT false,
  new_method_prescribed TEXT NULL,
  next_visit_date DATE NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE family_planning_followups IS 'Accreditation family planning service form capturing reproductive history, contraceptive side effects, pelvic/speculum exam, and counseling.';
CREATE INDEX IF NOT EXISTS idx_family_planning_patient ON family_planning_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_family_planning_encounter ON family_planning_followups(encounter_id);
CREATE INDEX IF NOT EXISTS idx_family_planning_appointment ON family_planning_followups(appointment_id);

DROP TRIGGER IF EXISTS set_family_planning_updated_at ON family_planning_followups;
CREATE TRIGGER set_family_planning_updated_at
BEFORE UPDATE ON family_planning_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 3. dental_assessments (Oral & Dental Health Protocol - Form 3)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dental_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  location_type TEXT NULL,
  extra_oral_exam_code INTEGER NULL,
  tmj_clicking BOOLEAN NULL,
  tmj_tenderness BOOLEAN NULL,
  reduced_jaw_mobility BOOLEAN NULL,
  oral_mucosa_condition INTEGER NULL,
  periodontal_index_cpi INTEGER NULL,
  fluorosis_index INTEGER NULL,
  white_spot_lesions BOOLEAN NULL,
  occlusion_class TEXT NULL,
  dmft_decayed INTEGER NULL DEFAULT 0,
  dmft_missing INTEGER NULL DEFAULT 0,
  dmft_filled INTEGER NULL DEFAULT 0,
  trauma_index_code INTEGER NULL,
  treatment_plan TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE dental_assessments IS 'Accreditation oral and dental examination form capturing WHO CPI index, DMFT score, TMJ assessment, and mucosal lesions.';
CREATE INDEX IF NOT EXISTS idx_dental_patient ON dental_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_encounter ON dental_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_dental_appointment ON dental_assessments(appointment_id);

DROP TRIGGER IF EXISTS set_dental_updated_at ON dental_assessments;
CREATE TRIGGER set_dental_updated_at
BEFORE UPDATE ON dental_assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. chronic_disease_followups (General Non-DM / Non-HTN Protocol)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chronic_disease_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL,
  disease_discovery_date DATE NULL,
  control_status TEXT NULL,
  complications_notes TEXT NULL,
  medications_adherence BOOLEAN NULL,
  next_investigation_due DATE NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE chronic_disease_followups IS 'General chronic disease follow-up form (bronchial asthma, epilepsy, hypothyroidism, rheumatoid arthritis).';
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_patient_id ON chronic_disease_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_encounter_id ON chronic_disease_followups(encounter_id);
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_appointment_id ON chronic_disease_followups(appointment_id);

DROP TRIGGER IF EXISTS set_chronic_disease_followups_updated_at ON chronic_disease_followups;
CREATE TRIGGER set_chronic_disease_followups_updated_at
BEFORE UPDATE ON chronic_disease_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. child_development_milestones (Developmental Milestones Checklist)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_development_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  screening_age_months INTEGER NOT NULL,
  gross_motor_normal BOOLEAN NULL,
  fine_motor_normal BOOLEAN NULL,
  hearing_speech_normal BOOLEAN NULL,
  social_interaction_normal BOOLEAN NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE child_development_milestones IS 'Child developmental milestones screening register according to age stages.';
CREATE INDEX IF NOT EXISTS idx_child_milestones_patient ON child_development_milestones(patient_id);
CREATE INDEX IF NOT EXISTS idx_child_milestones_encounter ON child_development_milestones(encounter_id);

DROP TRIGGER IF EXISTS set_child_milestones_updated_at ON child_development_milestones;
CREATE TRIGGER set_child_milestones_updated_at
BEFORE UPDATE ON child_development_milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. patient_visits (Longitudinal Clinic Visits Register)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT NULL,
  clinic_name TEXT NULL,
  chief_complaint TEXT NULL,
  diagnosis TEXT NULL,
  treatment_plan TEXT NULL,
  doctor_name TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_visits IS 'Master register of chronological patient visits, outpatient consultations, and triage notes.';
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_date ON patient_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_appointment ON patient_visits(appointment_id);

DROP TRIGGER IF EXISTS set_patient_visits_updated_at ON patient_visits;
CREATE TRIGGER set_patient_visits_updated_at
BEFORE UPDATE ON patient_visits
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. patient_risk_factors (Accreditation Risk Stratification Registry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  risk_factor_code TEXT NOT NULL,
  risk_factor_name TEXT NOT NULL,
  category TEXT NULL,
  severity TEXT NULL,
  onset_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_risk_factors IS 'Clinical and behavioral risk factors register (e.g. smoking, obesity, family risk).';
CREATE INDEX IF NOT EXISTS idx_patient_risk_factors_patient ON patient_risk_factors(patient_id);

DROP TRIGGER IF EXISTS set_patient_risk_factors_updated_at ON patient_risk_factors;
CREATE TRIGGER set_patient_risk_factors_updated_at
BEFORE UPDATE ON patient_risk_factors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 8. patient_screenings (Preventative Screening Registry)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  screening_type TEXT NOT NULL,
  score NUMERIC NULL,
  result TEXT NOT NULL,
  interpretation TEXT NULL,
  recommended_action TEXT NULL,
  screening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  screened_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_screenings IS 'Registry for periodic screenings (PHQ-9, fall risk, sensory acuity, cancer screening).';
CREATE INDEX IF NOT EXISTS idx_patient_screenings_patient ON patient_screenings(patient_id);

DROP TRIGGER IF EXISTS set_patient_screenings_updated_at ON patient_screenings;
CREATE TRIGGER set_patient_screenings_updated_at
BEFORE UPDATE ON patient_screenings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9. patient_referrals (Accreditation Referral & Specialist Consultation Form)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  referral_reason TEXT NOT NULL,
  provisional_diagnosis TEXT NULL,
  specialty_requested TEXT NOT NULL,
  target_clinic_id UUID NULL REFERENCES clinics(id) ON DELETE SET NULL,
  target_facility_name TEXT NULL,
  urgency TEXT NOT NULL DEFAULT 'ROUTINE',
  referral_date DATE NOT NULL DEFAULT CURRENT_DATE,
  specialist_feedback TEXT NULL,
  specialist_signature TEXT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_referrals IS 'Referral tracking for accreditation with closed-loop specialist communication.';
CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient ON patient_referrals(patient_id);

DROP TRIGGER IF EXISTS set_patient_referrals_updated_at ON patient_referrals;
CREATE TRIGGER set_patient_referrals_updated_at
BEFORE UPDATE ON patient_referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 10. encounter_orders (Clinical Encounter Diagnostic & Medication Orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  instructions TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ORDERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE encounter_orders IS 'Connects clinical encounter decisions directly to lab, radiology, or prescription orders.';
CREATE INDEX IF NOT EXISTS idx_encounter_orders_encounter ON encounter_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_orders_patient ON encounter_orders(patient_id);

DROP TRIGGER IF EXISTS set_encounter_orders_updated_at ON encounter_orders;
CREATE TRIGGER set_encounter_orders_updated_at
BEFORE UPDATE ON encounter_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- RULES:
-- 1. Enable RLS on all 10 tables.
-- 2. Drop any legacy or accidental policies.
-- 3. Grant access TO authenticated ONLY.
-- 4. ABSOLUTELY ZERO policies created for 'anon' role (Rule 2 & Rule 7).
-- ============================================================================

DO $$
DECLARE
  t text;
  new_tables text[] := ARRAY[
    'maternal_postpartum_followups',
    'family_planning_followups',
    'dental_assessments',
    'chronic_disease_followups',
    'child_development_milestones',
    'patient_visits',
    'patient_risk_factors',
    'patient_screenings',
    'patient_referrals',
    'encounter_orders'
  ];
BEGIN
  FOREACH t IN ARRAY new_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
      -- Enable Row Level Security
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
      
      -- Drop any pre-existing policies on this table
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'allow_all_for_authenticated_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'allow_all_for_anon_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'authenticated_full_access_' || t, t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'anon_full_access_' || t, t);
      
      -- Create secure policy for authenticated users ONLY
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
        'authenticated_full_access_' || t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- RELOAD SUPABASE POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
