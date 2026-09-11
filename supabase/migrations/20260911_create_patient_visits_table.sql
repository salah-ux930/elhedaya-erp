-- Migration: Create patient_visits table for Longitudinal Clinic Visits (نموذج التردد - موديول رقم ٤)
-- Conforms strictly to GAHAR Accreditation Standards & Project Security Rules (TO authenticated ONLY)

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

-- Documentation
COMMENT ON TABLE public.patient_visits IS 'سجل التردد والزيارات الطبية المعتمد للعيادات الخارجية والرعاية الأولية (موديول رقم ٤)';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_date ON public.patient_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_patient_visits_appointment ON public.patient_visits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_encounter ON public.patient_visits(encounter_id);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_patient_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_visits_updated_at ON public.patient_visits;
CREATE TRIGGER trg_patient_visits_updated_at
BEFORE UPDATE ON public.patient_visits
FOR EACH ROW EXECUTE FUNCTION update_patient_visits_updated_at();

-- ============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- Rule 2: anon must NEVER have access. Authenticated users ONLY.
-- ============================================================================
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

-- Drop legacy or anon policies
DROP POLICY IF EXISTS allow_all_for_authenticated_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS allow_all_for_anon_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS authenticated_full_access_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS anon_full_access_patient_visits ON public.patient_visits;
DROP POLICY IF EXISTS "Authenticated users have full access to patient_visits" ON public.patient_visits;

-- Grant secure full access to authenticated medical staff ONLY
CREATE POLICY authenticated_full_access_patient_visits 
ON public.patient_visits 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
