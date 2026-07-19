-- ============================================================================
-- ACCREDITATION PATIENT DEATHS REGISTRATION
-- ============================================================================
-- Safe Additive Migration: Adds the patient_deaths table to track mortalities

CREATE TABLE IF NOT EXISTS patient_deaths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  deceased_name TEXT NOT NULL,
  age_at_death INTEGER NOT NULL,
  death_date DATE NOT NULL,
  death_code TEXT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE patient_deaths IS 'Accreditation mortality registration capturing deceased name, age, date, and death code.';
CREATE INDEX IF NOT EXISTS idx_patient_deaths_patient ON patient_deaths(patient_id);

-- Check if update_updated_at_column exists and set trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_patient_deaths_updated_at') THEN
      CREATE TRIGGER set_patient_deaths_updated_at
      BEFORE UPDATE ON patient_deaths
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
