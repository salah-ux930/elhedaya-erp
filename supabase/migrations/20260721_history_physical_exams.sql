-- Migration: Add HISTORY & PHYSICAL EXAMINATION SHEET table
-- This supports recording detailed clinical histories for primary care and family health accreditation.

CREATE TABLE IF NOT EXISTS history_physical_exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  exam_date DATE DEFAULT CURRENT_DATE,
  hospitalization TEXT,
  previous_operations TEXT,
  current_medications TEXT,
  trauma_injuries TEXT,
  allergy TEXT,
  adverse_drug_reactions TEXT,
  abuse_negligence TEXT,
  psychiatric_history TEXT, -- 'medical_treatment', 'followup_with_psychiatrist', 'irrelevant'
  psychiatric_details TEXT,
  other_history TEXT,
  special_habits TEXT, -- comma-separated e.g. 'smoking,alcohol,other'
  special_habits_other TEXT,
  family_history TEXT, -- comma-separated e.g. 'TB,Asthma,Cardiac,Consanguinity,Diabetes,Hypertension,Blood Dis.,Renal,Twins,Congenital anomalies,Cancer,Epilepsy,Psychiatric,Other'
  family_history_other TEXT,
  lab_hemoglobin TEXT,
  lab_blood_group TEXT,
  lab_rh TEXT,
  lab_urine TEXT,
  lab_stool TEXT,
  maternal_history_notes TEXT,
  doctor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safely add columns if table already exists
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS family_history TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS family_history_other TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS lab_hemoglobin TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS lab_blood_group TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS lab_rh TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS lab_urine TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS lab_stool TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS maternal_history_notes TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS clinical_findings TEXT;
ALTER TABLE history_physical_exams ADD COLUMN IF NOT EXISTS significant_events TEXT;

-- Index for faster patient query
CREATE INDEX IF NOT EXISTS idx_history_physical_exams_patient ON history_physical_exams(patient_id);
