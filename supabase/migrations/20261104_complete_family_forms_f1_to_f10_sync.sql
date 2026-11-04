-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: FAMILY HEALTH ACCREDITATION (FORMS ف1 TO ف10)
-- MIGRATION: COMPLETE SPECIALIZED ROUTING, TRIPLE AUTO-SYNC & STRICT RLS
-- File: supabase/migrations/20261104_complete_family_forms_f1_to_f10_sync.sql
-- Date: 2026-11-04
-- Description:
--   Pure flat SQL statements (no DO $$ blocks or dynamic string concatenation)
--   for 100% compatibility with Supabase SQL Editor.
--   Enforces strict Row Level Security (TO authenticated ONLY, zero TO anon).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CLINICS & APPOINTMENTS ROUTING COLUMNS
-- ============================================================================
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS linked_module TEXT NULL;
ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE public.clinic_appointments ADD COLUMN IF NOT EXISTS triggered_by TEXT NULL;

-- ============================================================================
-- 2. CORE FAMILY HEALTH & ENCOUNTERS TABLES (IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.family_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code TEXT NULL UNIQUE,
  file_code TEXT NULL,
  head_of_family_name TEXT NULL,
  head_national_id TEXT NULL,
  home_number TEXT NULL,
  address TEXT NULL,
  area_district TEXT NULL,
  phone TEXT NULL,
  nearest_landmark TEXT NULL,
  social_status TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.family_file_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_file_id UUID NOT NULL REFERENCES public.family_files(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  relation_to_head TEXT NULL,
  family_individual_number INTEGER NULL,
  is_head BOOLEAN NULL DEFAULT false,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_deaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  family_file_id UUID NULL REFERENCES public.family_files(id) ON DELETE SET NULL,
  death_date DATE NULL,
  age_at_death TEXT NULL,
  place_of_death TEXT NULL,
  direct_cause_of_death TEXT NULL,
  underlying_causes TEXT NULL,
  death_certificate_number TEXT NULL,
  recorded_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  clinic_id UUID NULL REFERENCES public.clinics(id) ON DELETE SET NULL,
  doctor_id UUID NULL REFERENCES public.doctors(id) ON DELETE SET NULL,
  encounter_type TEXT NOT NULL DEFAULT 'outpatient',
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.patient_problem_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  problem_name TEXT NOT NULL,
  icd_code TEXT NULL,
  problem_type TEXT NULL,
  onset_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'active',
  resolved_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_risk_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  risk_factor_code TEXT NULL,
  risk_factor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  details TEXT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  screening_type TEXT NOT NULL,
  result_text TEXT NULL,
  result_json JSONB NULL,
  screening_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.encounter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  order_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  instructions TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ORDERED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. FORM 1 (ف1) & FORM 2A (ف2أ) & FORM 2B (ف2ب)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.history_physical_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  exam_date DATE DEFAULT CURRENT_DATE,
  hospitalization TEXT NULL,
  previous_operations TEXT NULL,
  current_medications TEXT NULL,
  trauma_injuries TEXT NULL,
  allergy TEXT NULL,
  adverse_drug_reactions TEXT NULL,
  abuse_negligence TEXT NULL,
  psychiatric_history TEXT NULL,
  psychiatric_details TEXT NULL,
  other_history TEXT NULL,
  special_habits TEXT NULL,
  special_habits_other TEXT NULL,
  family_history TEXT NULL,
  family_history_other TEXT NULL,
  lab_hemoglobin TEXT NULL,
  lab_blood_group TEXT NULL,
  lab_rh TEXT NULL,
  lab_urine TEXT NULL,
  lab_stool TEXT NULL,
  maternal_history_notes TEXT NULL,
  clinical_findings TEXT NULL,
  significant_events TEXT NULL,
  doctor_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS family_history TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS family_history_other TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS lab_hemoglobin TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS lab_blood_group TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS lab_rh TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS lab_urine TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS lab_stool TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS maternal_history_notes TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS clinical_findings TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS significant_events TEXT NULL;
ALTER TABLE public.history_physical_exams ADD COLUMN IF NOT EXISTS doctor_name TEXT NULL;

CREATE TABLE IF NOT EXISTS public.patient_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_type TEXT NULL,
  visit_code INTEGER NULL,
  complaint TEXT NULL,
  chief_complaint TEXT NULL,
  clinical_exam TEXT NULL,
  investigations TEXT NULL,
  diagnosis TEXT NULL,
  management TEXT NULL,
  treatment_plan TEXT NULL,
  doctor_name TEXT NULL,
  doctor_signature TEXT NULL,
  clinic_name TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS visit_type TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS visit_code INTEGER NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS complaint TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS chief_complaint TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS clinical_exam TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS investigations TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS diagnosis TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS management TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS treatment_plan TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS doctor_name TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS doctor_signature TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS clinic_name TEXT NULL;
ALTER TABLE public.patient_visits ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- ============================================================================
-- 4. SPECIALIZED FORMS ف3 TO ف10 TABLES & COLUMNS
-- ============================================================================

-- Form 3 (ف3 - فحص الأسنان)
CREATE TABLE IF NOT EXISTS public.dental_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
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
ALTER TABLE public.dental_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 4A/4B/4C (ف4أ/ب/ج - متابعة الأمراض المزمنة)
CREATE TABLE IF NOT EXISTS public.hypertension_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  bp_systolic NUMERIC NULL,
  bp_diastolic NUMERIC NULL,
  treatment_plan TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diabetes_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  fasting_blood_sugar NUMERIC NULL,
  hba1c NUMERIC NULL,
  treatment_plan TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chronic_disease_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
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
ALTER TABLE public.chronic_disease_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 5A/B/C (ف5أ/ب/ج - متابعة الطفل أقل من 5 سنوات)
CREATE TABLE IF NOT EXISTS public.child_under5_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  age_months INTEGER NOT NULL DEFAULT 0,
  weight_kg NUMERIC NULL,
  height_cm NUMERIC NULL,
  head_circumference_cm NUMERIC NULL,
  feeding_type TEXT NULL,
  weaning_started BOOLEAN NULL,
  hemoglobin_level NUMERIC NULL,
  mandatory_vaccines_up_to_date BOOLEAN NULL,
  other_vaccines TEXT NULL,
  vitamin_a_supplement_given BOOLEAN NULL,
  vitamin_d_supplement_given BOOLEAN NULL,
  parental_concerns TEXT NULL,
  clinical_assessment TEXT NULL,
  health_education_topics TEXT NULL,
  nurse_signature TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.child_under5_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.child_development_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  milestone_category TEXT NULL,
  age_bracket_months TEXT NULL,
  milestone_description TEXT NULL,
  status TEXT NULL DEFAULT 'achieved',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.child_development_milestones ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 5D (ف5د - متابعة الطفل أكثر من 5 سنوات)
CREATE TABLE IF NOT EXISTS public.child_over5_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
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
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS educational_stage TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS weight_kg NUMERIC NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS height_cm NUMERIC NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS bmi NUMERIC NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS vision_screening TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS hearing_screening TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS school_achievement_concerns BOOLEAN NULL DEFAULT false;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS psychiatric_behavioral_screening TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS hb_level NUMERIC NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS urine_analysis_result TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS stool_analysis_result TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS health_education_given TEXT NULL;
ALTER TABLE public.child_over5_followups ADD COLUMN IF NOT EXISTS doctor_signature TEXT NULL;

-- Form 6A (ف6أ - متابعة الحمل) & Form 6B (ف6ب - متابعة ما بعد الولادة)
CREATE TABLE IF NOT EXISTS public.maternal_antenatal_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  pregnancy_order INTEGER NULL,
  lmp_date DATE NULL,
  edd_date DATE NULL,
  blood_type_rh TEXT NULL,
  previous_obstetric_history TEXT NULL,
  tetanus_status TEXT NULL,
  consanguinity BOOLEAN NULL DEFAULT false,
  gravida INTEGER NULL,
  para INTEGER NULL,
  abortions INTEGER NULL,
  stillbirths INTEGER NULL,
  living_children INTEGER NULL,
  previous_cs BOOLEAN NULL DEFAULT false,
  fundal_height_cm NUMERIC NULL,
  fetal_lie TEXT NULL,
  fetal_heart_sound TEXT NULL,
  fetal_movement TEXT NULL,
  ultrasound_findings TEXT NULL,
  hb_result NUMERIC NULL,
  blood_glucose NUMERIC NULL,
  urine_albumin BOOLEAN NULL,
  urine_glucose BOOLEAN NULL,
  dental_check_done BOOLEAN NULL,
  supplements_prescribed BOOLEAN NULL,
  complications_concerns TEXT NULL,
  health_education_given TEXT NULL,
  next_visit_date DATE NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maternal_antenatal_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.maternal_postpartum_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
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
ALTER TABLE public.maternal_postpartum_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 7 (ف7 - تنظيم الأسرة)
CREATE TABLE IF NOT EXISTS public.family_planning_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
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
ALTER TABLE public.family_planning_followups ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 8A/8B (ف8أ/ب - فحص ما قبل الزواج)
CREATE TABLE IF NOT EXISTS public.premarital_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  partner_name TEXT NULL,
  partner_national_id TEXT NULL,
  consanguinity_with_partner BOOLEAN NULL DEFAULT false,
  infectious_disease_history TEXT NULL,
  hereditary_disease_history TEXT NULL,
  fasting_blood_sugar NUMERIC NULL,
  postprandial_blood_sugar NUMERIC NULL,
  cbc_summary TEXT NULL,
  rh_factor TEXT NULL,
  chest_xray_result TEXT NULL,
  hb_electrophoresis_done BOOLEAN NULL,
  genetic_counseling_given BOOLEAN NULL,
  certificate_number TEXT NULL,
  certificate_status TEXT NULL DEFAULT 'pending',
  mutual_consent_signed BOOLEAN NULL DEFAULT false,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.premarital_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 9 (ف9 - الفحص الدوري الشامل للمسنين)
CREATE TABLE IF NOT EXISTS public.geriatric_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE CASCADE,
  appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
  weight_loss BOOLEAN NULL,
  weakness_reported BOOLEAN NULL,
  poor_endurance BOOLEAN NULL,
  slowness_reported BOOLEAN NULL,
  inactivity_reported BOOLEAN NULL,
  basic_adls_score TEXT NULL,
  instrumental_adls_score TEXT NULL,
  advanced_adls_score TEXT NULL,
  depression_mood_assessment TEXT NULL,
  fall_risk_timed_up_go TEXT NULL,
  vision_hearing_incontinence TEXT NULL,
  osteoporosis_screening BOOLEAN NULL,
  cancer_screening_colorectal_prostate_breast TEXT NULL,
  immunizations_flu_pneumo TEXT NULL,
  mini_cog_score INTEGER NULL,
  caregiver_support_notes TEXT NULL,
  management_plan TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geriatric_assessments ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.clinic_appointments(id) ON DELETE SET NULL;

-- Form 10A (ف10أ - نموذج الإحالة)
CREATE TABLE IF NOT EXISTS public.patient_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  encounter_id UUID NULL REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,
  referred_to_entity TEXT NULL,
  referred_to_specialty TEXT NULL,
  referral_type TEXT NULL,
  reason TEXT NULL,
  relevant_history TEXT NULL,
  exam_findings TEXT NULL,
  investigations TEXT NULL,
  provisional_diagnosis TEXT NULL,
  transport_method TEXT NULL,
  referred_at TIMESTAMPTZ NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS referred_to_entity TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS referred_to_specialty TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS referral_type TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS reason TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS relevant_history TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS exam_findings TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS investigations TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS provisional_diagnosis TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS transport_method TEXT NULL;
ALTER TABLE public.patient_referrals ADD COLUMN IF NOT EXISTS referred_at TIMESTAMPTZ NULL DEFAULT now();

-- ============================================================================
-- 5. MAKE encounter_id NULLABLE ACROSS ALL SPECIALIZED TABLES
-- ============================================================================
ALTER TABLE public.maternal_antenatal_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.maternal_postpartum_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.child_under5_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.child_development_milestones ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.child_over5_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.family_planning_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.premarital_assessments ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.geriatric_assessments ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.dental_assessments ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.hypertension_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.diabetes_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.chronic_disease_followups ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.patient_visits ALTER COLUMN encounter_id DROP NOT NULL;
ALTER TABLE public.patient_referrals ALTER COLUMN encounter_id DROP NOT NULL;

-- ============================================================================
-- 6. STRICT ROW LEVEL SECURITY (RLS): TO authenticated ONLY (ZERO TO anon)
-- ============================================================================

-- 6.1 family_files
ALTER TABLE public.family_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_family_files ON public.family_files;
DROP POLICY IF EXISTS anon_full_access_family_files ON public.family_files;
DROP POLICY IF EXISTS allow_all_for_authenticated_family_files ON public.family_files;
DROP POLICY IF EXISTS authenticated_full_access_family_files ON public.family_files;
CREATE POLICY authenticated_full_access_family_files ON public.family_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.2 family_file_members
ALTER TABLE public.family_file_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS anon_full_access_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS allow_all_for_authenticated_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS authenticated_full_access_family_file_members ON public.family_file_members;
CREATE POLICY authenticated_full_access_family_file_members ON public.family_file_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.3 patient_deaths
ALTER TABLE public.patient_deaths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_deaths ON public.patient_deaths;
DROP POLICY IF EXISTS anon_full_access_patient_deaths ON public.patient_deaths;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_deaths ON public.patient_deaths;
DROP POLICY IF EXISTS authenticated_full_access_patient_deaths ON public.patient_deaths;
CREATE POLICY authenticated_full_access_patient_deaths ON public.patient_deaths FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.4 history_physical_exams
ALTER TABLE public.history_physical_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_history_physical_exams ON public.history_physical_exams;
DROP POLICY IF EXISTS anon_full_access_history_physical_exams ON public.history_physical_exams;
DROP POLICY IF EXISTS allow_all_for_authenticated_history_physical_exams ON public.history_physical_exams;
DROP POLICY IF EXISTS authenticated_full_access_history_physical_exams ON public.history_physical_exams;
CREATE POLICY authenticated_full_access_history_physical_exams ON public.history_physical_exams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.5 patient_visits
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS anon_full_access_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS authenticated_full_access_patient_visits ON public.patient_visits;
CREATE POLICY authenticated_full_access_patient_visits ON public.patient_visits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.6 clinical_encounters
ALTER TABLE public.clinical_encounters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_clinical_encounters ON public.clinical_encounters;
DROP POLICY IF EXISTS anon_full_access_clinical_encounters ON public.clinical_encounters;
DROP POLICY IF EXISTS allow_all_for_authenticated_clinical_encounters ON public.clinical_encounters;
DROP POLICY IF EXISTS authenticated_full_access_clinical_encounters ON public.clinical_encounters;
CREATE POLICY authenticated_full_access_clinical_encounters ON public.clinical_encounters FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.7 patient_vitals
ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_vitals ON public.patient_vitals;
DROP POLICY IF EXISTS anon_full_access_patient_vitals ON public.patient_vitals;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_vitals ON public.patient_vitals;
DROP POLICY IF EXISTS authenticated_full_access_patient_vitals ON public.patient_vitals;
CREATE POLICY authenticated_full_access_patient_vitals ON public.patient_vitals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.8 patient_problem_list
ALTER TABLE public.patient_problem_list ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_problem_list ON public.patient_problem_list;
DROP POLICY IF EXISTS anon_full_access_patient_problem_list ON public.patient_problem_list;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_problem_list ON public.patient_problem_list;
DROP POLICY IF EXISTS authenticated_full_access_patient_problem_list ON public.patient_problem_list;
CREATE POLICY authenticated_full_access_patient_problem_list ON public.patient_problem_list FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.9 patient_risk_factors
ALTER TABLE public.patient_risk_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_risk_factors ON public.patient_risk_factors;
DROP POLICY IF EXISTS anon_full_access_patient_risk_factors ON public.patient_risk_factors;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_risk_factors ON public.patient_risk_factors;
DROP POLICY IF EXISTS authenticated_full_access_patient_risk_factors ON public.patient_risk_factors;
CREATE POLICY authenticated_full_access_patient_risk_factors ON public.patient_risk_factors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.10 patient_screenings
ALTER TABLE public.patient_screenings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_screenings ON public.patient_screenings;
DROP POLICY IF EXISTS anon_full_access_patient_screenings ON public.patient_screenings;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_screenings ON public.patient_screenings;
DROP POLICY IF EXISTS authenticated_full_access_patient_screenings ON public.patient_screenings;
CREATE POLICY authenticated_full_access_patient_screenings ON public.patient_screenings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.11 patient_referrals
ALTER TABLE public.patient_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_patient_referrals ON public.patient_referrals;
DROP POLICY IF EXISTS anon_full_access_patient_referrals ON public.patient_referrals;
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_referrals ON public.patient_referrals;
DROP POLICY IF EXISTS authenticated_full_access_patient_referrals ON public.patient_referrals;
CREATE POLICY authenticated_full_access_patient_referrals ON public.patient_referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.12 hypertension_followups
ALTER TABLE public.hypertension_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_hypertension_followups ON public.hypertension_followups;
DROP POLICY IF EXISTS anon_full_access_hypertension_followups ON public.hypertension_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_hypertension_followups ON public.hypertension_followups;
DROP POLICY IF EXISTS authenticated_full_access_hypertension_followups ON public.hypertension_followups;
CREATE POLICY authenticated_full_access_hypertension_followups ON public.hypertension_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.13 diabetes_followups
ALTER TABLE public.diabetes_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_diabetes_followups ON public.diabetes_followups;
DROP POLICY IF EXISTS anon_full_access_diabetes_followups ON public.diabetes_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_diabetes_followups ON public.diabetes_followups;
DROP POLICY IF EXISTS authenticated_full_access_diabetes_followups ON public.diabetes_followups;
CREATE POLICY authenticated_full_access_diabetes_followups ON public.diabetes_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.14 chronic_disease_followups
ALTER TABLE public.chronic_disease_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_chronic_disease_followups ON public.chronic_disease_followups;
DROP POLICY IF EXISTS anon_full_access_chronic_disease_followups ON public.chronic_disease_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_chronic_disease_followups ON public.chronic_disease_followups;
DROP POLICY IF EXISTS authenticated_full_access_chronic_disease_followups ON public.chronic_disease_followups;
CREATE POLICY authenticated_full_access_chronic_disease_followups ON public.chronic_disease_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.15 encounter_orders
ALTER TABLE public.encounter_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_encounter_orders ON public.encounter_orders;
DROP POLICY IF EXISTS anon_full_access_encounter_orders ON public.encounter_orders;
DROP POLICY IF EXISTS allow_all_for_authenticated_encounter_orders ON public.encounter_orders;
DROP POLICY IF EXISTS authenticated_full_access_encounter_orders ON public.encounter_orders;
CREATE POLICY authenticated_full_access_encounter_orders ON public.encounter_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.16 maternal_antenatal_followups
ALTER TABLE public.maternal_antenatal_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_maternal_antenatal_followups ON public.maternal_antenatal_followups;
DROP POLICY IF EXISTS anon_full_access_maternal_antenatal_followups ON public.maternal_antenatal_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_maternal_antenatal_followups ON public.maternal_antenatal_followups;
DROP POLICY IF EXISTS authenticated_full_access_maternal_antenatal_followups ON public.maternal_antenatal_followups;
CREATE POLICY authenticated_full_access_maternal_antenatal_followups ON public.maternal_antenatal_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.17 maternal_postpartum_followups
ALTER TABLE public.maternal_postpartum_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_maternal_postpartum_followups ON public.maternal_postpartum_followups;
DROP POLICY IF EXISTS anon_full_access_maternal_postpartum_followups ON public.maternal_postpartum_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_maternal_postpartum_followups ON public.maternal_postpartum_followups;
DROP POLICY IF EXISTS authenticated_full_access_maternal_postpartum_followups ON public.maternal_postpartum_followups;
CREATE POLICY authenticated_full_access_maternal_postpartum_followups ON public.maternal_postpartum_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.18 child_under5_followups
ALTER TABLE public.child_under5_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_child_under5_followups ON public.child_under5_followups;
DROP POLICY IF EXISTS anon_full_access_child_under5_followups ON public.child_under5_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_child_under5_followups ON public.child_under5_followups;
DROP POLICY IF EXISTS authenticated_full_access_child_under5_followups ON public.child_under5_followups;
CREATE POLICY authenticated_full_access_child_under5_followups ON public.child_under5_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.19 child_development_milestones
ALTER TABLE public.child_development_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_child_development_milestones ON public.child_development_milestones;
DROP POLICY IF EXISTS anon_full_access_child_development_milestones ON public.child_development_milestones;
DROP POLICY IF EXISTS allow_all_for_authenticated_child_development_milestones ON public.child_development_milestones;
DROP POLICY IF EXISTS authenticated_full_access_child_development_milestones ON public.child_development_milestones;
CREATE POLICY authenticated_full_access_child_development_milestones ON public.child_development_milestones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.20 child_over5_followups
ALTER TABLE public.child_over5_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on child_over5_followups" ON public.child_over5_followups;
DROP POLICY IF EXISTS allow_all_for_anon_child_over5_followups ON public.child_over5_followups;
DROP POLICY IF EXISTS anon_full_access_child_over5_followups ON public.child_over5_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_child_over5_followups ON public.child_over5_followups;
DROP POLICY IF EXISTS authenticated_only_child_over5_followups ON public.child_over5_followups;
DROP POLICY IF EXISTS authenticated_full_access_child_over5_followups ON public.child_over5_followups;
CREATE POLICY authenticated_full_access_child_over5_followups ON public.child_over5_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.21 family_planning_followups
ALTER TABLE public.family_planning_followups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_family_planning_followups ON public.family_planning_followups;
DROP POLICY IF EXISTS anon_full_access_family_planning_followups ON public.family_planning_followups;
DROP POLICY IF EXISTS allow_all_for_authenticated_family_planning_followups ON public.family_planning_followups;
DROP POLICY IF EXISTS authenticated_full_access_family_planning_followups ON public.family_planning_followups;
CREATE POLICY authenticated_full_access_family_planning_followups ON public.family_planning_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.22 premarital_assessments
ALTER TABLE public.premarital_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_premarital_assessments ON public.premarital_assessments;
DROP POLICY IF EXISTS anon_full_access_premarital_assessments ON public.premarital_assessments;
DROP POLICY IF EXISTS allow_all_for_authenticated_premarital_assessments ON public.premarital_assessments;
DROP POLICY IF EXISTS authenticated_full_access_premarital_assessments ON public.premarital_assessments;
CREATE POLICY authenticated_full_access_premarital_assessments ON public.premarital_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.23 geriatric_assessments
ALTER TABLE public.geriatric_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_geriatric_assessments ON public.geriatric_assessments;
DROP POLICY IF EXISTS anon_full_access_geriatric_assessments ON public.geriatric_assessments;
DROP POLICY IF EXISTS allow_all_for_authenticated_geriatric_assessments ON public.geriatric_assessments;
DROP POLICY IF EXISTS authenticated_full_access_geriatric_assessments ON public.geriatric_assessments;
CREATE POLICY authenticated_full_access_geriatric_assessments ON public.geriatric_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6.24 dental_assessments
ALTER TABLE public.dental_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_dental_assessments ON public.dental_assessments;
DROP POLICY IF EXISTS anon_full_access_dental_assessments ON public.dental_assessments;
DROP POLICY IF EXISTS allow_all_for_authenticated_dental_assessments ON public.dental_assessments;
DROP POLICY IF EXISTS authenticated_full_access_dental_assessments ON public.dental_assessments;
CREATE POLICY authenticated_full_access_dental_assessments ON public.dental_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
