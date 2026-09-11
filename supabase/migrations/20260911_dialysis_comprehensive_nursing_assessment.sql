-- Migration: Comprehensive Dialysis Nursing Assessment Module (موديول التقييم التمريضي الشامل لوحدة الغسيل الكلوي)
-- Date: 2026-09-11
-- Strict Compliance with Project Rule 2 & Rule 7: NO anon access. TO authenticated ONLY.

-- 1. dialysis_nursing_assessments (التقييم التمريضي الرئيسي لكل جلسة غسيل)
CREATE TABLE IF NOT EXISTS public.dialysis_nursing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assessment_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  information_source TEXT, -- patient | family | relative | external_facility
  chief_complaint TEXT,
  medical_care_plan TEXT,
  doctor_signature TEXT,
  pre_dialysis_pain JSONB DEFAULT '{}'::jsonb, -- {has_pain, onset, location, duration, characteristics}
  allergy JSONB DEFAULT '{}'::jsonb, -- {has_allergy: bool, details}
  fall_risk_measures JSONB DEFAULT '{}'::jsonb, -- {card_placed, bed_low_brakes_locked, safe_environment, frequent_toilet_check, staff_assist_walking, patient_education}
  access_review JSONB DEFAULT '{}'::jsonb, -- {access_type, insertion_site, working_efficiently: bool, pulse_check_result, complications}
  edema JSONB DEFAULT '{}'::jsonb, -- {present: bool, location, grade}
  consciousness_level TEXT,
  immunization_review JSONB DEFAULT '{}'::jsonb, -- {reviewed_and_updated: bool, vaccine_name_if_not, reason}
  weight_gain_during_session NUMERIC,
  session_complications JSONB DEFAULT '{}'::jsonb, -- {none, cramps, nausea, hypoxia, high_bp, low_bp, dizziness, cardiac_problems, other_text}
  new_events_since_last_assessment JSONB DEFAULT '{}'::jsonb, -- {has_new: bool, details}
  doctor_orders_reviewed BOOLEAN DEFAULT FALSE,
  lab_results_reviewed BOOLEAN DEFAULT FALSE,
  dialysis_machine_check_reviewed BOOLEAN DEFAULT FALSE,
  breathing_difficulty BOOLEAN DEFAULT FALSE,
  chest_pain BOOLEAN DEFAULT FALSE,
  fluid_status JSONB DEFAULT '{}'::jsonb, -- {target_weight_kg, tongue_dryness: bool, neck_veins: 'distended'|'flat'}
  abuse_neglect_signs BOOLEAN DEFAULT FALSE,
  psychological_assessment TEXT, -- frustrated | tense | uncooperative | no_problem
  skin_assessment TEXT, -- healthy | wrinkled | inflamed
  spiritual_assessment TEXT, -- needs_support | no_need
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_nursing_assessments IS 'سجل التقييم التمريضي الشامل المرتبط بجلسة الغسيل الكلوي';
CREATE INDEX IF NOT EXISTS idx_dialysis_nursing_assessments_session ON public.dialysis_nursing_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_dialysis_nursing_assessments_patient ON public.dialysis_nursing_assessments(patient_id);

-- 2. dialysis_access_lines (سجل التركيبات والوصلات الوريدية والقساطر التراكمي)
CREATE TABLE IF NOT EXISTS public.dialysis_access_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL, -- peripheral_cannula | av_fistula | urinary_catheter | tracheal_tube | tracheostomy | chest_tube | cvc_central_line
  insertion_site TEXT,
  insertion_datetime TIMESTAMPTZ,
  removal_datetime TIMESTAMPTZ,
  removal_or_change_reason TEXT,
  responsible_doctor TEXT,
  status TEXT DEFAULT 'active', -- active | removed
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_access_lines IS 'سجل تراكمي للوصلات والقساطر الوريدية والأنبوبية لمرضى الغسيل';
CREATE INDEX IF NOT EXISTS idx_dialysis_access_lines_patient ON public.dialysis_access_lines(patient_id);
CREATE INDEX IF NOT EXISTS idx_dialysis_access_lines_status ON public.dialysis_access_lines(status);

-- 3. dialysis_nursing_notes (الملاحظات التمريضية أثناء الجلسة)
CREATE TABLE IF NOT EXISTS public.dialysis_nursing_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  note_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note_text TEXT NOT NULL,
  nurse_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_nursing_notes IS 'ملاحظات التمريض الزمنية أثناء جلسة الغسيل';
CREATE INDEX IF NOT EXISTS idx_dialysis_nursing_notes_session ON public.dialysis_nursing_notes(session_id);

-- 4. dialysis_nursing_care_plan (خطة الرعاية التمريضية)
CREATE TABLE IF NOT EXISTS public.dialysis_nursing_care_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  plan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessment TEXT,
  nursing_diagnosis TEXT,
  goal TEXT,
  nursing_interventions TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_nursing_care_plan IS 'خطة الرعاية والتدخلات التمريضية لجلسة الغسيل الكلوي';
CREATE INDEX IF NOT EXISTS idx_dialysis_nursing_care_plan_session ON public.dialysis_nursing_care_plan(session_id);

-- 5. dialysis_vital_signs_ews (العلامات الحيوية ونظام الإنذار المبكر EWS)
CREATE TABLE IF NOT EXISTS public.dialysis_vital_signs_ews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  recorded_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respiratory_rate NUMERIC, 
  respiratory_rate_score INT DEFAULT 0,
  oxygen_saturation NUMERIC, 
  spo2_score INT DEFAULT 0,
  oxygen_therapy_type TEXT DEFAULT 'air', -- air | o2
  oxygen_flow_lmin NUMERIC, 
  oxygen_score INT DEFAULT 0,
  systolic_bp NUMERIC, 
  bp_score INT DEFAULT 0,
  heart_rate NUMERIC, 
  hr_score INT DEFAULT 0,
  consciousness_level TEXT DEFAULT 'alert', -- alert | not_responding_to_voice_pain | unconscious
  consciousness_score INT DEFAULT 0,
  temperature_celsius NUMERIC, 
  temp_score INT DEFAULT 0,
  total_ews_score INT DEFAULT 0,
  escalation_action TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_vital_signs_ews IS 'سجل العلامات الحيوية وحساب درجات الإنذار المبكر EWS أثناء الجلسة';
CREATE INDEX IF NOT EXISTS idx_dialysis_vital_signs_ews_session ON public.dialysis_vital_signs_ews(session_id);

-- 6. dialysis_pain_glucose_log (سجل تقييم الألم وسكر الدم وكمية السحب)
CREATE TABLE IF NOT EXISTS public.dialysis_pain_glucose_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pain_assessment_score NUMERIC,
  blood_glucose_level NUMERIC,
  withdrawal_amount_ml NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_pain_glucose_log IS 'سجل الألم والسكر ومعدلات سحب السوائل أثناء جلسة الغسيل';
CREATE INDEX IF NOT EXISTS idx_dialysis_pain_glucose_log_session ON public.dialysis_pain_glucose_log(session_id);

-- 7. dialysis_medical_care_log (سجل المرور والرعاية الطبية)
CREATE TABLE IF NOT EXISTS public.dialysis_medical_care_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  log_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  complaint TEXT,
  examination_findings TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_medical_care_log IS 'سجل المرور الطبي والفحص أثناء جلسة الغسيل';
CREATE INDEX IF NOT EXISTS idx_dialysis_medical_care_log_session ON public.dialysis_medical_care_log(session_id);

-- 8. dialysis_medication_administration (سجل إعطاء الأدوية أثناء الجلسة MAR)
CREATE TABLE IF NOT EXISTS public.dialysis_medication_administration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
  drug_name TEXT NOT NULL,
  dose TEXT,
  route TEXT,
  instructions TEXT,
  administered_datetime TIMESTAMPTZ DEFAULT NOW(),
  doctor_signature TEXT,
  nurse_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_medication_administration IS 'سجل إعطاء وتوثيق أدوية جلسة الغسيل الكلوي (MAR)';
CREATE INDEX IF NOT EXISTS idx_dialysis_medication_admin_session ON public.dialysis_medication_administration(session_id);

-- 9. dialysis_health_education (سجل التثقيف والتوعية الصحية لمرضى الغسيل)
CREATE TABLE IF NOT EXISTS public.dialysis_health_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.dialysis_sessions(id) ON DELETE SET NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  learning_ability TEXT, -- high | medium | low
  learning_barriers JSONB DEFAULT '{}'::jsonb, -- {language, illiteracy, communication_difficulty, other}
  learning_method JSONB DEFAULT '{}'::jsonb, -- {reading, listening, practice}
  topics_covered JSONB DEFAULT '{}'::jsonb, -- {diet_explanation, patient_rights_duties, fall_prevention, fistula_site_care, fluid_restriction, other}
  patient_or_family_signature TEXT,
  nurse_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_health_education IS 'سجل التثقيف الصحي لمرضى وحدة الغسيل الكلوي';
CREATE INDEX IF NOT EXISTS idx_dialysis_health_education_patient ON public.dialysis_health_education(patient_id);
CREATE INDEX IF NOT EXISTS idx_dialysis_health_education_session ON public.dialysis_health_education(session_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - STRICTLY AUTHENTICATED ONLY (RULE 2 & 7)
-- ============================================================================

ALTER TABLE public.dialysis_nursing_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_assessments" ON public.dialysis_nursing_assessments;
DROP POLICY IF EXISTS "anon_access_dialysis_nursing_assessments" ON public.dialysis_nursing_assessments;
CREATE POLICY "authenticated_only_dialysis_nursing_assessments" 
ON public.dialysis_nursing_assessments FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_access_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_access_lines" ON public.dialysis_access_lines;
DROP POLICY IF EXISTS "anon_access_dialysis_access_lines" ON public.dialysis_access_lines;
CREATE POLICY "authenticated_only_dialysis_access_lines" 
ON public.dialysis_access_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_nursing_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_notes" ON public.dialysis_nursing_notes;
DROP POLICY IF EXISTS "anon_access_dialysis_nursing_notes" ON public.dialysis_nursing_notes;
CREATE POLICY "authenticated_only_dialysis_nursing_notes" 
ON public.dialysis_nursing_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_nursing_care_plan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_care_plan" ON public.dialysis_nursing_care_plan;
DROP POLICY IF EXISTS "anon_access_dialysis_nursing_care_plan" ON public.dialysis_nursing_care_plan;
CREATE POLICY "authenticated_only_dialysis_nursing_care_plan" 
ON public.dialysis_nursing_care_plan FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_vital_signs_ews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_vital_signs_ews" ON public.dialysis_vital_signs_ews;
DROP POLICY IF EXISTS "anon_access_dialysis_vital_signs_ews" ON public.dialysis_vital_signs_ews;
CREATE POLICY "authenticated_only_dialysis_vital_signs_ews" 
ON public.dialysis_vital_signs_ews FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_pain_glucose_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_pain_glucose_log" ON public.dialysis_pain_glucose_log;
DROP POLICY IF EXISTS "anon_access_dialysis_pain_glucose_log" ON public.dialysis_pain_glucose_log;
CREATE POLICY "authenticated_only_dialysis_pain_glucose_log" 
ON public.dialysis_pain_glucose_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_medical_care_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_medical_care_log" ON public.dialysis_medical_care_log;
DROP POLICY IF EXISTS "anon_access_dialysis_medical_care_log" ON public.dialysis_medical_care_log;
CREATE POLICY "authenticated_only_dialysis_medical_care_log" 
ON public.dialysis_medical_care_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_medication_administration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_medication_administration" ON public.dialysis_medication_administration;
DROP POLICY IF EXISTS "anon_access_dialysis_medication_administration" ON public.dialysis_medication_administration;
CREATE POLICY "authenticated_only_dialysis_medication_administration" 
ON public.dialysis_medication_administration FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.dialysis_health_education ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only_dialysis_health_education" ON public.dialysis_health_education;
DROP POLICY IF EXISTS "anon_access_dialysis_health_education" ON public.dialysis_health_education;
CREATE POLICY "authenticated_only_dialysis_health_education" 
ON public.dialysis_health_education FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
