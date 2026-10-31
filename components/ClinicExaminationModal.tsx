import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Activity, ChevronDown, ChevronUp, Stethoscope, 
  FileText, Shield, AlertCircle, CheckCircle2, HeartPulse, 
  FlaskConical, Loader2, Sparkles, Scale, Info, Users, User, Clock, ShieldAlert, FolderOpen,
  Baby, Syringe, Brain, Eye, Ear
} from 'lucide-react';
import { DB } from '../store.ts';
import { HospitalOperationalEngine, PatientOperationalProfile } from '../services/hospitalOperationalEngine.ts';
import PatientClinical360Modal from './PatientClinical360Modal.tsx';
import FamilyComprehensiveHealthRecordModal from './FamilyComprehensiveHealthRecordModal.tsx';
import { evaluateClinicalModuleEligibility } from '../services/followupSuggestions.ts';

interface ClinicExaminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSaved: () => void;
}

type ExamFormMode = 'child_under5' | 'child_over5' | 'general';

const CHILD_MILESTONE_BRACKETS = [2, 4, 6, 9, 12, 18, 24, 36, 48, 60];

const FAMILY_HISTORY_OPTIONS = [
  { key: 'TB', label: 'درن / سل (TB)' },
  { key: 'Asthma', label: 'ربو / حساسية صدر (Asthma)' },
  { key: 'Cardiac', label: 'أمراض قلب (Cardiac)' },
  { key: 'Consanguinity', label: 'صلة قرابة (Consanguinity)' },
  { key: 'Diabetes', label: 'مرض السكر (Diabetes)' },
  { key: 'Hypertension', label: 'ضغط دم مرتفع (Hypertension)' },
  { key: 'Blood Dis.', label: 'أمراض دم (Blood Dis.)' },
  { key: 'Renal', label: 'أمراض كلى (Renal)' },
  { key: 'Twins', label: 'توائم (Twins)' },
  { key: 'Congenital anomalies', label: 'عيوب خلقية (Congenital anomalies)' },
  { key: 'Cancer', label: 'أورام / سرطانات (Cancer)' },
  { key: 'Epilepsy', label: 'صرع وتشنجات (Epilepsy)' },
  { key: 'Psychiatric', label: 'أمراض نفسية (Psychiatric)' },
  { key: 'Other', label: 'أخرى (Other)' }
];

function detectInitialExamMode(appointment: any, patientObj: any): ExamFormMode {
  const elig = evaluateClinicalModuleEligibility(patientObj, 'child');
  const ageYears = elig.ageYears;
  const ageMonths = elig.ageMonths;

  const clinicLinked = String(appointment?.clinics?.linked_module || '').toLowerCase();
  const clinicText = `${appointment?.clinics?.name || ''} ${appointment?.clinics?.specialty || ''}`.toLowerCase();
  const notesText = String(appointment?.notes || '').toLowerCase();

  const isDentalClinic =
    clinicLinked === 'dental' ||
    clinicText.includes('أسنان') ||
    clinicText.includes('اسنان') ||
    clinicText.includes('فم');

  const isChildContext =
    clinicLinked === 'child' ||
    clinicLinked === 'child_followup' ||
    clinicText.includes('طفل') ||
    clinicText.includes('أطفال') ||
    clinicText.includes('اطفال') ||
    clinicText.includes('نمو') ||
    clinicText.includes('تطعيم') ||
    notesText.includes('طفل') ||
    notesText.includes('نمو') ||
    notesText.includes('تطعيم') ||
    notesText.includes('محطة') ||
    notesText.includes('رضاعة') ||
    notesText.includes('دون 5') ||
    notesText.includes('أقل من 5') ||
    notesText.includes('اقل من 5');

  if (!isDentalClinic) {
    if ((ageYears !== null && ageYears < 5) || (ageMonths !== null && ageMonths < 60)) {
      return 'child_under5';
    }
    if (
      notesText.includes('دون 5') ||
      notesText.includes('أقل من 5') ||
      notesText.includes('اقل من 5') ||
      notesText.includes('نمو الطفل')
    ) {
      if (ageYears === null || ageYears < 5) {
        return 'child_under5';
      }
    }
    if (isChildContext && ageYears !== null && ageYears >= 5 && ageYears < 18) {
      return 'child_over5';
    }
  }

  return 'general';
}

export const ClinicExaminationModal: React.FC<ClinicExaminationModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSaved
}) => {
  if (!isOpen || !appointment) return null;

  const [resolvedPatient, setResolvedPatient] = useState<any>(
    appointment.patients || { id: appointment.patient_id, name: 'مريض' }
  );

  const patientAgeInfo = useMemo(
    () => evaluateClinicalModuleEligibility(resolvedPatient, 'child'),
    [resolvedPatient]
  );

  const [examMode, setExamMode] = useState<ExamFormMode>(() =>
    detectInitialExamMode(appointment, appointment.patients || { id: appointment.patient_id })
  );
  const [userManuallySwitchedMode, setUserManuallySwitchedMode] = useState(false);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);

  // Toggle Section B (General Form)
  const [showComprehensiveDetails, setShowComprehensiveDetails] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationalProfile, setOperationalProfile] = useState<PatientOperationalProfile | null>(null);
  const [show360Modal, setShow360Modal] = useState(false);
  const [addDiagnosisAsChronic, setAddDiagnosisAsChronic] = useState(false);

  // Section C: Diagnosis & Prescription
  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || '');
  const [prescription, setPrescription] = useState(appointment.prescription || '');

  // Section A: Vitals & General Appearance
  const [vitalBp, setVitalBp] = useState('');
  const [vitalPulse, setVitalPulse] = useState('');
  const [vitalTemp, setVitalTemp] = useState('');
  const [vitalRespRate, setVitalRespRate] = useState('');
  const [vitalWeight, setVitalWeight] = useState('');
  const [vitalHeight, setVitalHeight] = useState('');
  const [generalAppearance, setGeneralAppearance] = useState('');

  // Child Under-5 Specific Fields (Form 5A, 5B, 5C)
  const [childAgeMonths, setChildAgeMonths] = useState<string>(
    patientAgeInfo.ageMonths !== null ? String(patientAgeInfo.ageMonths) : ''
  );
  const [childHeadCirc, setChildHeadCirc] = useState('');
  const [childFeedingType, setChildFeedingType] = useState('طبيعية مطلقة');
  const [childWeaningStarted, setChildWeaningStarted] = useState(false);
  const [childMandatoryVaccines, setChildMandatoryVaccines] = useState(true);
  const [childOtherVaccines, setChildOtherVaccines] = useState('');
  const [childVitaminA, setChildVitaminA] = useState(false);
  const [childVitaminD, setChildVitaminD] = useState(true);
  const [childParentalConcerns, setChildParentalConcerns] = useState('');
  const [childHealthEducation, setChildHealthEducation] = useState('التغذية السليمة للطفل، جدول التطعيمات الدورية، والوقاية من النزلات المعوية');
  const [milestoneGrossMotor, setMilestoneGrossMotor] = useState(true);
  const [milestoneFineMotor, setMilestoneFineMotor] = useState(true);
  const [milestoneHearingSpeech, setMilestoneHearingSpeech] = useState(true);
  const [milestoneSocial, setMilestoneSocial] = useState(true);

  // Child Over-5 Specific Fields (Form 5D)
  const [childEducationalStage, setChildEducationalStage] = useState('ابتدائي (Primary)');
  const [childVisionScreening, setChildVisionScreening] = useState('6/6 بالعينين - سليم');
  const [childHearingScreening, setChildHearingScreening] = useState('طبيعي وسليم');
  const [childSchoolConcerns, setChildSchoolConcerns] = useState(false);
  const [childPsychScreening, setChildPsychScreening] = useState('طبيعي - لا توجد اضطرابات سلوكية ملحوظة');

  // Section B: Relevant History
  const [hospitalization, setHospitalization] = useState('');
  const [previousOperations, setPreviousOperations] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [traumaInjuries, setTraumaInjuries] = useState('');
  const [allergy, setAllergy] = useState('');
  const [adverseDrugReactions, setAdverseDrugReactions] = useState('');
  const [abuseNegligence, setAbuseNegligence] = useState('');
  const [otherHistory, setOtherHistory] = useState('');

  // Psychiatric History
  const [psychiatricHistory, setPsychiatricHistory] = useState('irrelevant');
  const [psychiatricDetails, setPsychiatricDetails] = useState('');

  // Special Habits
  const [habits, setHabits] = useState<string[]>([]);
  const [specialHabitsOther, setSpecialHabitsOther] = useState('');

  // Family Medical History
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [familyHistoryOther, setFamilyHistoryOther] = useState('');

  // Lab Tests
  const [labHemoglobin, setLabHemoglobin] = useState('');
  const [labBloodGroup, setLabBloodGroup] = useState('');
  const [labRh, setLabRh] = useState('');
  const [labUrine, setLabUrine] = useState('');
  const [labStool, setLabStool] = useState('');

  // Automatically compute BMI
  const computedBmi = useMemo(() => {
    const w = parseFloat(vitalWeight);
    const h = parseFloat(vitalHeight);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const heightInMeters = h / 100;
      const val = w / (heightInMeters * heightInMeters);
      return val.toFixed(1);
    }
    return '';
  }, [vitalWeight, vitalHeight]);

  const bmiCategory = useMemo(() => {
    if (!computedBmi) return null;
    const bmiVal = parseFloat(computedBmi);
    if (isNaN(bmiVal)) return null;
    if (bmiVal < 18.5) return { label: 'نحافة (Underweight)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (bmiVal < 25) return { label: 'وزن مثالي وطبيعي (Normal)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (bmiVal < 30) return { label: 'زيادة وزن (Overweight)', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    return { label: 'سمنة (Obese)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  }, [computedBmi]);

  // Sync calculated age in months and auto-detect mode once full patient object is resolved
  useEffect(() => {
    if (patientAgeInfo.ageMonths !== null && !childAgeMonths) {
      setChildAgeMonths(String(patientAgeInfo.ageMonths));
      if (patientAgeInfo.ageMonths >= 6) {
        setChildWeaningStarted(true);
      }
    }
    if (!userManuallySwitchedMode) {
      const detected = detectInitialExamMode(appointment, resolvedPatient);
      setExamMode(detected);
    }
  }, [patientAgeInfo.ageMonths, resolvedPatient, appointment, userManuallySwitchedMode]);

  // Load existing exam for this appointment or patient today
  useEffect(() => {
    let isMounted = true;
    const loadExistingData = async () => {
      setLoadingExisting(true);
      setErrorMessage(null);
      try {
        const existing = await DB.getPhysicalExamForAppointment(appointment.id, appointment.patient_id);
        if (existing && isMounted) {
          if (existing.hospitalization) setHospitalization(existing.hospitalization);
          if (existing.previous_operations) setPreviousOperations(existing.previous_operations);
          if (existing.current_medications) setCurrentMedications(existing.current_medications);
          if (existing.trauma_injuries) setTraumaInjuries(existing.trauma_injuries);
          if (existing.allergy) setAllergy(existing.allergy);
          if (existing.adverse_drug_reactions) setAdverseDrugReactions(existing.adverse_drug_reactions);
          if (existing.abuse_negligence) setAbuseNegligence(existing.abuse_negligence);
          if (existing.other_history) setOtherHistory(existing.other_history);
          if (existing.psychiatric_history) setPsychiatricHistory(existing.psychiatric_history);
          if (existing.psychiatric_details) setPsychiatricDetails(existing.psychiatric_details);

          if (existing.special_habits) {
            setHabits(existing.special_habits.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
          if (existing.special_habits_other) setSpecialHabitsOther(existing.special_habits_other);

          if (existing.family_history) {
            setFamilyHistory(existing.family_history.split(',').map((s: string) => s.trim()).filter(Boolean));
          }
          if (existing.family_history_other) setFamilyHistoryOther(existing.family_history_other);

          if (existing.lab_hemoglobin) setLabHemoglobin(existing.lab_hemoglobin);
          if (existing.lab_blood_group) setLabBloodGroup(existing.lab_blood_group);
          if (existing.lab_rh) setLabRh(existing.lab_rh);
          if (existing.lab_urine) setLabUrine(existing.lab_urine);
          if (existing.lab_stool) setLabStool(existing.lab_stool);

          if (existing.clinical_findings) {
            try {
              const parsed = typeof existing.clinical_findings === 'string'
                ? JSON.parse(existing.clinical_findings)
                : existing.clinical_findings;
              if (parsed.vital_bp) setVitalBp(parsed.vital_bp);
              if (parsed.vital_pulse) setVitalPulse(parsed.vital_pulse);
              if (parsed.vital_temp) setVitalTemp(parsed.vital_temp);
              if (parsed.vital_resp_rate) setVitalRespRate(parsed.vital_resp_rate);
              if (parsed.vital_weight) setVitalWeight(parsed.vital_weight);
              if (parsed.vital_height) setVitalHeight(parsed.vital_height);
              if (parsed.head_circumference_cm) setChildHeadCirc(String(parsed.head_circumference_cm));
              if (parsed.general_appearance) setGeneralAppearance(parsed.general_appearance);
            } catch (e) {
              console.warn("Could not parse clinical findings JSON:", e);
            }
          }

          if (
            existing.hospitalization || existing.previous_operations || 
            existing.current_medications || existing.allergy || 
            existing.special_habits || existing.family_history ||
            existing.lab_hemoglobin
          ) {
            setShowComprehensiveDetails(true);
          }
        }

        // Load Family File, Full Patient Record, & Operational Clinical Decision Profile
        if (appointment.patient_id) {
          const [familyFiles, problems, physicalExams, allPatients] = await Promise.all([
            DB.getFamilyFiles(),
            DB.getPatientProblems(appointment.patient_id),
            DB.getPhysicalExams(appointment.patient_id),
            appointment.patients?.date_of_birth ? Promise.resolve([]) : DB.getPatients()
          ]);
          if (isMounted) {
            const fullPat =
              (allPatients || []).find((p: any) => p.id === appointment.patient_id) ||
              appointment.patients ||
              { id: appointment.patient_id, name: 'مريض' };
            setResolvedPatient(fullPat);

            const prof = HospitalOperationalEngine.buildPatientOperationalProfile(fullPat, {
              familyFiles,
              problems,
              physicalExams
            });
            setOperationalProfile(prof);
          }
        }
      } catch (err: any) {
        console.warn("Could not load prior physical exam:", err);
      } finally {
        if (isMounted) setLoadingExisting(false);
      }
    };

    loadExistingData();
    return () => {
      isMounted = false;
    };
  }, [appointment.id, appointment.patient_id]);

  const handleHabitToggle = (habitKey: string) => {
    setHabits(prev => 
      prev.includes(habitKey) ? prev.filter(h => h !== habitKey) : [...prev, habitKey]
    );
  };

  const handleFamilyHistoryToggle = (key: string) => {
    setFamilyHistory(prev => 
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (examMode === 'child_under5') {
      const monthsNum = Number(childAgeMonths);
      if (childAgeMonths === '' || isNaN(monthsNum) || monthsNum < 0 || monthsNum > 60) {
        setErrorMessage('يرجى إدخال عمر الطفل بالشهور بشكل صحيح (من 0 إلى 60 شهراً).');
        return;
      }
      if (!vitalWeight.trim() && !vitalHeight.trim()) {
        setErrorMessage('يرجى تسجيل قياسات نمو الطفل الأساسية (الوزن أو الطول على الأقل).');
        return;
      }
    }

    const effectiveDiagnosis = diagnosis.trim() || (
      examMode === 'child_under5'
        ? `متابعة نمو وتطعيمات الطفل (عمر ${childAgeMonths || 0} شهر) - ${
            milestoneGrossMotor && milestoneFineMotor && milestoneHearingSpeech && milestoneSocial
              ? 'نمو حركي وتطوري مناسب للعمر'
              : 'يحتاج متابعة للتطور النمائي'
          }`
        : examMode === 'child_over5'
        ? `فحص دوري للسن المدرسي (${childEducationalStage})`
        : ''
    );

    if (!effectiveDiagnosis) {
      setErrorMessage("يرجى كتابة التقييم الإكلينيكي / التشخيص الطبي للكشف.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const todayDate = new Date().toISOString().split('T')[0];
    const doctorName = appointment.doctors?.name || appointment.doctor_name || '';

    const clinicalFindingsObj: Record<string, any> = {
      exam_form_mode: examMode,
      general_appearance: generalAppearance.trim(),
      vital_bp: vitalBp.trim(),
      vital_pulse: vitalPulse.trim(),
      vital_temp: vitalTemp.trim(),
      vital_resp_rate: vitalRespRate.trim(),
      vital_weight: vitalWeight.trim(),
      vital_height: vitalHeight.trim(),
      vital_bmi: computedBmi
    };

    if (examMode === 'child_under5') {
      clinicalFindingsObj.age_months = Number(childAgeMonths) || 0;
      clinicalFindingsObj.head_circumference_cm = childHeadCirc.trim() || null;
      clinicalFindingsObj.feeding_type = childFeedingType;
      clinicalFindingsObj.weaning_started = childWeaningStarted;
      clinicalFindingsObj.mandatory_vaccines_up_to_date = childMandatoryVaccines;
      clinicalFindingsObj.vitamin_a_supplement_given = childVitaminA;
      clinicalFindingsObj.vitamin_d_supplement_given = childVitaminD;
    }

    const examRecord = {
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      exam_date: todayDate,
      doctor_name: doctorName,
      hospitalization: hospitalization.trim() || null,
      previous_operations: previousOperations.trim() || null,
      current_medications: currentMedications.trim() || null,
      trauma_injuries: traumaInjuries.trim() || null,
      allergy: allergy.trim() || null,
      adverse_drug_reactions: adverseDrugReactions.trim() || null,
      abuse_negligence: abuseNegligence.trim() || null,
      psychiatric_history: psychiatricHistory || 'irrelevant',
      psychiatric_details: psychiatricDetails.trim() || null,
      other_history: otherHistory.trim() || null,
      special_habits: habits.length > 0 ? habits.join(',') : null,
      special_habits_other: specialHabitsOther.trim() || null,
      family_history: familyHistory.length > 0 ? familyHistory.join(',') : null,
      family_history_other: familyHistoryOther.trim() || null,
      lab_hemoglobin: labHemoglobin.trim() || null,
      lab_blood_group: labBloodGroup.trim() || null,
      lab_rh: labRh.trim() || null,
      lab_urine: labUrine.trim() || null,
      lab_stool: labStool.trim() || null,
      clinical_findings: JSON.stringify(clinicalFindingsObj)
    };

    try {
      // 1. If specialized Child Under-5 Followup mode, save to child_under5_followups
      if (examMode === 'child_under5') {
        await DB.addAccreditationRecord('child_under5_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          age_months: Number(childAgeMonths) || 0,
          weight_kg: vitalWeight ? Number(vitalWeight) : null,
          height_cm: vitalHeight ? Number(vitalHeight) : null,
          head_circumference_cm: childHeadCirc ? Number(childHeadCirc) : null,
          feeding_type: childFeedingType || null,
          weaning_started: childWeaningStarted,
          hemoglobin_level: labHemoglobin ? Number(labHemoglobin) : null,
          mandatory_vaccines_up_to_date: childMandatoryVaccines,
          other_vaccines: childOtherVaccines.trim() || null,
          vitamin_a_supplement_given: childVitaminA,
          vitamin_d_supplement_given: childVitaminD,
          parental_concerns: childParentalConcerns.trim() || null,
          clinical_assessment: effectiveDiagnosis,
          health_education_topics: childHealthEducation.trim() || null,
          doctor_signature: doctorName || null
        });
      }

      // 1b. If specialized Child Over-5 (School Age) mode, save to child_over5_followups
      if (examMode === 'child_over5') {
        await DB.addAccreditationRecord('child_over5_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          educational_stage: childEducationalStage || null,
          weight_kg: vitalWeight ? Number(vitalWeight) : null,
          height_cm: vitalHeight ? Number(vitalHeight) : null,
          bmi: computedBmi ? Number(computedBmi) : null,
          vision_screening: childVisionScreening.trim() || null,
          hearing_screening: childHearingScreening.trim() || null,
          school_achievement_concerns: childSchoolConcerns,
          psychiatric_behavioral_screening: childPsychScreening.trim() || null,
          hb_level: labHemoglobin ? Number(labHemoglobin) : null,
          urine_analysis_result: labUrine.trim() || null,
          stool_analysis_result: labStool.trim() || null,
          health_education_given: childHealthEducation.trim() || null,
          doctor_signature: doctorName || null
        });
      }

      // 2. Save or update physical exam record for unified vitals/history lookup
      await DB.saveClinicPhysicalExam(examRecord);

      // 3. Update clinic appointment status, diagnosis, and prescription
      await DB.updateAppointmentStatus(
        appointment.id,
        'COMPLETED',
        effectiveDiagnosis,
        prescription.trim()
      );

      // 4. Sync clinical event to Family File
      await HospitalOperationalEngine.syncClinicalEventToFamilyFile({
        patient_id: appointment.patient_id,
        event_type: 'CLINIC_EXAM',
        date: todayDate,
        doctor_or_staff: doctorName ? `د/ ${doctorName} (${appointment.clinics?.name || 'العيادة'})` : (appointment.clinics?.name || 'العيادة'),
        diagnosis_or_summary: effectiveDiagnosis,
        treatment_or_medications: prescription.trim(),
        new_chronic_condition: addDiagnosisAsChronic ? effectiveDiagnosis : undefined
      });

      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Error saving clinic examination:", err);
      const msg = err?.message || "حدث خطأ غير متوقع أثناء حفظ بيانات الكشف في قاعدة البيانات.";
      setErrorMessage(`تعذر إنهاء الكشف: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-in zoom-in-95">
        
        {/* Header */}
        <div className={`p-5 sm:p-6 text-white flex justify-between items-start shrink-0 rounded-t-3xl ${
          examMode === 'child_under5' || examMode === 'child_over5'
            ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900'
            : 'bg-primary-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white/15 rounded-2xl shrink-0 mt-0.5">
              {examMode === 'child_under5' || examMode === 'child_over5' ? (
                <Baby size={24} />
              ) : (
                <Stethoscope size={24} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl">
                  {examMode === 'child_under5'
                    ? 'فحص ومتابعة نمو الطفل دون 5 سنوات'
                    : examMode === 'child_over5'
                    ? 'فحص الصحة المدرسية والمراهقين (5 - 18 سنة)'
                    : 'تسجيل الكشف الطبي والفحص السريري'}
                </h3>
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] font-bold">
                  {examMode === 'child_under5'
                    ? 'نموذج متابعة الطفل (Form 5A & 5C)'
                    : examMode === 'child_over5'
                    ? 'نموذج السن المدرسي (Form 5D)'
                    : 'نموذج ف1'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90 mt-1.5">
                <span className="font-bold flex items-center gap-1">
                  <User size={13} /> {resolvedPatient?.name || appointment.patients?.name || 'مريض'}
                </span>
                {patientAgeInfo.ageMonths !== null && patientAgeInfo.ageMonths < 60 && (
                  <>
                    <span>•</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-black">
                      العمر: {patientAgeInfo.ageMonths} شهر
                    </span>
                  </>
                )}
                {patientAgeInfo.ageYears !== null && patientAgeInfo.ageYears >= 5 && (
                  <>
                    <span>•</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-black">
                      العمر: {patientAgeInfo.ageYears} سنة
                    </span>
                  </>
                )}
                <span>•</span>
                <span>د/ {appointment.doctors?.name || '---'} ({appointment.clinics?.name || 'العيادة'})</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {appointment.date} | {appointment.time}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={saving}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="إغلاق"
          >
            <X size={22} />
          </button>
        </div>

        {/* Examination Form Mode Selector Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-black text-slate-600 ml-1">نموذج الكشف:</span>
            <button
              type="button"
              onClick={() => {
                setExamMode('child_under5');
                setUserManuallySwitchedMode(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                examMode === 'child_under5'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
              }`}
            >
              <Baby size={14} />
              <span>متابعة طفل أقل من 5 سنوات</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExamMode('child_over5');
                setUserManuallySwitchedMode(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                examMode === 'child_over5'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-teal-50 border border-slate-200'
              }`}
            >
              <Users size={14} />
              <span>فحص طفل 5 - 18 سنة</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExamMode('general');
                setUserManuallySwitchedMode(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                examMode === 'general'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Stethoscope size={14} />
              <span>نموذج الكشف العام (ف1)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowComprehensiveModal(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderOpen size={13} className="text-indigo-600" />
            <span>فتح السجل الصحي التخصصي الكامل</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
          
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle size={20} className="shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">فشل إتمام العملية</p>
                <p className="text-xs mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {loadingExisting && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-bold animate-pulse">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              جاري مراجعة السجلات الطبية السابقة للمريض...
            </div>
          )}

          {/* شريط التنبيهات الفورية من الملف العائلي (الحساسية، الأمراض المزمنة، الاستحقاق) */}
          {operationalProfile && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <FolderOpen size={15} className="text-indigo-600" />
                    الربط مع الملف العائلي:
                  </span>
                  {operationalProfile.familyFile ? (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg text-[11px] font-bold font-mono">
                      {operationalProfile.familyFile.file_code} ({operationalProfile.memberRole || 'فرد أسرة'})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold">
                      غير مربوط بملف عائلي بعد
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                      operationalProfile.billingEligibility.status === 'FREE_SOCIAL'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {operationalProfile.billingEligibility.badgeText}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShow360Modal(true)}
                  className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <User size={13} className="text-primary-600" />
                  بطاقة المريض
                </button>
              </div>

              {(operationalProfile.hasAllergyAlert || operationalProfile.chronicProblems.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                  {operationalProfile.hasAllergyAlert && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-xs font-black flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-700" />
                      تنبيه حساسية دوائية/عامة: {[...operationalProfile.drugReactions, ...operationalProfile.allergies].join(' ، ')}
                    </span>
                  )}
                  {operationalProfile.chronicProblems.map((prob, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold"
                    >
                      مرض مزمن: {prob.diagnosis_description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (1): نموذج فحص ومتابعة نمو الطفل أقل من 5 سنوات (Form 5A, 5B, 5C) */}
          {/* ========================================================================= */}
          {examMode === 'child_under5' && (
            <div className="space-y-5">
              {/* 1. العمر بالشهور وقياسات النمو البدني للطفل */}
              <div className="bg-emerald-50/70 p-5 rounded-2xl border-2 border-emerald-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                    <Baby size={18} className="text-emerald-600" />
                    <span>1. قياسات النمو البدني والمؤشرات الحيوية للطفل (أقل من 5 سنوات)</span>
                  </div>
                  <span className="text-[11px] font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    Form 5A & 5C — متابعة النمو
                  </span>
                </div>

                {/* Quick Milestone Bracket Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-emerald-900 block">
                    محطة المتابعة الدورية للطفل (بالشهور):
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CHILD_MILESTONE_BRACKETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setChildAgeMonths(String(m));
                          if (m >= 6) setChildWeaningStarted(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          Number(childAgeMonths) === m
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {m} شهر
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block">
                      العمر بالشهور <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      required
                      value={childAgeMonths}
                      onChange={e => setChildAgeMonths(e.target.value)}
                      placeholder="مثال: 6"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block">
                      الوزن (كجم) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitalWeight}
                      onChange={e => setVitalWeight(e.target.value)}
                      placeholder="مثال: 7.5"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block">
                      الطول (سم) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={vitalHeight}
                      onChange={e => setVitalHeight(e.target.value)}
                      placeholder="مثال: 68"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block">
                      محيط الرأس (سم)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={childHeadCirc}
                      onChange={e => setChildHeadCirc(e.target.value)}
                      placeholder="مثال: 42"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      الحرارة (°C)
                    </label>
                    <input
                      type="text"
                      value={vitalTemp}
                      onChange={e => setVitalTemp(e.target.value)}
                      placeholder="37.0"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      الهيموجلوبين Hb (g/dL)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labHemoglobin}
                      onChange={e => setLabHemoglobin(e.target.value)}
                      placeholder="11.5"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. الرضاعة والتغذية والفطام + التطعيمات والمكملات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <HeartPulse size={15} className="text-emerald-600" />
                    <span>2. تقييم الرضاعة والتغذية والفطام</span>
                  </h4>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      نوع التغذية والرضاعة الحالية
                    </label>
                    <select
                      value={childFeedingType}
                      onChange={e => setChildFeedingType(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="طبيعية مطلقة">رضاعة طبيعية مطلقة (Exclusive Breastfeeding)</option>
                      <option value="صناعية">ألبان صناعية بديلة</option>
                      <option value="مختلطة">رضاعة مختلطة (طبيعية + صناعية)</option>
                      <option value="تغذية تكميلية وفطام">تغذية تكميلية وفطام</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={childWeaningStarted}
                      onChange={e => setChildWeaningStarted(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>تم بدء الفطام وإدخال الأغذية التكميلية المناسبة لعمر الطفل</span>
                  </label>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Syringe size={15} className="text-emerald-600" />
                    <span>3. التطعيمات الإجبارية والفيتامينات الوقائية</span>
                  </h4>

                  <div className="space-y-2 text-xs font-bold text-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={childMandatoryVaccines}
                        onChange={e => setChildMandatoryVaccines(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>التطعيمات الإجبارية المقررة مكتملة حسب عمر الطفل</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={childVitaminD}
                        onChange={e => setChildVitaminD(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>يتناول جرعات فيتامين (د) الوقائية بانتظام</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={childVitaminA}
                        onChange={e => setChildVitaminA(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span>تم إعطاء كبسولة فيتامين (أ) المقررة (عند 9 أو 18 شهراً)</span>
                    </label>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={childOtherVaccines}
                      onChange={e => setChildOtherVaccines(e.target.value)}
                      placeholder="تطعيمات إضافية أو ملاحظات حول جدول التطعيم..."
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. فحص التطور النمائي والحركي للطفل (Form 5B) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Brain size={15} className="text-indigo-600" />
                    <span>4. فحص التطور النمائي والحركي لعمر الطفل (Developmental Milestones)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    Form 5B
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-bold">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    milestoneGrossMotor ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <input
                      type="checkbox"
                      checked={milestoneGrossMotor}
                      onChange={e => setMilestoneGrossMotor(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>الحركة الكبرى مناسبة للسن</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    milestoneFineMotor ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <input
                      type="checkbox"
                      checked={milestoneFineMotor}
                      onChange={e => setMilestoneFineMotor(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>الحركة الدقيقة والانتباه سليم</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    milestoneHearingSpeech ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <input
                      type="checkbox"
                      checked={milestoneHearingSpeech}
                      onChange={e => setMilestoneHearingSpeech(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>السمع والمناغاة/النطق سليم</span>
                  </label>

                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    milestoneSocial ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <input
                      type="checkbox"
                      checked={milestoneSocial}
                      onChange={e => setMilestoneSocial(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>التفاعل الاجتماعي والاستجابة</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      شكوى أو ملاحظات الأم / ولي الأمر
                    </label>
                    <input
                      type="text"
                      value={childParentalConcerns}
                      onChange={e => setChildParentalConcerns(e.target.value)}
                      placeholder="أي ملاحظات للأم حول الشهية، النوم، التسنين، الحركة..."
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      التثقيف الصحي المقدم للأم
                    </label>
                    <input
                      type="text"
                      value={childHealthEducation}
                      onChange={e => setChildHealthEducation(e.target.value)}
                      placeholder="إرشادات الرضاعة، الفطام، التطعيمات، النظافة..."
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (2): نموذج فحص السن المدرسي والمراهقين 5 - 18 سنة (Form 5D) */}
          {/* ========================================================================= */}
          {examMode === 'child_over5' && (
            <div className="bg-teal-50/60 p-5 rounded-2xl border-2 border-teal-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                <div className="flex items-center gap-2 text-teal-950 font-black text-sm">
                  <Users size={18} className="text-teal-600" />
                  <span>فحص الصحة المدرسية والمراهقين (5 - 18 سنة)</span>
                </div>
                <span className="text-[11px] font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                  Form 5D
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">المرحلة التعليمية</label>
                  <select
                    value={childEducationalStage}
                    onChange={e => setChildEducationalStage(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="رياض أطفال (KG)">رياض أطفال (KG)</option>
                    <option value="ابتدائي (Primary)">المرحلة الابتدائية (Primary)</option>
                    <option value="إعدادي (Preparatory)">المرحلة الإعدادية (Preparatory)</option>
                    <option value="ثانوي (Secondary)">المرحلة الثانوية (Secondary)</option>
                    <option value="غير ملتحق / متسرب">غير ملتحق / متسرب</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوزن (كجم)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalWeight}
                    onChange={e => setVitalWeight(e.target.value)}
                    placeholder="مثال: 28"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الطول (سم)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={vitalHeight}
                    onChange={e => setVitalHeight(e.target.value)}
                    placeholder="مثال: 125"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مؤشر كتلة الجسم (BMI)</label>
                  <input
                    type="text"
                    readOnly
                    value={computedBmi ? `${computedBmi} kg/m²` : 'يُحسب تلقائياً'}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700 flex items-center gap-1">
                    <Eye size={13} className="text-teal-600" /> فحص حدة الإبصار (Vision Screening)
                  </label>
                  <input
                    type="text"
                    value={childVisionScreening}
                    onChange={e => setChildVisionScreening(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700 flex items-center gap-1">
                    <Ear size={13} className="text-teal-600" /> فحص السمع (Hearing Screening)
                  </label>
                  <input
                    type="text"
                    value={childHearingScreening}
                    onChange={e => setChildHearingScreening(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">نسبة الهيموجلوبين Hb (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labHemoglobin}
                    onChange={e => setLabHemoglobin(e.target.value)}
                    placeholder="12.5"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تحليل البول (Urine)</label>
                  <input
                    type="text"
                    value={labUrine}
                    onChange={e => setLabUrine(e.target.value)}
                    placeholder="سليم"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تحليل البراز (Stool)</label>
                  <input
                    type="text"
                    value={labStool}
                    onChange={e => setLabStool(e.target.value)}
                    placeholder="خالٍ من الطفيليات"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold items-center">
                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={childSchoolConcerns}
                    onChange={e => setChildSchoolConcerns(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600"
                  />
                  <span>توجد صعوبات تعلم أو تأخر في التحصيل الدراسي</span>
                </label>
                <div>
                  <input
                    type="text"
                    value={childPsychScreening}
                    onChange={e => setChildPsychScreening(e.target.value)}
                    placeholder="التقييم النفسي والسلوكي..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (3): القسم الأساسي للكشف العام (نموذج ف1 - يظهر فقط في الوضع العام) */}
          {/* ========================================================================= */}
          {examMode === 'general' && (
            <>
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                    <Activity size={18} className="text-primary-600" />
                    <span>القسم الأساسي: العلامات الحيوية والفحص العام</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    إلزامي / روتيني
                  </span>
                </div>

                {/* Vital Signs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">ضغط الدم (BP)</label>
                    <input
                      type="text"
                      value={vitalBp}
                      onChange={e => setVitalBp(e.target.value)}
                      placeholder="120/80"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">النبض (Pulse)</label>
                    <input
                      type="text"
                      value={vitalPulse}
                      onChange={e => setVitalPulse(e.target.value)}
                      placeholder="72 نبضة/د"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">الحرارة (Temp)</label>
                    <input
                      type="text"
                      value={vitalTemp}
                      onChange={e => setVitalTemp(e.target.value)}
                      placeholder="37.0 °C"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">التنفس (RR)</label>
                    <input
                      type="text"
                      value={vitalRespRate}
                      onChange={e => setVitalRespRate(e.target.value)}
                      placeholder="16 /د"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">الوزن (كجم)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitalWeight}
                      onChange={e => setVitalWeight(e.target.value)}
                      placeholder="70"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">الطول (سم)</label>
                    <input
                      type="number"
                      step="1"
                      value={vitalHeight}
                      onChange={e => setVitalHeight(e.target.value)}
                      placeholder="170"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Calculated BMI */}
                {computedBmi && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-primary-600" />
                      <span className="text-xs font-bold text-slate-700">مؤشر كتلة الجسم (BMI):</span>
                      <span className="text-sm font-black text-slate-900">{computedBmi} kg/m²</span>
                    </div>
                    {bmiCategory && (
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${bmiCategory.color}`}>
                        {bmiCategory.label}
                      </span>
                    )}
                  </div>
                )}

                {/* General Appearance */}
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    الفحص العام والمظهر الإكلينيكي (General Appearance)
                  </label>
                  <input
                    type="text"
                    value={generalAppearance}
                    onChange={e => setGeneralAppearance(e.target.value)}
                    placeholder="الحالة العامة للمريض، الوعي، وجود شحوب، زرقة، صفراء، علامات إرهاق أو إجهاد..."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* قسم (ب): تفاصيل الفحص الشامل (Collapsible - مغلق افتراضياً) */}
              <div className="border border-indigo-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowComprehensiveDetails(!showComprehensiveDetails)}
                  className="w-full p-4 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors flex items-center justify-between text-right"
                >
                  <div className="flex items-center gap-2.5 text-indigo-950">
                    <Shield size={18} className="text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-black text-sm">
                        {showComprehensiveDetails ? 'إخفاء تفاصيل الفحص الشامل والتاريخ المرضي ▴' : 'إضافة تفاصيل الفحص الشامل والتاريخ المرضي (نموذج ف1) ▾'}
                      </span>
                      <p className="text-[11px] text-indigo-600 mt-0.5">
                        (اختياري: التاريخ المرضي، العائلي، النفسي، العادات الخاصة، والفحوصات المعملية)
                      </p>
                    </div>
                  </div>
                  <div className="p-1.5 bg-white/80 rounded-lg text-indigo-700 border border-indigo-200">
                    {showComprehensiveDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {showComprehensiveDetails && (
                  <div className="p-5 space-y-6 border-t border-indigo-100 bg-white animate-in fade-in duration-300">
                    
                    {/* 1. Relevant Clinical History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <FileText size={14} className="text-indigo-600" />
                        1. التاريخ المرضي ذو الصلة (Relevant Clinical History)
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">دخول مستشفى سابق</label>
                          <input
                            type="text"
                            value={hospitalization}
                            onChange={e => setHospitalization(e.target.value)}
                            placeholder="الأسباب والتواريخ إن وجدت"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">عمليات جراحية سابقة</label>
                          <input
                            type="text"
                            value={previousOperations}
                            onChange={e => setPreviousOperations(e.target.value)}
                            placeholder="العملية وتاريخ إجرائها"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">أدوية حالية ومستمرة</label>
                          <input
                            type="text"
                            value={currentMedications}
                            onChange={e => setCurrentMedications(e.target.value)}
                            placeholder="الأدوية المزمنة الحالية"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">إصابات وحوادث</label>
                          <input
                            type="text"
                            value={traumaInjuries}
                            onChange={e => setTraumaInjuries(e.target.value)}
                            placeholder="كسور أو إصابات سابقة"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">حساسية عامة (Allergy)</label>
                          <input
                            type="text"
                            value={allergy}
                            onChange={e => setAllergy(e.target.value)}
                            placeholder="أطعمة أو مواد بيئية..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">تحسس دوائي (Adverse Drug Reactions)</label>
                          <input
                            type="text"
                            value={adverseDrugReactions}
                            onChange={e => setAdverseDrugReactions(e.target.value)}
                            placeholder="بنسلين، سلفا، مسكنات..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">شبهة إهمال أو إيذاء (Abuse / Negligence)</label>
                          <input
                            type="text"
                            value={abuseNegligence}
                            onChange={e => setAbuseNegligence(e.target.value)}
                            placeholder="أي علامات إيذاء أو إهمال ملحوظة"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">ملاحظات تاريخ مرضي أخرى</label>
                          <input
                            type="text"
                            value={otherHistory}
                            onChange={e => setOtherHistory(e.target.value)}
                            placeholder="أي تفاصيل أخرى..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Psychiatric History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <HeartPulse size={14} className="text-purple-600" />
                        2. التاريخ النفسي (Psychiatric History)
                      </h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          psychiatricHistory === 'irrelevant' 
                            ? 'bg-purple-50 border-purple-300 font-bold text-purple-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}>
                          <input
                            type="radio"
                            name="psychiatricHistory"
                            value="irrelevant"
                            checked={psychiatricHistory === 'irrelevant'}
                            onChange={() => setPsychiatricHistory('irrelevant')}
                            className="text-purple-600"
                          />
                          <span>لا يوجد / غير ملائم</span>
                        </label>

                        <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          psychiatricHistory === 'medical_treatment' 
                            ? 'bg-purple-50 border-purple-300 font-bold text-purple-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}>
                          <input
                            type="radio"
                            name="psychiatricHistory"
                            value="medical_treatment"
                            checked={psychiatricHistory === 'medical_treatment'}
                            onChange={() => setPsychiatricHistory('medical_treatment')}
                            className="text-purple-600"
                          />
                          <span>يتلقى علاجاً طبياً</span>
                        </label>

                        <label className={`flex items-center gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          psychiatricHistory === 'followup_with_psychiatrist' 
                            ? 'bg-purple-50 border-purple-300 font-bold text-purple-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}>
                          <input
                            type="radio"
                            name="psychiatricHistory"
                            value="followup_with_psychiatrist"
                            checked={psychiatricHistory === 'followup_with_psychiatrist'}
                            onChange={() => setPsychiatricHistory('followup_with_psychiatrist')}
                            className="text-purple-600"
                          />
                          <span>متابعة مع طبيب نفسي</span>
                        </label>
                      </div>

                      {psychiatricHistory !== 'irrelevant' && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">تفاصيل التاريخ النفسي</label>
                          <input
                            type="text"
                            value={psychiatricDetails}
                            onChange={e => setPsychiatricDetails(e.target.value)}
                            placeholder="التشخيص النفسي، الأدوية النفسية الحالية، اسم الطبيب المتابع..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* 3. Special Habits */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <Sparkles size={14} className="text-amber-600" />
                        3. العادات الخاصة (Special Habits)
                      </h4>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={habits.includes('smoking')}
                            onChange={() => handleHabitToggle('smoking')}
                            className="rounded text-primary-600 w-4 h-4"
                          />
                          <span>تدخين (Smoking)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={habits.includes('alcohol')}
                            onChange={() => handleHabitToggle('alcohol')}
                            className="rounded text-primary-600 w-4 h-4"
                          />
                          <span>كحوليات (Alcohol)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={habits.includes('other')}
                            onChange={() => handleHabitToggle('other')}
                            className="rounded text-primary-600 w-4 h-4"
                          />
                          <span>عادات أخرى</span>
                        </label>
                      </div>

                      {habits.includes('other') && (
                        <div>
                          <input
                            type="text"
                            value={specialHabitsOther}
                            onChange={e => setSpecialHabitsOther(e.target.value)}
                            placeholder="تحديد العادات الأخرى..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* 4. Family Medical History */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <Users size={14} className="text-emerald-600" />
                        4. التاريخ المرضي للعائلة (Family Medical History)
                      </h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {FAMILY_HISTORY_OPTIONS.map(opt => {
                          const isChecked = familyHistory.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked 
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950' 
                                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleFamilyHistoryToggle(opt.key)}
                                className="rounded text-emerald-600 w-3.5 h-3.5"
                              />
                              <span className="truncate">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      {familyHistory.includes('Other') && (
                        <div>
                          <input
                            type="text"
                            value={familyHistoryOther}
                            onChange={e => setFamilyHistoryOther(e.target.value)}
                            placeholder="تفاصيل الأمراض الوراثية أو العائلية الأخرى..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* 5. Lab Tests */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <FlaskConical size={14} className="text-teal-600" />
                        5. الفحوصات المعملية والتحاليل الأولية (Lab Tests)
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">الهيموجلوبين (Hb)</label>
                          <input
                            type="text"
                            value={labHemoglobin}
                            onChange={e => setLabHemoglobin(e.target.value)}
                            placeholder="13.5 g/dL"
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">فصيلة الدم</label>
                          <select
                            value={labBloodGroup}
                            onChange={e => setLabBloodGroup(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                          >
                            <option value="">— اختر —</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="AB">AB</option>
                            <option value="O">O</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">عامل ريسس (RH)</label>
                          <select
                            value={labRh}
                            onChange={e => setLabRh(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                          >
                            <option value="">— اختر —</option>
                            <option value="+">+ (موجب)</option>
                            <option value="-">- (سالب)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">تحليل البول (Urine)</label>
                          <input
                            type="text"
                            value={labUrine}
                            onChange={e => setLabUrine(e.target.value)}
                            placeholder="البروتين، السكر، صديد..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 mb-1 block">تحليل البراز (Stool)</label>
                          <input
                            type="text"
                            value={labStool}
                            onChange={e => setLabStool(e.target.value)}
                            placeholder="طفيليات، دم خفي..."
                            className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* قسم التقييم الإكلينيكي / التشخيص الطبي والعلاج الموصوف */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-800 flex items-center justify-between">
                <span>
                  {examMode === 'child_under5'
                    ? 'التقييم الإكلينيكي لنمو الطفل والتشخيص الطبي (Clinical Assessment)'
                    : 'التشخيص الطبي (Clinical Diagnosis) *'}
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {examMode === 'child_under5' ? 'يُحفظ في سجل متابعة الطفل (Form 5A)' : 'مطلوب لإتمام الكشف'}
                </span>
              </label>
              <textarea
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                rows={2}
                required={examMode === 'general'}
                className="w-full border border-slate-300 rounded-2xl p-3.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm leading-relaxed"
                placeholder={
                  examMode === 'child_under5'
                    ? 'تقييم نمو الطفل، التسنين، الحركة، التغذية، أو أي ملاحظات إكلينيكية...'
                    : 'اكتب التشخيص الطبي النهائي أو المبدئي للحالة...'
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-800">
                {examMode === 'child_under5'
                  ? 'المكملات الغذائية والعلاج الموصوف والتوصيات (Prescription & Supplements)'
                  : 'الروشتة والعلاج الموصوف (Prescription & Management Plan)'}
              </label>
              <textarea
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-2xl p-3.5 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm leading-relaxed"
                placeholder={
                  examMode === 'child_under5'
                    ? 'فيتامين د، حديد، خافض حرارة، أو توصيات المتابعة القادمة...'
                    : 'الأدوية الموصوفة، الجرعات، التوصيات الطبية والمتابعة...'
                }
              />
            </div>

            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 text-xs font-bold text-indigo-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addDiagnosisAsChronic}
                  onChange={e => setAddDiagnosisAsChronic(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <span>إدراج هذا التشخيص أيضاً ضمن قائمة المشكلات الصحية المستمرة بالملف العائلي</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                يُرحّل الكشف تلقائياً لسجل متابعة الطفل والملف العائلي
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors disabled:opacity-50 text-sm text-center cursor-pointer"
            >
              إلغاء وتراجع
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3.5 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer ${
                examMode === 'child_under5' || examMode === 'child_over5'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري حفظ الكشف وتحديث الملف العائلي...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {examMode === 'child_under5'
                    ? 'حفظ فحص متابعة الطفل دون 5 سنوات وإنهاء الكشف'
                    : examMode === 'child_over5'
                    ? 'حفظ فحص السن المدرسي وإنهاء الكشف'
                    : 'إنهاء الكشف وحفظ البيانات وتحديث الملف العائلي'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {show360Modal && (
        <PatientClinical360Modal
          isOpen={show360Modal}
          onClose={() => setShow360Modal(false)}
          patient={resolvedPatient}
        />
      )}

      {showComprehensiveModal && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showComprehensiveModal}
          onClose={() => setShowComprehensiveModal(false)}
          patient={resolvedPatient}
          familyFile={operationalProfile?.familyFile || undefined}
          initialModule={examMode === 'child_under5' || examMode === 'child_over5' ? 'child' : 'history'}
          activeAppointment={appointment}
          onAppointmentCompleted={() => {
            setShowComprehensiveModal(false);
            onSaved();
            onClose();
          }}
        />
      )}
    </div>
  );
};
