
export type Permission = 
  | 'VIEW_DASHBOARD' 
  | 'VIEW_NOTIFICATIONS'
  | 'MANAGE_RECEPTION'
  | 'MANAGE_CLINIC_RECEPTION'
  | 'MANAGE_PATIENTS' 
  | 'MANAGE_LAB'
  | 'MANAGE_BILLING' 
  | 'MANAGE_PAYROLL' 
  | 'MANAGE_INVENTORY' 
  | 'MANAGE_FINANCE' 
  | 'MANAGE_USERS' 
  | 'SYSTEM_SETUP'
  | 'MANAGE_STORES'
  | 'MANAGE_ACCOUNTS'
  | 'VIEW_REPORTS'
  | 'VIEW_MEDICAL_RECORDS'
  | string;

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  permissions: Permission[];
}

export interface Patient {
  id: string;
  name: string;
  national_id: string;
  phone: string;
  address: string;
  blood_type: string;
  date_of_birth?: string;
  gender?: string;
  marital_status?: string;
  occupation?: string;
  guardian_name?: string;
  guardian_phone?: string;
  funding_entity_id: string;
  emergency_contact: {
    name: string;
    phone: string;
    relation: string;
  };
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'DIALYSIS' | 'LAB' | 'PHARMACY' | 'OTHER';
  config?: {
    required_fields?: string[];
    consumables?: { product_id: string; quantity: number }[];
  };
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  price: number;
  category?: string;
  barcode?: string;
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  is_main: boolean;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  store_id: string;
  type: 'ADD' | 'DEDUCT' | 'TRANSFER';
  quantity: number;
  target_store_id?: string;
  date: string;
  note?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  bank_account: string;
  shift_price: number;
  salary_type?: 'MONTHLY' | 'PER_SHIFT';
  monthly_salary?: number;
  type: 'PERMANENT' | 'TEMPORARY';
}

export interface ShiftRecord {
  id: string;
  employee_id: string;
  date: string;
  count: number;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  balance: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
  note: string;
}

export interface DialysisSession {
  id: string;
  patient_id: string;
  service_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  weight_before: number;
  weight_after?: number;
  blood_pressure: string;
  room: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  notes: string;
  custom_data?: Record<string, string>;
  machine_id?: string;
}

export interface FundingEntity {
  id: string;
  name: string;
  created_at: string;
}

export interface TransferRequest {
  id: string;
  from_store_id: string;
  to_store_id: string;
  items: { product_id: string; quantity: number }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  requested_by?: string;
  note?: string;
  date: string;
}

export interface LabTestDefinition {
  id: string;
  name: string;
  category?: string;
  sample_type?: string;
  normal_range_male?: string;
  normal_range_female?: string;
  normal_range_child?: string;
}

export interface LabTest {
  id: string;
  patient_id: string;
  test_definition_id: string;
  result?: string;
  status: 'PENDING' | 'COMPLETED';
  date: string;
}

export interface Clinic {
  id: string;
  name: string;
  specialty: string;
  room?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  clinic_id: string;
}

export interface ClinicAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string;
  date: string;
  time: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  encounter_id?: string;
}

// ============================================================================
// ACCREDITATION FAMILY HEALTH & PRIMARY CARE TYPES
// ============================================================================

export interface ClinicalEncounter {
  id: string;
  patient_id: string;
  appointment_id?: string;
  clinic_id?: string;
  doctor_id?: string;
  encounter_type: string;
  encounter_date: string;
  encounter_time?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  chief_complaint?: string;
  history_of_present_illness?: string;
  assessment_summary?: string;
  plan_summary?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  visit_source?: string;
  followup_due_date?: string;
  created_at?: string;
  updated_at?: string;
  // joined relations
  patients?: Patient;
  doctors?: Doctor;
  clinics?: Clinic;
}

export interface PatientVitals {
  id: string;
  encounter_id: string;
  patient_id: string;
  measured_at: string;
  systolic_bp?: number;
  diastolic_bp?: number;
  bp_position?: string;
  pulse?: number;
  respiratory_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  waist_cm?: number;
  head_circumference_cm?: number;
  blood_glucose_random?: number;
  notes?: string;
}

export interface PatientProblem {
  id: string;
  patient_id: string;
  encounter_id?: string;
  problem_name: string;
  icd_code?: string;
  problem_type?: 'acute' | 'chronic' | 'risk_factor' | 'complication' | string;
  onset_date?: string;
  status: 'active' | 'resolved' | 'inactive';
  resolved_date?: string;
  notes?: string;
}

export interface PatientRiskFactor {
  id: string;
  patient_id: string;
  encounter_id?: string;
  risk_factor_code?: string;
  risk_factor_name: string;
  status: string;
  details?: string;
  recorded_at?: string;
}

export interface PatientScreening {
  id: string;
  patient_id: string;
  encounter_id?: string;
  screening_type: string;
  result_text?: string;
  result_json?: any;
  screening_date: string;
  notes?: string;
}

export interface PatientReferral {
  id: string;
  patient_id: string;
  encounter_id?: string;
  referring_clinic_id?: string;
  referring_doctor_id?: string;
  referred_to_entity?: string;
  referred_to_specialty?: string;
  referral_type?: string;
  reason?: string;
  relevant_history?: string;
  exam_findings?: string;
  investigations?: string;
  provisional_diagnosis?: string;
  transport_method?: string;
  referred_at?: string;
  result_summary?: string;
  final_diagnosis?: string;
  current_medications?: string;
  interventions?: string;
  recommendations?: string;
  revisit_date?: string;
  specialist_name?: string;
  specialist_signature?: string;
}

export interface FamilyFile {
  id: string;
  family_code: string;
  home_number?: string;
  address?: string;
  area_district?: string;
  phone?: string;
  nearest_landmark?: string;
  notes?: string;
  national_id?: string;
  governorate?: string;
  administration?: string;
  village_city?: string;
  health_unit?: string;
  head_name?: string;
  created_at?: string;
  members?: FamilyFileMember[];
}

export interface FamilyFileMember {
  id: string;
  family_file_id: string;
  patient_id: string;
  relationship_to_head?: string;
  family_role?: string;
  is_head: boolean;
  patients?: Patient;
}

export interface HypertensionFollowup {
  id: string;
  patient_id: string;
  encounter_id: string;
  complaint?: string;
  bp_sitting_systolic?: number;
  bp_sitting_diastolic?: number;
  bp_standing_systolic?: number;
  bp_standing_diastolic?: number;
  smoking?: boolean;
  physical_inactivity?: boolean;
  obesity?: boolean;
  dyslipidemia?: boolean;
  family_history?: boolean;
  lvh_hf?: boolean;
  angina_mi?: boolean;
  stroke_tia?: boolean;
  ckd?: boolean;
  retinopathy?: boolean;
  urine_analysis_done?: boolean;
  creatinine_egfr_done?: boolean;
  potassium_sodium_done?: boolean;
  fasting_blood_sugar_done?: boolean;
  cbc_done?: boolean;
  total_cholesterol_done?: boolean;
  ldl_done?: boolean;
  hdl_done?: boolean;
  triglycerides_done?: boolean;
  ecg_done?: boolean;
  diet_weight_loss_education?: boolean;
  physical_activity_education?: boolean;
  low_salt_education?: boolean;
  smoking_cessation_education?: boolean;
  treatment_plan?: string;
  doctor_signature?: string;
  followup_interval?: string;
  created_at?: string;
}

export interface DiabetesFollowup {
  id: string;
  patient_id: string;
  encounter_id: string;
  complaint?: string;
  smoking?: boolean;
  physical_inactivity?: boolean;
  obesity?: boolean;
  family_history?: boolean;
  dyslipidemia?: boolean;
  ckd?: boolean;
  neuropathy?: boolean;
  retinopathy?: boolean;
  diabetic_foot?: boolean;
  dka_or_hypoglycemia?: boolean;
  fbs_done?: boolean;
  hba1c_done?: boolean;
  urine_analysis_done?: boolean;
  creatinine_egfr_done?: boolean;
  fundus_exam_done?: boolean;
  foot_exam_done?: boolean;
  ecg_done?: boolean;
  urinary_microalbumin_done?: boolean;
  lipid_profile_done?: boolean;
  diet_weight_loss_education?: boolean;
  physical_activity_education?: boolean;
  self_monitoring_education?: boolean;
  hypoglycemia_education?: boolean;
  smoking_cessation_education?: boolean;
  treatment_plan?: string;
  doctor_signature?: string;
  followup_interval?: string;
  created_at?: string;
}

export interface ChronicFollowup {
  id: string;
  patient_id: string;
  encounter_id: string;
  diagnosis: string;
  disease_discovery_date?: string;
  complaint?: string;
  clinical_notes?: string;
  investigations?: string;
  management_plan?: string;
  doctor_signature?: string;
  created_at?: string;
}

export interface AncFollowup {
  id: string;
  patient_id: string;
  encounter_id: string;
  pregnancy_order?: number;
  lmp_date?: string;
  edd_date?: string;
  blood_type_rh?: string;
  consanguinity?: boolean;
  gravida?: number;
  para?: number;
  abortions?: number;
  fundal_height_cm?: number;
  fetal_lie?: string;
  fetal_heart_sound?: string;
  fetal_movement?: string;
  hb_result?: number;
  blood_glucose?: number;
  supplements_prescribed?: boolean;
  complications_concerns?: string;
  health_education_given?: string;
  next_visit_date?: string;
  doctor_signature?: string;
}

export interface PostpartumFollowup {
  id: string;
  patient_id: string;
  encounter_id: string;
  delivery_date?: string;
  delivery_mode?: string;
  delivery_outcome?: string;
  vitamin_a_given?: boolean;
  exclusive_breastfeeding?: boolean;
  breastfeeding_problems?: string;
  depression_screening_done?: boolean;
  maternal_concerns?: string;
  contraception_method?: string;
  doctor_signature?: string;
}

export interface ChildUnder5Followup {
  id: string;
  patient_id: string;
  encounter_id: string;
  age_months: number;
  weight_kg?: number;
  height_cm?: number;
  head_circumference_cm?: number;
  feeding_type?: string;
  mandatory_vaccines_up_to_date?: boolean;
  parental_concerns?: string;
  clinical_assessment?: string;
  doctor_signature?: string;
}

export interface ChildMilestone {
  id: string;
  patient_id: string;
  encounter_id: string;
  milestone_category: string;
  age_bracket_months: string;
  milestone_description: string;
  status: 'achieved' | 'delayed' | 'not_assessed';
  notes?: string;
}

export interface PremaritalAssessment {
  id: string;
  patient_id: string;
  encounter_id: string;
  partner_name?: string;
  partner_national_id?: string;
  consanguinity_with_partner?: boolean;
  infectious_disease_history?: string;
  hereditary_disease_history?: string;
  fasting_blood_sugar?: number;
  rh_factor?: string;
  hb_electrophoresis_done?: boolean;
  certificate_status?: string;
  mutual_consent_signed?: boolean;
  doctor_signature?: string;
}

export interface GeriatricAssessment {
  id: string;
  patient_id: string;
  encounter_id: string;
  weight_loss?: boolean;
  weakness_reported?: boolean;
  basic_adls_score?: string;
  depression_mood_assessment?: string;
  fall_risk_timed_up_go?: string;
  mini_cog_score?: number;
  management_plan?: string;
  doctor_signature?: string;
}

export interface DentalAssessment {
  id: string;
  patient_id: string;
  encounter_id: string;
  tmj_clicking?: boolean;
  tmj_tenderness?: boolean;
  periodontal_index_cpi?: number;
  dmft_decayed?: number;
  dmft_missing?: number;
  dmft_filled?: number;
  treatment_plan?: string;
  doctor_signature?: string;
}

