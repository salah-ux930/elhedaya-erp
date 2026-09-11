
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

export type LinkedModuleType = 
  | 'child_followup' 
  | 'maternal_care' 
  | 'family_planning' 
  | 'geriatric_care' 
  | 'dental' 
  | 'premarital' 
  | 'visits'
  | 'history'
  | 'general' 
  | null;

export type AppointmentTriggerType = 
  | 'staff_scheduled' 
  | 'system_suggested' 
  | 'patient_request';

export interface SuggestedFollowup {
  id: string;
  patient_id: string;
  module_type: LinkedModuleType;
  title: string;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
  due_date?: string;
  suggested_clinic_name?: string;
}

export interface Clinic {
  id: string;
  name: string;
  specialty: string;
  room?: string;
  linked_module?: LinkedModuleType;
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
  triggered_by?: AppointmentTriggerType;
  // joined relations
  patients?: Patient;
  doctors?: Doctor;
  clinics?: Clinic;
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
  house_number?: string;
  family_number?: string;
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
  
  // Housing conditions (حالة المسكن)
  total_rooms?: number;
  sleeping_rooms?: number;
  ventilation?: 'good' | 'poor' | string;
  water_source?: 'public' | 'other' | string;
  sewage_system?: 'sanitary' | 'trench' | string;
  lighting_type?: 'electricity' | 'other' | string;
  has_animals_birds?: boolean;
  barn_location?: 'inside' | 'outside' | 'none' | string;

  // Social Search / Social Assessment (البحث الاجتماعي)
  income_type?: 'fixed' | 'variable' | string;
  monthly_income?: number;
  has_chronic_diseases?: boolean;
  has_disabilities?: boolean;
  receives_pension?: boolean;
  breadwinner_name?: string;
  eligible_for_free_service?: boolean;
}

export interface FamilyFileMember {
  id: string;
  family_file_id: string;
  patient_id: string;
  family_individual_number?: number;
  relationship_to_head?: string;
  family_role?: string;
  is_head: boolean;
  created_by?: string;
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
  encounter_id?: string;
  appointment_id?: string;
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
  created_at?: string;
}

export interface PostpartumFollowup {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
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
  created_at?: string;
}

export interface ChildUnder5Followup {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  age_months: number;
  weight_kg?: number;
  height_cm?: number;
  head_circumference_cm?: number;
  feeding_type?: string;
  mandatory_vaccines_up_to_date?: boolean;
  parental_concerns?: string;
  clinical_assessment?: string;
  doctor_signature?: string;
  created_at?: string;
}

export interface ChildOver5Followup {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  visit_date?: string;
  educational_stage?: string;
  school_stage?: string;
  weight_kg?: number;
  height_cm?: number;
  bmi?: number;
  vision_screening?: string;
  hearing_screening?: string;
  school_achievement_concerns?: boolean;
  scholastic_performance?: string;
  psychiatric_behavioral_screening?: string;
  psychosocial_evaluation?: string;
  pubertal_stage?: string;
  hb_level?: number;
  urine_analysis_result?: string;
  stool_analysis_result?: string;
  health_education_given?: string;
  clinical_notes?: string;
  doctor_signature?: string;
  doctor_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FamilyPlanningFollowup {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  method_chosen?: string;
  previous_methods_used?: string;
  parity?: number;
  living_children_count?: number;
  medical_eligibility_criteria_met?: boolean;
  side_effects_reported?: string;
  pelvic_exam_normal?: boolean;
  blood_pressure?: string;
  next_appointment_date?: string;
  doctor_signature?: string;
  created_at?: string;
}

export interface ChildMilestone {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  milestone_category: string;
  age_bracket_months: string;
  milestone_description: string;
  status: 'achieved' | 'delayed' | 'not_assessed';
  notes?: string;
}

export interface PremaritalAssessment {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
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
  created_at?: string;
}

export interface GeriatricAssessment {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  weight_loss?: boolean;
  weakness_reported?: boolean;
  basic_adls_score?: string;
  depression_mood_assessment?: string;
  fall_risk_timed_up_go?: string;
  mini_cog_score?: number;
  management_plan?: string;
  doctor_signature?: string;
  created_at?: string;
}

export interface DentalAssessment {
  id: string;
  patient_id: string;
  encounter_id?: string;
  appointment_id?: string;
  tmj_clicking?: boolean;
  tmj_tenderness?: boolean;
  periodontal_index_cpi?: number;
  dmft_decayed?: number;
  dmft_missing?: number;
  dmft_filled?: number;
  treatment_plan?: string;
  doctor_signature?: string;
  created_at?: string;
}

export interface PatientDeath {
  id: string;
  patient_id: string;
  deceased_name: string;
  age_at_death: number;
  death_date: string;
  death_code: string;
  notes?: string;
  created_at?: string;
  patients?: Patient;
}

export interface HistoryPhysicalExam {
  id: string;
  patient_id: string;
  appointment_id?: string;
  exam_date: string;
  hospitalization?: string;
  previous_operations?: string;
  current_medications?: string;
  trauma_injuries?: string;
  allergy?: string;
  adverse_drug_reactions?: string;
  abuse_negligence?: string;
  psychiatric_history?: 'medical_treatment' | 'followup_with_psychiatrist' | 'irrelevant' | string;
  psychiatric_details?: string;
  other_history?: string;
  special_habits?: string; // comma separated list
  special_habits_other?: string;
  family_history?: string; // comma separated list e.g. TB,Asthma,Cardiac...
  family_history_other?: string;
  lab_hemoglobin?: string;
  lab_blood_group?: string;
  lab_rh?: string;
  lab_urine?: string;
  lab_stool?: string;
  maternal_history_notes?: string;
  clinical_findings?: string; // JSON string of general physical examination & clinical findings
  doctor_name?: string;
  created_at?: string;
  patients?: Patient;
}

export interface PatientVisit {
  id: string;
  patient_id: string;
  appointment_id?: string;
  visit_date: string;
  visit_type: string;
  visit_code?: number;
  complaint?: string;
  clinical_exam?: string;
  investigations?: string;
  diagnosis?: string;
  management?: string;
  doctor_signature?: string;
  created_at?: string;
  patients?: Patient;
}

// ==========================================
// Comprehensive Dialysis Nursing Assessment
// ==========================================

export interface DialysisNursingAssessment {
  id?: string;
  session_id: string;
  patient_id: string;
  assessment_datetime: string;
  information_source?: 'patient' | 'family' | 'relative' | 'external_facility' | string;
  chief_complaint?: string;
  medical_care_plan?: string;
  doctor_signature?: string;
  pre_dialysis_pain?: {
    has_pain: boolean;
    onset?: string;
    location?: string;
    duration?: string;
    characteristics?: string;
  };
  allergy?: {
    has_allergy: boolean;
    details?: string;
  };
  fall_risk_measures?: {
    card_placed?: boolean;
    bed_low_brakes_locked?: boolean;
    safe_environment?: boolean;
    frequent_toilet_check?: boolean;
    staff_assist_walking?: boolean;
    patient_education?: boolean;
  };
  access_review?: {
    access_type?: string;
    insertion_site?: string;
    working_efficiently?: boolean;
    pulse_check_result?: string;
    complications?: string;
  };
  edema?: {
    present: boolean;
    location?: string;
    grade?: string;
  };
  consciousness_level?: string;
  immunization_review?: {
    reviewed_and_updated: boolean;
    vaccine_name_if_not?: string;
    reason?: string;
  };
  weight_gain_during_session?: number;
  session_complications?: {
    none?: boolean;
    cramps?: boolean;
    nausea?: boolean;
    hypoxia?: boolean;
    high_bp?: boolean;
    low_bp?: boolean;
    dizziness?: boolean;
    cardiac_problems?: boolean;
    other_text?: string;
  };
  new_events_since_last_assessment?: {
    has_new: boolean;
    details?: string;
  };
  doctor_orders_reviewed?: boolean;
  lab_results_reviewed?: boolean;
  dialysis_machine_check_reviewed?: boolean;
  breathing_difficulty?: boolean;
  chest_pain?: boolean;
  fluid_status?: {
    target_weight_kg?: number;
    tongue_dryness?: boolean;
    neck_veins?: 'distended' | 'flat' | string;
  };
  abuse_neglect_signs?: boolean;
  psychological_assessment?: 'frustrated' | 'tense' | 'uncooperative' | 'no_problem' | string;
  skin_assessment?: 'healthy' | 'wrinkled' | 'inflamed' | string;
  spiritual_assessment?: 'needs_support' | 'no_need' | string;
  created_by?: string;
  created_at?: string;
}

export interface DialysisAccessLine {
  id?: string;
  patient_id: string;
  line_type: 'peripheral_cannula' | 'av_fistula' | 'urinary_catheter' | 'tracheal_tube' | 'tracheostomy' | 'chest_tube' | 'cvc_central_line' | string;
  insertion_site?: string;
  insertion_datetime?: string;
  removal_datetime?: string;
  removal_or_change_reason?: string;
  responsible_doctor?: string;
  status: 'active' | 'removed';
  created_by?: string;
  created_at?: string;
}

export interface DialysisNursingNote {
  id?: string;
  session_id: string;
  note_time: string;
  note_text: string;
  nurse_signature?: string;
  created_at?: string;
}

export interface DialysisNursingCarePlan {
  id?: string;
  session_id: string;
  plan_time: string;
  assessment?: string;
  nursing_diagnosis?: string;
  goal?: string;
  nursing_interventions?: string;
  signature?: string;
  created_at?: string;
}

export interface DialysisVitalSignsEws {
  id?: string;
  session_id: string;
  recorded_time: string;
  respiratory_rate?: number;
  respiratory_rate_score?: number;
  oxygen_saturation?: number;
  spo2_score?: number;
  oxygen_therapy_type?: 'air' | 'o2' | string;
  oxygen_flow_lmin?: number;
  oxygen_score?: number;
  systolic_bp?: number;
  bp_score?: number;
  heart_rate?: number;
  hr_score?: number;
  consciousness_level?: 'alert' | 'not_responding_to_voice_pain' | 'unconscious' | string;
  consciousness_score?: number;
  temperature_celsius?: number;
  temp_score?: number;
  total_ews_score?: number;
  escalation_action?: string;
  recorded_by?: string;
  created_at?: string;
}

export interface DialysisPainGlucoseLog {
  id?: string;
  session_id: string;
  log_time: string;
  pain_assessment_score?: number;
  blood_glucose_level?: number;
  withdrawal_amount_ml?: number;
  created_at?: string;
}

export interface DialysisMedicalCareLog {
  id?: string;
  session_id: string;
  log_time: string;
  complaint?: string;
  examination_findings?: string;
  created_at?: string;
}

export interface DialysisMedicationAdmin {
  id?: string;
  session_id: string;
  drug_name: string;
  dose?: string;
  route?: string;
  instructions?: string;
  administered_datetime?: string;
  doctor_signature?: string;
  nurse_signature?: string;
  created_at?: string;
}

export interface DialysisHealthEducation {
  id?: string;
  patient_id: string;
  session_id?: string;
  assessment_date: string;
  learning_ability?: 'high' | 'medium' | 'low' | string;
  learning_barriers?: {
    language?: boolean;
    illiteracy?: boolean;
    communication_difficulty?: boolean;
    other?: string;
  };
  learning_method?: {
    reading?: boolean;
    listening?: boolean;
    practice?: boolean;
  };
  topics_covered?: {
    diet_explanation?: boolean;
    patient_rights_duties?: boolean;
    fall_prevention?: boolean;
    fistula_site_care?: boolean;
    fluid_restriction?: boolean;
    other?: string;
  };
  patient_or_family_signature?: string;
  nurse_signature?: string;
  created_at?: string;
}

