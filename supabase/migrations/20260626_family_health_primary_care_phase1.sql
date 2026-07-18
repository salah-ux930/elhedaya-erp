-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: FAMILY HEALTH / PRIMARY CARE MODULE
-- PHASE 1 DATABASE MIGRATION (ACCREDITATION CORE & CHRONIC DISEASES)
-- ============================================================================
-- Safe Additive Migration: Preserves 100% of existing ERP, Dialysis, Lab,
-- Clinic, Financial, Queue, and HR tables.
-- ============================================================================

-- 0. ENABLE REQUIRED EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. REUSABLE TRIGGER FOR AUTO-UPDATING updated_at COLUMNS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- SECTION A: SAFE ADDITIVE CHANGES TO EXISTING TABLES
-- ============================================================================

-- Add demographic stratification required for accreditation workflows (Maternal/Child, Geriatrics, Premarital)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- Add comment explanations for compliance audits
COMMENT ON COLUMN patients.gender IS 'Accreditation stratification: Antenatal, postpartum, family planning, cervical/breast cancer screening programs.';
COMMENT ON COLUMN patients.marital_status IS 'Accreditation stratification: Premarital screening programs & household head linkage.';
COMMENT ON COLUMN patients.occupation IS 'Accreditation stratification: Occupational hazard screenings & socioeconomic evaluation.';
COMMENT ON COLUMN patients.guardian_name IS 'Accreditation requirement: Mandatory consent & caregiver contact for pediatric (under 5 / over 5) & geriatric care.';
COMMENT ON COLUMN patients.guardian_phone IS 'Accreditation requirement: Caregiver emergency follow-up phone.';

-- Note: Bidirectional encounter linkage on clinic_appointments is added after clinical_encounters table creation.

-- ============================================================================
-- SECTION B: SHARED CLINICAL CORE TABLES
-- ============================================================================

-- 1. clinical_encounters (Separates medical documentation from scheduling)
CREATE TABLE IF NOT EXISTS clinical_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES clinic_appointments(id) ON DELETE SET NULL,
  clinic_id UUID NULL REFERENCES clinics(id) ON DELETE SET NULL,
  doctor_id UUID NULL REFERENCES doctors(id) ON DELETE SET NULL,
  encounter_type TEXT NOT NULL,
  encounter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  encounter_time TIME NULL,
  status TEXT NOT NULL DEFAULT 'open',
  chief_complaint TEXT NULL,
  history_of_present_illness TEXT NULL,
  assessment_summary TEXT NULL,
  plan_summary TEXT NULL,
  notes TEXT NULL,
  created_by TEXT NULL,
  updated_by TEXT NULL,
  visit_source TEXT NULL,
  followup_due_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_encounter_status CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled'))
);

COMMENT ON TABLE clinical_encounters IS 'Core clinical encounter layer. Replaces appointment-only documentation for longitudinal Family Health & Primary Care accreditation.';
COMMENT ON COLUMN clinical_encounters.encounter_type IS 'Examples: outpatient, family_health, hypertension_followup, diabetes_followup, chronic_followup, antenatal, postpartum, child_under5, child_over5, family_planning, premarital, geriatric, dental, referral.';

CREATE INDEX IF NOT EXISTS idx_clinical_encounters_patient_id ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_encounters_appointment_id ON clinical_encounters(appointment_id);
CREATE INDEX IF NOT EXISTS idx_clinical_encounters_date ON clinical_encounters(encounter_date);
CREATE INDEX IF NOT EXISTS idx_clinical_encounters_type ON clinical_encounters(encounter_type);
CREATE INDEX IF NOT EXISTS idx_clinical_encounters_doctor_id ON clinical_encounters(doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_encounters_clinic_id ON clinical_encounters(clinic_id);

CREATE TRIGGER set_clinical_encounters_updated_at
BEFORE UPDATE ON clinical_encounters
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safe additive bidirectional linkage on existing clinic_appointments
ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_clinic_appointments_encounter_id ON clinic_appointments(encounter_id);

-- 2. patient_vitals (Structured anthropometrics & vital signs)
CREATE TABLE IF NOT EXISTS patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  systolic_bp NUMERIC NULL,
  diastolic_bp NUMERIC NULL,
  bp_position TEXT NULL,
  pulse NUMERIC NULL,
  respiratory_rate NUMERIC NULL,
  temperature NUMERIC NULL,
  oxygen_saturation NUMERIC NULL,
  weight_kg NUMERIC NULL,
  height_cm NUMERIC NULL,
  bmi NUMERIC NULL,
  waist_cm NUMERIC NULL,
  head_circumference_cm NUMERIC NULL,
  blood_glucose_random NUMERIC NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_vitals IS 'Longitudinal vital signs & anthropometric measurements across all clinical encounters.';
CREATE INDEX IF NOT EXISTS idx_patient_vitals_encounter_id ON patient_vitals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_patient_id ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_measured_at ON patient_vitals(measured_at);

CREATE TRIGGER set_patient_vitals_updated_at
BEFORE UPDATE ON patient_vitals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. patient_problem_list (Structured ICD-10 diagnoses & chronic conditions)
CREATE TABLE IF NOT EXISTS patient_problem_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  problem_name TEXT NOT NULL,
  icd_code TEXT NULL,
  problem_type TEXT NULL,
  onset_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_problem_status CHECK (status IN ('active', 'resolved', 'inactive'))
);

COMMENT ON TABLE patient_problem_list IS 'Accreditation problem list for tracking chronic illnesses, acute episodes, and medical history.';
COMMENT ON COLUMN patient_problem_list.problem_type IS 'Examples: acute, chronic, risk_factor, complication.';

CREATE INDEX IF NOT EXISTS idx_patient_problem_list_patient_id ON patient_problem_list(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_problem_list_encounter_id ON patient_problem_list(encounter_id);
CREATE INDEX IF NOT EXISTS idx_patient_problem_list_status ON patient_problem_list(status);
CREATE INDEX IF NOT EXISTS idx_patient_problem_list_type ON patient_problem_list(problem_type);

CREATE TRIGGER set_patient_problem_list_updated_at
BEFORE UPDATE ON patient_problem_list
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. patient_risk_factors (Structured clinical & lifestyle risk stratification)
CREATE TABLE IF NOT EXISTS patient_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  risk_factor_code TEXT NULL,
  risk_factor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  details TEXT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_risk_factors IS 'Structured risk factors reused across HTN, DM, chronic disease, maternal, and geriatric programs.';
CREATE INDEX IF NOT EXISTS idx_patient_risk_factors_patient_id ON patient_risk_factors(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_risk_factors_encounter_id ON patient_risk_factors(encounter_id);
CREATE INDEX IF NOT EXISTS idx_patient_risk_factors_code ON patient_risk_factors(risk_factor_code);
CREATE INDEX IF NOT EXISTS idx_patient_risk_factors_name ON patient_risk_factors(risk_factor_name);

CREATE TRIGGER set_patient_risk_factors_updated_at
BEFORE UPDATE ON patient_risk_factors
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. patient_screenings (Standardized preventative health assessments)
CREATE TABLE IF NOT EXISTS patient_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  screening_type TEXT NOT NULL,
  result_text TEXT NULL,
  result_json JSONB NULL,
  screening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_screenings IS 'Structured assessment results (e.g., PHQ-9 depression, fall risk, developmental milestones, visual/hearing acuity).';
CREATE INDEX IF NOT EXISTS idx_patient_screenings_patient_id ON patient_screenings(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_screenings_encounter_id ON patient_screenings(encounter_id);
CREATE INDEX IF NOT EXISTS idx_patient_screenings_type ON patient_screenings(screening_type);
CREATE INDEX IF NOT EXISTS idx_patient_screenings_date ON patient_screenings(screening_date);

CREATE TRIGGER set_patient_screenings_updated_at
BEFORE UPDATE ON patient_screenings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. patient_referrals (Accreditation-compliant internal & external referrals)
CREATE TABLE IF NOT EXISTS patient_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES clinical_encounters(id) ON DELETE SET NULL,
  referring_clinic_id UUID NULL REFERENCES clinics(id) ON DELETE SET NULL,
  referring_doctor_id UUID NULL REFERENCES doctors(id) ON DELETE SET NULL,
  referred_to_entity TEXT NULL,
  referred_to_specialty TEXT NULL,
  referral_type TEXT NULL,
  reason TEXT NULL,
  relevant_history TEXT NULL,
  exam_findings TEXT NULL,
  investigations TEXT NULL,
  provisional_diagnosis TEXT NULL,
  transport_method TEXT NULL,
  referred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result_summary TEXT NULL,
  final_diagnosis TEXT NULL,
  current_medications TEXT NULL,
  interventions TEXT NULL,
  recommendations TEXT NULL,
  revisit_date DATE NULL,
  specialist_name TEXT NULL,
  specialist_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_referrals IS 'Full clinical referral form and closed-loop specialist feedback tracking.';
CREATE INDEX IF NOT EXISTS idx_patient_referrals_patient_id ON patient_referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_encounter_id ON patient_referrals(encounter_id);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_referred_at ON patient_referrals(referred_at);
CREATE INDEX IF NOT EXISTS idx_patient_referrals_type ON patient_referrals(referral_type);

CREATE TRIGGER set_patient_referrals_updated_at
BEFORE UPDATE ON patient_referrals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION C: FAMILY / HOUSEHOLD ACCREDITATION LAYER
-- ============================================================================

-- 7. family_files (Household master record)
CREATE TABLE IF NOT EXISTS family_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT NULL UNIQUE,
  home_number TEXT NULL,
  address TEXT NULL,
  area_district TEXT NULL,
  phone TEXT NULL,
  nearest_landmark TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE family_files IS 'Master household folder representing the family unit required by primary care accreditation standards.';

CREATE TRIGGER set_family_files_updated_at
BEFORE UPDATE ON family_files
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. family_file_members (Links individual patients to household folder)
CREATE TABLE IF NOT EXISTS family_file_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_file_id UUID NOT NULL REFERENCES family_files(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship_to_head TEXT NULL,
  family_role TEXT NULL,
  is_head BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_family_file_patient UNIQUE(family_file_id, patient_id)
);

COMMENT ON TABLE family_file_members IS 'Mapping of patients to family files. Prevents duplicate patient assignment within the same household.';
CREATE INDEX IF NOT EXISTS idx_family_file_members_file_id ON family_file_members(family_file_id);
CREATE INDEX IF NOT EXISTS idx_family_file_members_patient_id ON family_file_members(patient_id);

CREATE TRIGGER set_family_file_members_updated_at
BEFORE UPDATE ON family_file_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION D: ACCREDITATION CHRONIC DISEASE PROGRAM TABLES (PHASE 1)
-- ============================================================================

-- 9. hypertension_followups (Dedicated HTN clinical protocol form)
CREATE TABLE IF NOT EXISTS hypertension_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  complaint TEXT NULL,
  bp_sitting_systolic NUMERIC NULL,
  bp_sitting_diastolic NUMERIC NULL,
  bp_standing_systolic NUMERIC NULL,
  bp_standing_diastolic NUMERIC NULL,
  smoking BOOLEAN NULL,
  physical_inactivity BOOLEAN NULL,
  obesity BOOLEAN NULL,
  dyslipidemia BOOLEAN NULL,
  family_history BOOLEAN NULL,
  lvh_hf BOOLEAN NULL,
  angina_mi BOOLEAN NULL,
  stroke_tia BOOLEAN NULL,
  ckd BOOLEAN NULL,
  retinopathy BOOLEAN NULL,
  urine_analysis_done BOOLEAN NULL,
  creatinine_egfr_done BOOLEAN NULL,
  potassium_sodium_done BOOLEAN NULL,
  fasting_blood_sugar_done BOOLEAN NULL,
  cbc_done BOOLEAN NULL,
  total_cholesterol_done BOOLEAN NULL,
  ldl_done BOOLEAN NULL,
  hdl_done BOOLEAN NULL,
  triglycerides_done BOOLEAN NULL,
  ecg_done BOOLEAN NULL,
  diet_weight_loss_education BOOLEAN NULL,
  physical_activity_education BOOLEAN NULL,
  low_salt_education BOOLEAN NULL,
  smoking_cessation_education BOOLEAN NULL,
  treatment_plan TEXT NULL,
  doctor_signature TEXT NULL,
  followup_interval TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE hypertension_followups IS 'Accreditation hypertension protocol form capturing orthostatic BP, target organ damage, monitoring checklist, and counseling.';
CREATE INDEX IF NOT EXISTS idx_hypertension_followups_patient_id ON hypertension_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_hypertension_followups_encounter_id ON hypertension_followups(encounter_id);

CREATE TRIGGER set_hypertension_followups_updated_at
BEFORE UPDATE ON hypertension_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. diabetes_followups (Dedicated DM clinical protocol form)
CREATE TABLE IF NOT EXISTS diabetes_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  complaint TEXT NULL,
  smoking BOOLEAN NULL,
  physical_inactivity BOOLEAN NULL,
  obesity BOOLEAN NULL,
  family_history BOOLEAN NULL,
  dyslipidemia BOOLEAN NULL,
  ckd BOOLEAN NULL,
  neuropathy BOOLEAN NULL,
  retinopathy BOOLEAN NULL,
  diabetic_foot BOOLEAN NULL,
  dka_or_hypoglycemia BOOLEAN NULL,
  fbs_done BOOLEAN NULL,
  hba1c_done BOOLEAN NULL,
  urine_analysis_done BOOLEAN NULL,
  creatinine_egfr_done BOOLEAN NULL,
  fundus_exam_done BOOLEAN NULL,
  foot_exam_done BOOLEAN NULL,
  ecg_done BOOLEAN NULL,
  urinary_microalbumin_done BOOLEAN NULL,
  lipid_profile_done BOOLEAN NULL,
  diet_weight_loss_education BOOLEAN NULL,
  physical_activity_education BOOLEAN NULL,
  self_monitoring_education BOOLEAN NULL,
  hypoglycemia_education BOOLEAN NULL,
  smoking_cessation_education BOOLEAN NULL,
  treatment_plan TEXT NULL,
  doctor_signature TEXT NULL,
  followup_interval TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE diabetes_followups IS 'Accreditation diabetes protocol form capturing glycemic monitoring checklist, micro/macrovascular complications, and education.';
CREATE INDEX IF NOT EXISTS idx_diabetes_followups_patient_id ON diabetes_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_diabetes_followups_encounter_id ON diabetes_followups(encounter_id);

CREATE TRIGGER set_diabetes_followups_updated_at
BEFORE UPDATE ON diabetes_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. chronic_disease_followups (General non-DM / non-HTN chronic protocol form)
CREATE TABLE IF NOT EXISTS chronic_disease_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  diagnosis TEXT NOT NULL,
  disease_discovery_date DATE NULL,
  complaint TEXT NULL,
  clinical_notes TEXT NULL,
  investigations TEXT NULL,
  management_plan TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE chronic_disease_followups IS 'General chronic disease follow-up form (e.g., bronchial asthma, epilepsy, hypothyroidism, rheumatoid arthritis).';
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_patient_id ON chronic_disease_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_encounter_id ON chronic_disease_followups(encounter_id);
CREATE INDEX IF NOT EXISTS idx_chronic_disease_followups_diagnosis ON chronic_disease_followups(diagnosis);

CREATE TRIGGER set_chronic_disease_followups_updated_at
BEFORE UPDATE ON chronic_disease_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION E: RECOMMENDED CORE TABLE
-- ============================================================================

-- 12. encounter_orders (Encounter-centric clinical order linkage)
CREATE TABLE IF NOT EXISTS encounter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered',
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_order_status CHECK (status IN ('ordered', 'in_progress', 'completed', 'cancelled'))
);

COMMENT ON TABLE encounter_orders IS 'Encounter-level orders connecting primary consultations to lab tests, radiology, procedures, and prescriptions.';
COMMENT ON COLUMN encounter_orders.order_type IS 'Examples: lab, radiology, procedure, medication.';

CREATE INDEX IF NOT EXISTS idx_encounter_orders_patient_id ON encounter_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounter_orders_encounter_id ON encounter_orders(encounter_id);
CREATE INDEX IF NOT EXISTS idx_encounter_orders_type ON encounter_orders(order_type);
CREATE INDEX IF NOT EXISTS idx_encounter_orders_status ON encounter_orders(status);

CREATE TRIGGER set_encounter_orders_updated_at
BEFORE UPDATE ON encounter_orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RELOAD SUPABASE POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
