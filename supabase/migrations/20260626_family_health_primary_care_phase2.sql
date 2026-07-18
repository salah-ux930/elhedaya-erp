-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: FAMILY HEALTH / PRIMARY CARE MODULE
-- PHASE 2 DATABASE MIGRATION (MATERNAL, CHILD, GERIATRIC & DENTAL ACCREDITATION)
-- ============================================================================
-- Safe Additive Migration: Preserves 100% of existing tables and Phase 1 core.
-- ============================================================================

-- 13. maternal_antenatal_followups (Pregnancy & ANC Protocol - Form 6 A)
CREATE TABLE IF NOT EXISTS maternal_antenatal_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

COMMENT ON TABLE maternal_antenatal_followups IS 'Accreditation antenatal care (ANC) form capturing obstetric assessment, fetal monitoring, lab screening, and counseling.';
CREATE INDEX IF NOT EXISTS idx_maternal_anc_patient ON maternal_antenatal_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_maternal_anc_encounter ON maternal_antenatal_followups(encounter_id);

CREATE TRIGGER set_maternal_anc_updated_at
BEFORE UPDATE ON maternal_antenatal_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. maternal_postpartum_followups (Postpartum Protocol - Form 6 B)
CREATE TABLE IF NOT EXISTS maternal_postpartum_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

CREATE TRIGGER set_maternal_postpartum_updated_at
BEFORE UPDATE ON maternal_postpartum_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. child_under5_followups (Pediatric Growth & Care Under 5 - Form 5 A & 5 C)
CREATE TABLE IF NOT EXISTS child_under5_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  age_months INTEGER NOT NULL,
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

COMMENT ON TABLE child_under5_followups IS 'Accreditation child follow-up under 5 years capturing WHO growth metrics, nutrition, immunization status, and clinical exam.';
CREATE INDEX IF NOT EXISTS idx_child_under5_patient ON child_under5_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_child_under5_encounter ON child_under5_followups(encounter_id);

CREATE TRIGGER set_child_under5_updated_at
BEFORE UPDATE ON child_under5_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. child_development_milestones (Developmental Milestones Checklist - Form 5 B)
CREATE TABLE IF NOT EXISTS child_development_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  milestone_category TEXT NOT NULL,
  age_bracket_months TEXT NOT NULL,
  milestone_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'achieved',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_milestone_status CHECK (status IN ('achieved', 'delayed', 'not_assessed'))
);

COMMENT ON TABLE child_development_milestones IS 'Structured tracking of motor, cognitive, speech, and social milestones across infancy and early childhood.';
CREATE INDEX IF NOT EXISTS idx_child_milestones_patient ON child_development_milestones(patient_id);
CREATE INDEX IF NOT EXISTS idx_child_milestones_encounter ON child_development_milestones(encounter_id);

CREATE TRIGGER set_child_milestones_updated_at
BEFORE UPDATE ON child_development_milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. child_over5_followups (School Age & Adolescent Health Over 5 - Form 5 D)
CREATE TABLE IF NOT EXISTS child_over5_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  educational_stage TEXT NULL,
  weight_kg NUMERIC NULL,
  height_cm NUMERIC NULL,
  bmi NUMERIC NULL,
  vision_screening TEXT NULL,
  hearing_screening TEXT NULL,
  school_achievement_concerns BOOLEAN NULL,
  psychiatric_behavioral_screening TEXT NULL,
  hb_level NUMERIC NULL,
  urine_analysis_result TEXT NULL,
  stool_analysis_result TEXT NULL,
  health_education_given TEXT NULL,
  doctor_signature TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE child_over5_followups IS 'Accreditation child follow-up over 5 years (nursery to secondary school) capturing scholastic health, vision/hearing screening, and psychosocial evaluation.';
CREATE INDEX IF NOT EXISTS idx_child_over5_patient ON child_over5_followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_child_over5_encounter ON child_over5_followups(encounter_id);

CREATE TRIGGER set_child_over5_updated_at
BEFORE UPDATE ON child_over5_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 18. family_planning_followups (Reproductive Health & Contraception - Form 7)
CREATE TABLE IF NOT EXISTS family_planning_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

CREATE TRIGGER set_family_planning_updated_at
BEFORE UPDATE ON family_planning_followups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. premarital_assessments (Premarital Examination Protocol - Form 8 A & 8 B)
CREATE TABLE IF NOT EXISTS premarital_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

COMMENT ON TABLE premarital_assessments IS 'Accreditation premarital examination form capturing partner consanguinity, mandatory infectious/genetic lab screenings, and certified informed consent.';
CREATE INDEX IF NOT EXISTS idx_premarital_patient ON premarital_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_premarital_encounter ON premarital_assessments(encounter_id);

CREATE TRIGGER set_premarital_updated_at
BEFORE UPDATE ON premarital_assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 20. geriatric_assessments (Comprehensive Geriatric Assessment - Form 9)
CREATE TABLE IF NOT EXISTS geriatric_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

COMMENT ON TABLE geriatric_assessments IS 'Accreditation geriatric assessment form capturing physical frailty index, ADLs/IADLs functional independence, cognitive mini-cog screening, and preventative oncology.';
CREATE INDEX IF NOT EXISTS idx_geriatric_patient ON geriatric_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_geriatric_encounter ON geriatric_assessments(encounter_id);

CREATE TRIGGER set_geriatric_updated_at
BEFORE UPDATE ON geriatric_assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 21. dental_assessments (Oral & Dental Health Protocol - Form 3)
CREATE TABLE IF NOT EXISTS dental_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
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

COMMENT ON TABLE dental_assessments IS 'Accreditation oral and dental examination form capturing WHO Community Periodontal Index (CPI), DMFT caries index, TMJ assessment, and mucosal lesions.';
CREATE INDEX IF NOT EXISTS idx_dental_patient ON dental_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_dental_encounter ON dental_assessments(encounter_id);

CREATE TRIGGER set_dental_updated_at
BEFORE UPDATE ON dental_assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RELOAD SUPABASE POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';
