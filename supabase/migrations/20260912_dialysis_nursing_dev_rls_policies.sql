-- ==============================================================================
-- Migration: 20260912_dialysis_nursing_dev_rls_policies.sql
-- Description: Allow temporary anon read/write access for dialysis nursing assessment
--              tables during development & testing phase as explicitly requested by user.
-- ==============================================================================

-- 1. dialysis_nursing_notes
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_notes" ON public.dialysis_nursing_notes;
DROP POLICY IF EXISTS "dev_dialysis_nursing_notes_policy" ON public.dialysis_nursing_notes;
CREATE POLICY "dev_dialysis_nursing_notes_policy" 
  ON public.dialysis_nursing_notes FOR ALL USING (true) WITH CHECK (true);

-- 2. dialysis_vital_signs_ews
DROP POLICY IF EXISTS "authenticated_only_dialysis_vital_signs_ews" ON public.dialysis_vital_signs_ews;
DROP POLICY IF EXISTS "dev_dialysis_vital_signs_ews_policy" ON public.dialysis_vital_signs_ews;
CREATE POLICY "dev_dialysis_vital_signs_ews_policy" 
  ON public.dialysis_vital_signs_ews FOR ALL USING (true) WITH CHECK (true);

-- 3. dialysis_nursing_assessments
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_assessments" ON public.dialysis_nursing_assessments;
DROP POLICY IF EXISTS "dev_dialysis_nursing_assessments_policy" ON public.dialysis_nursing_assessments;
CREATE POLICY "dev_dialysis_nursing_assessments_policy" 
  ON public.dialysis_nursing_assessments FOR ALL USING (true) WITH CHECK (true);

-- 4. dialysis_access_lines
DROP POLICY IF EXISTS "authenticated_only_dialysis_access_lines" ON public.dialysis_access_lines;
DROP POLICY IF EXISTS "dev_dialysis_access_lines_policy" ON public.dialysis_access_lines;
CREATE POLICY "dev_dialysis_access_lines_policy" 
  ON public.dialysis_access_lines FOR ALL USING (true) WITH CHECK (true);

-- 5. dialysis_nursing_care_plan
DROP POLICY IF EXISTS "authenticated_only_dialysis_nursing_care_plan" ON public.dialysis_nursing_care_plan;
DROP POLICY IF EXISTS "dev_dialysis_nursing_care_plan_policy" ON public.dialysis_nursing_care_plan;
CREATE POLICY "dev_dialysis_nursing_care_plan_policy" 
  ON public.dialysis_nursing_care_plan FOR ALL USING (true) WITH CHECK (true);

-- 6. dialysis_pain_glucose_log
DROP POLICY IF EXISTS "authenticated_only_dialysis_pain_glucose_log" ON public.dialysis_pain_glucose_log;
DROP POLICY IF EXISTS "dev_dialysis_pain_glucose_log_policy" ON public.dialysis_pain_glucose_log;
CREATE POLICY "dev_dialysis_pain_glucose_log_policy" 
  ON public.dialysis_pain_glucose_log FOR ALL USING (true) WITH CHECK (true);

-- 7. dialysis_medical_care_log
DROP POLICY IF EXISTS "authenticated_only_dialysis_medical_care_log" ON public.dialysis_medical_care_log;
DROP POLICY IF EXISTS "dev_dialysis_medical_care_log_policy" ON public.dialysis_medical_care_log;
CREATE POLICY "dev_dialysis_medical_care_log_policy" 
  ON public.dialysis_medical_care_log FOR ALL USING (true) WITH CHECK (true);

-- 8. dialysis_medication_administration
DROP POLICY IF EXISTS "authenticated_only_dialysis_medication_administration" ON public.dialysis_medication_administration;
DROP POLICY IF EXISTS "dev_dialysis_medication_administration_policy" ON public.dialysis_medication_administration;
CREATE POLICY "dev_dialysis_medication_administration_policy" 
  ON public.dialysis_medication_administration FOR ALL USING (true) WITH CHECK (true);

-- 9. dialysis_health_education
DROP POLICY IF EXISTS "authenticated_only_dialysis_health_education" ON public.dialysis_health_education;
DROP POLICY IF EXISTS "dev_dialysis_health_education_policy" ON public.dialysis_health_education;
CREATE POLICY "dev_dialysis_health_education_policy" 
  ON public.dialysis_health_education FOR ALL USING (true) WITH CHECK (true);

-- Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
