# Hospital ERP & Medical System — Family Health / Primary Care Accreditation Module
## Phase 1 Architecture: Schema Design & Safe Database Migrations Report

---

## SECTION 1 — SCHEMA GAP ANALYSIS

### 1. Reusable Existing Infrastructure
The system currently possesses a robust ERP and operational backbone (~80% implemented). The following existing entities serve as foundational pillars and **must remain untouched**:
* **`patients`**: Master demographic record (name, national_id, phone, address, DOB, blood_type).
* **`clinics` & `doctors`**: Organizational hierarchy and provider registry.
* **`clinic_appointments`**: Scheduling engine, queue synchronization, and visit arrival tracking.
* **`lab_test_definitions` & `lab_tests`**: Diagnostic test definitions and execution history.
* **ERP Core**: `invoices`, `services`, `stores`, `products`, `transfer_requests`, `queue`, `dialysis_*`.

### 2. Critical Gaps for Accreditation-Safe Primary Care Workflows
Primary Care & Family Health accreditation (GAHAR / JCI / WHO Primary Health Care standards) mandates structured clinical governance that existing operational tables cannot support:
1. **Separation of Encounter vs. Appointment**: An appointment is a calendar reservation (`date`, `time`, `status`). A clinical encounter is a legal medical record representing consultation documentation (`SOAP` notes, longitudinal problem lists, clinical assessments).
2. **Household / Family File Unit**: Accreditation requires grouping patients into household master folders (`family_files`) to track familial disease transmission, hereditary risks, and primary breadwinner/caregiver dynamics.
3. **Structured Program Protocols**: Chronic disease management (Hypertension, Diabetes) requires boolean checklists for target organ damage, routine quarterly lab audits, and patient education tracking rather than unstructured free-text.

### 3. Why `clinic_appointments` is Insufficient as a Clinical Core
Overloading `clinic_appointments` with clinical fields violates 3rd Normal Form and clinical data integrity:
* **Multi-Encounter Visits**: A walk-in patient or emergency case may experience multiple medical consultations (e.g., GP triage followed by a specialist referral or chronic disease audit) during a single arrival.
* **Data Lifecycle**: Appointments are frequently rescheduled, cancelled, or purged. Clinical documentation is permanent medical legal evidence that must persist indefinitely even if appointment logs are archived.
* **Granularity**: `clinic_appointments` contains only single text fields (`diagnosis`, `prescription`). Accreditation demands structured longitudinal `problem_list` entries (ICD-10 codes, onset dates, problem types) and historical screening registries.

---

## SECTION 2 — TARGET FIRST-BATCH SCHEMA PROPOSAL

The Phase 1 target schema establishes an **encounter-centric hybrid architecture** divided into three clean layers:

### A. Shared Clinical Core (Reusable across all hospital departments)
1. **`clinical_encounters`**: Master medical record for consultations. Links optionally to `appointment_id`, `clinic_id`, and `doctor_id`. Supports 14+ standardized encounter types (`outpatient`, `family_health`, `hypertension_followup`, `diabetes_followup`, `antenatal`, `geriatric`, etc.).
2. **`patient_vitals`**: Longitudinal anthropometrics (systolic/diastolic BP, pulse, temp, weight, height, BMI, random glucose, SpO2, waist/head circumference).
3. **`patient_problem_list`**: Standardized active/resolved condition tracker (ICD-10 codes, problem classification: `acute`, `chronic`, `risk_factor`, `complication`).
4. **`patient_risk_factors`**: Reusable clinical/lifestyle risk stratification (`smoking`, `obesity`, `sedentary`, etc.).
5. **`patient_screenings`**: Preventative assessment registry (PHQ-9 depression scores, fall risk, developmental milestones, visual/hearing acuity).
6. **`patient_referrals`**: Accreditation referral form with closed-loop specialist feedback (`provisional_diagnosis`, `investigations`, `specialist_signature`, `final_diagnosis`).

### B. Family / Household Accreditation Layer
7. **`family_files`**: Master household folder (`family_code`, home phone, address, area/district, nearest landmark).
8. **`family_file_members`**: Patient-to-household linkage (`relationship_to_head`, `family_role`, `is_head`). Enforces `UNIQUE(family_file_id, patient_id)` to prevent duplicate household assignment.

### C. Accreditation Program Tables (Phase 1 Chronic Diseases)
9. **`hypertension_followups`**: Dedicated HTN protocol form capturing orthostatic BP (sitting vs. standing), cardiovascular risk factors, target organ damage (LVH, CKD, retinopathy), monitoring investigation audits, and lifestyle education counseling.
10. **`diabetes_followups`**: Dedicated DM protocol form capturing micro/macrovascular complications (neuropathy, nephropathy, diabetic foot), routine monitoring checks (FBS, HbA1c, microalbumin, fundus exam), and hypoglycemia/self-monitoring counseling.
11. **`chronic_disease_followups`**: General non-DM / non-HTN chronic disease protocol form (bronchial asthma, epilepsy, thyroid disorders, rheumatoid arthritis).

### D. Recommended Core Linkage
12. **`encounter_orders`**: Connects primary care consultations directly to downstream diagnostic tests (`lab`, `radiology`), procedures, and medication prescriptions.

---

## SECTION 3 — SAFE ADDITIVE CHANGES TO EXISTING TABLES

### 1. Additive Fields on `patients`
To satisfy accreditation stratification rules without altering existing queries, five **nullable columns** are added:
* **`gender text`**: Required for maternal health programs (antenatal, postpartum, family planning) and gender-specific cancer screenings (cervical/breast).
* **`marital_status text`**: Required for premarital screening accreditation and household head relationship modeling.
* **`occupation text`**: Required for occupational health hazard assessments and socioeconomic risk profiling.
* **`guardian_name text` & `guardian_phone text`**: Mandatory accreditation compliance for pediatric (under 5 / over 5) and geriatric patients requiring legal consent and caregiver contact.

### 2. Bidirectional Linkage on `clinic_appointments`
* **`encounter_id uuid null references clinical_encounters(id) on delete set null`**: Provides O(1) fast navigation for frontends rendering clinic reception queues ("Start Encounter" vs. "Resume Encounter #UUID").

---

## SECTION 4 — MIGRATION EXECUTION ORDER

To guarantee zero downtime and respect foreign key dependencies, SQL execution **must follow this precise sequence**:

1. **`0_enable_extensions`**: Activate `uuid-ossp` and `pgcrypto`.
2. **`1_reusable_trigger`**: Create `update_updated_at_column()` plpgsql function.
3. **`2_alter_patients`**: Add nullable stratification columns (`gender`, `marital_status`, `occupation`, `guardian_*`).
4. **`3_create_clinical_encounters`**: Base encounter table referencing `patients`, `clinic_appointments`, `clinics`, `doctors`.
5. **`4_alter_clinic_appointments`**: Add nullable `encounter_id` FK pointing to `clinical_encounters`.
6. **`5_create_patient_vitals`**: Vitals referencing `clinical_encounters` and `patients`.
7. **`6_create_patient_problem_list`**: Diagnoses referencing `patients` and `clinical_encounters`.
8. **`7_create_patient_risk_factors`**: Risk factors referencing `patients` and `clinical_encounters`.
9. **`8_create_patient_screenings`**: Screenings referencing `patients` and `clinical_encounters`.
10. **`9_create_patient_referrals`**: Referrals referencing `patients`, `clinical_encounters`, `clinics`, `doctors`.
11. **`10_create_family_files`**: Household master records.
12. **`11_create_family_file_members`**: Linkage referencing `family_files` and `patients`.
13. **`12_create_hypertension_followups`**: HTN protocol referencing `patients` and `clinical_encounters`.
14. **`13_create_diabetes_followups`**: DM protocol referencing `patients` and `clinical_encounters`.
15. **`14_create_chronic_disease_followups`**: General chronic protocol referencing `patients` and `clinical_encounters`.
16. **`15_create_encounter_orders`**: Order linkage referencing `patients` and `clinical_encounters`.
17. **`16_reload_cache`**: Issue `NOTIFY pgrst, 'reload schema';` for Supabase PostgREST API cache invalidation.

---

## SECTION 5 — COMPATIBILITY & COEXISTENCE NOTES

### 1. Unchanged Operation of `clinic_appointments`
Existing reception and booking modules continue inserting and updating `clinic_appointments` exactly as before. Because `encounter_id` on appointments and `appointment_id` on encounters are both `NULLABLE`, scheduling remains completely decoupled from clinical charting.

### 2. Frontend Encounter Creation Flow
When a doctor selects a waiting patient from the clinic queue:
1. UI executes `POST /rest/v1/clinical_encounters` with `{ patient_id: "...", appointment_id: "...", encounter_type: "family_health", status: "in_progress" }`.
2. UI updates the appointment: `PATCH /rest/v1/clinic_appointments?id=eq.{id}` with `{ status: 'IN_CONSULTATION', encounter_id: new_encounter.id }`.
3. Subsequent vitals, SOAP notes, or chronic disease follow-up forms attach directly to `encounter_id`.

### 3. Family File Connection Strategy
Frontends search existing patients by `national_id` or `phone`. When establishing a household folder:
1. `POST /rest/v1/family_files` creates the master folder with a unique `family_code` (e.g., `FAM-2026-0891`).
2. `POST /rest/v1/family_file_members` inserts rows linking existing `patient_id`s to the folder with roles (`head`, `spouse`, `child`).
3. During any patient consultation, the UI queries `family_file_members` to display household siblings, parental history, and household socioeconomic context.

### 4. Chronic Disease Protocols Coexistence
When a patient with an active problem (`Diabetes Mellitus Type 2`) arrives for their quarterly review:
1. Doctor opens a new encounter (`encounter_type: 'diabetes_followup'`).
2. Doctor logs current vitals into `patient_vitals`.
3. Doctor completes the structured boolean audit in `diabetes_followups` (checking off `hba1c_done: true`, `foot_exam_done: true`, complications status).
4. All data remains neatly indexed by `(patient_id, encounter_id)` for instant quarterly accreditation compliance reporting.

---

## SECTION 6 — INTENTIONALLY DEFERRED SCOPE (PHASE 2 ROADMAP)

To maintain strict Phase 1 scope discipline and protect core stability, specialized accreditation forms are **intentionally deferred to Phase 2**:
* **Maternal Health**: `antenatal_followups`, `postpartum_followups`, `obstetric_history` tables.
* **Child Health**: `child_under5_growth_records`, `vaccination_schedules`, `child_over5_assessments`.
* **Preventative Programs**: `family_planning_visits`, `premarital_screenings`, `geriatric_comprehensive_assessments`.
* **Specialized Clinics**: `dental_charting_records`.
* **Print & Export Engine**: PDF template definition tables matching Ministry of Health / GAHAR official paper layouts.

All Phase 2 tables will seamlessly attach to `clinical_encounters.id` and `patients.id` using the foundational architecture established in Phase 1.
