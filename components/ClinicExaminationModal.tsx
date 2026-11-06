import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Activity, ChevronDown, ChevronUp, Stethoscope, 
  FileText, Shield, AlertCircle, CheckCircle2, HeartPulse, 
  FlaskConical, Loader2, Sparkles, Scale, Info, Users, User, Clock, ShieldAlert, FolderOpen,
  Baby, Syringe, Brain, Eye, Ear, HeartHandshake, Smile, Send, ArrowRight, Lock
} from 'lucide-react';
import { DB } from '../store.ts';
import { HospitalOperationalEngine, PatientOperationalProfile } from '../services/hospitalOperationalEngine.ts';
import PatientClinical360Modal from './PatientClinical360Modal.tsx';
import FamilyComprehensiveHealthRecordModal from './FamilyComprehensiveHealthRecordModal.tsx';
import { evaluateClinicalModuleEligibility } from '../services/followupSuggestions.ts';
import {
  ExamFormMode,
  EXAM_FORM_METADATA,
  resolveBookingVisitAndForm,
  getSmartOrderedExamModes
} from '../utils/clinicalBookingRouter.ts';

interface ClinicExaminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSaved: () => void;
}

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

const ALL_EXAM_MODES: { mode: ExamFormMode; shortLabel: string; badge: string }[] = [
  { mode: 'child_under5', shortLabel: 'طفل < 5 سنوات', badge: 'ف5أ/ب/ج' },
  { mode: 'child_over5', shortLabel: 'السن المدرسي 5-18', badge: 'ف5د' },
  { mode: 'maternal_anc', shortLabel: 'متابعة الحمل', badge: 'ف6أ' },
  { mode: 'maternal_postpartum', shortLabel: 'ما بعد الولادة', badge: 'ف6ب' },
  { mode: 'family_planning', shortLabel: 'تنظيم الأسرة', badge: 'ف7' },
  { mode: 'chronic_followup', shortLabel: 'أمراض مزمنة (ضغط/سكر)', badge: 'ف4أ/ب/ج' },
  { mode: 'dental', shortLabel: 'فحص الأسنان', badge: 'ف3' },
  { mode: 'premarital', shortLabel: 'فحص راغبي الزواج', badge: 'ف8أ/ب' },
  { mode: 'geriatric', shortLabel: 'تقييم المسنين', badge: 'ف9' },
  { mode: 'general', shortLabel: 'الفحص الشامل العام', badge: 'ف1' }
];

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

  const initialRoute = useMemo(
    () =>
      resolveBookingVisitAndForm(
        appointment.clinics,
        resolvedPatient,
        appointment.notes
      ),
    [appointment.clinics, resolvedPatient, appointment.notes]
  );

  const smartExamModes = useMemo(
    () => getSmartOrderedExamModes(resolvedPatient, initialRoute.examFormMode),
    [resolvedPatient, initialRoute.examFormMode]
  );

  const [examMode, setExamMode] = useState<ExamFormMode>(() => initialRoute.examFormMode);
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
  const [recordAsSignificantEvent, setRecordAsSignificantEvent] = useState(true);
  const [existingSignificantEvents, setExistingSignificantEvents] = useState<any[]>([]);

  // Section C: Complaint, Diagnosis & Prescription
  const [chiefComplaint, setChiefComplaint] = useState(
    (appointment.notes || '').replace(/\[FORM:[a-z0-9_|:]+\]\s*/gi, '').trim()
  );
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

  // ---------------------------------------------------------------------------
  // 1. Child Under-5 Specific Fields (Form 5A, 5B, 5C)
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // 2. Child Over-5 Specific Fields (Form 5D)
  // ---------------------------------------------------------------------------
  const [childEducationalStage, setChildEducationalStage] = useState('ابتدائي (Primary)');
  const [childVisionScreening, setChildVisionScreening] = useState('6/6 بالعينين - سليم');
  const [childHearingScreening, setChildHearingScreening] = useState('طبيعي وسليم');
  const [childSchoolConcerns, setChildSchoolConcerns] = useState(false);
  const [childPsychScreening, setChildPsychScreening] = useState('طبيعي - لا توجد اضطرابات سلوكية ملحوظة');

  // ---------------------------------------------------------------------------
  // 3. Maternal ANC Specific Fields (Form 6A - متابعة الحمل)
  // ---------------------------------------------------------------------------
  const [ancPregnancyOrder, setAncPregnancyOrder] = useState('1');
  const [ancLmpDate, setAncLmpDate] = useState('');
  const [ancEddDate, setAncEddDate] = useState('');
  const [ancGravida, setAncGravida] = useState('1');
  const [ancPara, setAncPara] = useState('0');
  const [ancAbortions, setAncAbortions] = useState('0');
  const [ancTetanusStatus, setAncTetanusStatus] = useState('ممنعة (جرعة مكتملة)');
  const [ancConsanguinity, setAncConsanguinity] = useState(false);
  const [ancPreviousCs, setAncPreviousCs] = useState(false);
  const [ancFundalHeight, setAncFundalHeight] = useState('');
  const [ancFetalLie, setAncFetalLie] = useState('طولي - رأسي (Cephalic)');
  const [ancFetalHeartSound, setAncFetalHeartSound] = useState('مسموع ومنتظم (140 ن/د)');
  const [ancFetalMovement, setAncFetalMovement] = useState('محسوسة وطبيعية');
  const [ancUltrasound, setAncUltrasound] = useState('جنين واحد حي - سائل أمنيوسي طبيعي');
  const [ancBloodGlucose, setAncBloodGlucose] = useState('');
  const [ancUrineAlbumin, setAncUrineAlbumin] = useState(false);
  const [ancDentalCheck, setAncDentalCheck] = useState(true);
  const [ancSupplements, setAncSupplements] = useState(true);
  const [ancNextVisitDate, setAncNextVisitDate] = useState('');

  // ---------------------------------------------------------------------------
  // 4. Maternal Postpartum Specific Fields (Form 6B - متابعة ما بعد الولادة)
  // ---------------------------------------------------------------------------
  const [ppDeliveryDate, setPpDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [ppDeliveryMode, setPpDeliveryMode] = useState('ولادة طبيعية');
  const [ppDeliveryOutcome, setPpDeliveryOutcome] = useState('طفل حي سليم');
  const [ppDeliveryPlace, setPpDeliveryPlace] = useState('مستشفى / مركز طبي');
  const [ppAttendedBy, setPpAttendedBy] = useState('طبيب');
  const [ppVisitNum, setPpVisitNum] = useState('1');
  const [ppVitaminAGiven, setPpVitaminAGiven] = useState(true);
  const [ppExclusiveBf, setPpExclusiveBf] = useState(true);
  const [ppFeedingOnDemand, setPpFeedingOnDemand] = useState(true);
  const [ppLatchPosition, setPpLatchPosition] = useState('وضع وتعلق جيد بالثدي');
  const [ppDepressionScreening, setPpDepressionScreening] = useState(true);
  const [ppSocialAdjustment, setPpSocialAdjustment] = useState(true);
  const [ppContraceptionMethod, setPpContraceptionMethod] = useState('حبيبات أحادية الهرمون للرضاعة');

  // ---------------------------------------------------------------------------
  // 5. Family Planning Specific Fields (Form 7 - تنظيم الأسرة)
  // ---------------------------------------------------------------------------
  const [fpVisitReason, setFpVisitReason] = useState('حصول على وسيلة / متابعة وسيلة');
  const [fpCurrentMethod, setFpCurrentMethod] = useState('لولب نحاسي (IUD)');
  const [fpMethodDuration, setFpMethodDuration] = useState('6 شهور');
  const [fpSideEffects, setFpSideEffects] = useState('لا توجد أعراض جانبية');
  const [fpMenstrualRegularity, setFpMenstrualRegularity] = useState('منتظمة');
  const [fpMenstrualAmount, setFpMenstrualAmount] = useState('متوسطة');
  const [fpDysmenorrhea, setFpDysmenorrhea] = useState(false);
  const [fpPelvicExam, setFpPelvicExam] = useState('طبيعي - لا توجد قرح أو التهابات');
  const [fpUterinePosition, setFpUterinePosition] = useState('أمامي الانقلاب وحجم طبيعي (Anteverted / Normal)');
  const [fpCervixAppearance, setFpCervixAppearance] = useState('سليم وطبيعي (Normal)');
  const [fpBreastSelfExamTaught, setFpBreastSelfExamTaught] = useState(true);
  const [fpNewMethodPrescribed, setFpNewMethodPrescribed] = useState('استمرار على الوسيلة الحالية');
  const [fpNextVisitDate, setFpNextVisitDate] = useState('');

  // ---------------------------------------------------------------------------
  // 6. Chronic Disease Follow-up Specific Fields (Form 4A HTN / 4B DM / 4C Other)
  // ---------------------------------------------------------------------------
  const [chronicSubForm, setChronicSubForm] = useState<'f4a_htn' | 'f4b_dm' | 'f4c_other'>('f4a_htn');
  const [chronicStandingBp, setChronicStandingBp] = useState('');
  const [chronicFbs, setChronicFbs] = useState('');
  const [chronicHba1c, setChronicHba1c] = useState('');
  const [chronicCreatinineEgfr, setChronicCreatinineEgfr] = useState('');
  const [chronicTotalCholesterol, setChronicTotalCholesterol] = useState('');
  const [chronicFundusExam, setChronicFundusExam] = useState('سليم');
  const [chronicFootExam, setChronicFootExam] = useState('سليم - النبض الطرفي والإحساس طبيعي');
  const [chronicControlStatus, setChronicControlStatus] = useState('منضبط (Controlled)');
  const [chronicMedAdherence, setChronicMedAdherence] = useState(true);
  const [chronicComplications, setChronicComplications] = useState('لا توجد مضاعفات بالأعضاء المستهدفة');
  const [chronicNextInvestigationDue, setChronicNextInvestigationDue] = useState('');

  // ---------------------------------------------------------------------------
  // 7. Dental Assessment Specific Fields (Form 3 - فحص وعلاج الأسنان)
  // ---------------------------------------------------------------------------
  const [dentalLocationType, setDentalLocationType] = useState('حضر (Urban)');
  const [dentalExtraOralCode, setDentalExtraOralCode] = useState('0');
  const [dentalTmjClicking, setDentalTmjClicking] = useState(false);
  const [dentalTmjTenderness, setDentalTmjTenderness] = useState(false);
  const [dentalOralMucosaCode, setDentalOralMucosaCode] = useState('0');
  const [dentalCpiCode, setDentalCpiCode] = useState('0');
  const [dentalFluorosisCode, setDentalFluorosisCode] = useState('0');
  const [dentalOcclusionClass, setDentalOcclusionClass] = useState('Class I');
  const [dentalDmftDecayed, setDentalDmftDecayed] = useState('0');
  const [dentalDmftMissing, setDentalDmftMissing] = useState('0');
  const [dentalDmftFilled, setDentalDmftFilled] = useState('0');

  // ---------------------------------------------------------------------------
  // 8. Premarital Screening Specific Fields (Form 8A / 8B - فحص راغبي الزواج)
  // ---------------------------------------------------------------------------
  const [pmPartnerName, setPmPartnerName] = useState('');
  const [pmPartnerNationalId, setPmPartnerNationalId] = useState('');
  const [pmConsanguinity, setPmConsanguinity] = useState(false);
  const [pmInfectiousHistory, setPmInfectiousHistory] = useState('سلبي (HCV / HBV / HIV Negative)');
  const [pmHereditaryHistory, setPmHereditaryHistory] = useState('لا توجد أمراض وراثية عائلية مسجلة');
  const [pmFbs, setPmFbs] = useState('90');
  const [pmChestXray, setPmChestXray] = useState('سليمة وطبيعية');
  const [pmHbElectrophoresis, setPmHbElectrophoresis] = useState(true);
  const [pmGeneticCounseling, setPmGeneticCounseling] = useState(true);
  const [pmMutualConsent, setPmMutualConsent] = useState(true);
  const [pmCertNumber, setPmCertNumber] = useState('');

  // ---------------------------------------------------------------------------
  // 9. Geriatric Assessment Specific Fields (Form 9 - تقييم المسنين الشامل)
  // ---------------------------------------------------------------------------
  const [gerWeightLoss, setGerWeightLoss] = useState(false);
  const [gerWeakness, setGerWeakness] = useState(false);
  const [gerPoorEndurance, setGerPoorEndurance] = useState(false);
  const [gerSlowness, setGerSlowness] = useState(false);
  const [gerInactivity, setGerInactivity] = useState(false);
  const [gerBasicAdls, setGerBasicAdls] = useState('مستقل تماماً في الأنشطة الأساسية (6/6)');
  const [gerInstrumentalAdls, setGerInstrumentalAdls] = useState('مستقل في الأنشطة الفعالة');
  const [gerMoodAssessment, setGerMoodAssessment] = useState('مزاج مستقر - لا توجد علامات اكتئاب');
  const [gerTimedUpAndGo, setGerTimedUpAndGo] = useState('طبيعي (< 12 ثانية) - خطر سقوط منخفض');
  const [gerVisionHearingIncontinence, setGerVisionHearingIncontinence] = useState('الرؤية والسمع مقبولان - لا يوجد سلس بول');
  const [gerOsteoporosisScreening, setGerOsteoporosisScreening] = useState(true);
  const [gerCancerScreening, setGerCancerScreening] = useState('تم الفحص الدوري والتوعية');
  const [gerImmunizations, setGerImmunizations] = useState('تطعيم الإنفلونزا الموسمية والمكورات الرئوية');
  const [gerMiniCogScore, setGerMiniCogScore] = useState('5');

  // ---------------------------------------------------------------------------
  // 10. Referral Form (Form 10A - نموذج الإحالة لمستشفى / استشاري)
  // ---------------------------------------------------------------------------
  const [includeReferralForm10A, setIncludeReferralForm10A] = useState(false);
  const [refTargetFacility, setRefTargetFacility] = useState('المستشفى التخصصي / العام');
  const [refSpecialty, setRefSpecialty] = useState('استشاري تخصصي');
  const [refUrgency, setRefUrgency] = useState<'ROUTINE' | 'URGENT' | 'EMERGENCY'>('ROUTINE');
  const [refReason, setRefReason] = useState('');

  // Section B: Relevant History (Form 1)
  const [hospitalization, setHospitalization] = useState('');
  const [previousOperations, setPreviousOperations] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [traumaInjuries, setTraumaInjuries] = useState('');
  const [allergy, setAllergy] = useState('');
  const [adverseDrugReactions, setAdverseDrugReactions] = useState('');
  const [abuseNegligence, setAbuseNegligence] = useState('');
  const [otherHistory, setOtherHistory] = useState('');
  const [psychiatricHistory, setPsychiatricHistory] = useState('irrelevant');
  const [psychiatricDetails, setPsychiatricDetails] = useState('');
  const [habits, setHabits] = useState<string[]>([]);
  const [specialHabitsOther, setSpecialHabitsOther] = useState('');
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

  // Auto-calculate EDD when LMP changes in Maternal ANC (Form 6A)
  const handleLmpChange = (lmpVal: string) => {
    setAncLmpDate(lmpVal);
    if (lmpVal) {
      const d = new Date(lmpVal);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 280); // 40 weeks
        setAncEddDate(d.toISOString().split('T')[0]);
      }
    }
  };

  // Sync calculated age in months and auto-detect mode once full patient object is resolved
  useEffect(() => {
    if (patientAgeInfo.ageMonths !== null && !childAgeMonths) {
      setChildAgeMonths(String(patientAgeInfo.ageMonths));
      if (patientAgeInfo.ageMonths >= 6) {
        setChildWeaningStarted(true);
      }
    }
    if (!userManuallySwitchedMode) {
      const resolved = resolveBookingVisitAndForm(
        appointment.clinics,
        resolvedPatient,
        appointment.notes
      );
      setExamMode(resolved.examFormMode);
      if (resolved.chronicSubType === 'diabetes') setChronicSubForm('f4b_dm');
      else if (resolved.chronicSubType === 'hypertension') setChronicSubForm('f4a_htn');
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

          if (existing.significant_events) {
            try {
              const parsedSig =
                typeof existing.significant_events === 'string'
                  ? JSON.parse(existing.significant_events)
                  : existing.significant_events;
              if (Array.isArray(parsedSig)) {
                setExistingSignificantEvents(parsedSig);
              }
            } catch {
              // ignore parse error
            }
          }

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

  const activeRouteMeta = useMemo(
    () => resolveBookingVisitAndForm(appointment.clinics, resolvedPatient, appointment.notes, examMode),
    [appointment.clinics, resolvedPatient, appointment.notes, examMode]
  );

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

    // Build default clinical diagnosis summary based on the active form mode if doctor left diagnosis blank
    const defaultDiagByMode: Record<ExamFormMode, string> = {
      child_under5: `متابعة نمو وتطعيمات الطفل (عمر ${childAgeMonths || 0} شهر) - ${
        milestoneGrossMotor && milestoneFineMotor && milestoneHearingSpeech && milestoneSocial
          ? 'نمو حركي وتطوري مناسب للعمر'
          : 'يحتاج متابعة للتطور النمائي'
      }`,
      child_over5: `فحص دوري للسن المدرسي (${childEducationalStage}) - إبصار: ${childVisionScreening}`,
      maternal_anc: `متابعة حمل دورية (G${ancGravida} P${ancPara}) - ${ancFetalHeartSound}`,
      maternal_postpartum: `متابعة نفاس وما بعد الولادة (الزيارة ${ppVisitNum}) - ${ppDeliveryMode}`,
      family_planning: `متابعة تنظيم الأسرة (${fpVisitReason}) - الوسيلة: ${fpCurrentMethod}`,
      chronic_followup:
        chronicSubForm === 'f4a_htn'
          ? `متابعة ضغط الدم المزمن (${chronicControlStatus}) - BP: ${vitalBp || 'مسجل'}`
          : chronicSubForm === 'f4b_dm'
          ? `متابعة مرض السكر (${chronicControlStatus}) - HbA1c: ${chronicHba1c || '—'}%`
          : `متابعة مرض مزمن (${chronicControlStatus})`,
      dental: `فحص وعلاج الأسنان (DMFT: D=${dentalDmftDecayed}, M=${dentalDmftMissing}, F=${dentalDmftFilled})`,
      premarital: `فحص ومشورة المقبلين على الزواج (${
        patientAgeInfo.normalizedGender === 'female' ? 'ف8ب - الزوجة' : 'ف8أ - الزوج'
      })`,
      geriatric: `تقييم شامل للمسنين (Mini-Cog: ${gerMiniCogScore}/5 - ${gerBasicAdls})`,
      general: ''
    };

    const effectiveDiagnosis = diagnosis.trim() || defaultDiagByMode[examMode];

    if (!effectiveDiagnosis) {
      setErrorMessage('يرجى كتابة التقييم الإكلينيكي / التشخيص الطبي للكشف.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const todayDate = new Date().toISOString().split('T')[0];
    const doctorName = appointment.doctors?.name || appointment.doctor_name || 'طبيب العيادة';
    const clinicName = appointment.clinics?.name || 'العيادة الخارجية';

    // Build clinical exam summary & investigations summary for Form 2B (نموذج التردد)
    const examSummaryParts: string[] = [];
    if (vitalBp) examSummaryParts.push(`ضغط: ${vitalBp}`);
    if (vitalPulse) examSummaryParts.push(`نبض: ${vitalPulse}`);
    if (vitalTemp) examSummaryParts.push(`حرارة: ${vitalTemp}`);
    if (vitalWeight) examSummaryParts.push(`وزن: ${vitalWeight} كجم`);
    if (vitalHeight) examSummaryParts.push(`طول: ${vitalHeight} سم`);
    if (computedBmi) examSummaryParts.push(`BMI: ${computedBmi}`);
    if (examMode === 'child_under5' && childHeadCirc) examSummaryParts.push(`محيط الرأس: ${childHeadCirc} سم`);
    if (examMode === 'maternal_anc' && ancFundalHeight) examSummaryParts.push(`ارتفاع الرحم: ${ancFundalHeight} سم`);
    if (examMode === 'dental') examSummaryParts.push(`DMFT: D${dentalDmftDecayed}/M${dentalDmftMissing}/F${dentalDmftFilled}`);

    const investigationsParts: string[] = [];
    if (labHemoglobin) investigationsParts.push(`Hb: ${labHemoglobin}`);
    if (labBloodGroup) investigationsParts.push(`فصيلة: ${labBloodGroup}${labRh || ''}`);
    if (labUrine) investigationsParts.push(`بول: ${labUrine}`);
    if (labStool) investigationsParts.push(`براز: ${labStool}`);
    if (examMode === 'chronic_followup') {
      if (chronicFbs) investigationsParts.push(`سكر صائم: ${chronicFbs}`);
      if (chronicHba1c) investigationsParts.push(`HbA1c: ${chronicHba1c}%`);
      if (chronicCreatinineEgfr) investigationsParts.push(`كلى: ${chronicCreatinineEgfr}`);
    }
    if (examMode === 'maternal_anc') {
      if (ancBloodGlucose) investigationsParts.push(`سكر: ${ancBloodGlucose}`);
      if (ancUltrasound) investigationsParts.push(`سونار: ${ancUltrasound}`);
    }

    const clinicalFindingsObj: Record<string, any> = {
      exam_form_mode: examMode,
      form_code_badge: activeRouteMeta.formCodeBadge,
      visit_code: activeRouteMeta.visitCode,
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

    // Build updated Significant Events array for Form 2A (ملخص الأحداث الطبية الهامة)
    const updatedSignificantEvents = [...existingSignificantEvents.filter((ev: any) => ev && ev.description)];
    if (recordAsSignificantEvent || addDiagnosisAsChronic || includeReferralForm10A) {
      const eventDesc = `[${activeRouteMeta.formCodeBadge}] ${effectiveDiagnosis}${
        prescription.trim() ? ` — العلاج/الإجراء: ${prescription.trim()}` : ''
      }${includeReferralForm10A ? ` (تمت إحالة الحالة ف10أ إلى: ${refTargetFacility})` : ''}`;

      const alreadyRecordedToday = updatedSignificantEvents.some(
        (ev: any) => ev.date === todayDate && ev.description === eventDesc
      );
      if (!alreadyRecordedToday) {
        updatedSignificantEvents.unshift({
          id: `sig_${Date.now()}`,
          date: todayDate,
          description: eventDesc,
          doctor: `د/ ${doctorName}`
        });
      }
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
      clinical_findings: JSON.stringify(clinicalFindingsObj),
      significant_events: JSON.stringify(updatedSignificantEvents)
    };

    try {
      // =========================================================================
      // مسار (1): حفظ بيانات النموذج التخصصي في الجدول المعتمد المقابل (ف1 إلى ف10)
      // =========================================================================
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
      } else if (examMode === 'child_over5') {
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
      } else if (examMode === 'maternal_anc') {
        await DB.addAccreditationRecord('maternal_antenatal_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          pregnancy_order: Number(ancPregnancyOrder) || 1,
          lmp_date: ancLmpDate || null,
          edd_date: ancEddDate || null,
          blood_type_rh: labBloodGroup ? `${labBloodGroup}${labRh || '+'}` : null,
          tetanus_status: ancTetanusStatus || null,
          consanguinity: ancConsanguinity,
          gravida: Number(ancGravida) || 1,
          para: Number(ancPara) || 0,
          abortions: Number(ancAbortions) || 0,
          previous_cs: ancPreviousCs,
          fundal_height_cm: ancFundalHeight ? Number(ancFundalHeight) : null,
          fetal_lie: ancFetalLie || null,
          fetal_heart_sound: ancFetalHeartSound || null,
          fetal_movement: ancFetalMovement || null,
          ultrasound_findings: ancUltrasound.trim() || null,
          hb_result: labHemoglobin ? Number(labHemoglobin) : null,
          blood_glucose: ancBloodGlucose ? Number(ancBloodGlucose) : null,
          urine_albumin: ancUrineAlbumin,
          dental_check_done: ancDentalCheck,
          supplements_prescribed: ancSupplements,
          complications_concerns: effectiveDiagnosis,
          health_education_given: prescription.trim() || 'التغذية الصحية أثناء الحمل وعلامات الخطر',
          next_visit_date: ancNextVisitDate || null,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'maternal_postpartum') {
        await DB.addAccreditationRecord('maternal_postpartum_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          delivery_date: ppDeliveryDate || todayDate,
          delivery_mode: ppDeliveryMode,
          delivery_outcome: ppDeliveryOutcome,
          vitamin_a_given: ppVitaminAGiven,
          delivery_place: ppDeliveryPlace,
          attended_by: ppAttendedBy,
          postpartum_visit_num: Number(ppVisitNum) || 1,
          exclusive_breastfeeding: ppExclusiveBf,
          feeding_on_demand: ppFeedingOnDemand,
          breastfeeding_position_latch: ppLatchPosition,
          depression_screening_done: ppDepressionScreening,
          social_adjustment_ok: ppSocialAdjustment,
          maternal_concerns: effectiveDiagnosis,
          health_education_topics: prescription.trim() || 'رعاية الأم والمولود والرضاعة الطبيعية',
          contraception_method: ppContraceptionMethod || null,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'family_planning') {
        await DB.addAccreditationRecord('family_planning_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          visit_reason: fpVisitReason,
          current_method: fpCurrentMethod,
          method_duration: fpMethodDuration,
          side_effects: fpSideEffects,
          menstrual_regularity: fpMenstrualRegularity,
          menstrual_amount: fpMenstrualAmount,
          dysmenorrhea: fpDysmenorrhea,
          pelvic_exam_inspection: fpPelvicExam,
          uterine_position_size: fpUterinePosition,
          cervix_appearance: fpCervixAppearance,
          breast_self_exam_taught: fpBreastSelfExamTaught,
          new_method_prescribed: fpNewMethodPrescribed,
          next_visit_date: fpNextVisitDate || null,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'chronic_followup') {
        await DB.addAccreditationRecord('chronic_disease_followups', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          diagnosis: effectiveDiagnosis,
          disease_discovery_date: todayDate,
          control_status: chronicControlStatus,
          complications_notes: `${chronicComplications}${
            chronicSubForm === 'f4a_htn' && chronicStandingBp ? ` | ضغط وقوف: ${chronicStandingBp}` : ''
          }${
            chronicSubForm === 'f4b_dm'
              ? ` | قاع العين: ${chronicFundusExam} | فحص القدم: ${chronicFootExam}`
              : ''
          }`,
          medications_adherence: chronicMedAdherence,
          next_investigation_due: chronicNextInvestigationDue || null,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'dental') {
        await DB.addAccreditationRecord('dental_assessments', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          location_type: dentalLocationType,
          extra_oral_exam_code: Number(dentalExtraOralCode) || 0,
          tmj_clicking: dentalTmjClicking,
          tmj_tenderness: dentalTmjTenderness,
          oral_mucosa_condition: Number(dentalOralMucosaCode) || 0,
          periodontal_index_cpi: Number(dentalCpiCode) || 0,
          fluorosis_index: Number(dentalFluorosisCode) || 0,
          occlusion_class: dentalOcclusionClass,
          dmft_decayed: Number(dentalDmftDecayed) || 0,
          dmft_missing: Number(dentalDmftMissing) || 0,
          dmft_filled: Number(dentalDmftFilled) || 0,
          treatment_plan: prescription.trim() || effectiveDiagnosis,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'premarital') {
        await DB.addAccreditationRecord('premarital_assessments', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          partner_name: pmPartnerName.trim() || null,
          partner_national_id: pmPartnerNationalId.trim() || null,
          consanguinity_with_partner: pmConsanguinity,
          infectious_disease_history: pmInfectiousHistory.trim() || null,
          hereditary_disease_history: pmHereditaryHistory.trim() || null,
          fasting_blood_sugar: pmFbs ? Number(pmFbs) : null,
          cbc_summary: labHemoglobin ? `Hb: ${labHemoglobin}` : 'سليم',
          rh_factor: labRh || '+',
          chest_xray_result: pmChestXray.trim() || null,
          hb_electrophoresis_done: pmHbElectrophoresis,
          genetic_counseling_given: pmGeneticCounseling,
          certificate_number: pmCertNumber.trim() || null,
          certificate_status: 'لائق طبياً - تم استلام المشورة',
          mutual_consent_signed: pmMutualConsent,
          doctor_signature: doctorName || null
        });
      } else if (examMode === 'geriatric') {
        await DB.addAccreditationRecord('geriatric_assessments', {
          patient_id: appointment.patient_id,
          appointment_id: appointment.id,
          weight_loss: gerWeightLoss,
          weakness_reported: gerWeakness,
          poor_endurance: gerPoorEndurance,
          slowness_reported: gerSlowness,
          inactivity_reported: gerInactivity,
          basic_adls_score: gerBasicAdls,
          instrumental_adls_score: gerInstrumentalAdls,
          depression_mood_assessment: gerMoodAssessment,
          fall_risk_timed_up_go: gerTimedUpAndGo,
          vision_hearing_incontinence: gerVisionHearingIncontinence,
          osteoporosis_screening: gerOsteoporosisScreening,
          cancer_screening_colorectal_prostate_breast: gerCancerScreening,
          immunizations_flu_pneumo: gerImmunizations,
          mini_cog_score: Number(gerMiniCogScore) || 5,
          management_plan: prescription.trim() || effectiveDiagnosis,
          doctor_signature: doctorName || null
        });
      }

      // 1b. If Referral Form 10A (نموذج الإحالة ف10أ) is checked, save to patient_referrals
      if (includeReferralForm10A) {
        await DB.addAccreditationRecord('patient_referrals', {
          patient_id: appointment.patient_id,
          referral_reason: refReason.trim() || effectiveDiagnosis,
          provisional_diagnosis: effectiveDiagnosis,
          specialty_requested: refSpecialty.trim() || 'استشاري تخصصي',
          target_facility_name: refTargetFacility.trim() || 'المستشفى العام',
          urgency: refUrgency,
          referral_date: todayDate,
          status: 'PENDING'
        });
      }

      // =========================================================================
      // مسار (2): حفظ الفحص العام وتحديث ملخص الأحداث الطبية الهامة (نموذج ف1 + ف2أ)
      // =========================================================================
      await DB.saveClinicPhysicalExam(examRecord);

      // 3. Update clinic appointment status, diagnosis, and prescription
      await DB.updateAppointmentStatus(
        appointment.id,
        'COMPLETED',
        effectiveDiagnosis,
        prescription.trim()
      );

      // =========================================================================
      // مسار (3): الترحيل التلقائي إلى نموذج التردد (ف2ب) والتاريخ المرضي للأسرة
      // =========================================================================
      await HospitalOperationalEngine.syncClinicalEventToFamilyFile({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        event_type: 'CLINIC_EXAM',
        date: todayDate,
        visit_code: activeRouteMeta.visitCode,
        visit_type: activeRouteMeta.visitTypeLabel,
        clinic_name: clinicName,
        doctor_or_staff: doctorName ? `د/ ${doctorName} (${clinicName})` : clinicName,
        complaint_or_reason: chiefComplaint.trim() || activeRouteMeta.formTitle,
        clinical_exam_summary: examSummaryParts.join(' | ') || generalAppearance.trim() || 'فحص سريري مكتمل',
        investigations_summary: investigationsParts.join(' | ') || null,
        diagnosis_or_summary: `[${activeRouteMeta.formCodeBadge}] ${effectiveDiagnosis}`,
        treatment_or_medications: prescription.trim() || 'تم التوثيق والمتابعة بالملف العائلي',
        new_chronic_condition:
          addDiagnosisAsChronic || examMode === 'chronic_followup' ? effectiveDiagnosis : undefined
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
    <div className="fixed inset-0 z-50 bg-slate-50 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-200" dir="rtl">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden">
        
        {/* Full-Page Header */}
        <div className={`px-6 py-4 text-white flex flex-wrap justify-between items-center gap-4 shrink-0 shadow-md ${
          examMode === 'child_under5' || examMode === 'child_over5'
            ? 'bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900'
            : examMode === 'maternal_anc' || examMode === 'maternal_postpartum' || examMode === 'family_planning'
            ? 'bg-gradient-to-r from-rose-800 via-pink-800 to-rose-900'
            : examMode === 'dental'
            ? 'bg-gradient-to-r from-sky-800 via-cyan-800 to-sky-900'
            : 'bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950'
        }`}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all border border-white/20 cursor-pointer shrink-0"
              title="العودة لقائمة العيادات"
            >
              <ArrowRight size={17} />
              <span>العودة للعيادات</span>
            </button>

            <div className="p-3 bg-white/15 rounded-2xl shrink-0 hidden sm:flex">
              {examMode === 'child_under5' || examMode === 'child_over5' ? (
                <Baby size={24} />
              ) : examMode === 'maternal_anc' || examMode === 'maternal_postpartum' || examMode === 'family_planning' ? (
                <HeartHandshake size={24} />
              ) : examMode === 'dental' ? (
                <Smile size={24} />
              ) : (
                <Stethoscope size={24} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-base sm:text-xl">
                  {activeRouteMeta.formTitle}
                </h3>
                <span className="px-2.5 py-0.5 bg-white/20 rounded-lg text-[11px] font-black">
                  {activeRouteMeta.formCodeBadge}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-400/25 border border-emerald-300/40 rounded-lg text-[11px] font-black font-mono">
                  كود التردد (ف2ب): {activeRouteMeta.visitCode} - {activeRouteMeta.visitTypeLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-90 mt-1.5 font-mono tabular-nums">
                <span className="font-bold flex items-center gap-1 font-sans">
                  <User size={13} /> {resolvedPatient?.name || appointment.patients?.name || 'مريض'}
                </span>
                {patientAgeInfo.ageMonths !== null && patientAgeInfo.ageMonths < 60 && (
                  <>
                    <span>·</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-black">
                      العمر: {patientAgeInfo.ageMonths} شهر
                    </span>
                  </>
                )}
                {patientAgeInfo.ageYears !== null && patientAgeInfo.ageYears >= 5 && (
                  <>
                    <span>·</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-md font-black">
                      العمر: {patientAgeInfo.ageYears} سنة
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="font-sans">د/ {appointment.doctors?.name || '---'} ({appointment.clinics?.name || 'العيادة'})</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {appointment.date} | {appointment.time}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComprehensiveModal(true)}
              className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <FolderOpen size={15} />
              <span>السجل الصحي التراكمي الكامل</span>
            </button>
            <button 
              onClick={onClose} 
              disabled={saving}
              className="p-2 hover:bg-white/15 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              title="إغلاق"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Examination Form Mode Selector Bar (Smart Filtered by Patient Age/Gender & Booked Clinic) */}
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex flex-col gap-2 shrink-0 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0 ml-1">
              النماذج المتاحة للمريض ({smartExamModes.eligibleModes.length}):
            </span>

            {smartExamModes.eligibleModes.map(item => {
              const isSelected = examMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setExamMode(item.mode);
                    setUserManuallySwitchedMode(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-indigo-700 text-white shadow-xs ring-2 ring-indigo-300'
                      : item.isBookedClinicForm
                      ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border-2 border-emerald-400'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : item.isBookedClinicForm
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}>
                    {item.badge}
                  </span>
                  <span>{item.shortLabel}</span>
                  {item.isBookedClinicForm && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950'
                        : 'bg-emerald-200/80 text-emerald-950'
                    }`}>
                      نموذج العيادة المحجوزة
                    </span>
                  )}
                </button>
              );
            })}

            {smartExamModes.ineligibleModes.length > 0 && (
              <>
                <div className="h-6 w-[1px] bg-slate-300 mx-1 shrink-0" />
                <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                  <Lock size={11} />
                  <span>نماذج غير متوافقة مع عمر/نوع المريض:</span>
                </span>
                {smartExamModes.ineligibleModes.map(item => (
                  <button
                    key={item.mode}
                    type="button"
                    disabled
                    title={item.detailedReason}
                    className="px-2.5 py-1 rounded-xl text-right bg-slate-100/70 text-slate-400 border border-dashed border-slate-200 opacity-60 cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap shrink-0 select-none"
                  >
                    <Lock size={12} className="text-slate-400 shrink-0" />
                    <div className="flex flex-col leading-tight">
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.1 rounded text-[9px] font-mono bg-slate-200/70 text-slate-500">
                          {item.badge}
                        </span>
                        <span className="text-[11px] font-bold line-through decoration-slate-300">
                          {item.shortLabel}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-rose-500/90">
                        مغلق: {item.shortLockReason}
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Full-Page Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          <div className="max-w-7xl mx-auto space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
          
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
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-bold">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              جاري مراجعة السجلات الطبية السابقة للمريض...
            </div>
          )}

          {/* شريط التنبيهات الفورية من الملف العائلي */}
          {operationalProfile && (
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <FolderOpen size={15} className="text-indigo-600" />
                    الربط مع الملف العائلي:
                  </span>
                  {operationalProfile.familyFile ? (
                    <span className="font-bold font-mono text-indigo-800">
                      {operationalProfile.familyFile.file_code} ({operationalProfile.memberRole || 'فرد أسرة'})
                    </span>
                  ) : (
                    <span className="font-bold text-amber-800">
                      سجل فردي (يُرحّل لسجل الزيارات والأحداث الهامة للمريض)
                    </span>
                  )}
                  <span>·</span>
                  <span className="font-bold text-slate-700">
                    {operationalProfile.billingEligibility.badgeText}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShow360Modal(true)}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <User size={13} className="text-indigo-600" />
                  بطاقة المريض الشاملة
                </button>
              </div>

              {(operationalProfile.hasAllergyAlert || operationalProfile.chronicProblems.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  {operationalProfile.hasAllergyAlert && (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg font-black flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-rose-700" />
                      تنبيه حساسية: {[...operationalProfile.drugReactions, ...operationalProfile.allergies].join(' ، ')}
                    </span>
                  )}
                  {operationalProfile.chronicProblems.map((prob, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold"
                    >
                      مرض مزمن مسجل: {prob.diagnosis_description}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (1): نموذج متابعة الطفل تحت 5 سنوات (ف5أ + ف5ب/ج) */}
          {/* ========================================================================= */}
          {examMode === 'child_under5' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                    <Baby size={18} className="text-emerald-600" />
                    <span>1. قياسات النمو البدني والمؤشرات الحيوية للطفل (تحت 5 سنوات)</span>
                  </div>
                  <span className="text-[11px] font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                    نموذج ف5أ — متابعة الطفل
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono tabular-nums transition-all cursor-pointer ${
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

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums">
                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block font-sans">
                      العمر بالشهور <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      required
                      value={childAgeMonths}
                      onChange={e => setChildAgeMonths(e.target.value)}
                      placeholder="6"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block font-sans">
                      الوزن (كجم) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vitalWeight}
                      onChange={e => setVitalWeight(e.target.value)}
                      placeholder="7.5"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block font-sans">
                      الطول (سم) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={vitalHeight}
                      onChange={e => setVitalHeight(e.target.value)}
                      placeholder="68"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-700 mb-1 block font-sans">
                      محيط الرأس (سم)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={childHeadCirc}
                      onChange={e => setChildHeadCirc(e.target.value)}
                      placeholder="42"
                      className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-black text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block font-sans">
                      الحرارة (°C)
                    </label>
                    <input
                      type="text"
                      value={vitalTemp}
                      onChange={e => setVitalTemp(e.target.value)}
                      placeholder="37.0"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block font-sans">
                      الهيموجلوبين Hb
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={labHemoglobin}
                      onChange={e => setLabHemoglobin(e.target.value)}
                      placeholder="11.5"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. الرضاعة والتغذية + التطعيمات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
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
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white outline-none"
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

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
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
                  <input
                    type="text"
                    value={childOtherVaccines}
                    onChange={e => setChildOtherVaccines(e.target.value)}
                    placeholder="تطعيمات إضافية أو ملاحظات حول جدول التطعيم..."
                    className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* 4. فحص التطور النمائي والحركي للطفل (ف5ب / ف5ج) */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Brain size={15} className="text-indigo-600" />
                    <span>4. فحص علامات تطور الطفل (Developmental Milestones)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    نموذج ف5ب / ف5ج
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-bold">
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
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
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
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
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                    milestoneHearingSpeech ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950' : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <input
                      type="checkbox"
                      checked={milestoneHearingSpeech}
                      onChange={e => setMilestoneHearingSpeech(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>السمع والنطق سليم</span>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
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
                      شكوى أو مخاوف الوالدين (Parental Concern)
                    </label>
                    <input
                      type="text"
                      value={childParentalConcerns}
                      onChange={e => setChildParentalConcerns(e.target.value)}
                      placeholder="ملاحظات الأم حول الشهية، النوم، التسنين، الحركة..."
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-slate-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      التثقيف الصحي المقدم للأم (Health Education)
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
          {/* وضع (2): نموذج متابعة الطفل فوق 5 سنوات — السن المدرسي (ف5د) */}
          {/* ========================================================================= */}
          {examMode === 'child_over5' && (
            <div className="bg-teal-50/60 p-5 rounded-2xl border border-teal-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                <div className="flex items-center gap-2 text-teal-950 font-black text-sm">
                  <Users size={18} className="text-teal-600" />
                  <span>نموذج متابعة الطفل فوق 5 سنوات — السن المدرسي (5 - 18 سنة)</span>
                </div>
                <span className="text-[11px] font-black text-teal-800 bg-white px-2.5 py-1 rounded-lg border border-teal-200">
                  نموذج ف5د
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
                    <option value="حضانة (Nursery)">حضانة (Nursery)</option>
                    <option value="فرقة أولى ابتدائي (Primary 1)">فرقة أولى ابتدائي (Primary 1)</option>
                    <option value="فرقة ثانية ابتدائي (Primary 2)">فرقة ثانية ابتدائي (Primary 2)</option>
                    <option value="فرقة رابعة ابتدائي (Primary 4)">فرقة رابعة ابتدائي (Primary 4)</option>
                    <option value="أولى إعدادي (Preparatory 1)">أولى إعدادي (Preparatory 1)</option>
                    <option value="أولى ثانوي (Secondary 1)">أولى ثانوي (Secondary 1)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوزن (كجم)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalWeight}
                    onChange={e => setVitalWeight(e.target.value)}
                    placeholder="28"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الطول (سم)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={vitalHeight}
                    onChange={e => setVitalHeight(e.target.value)}
                    placeholder="125"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مؤشر كتلة الجسم (BMI)</label>
                  <input
                    type="text"
                    readOnly
                    value={computedBmi ? `${computedBmi} kg/m²` : 'يُحسب تلقائياً'}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-700 font-mono tabular-nums"
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
                  <label className="block mb-1 text-slate-700">الهيموجلوبين Hb (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labHemoglobin}
                    onChange={e => setLabHemoglobin(e.target.value)}
                    placeholder="12.5"
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
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
                  <span>توجد صعوبات تعلم أو تأخر في التحصيل الدراسي (School Achievement)</span>
                </label>
                <div>
                  <input
                    type="text"
                    value={childPsychScreening}
                    onChange={e => setChildPsychScreening(e.target.value)}
                    placeholder="المسح النفسي والسلوكي (Psychiatric Disorders Screening)..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (3): نموذج متابعة الحمل (ف6أ - Antenatal Care) */}
          {/* ========================================================================= */}
          {examMode === 'maternal_anc' && (
            <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                  <HeartHandshake size={18} className="text-rose-600" />
                  <span>نموذج متابعة الحمل (Antenatal Care — ف6أ)</span>
                </div>
                <span className="text-[11px] font-black text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                  نموذج ف6أ
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">ترتيب الحمل</label>
                  <input
                    type="number"
                    value={ancPregnancyOrder}
                    onChange={e => setAncPregnancyOrder(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">بداية آخر دورة (LMP)</label>
                  <input
                    type="date"
                    value={ancLmpDate}
                    onChange={e => handleLmpChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تاريخ الولادة المتوقع (EDD)</label>
                  <input
                    type="date"
                    value={ancEddDate}
                    onChange={e => setAncEddDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مرات الحمل (Gravida)</label>
                  <input
                    type="number"
                    value={ancGravida}
                    onChange={e => setAncGravida(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مرات الولادة (Para)</label>
                  <input
                    type="number"
                    value={ancPara}
                    onChange={e => setAncPara(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الإجهاض (Abortions)</label>
                  <input
                    type="number"
                    value={ancAbortions}
                    onChange={e => setAncAbortions(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">ضغط الدم (BP)</label>
                  <input
                    type="text"
                    value={vitalBp}
                    onChange={e => setVitalBp(e.target.value)}
                    placeholder="110/70"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوزن (كجم)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalWeight}
                    onChange={e => setVitalWeight(e.target.value)}
                    placeholder="68"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مستوى قاع الرحم (سم)</label>
                  <input
                    type="number"
                    value={ancFundalHeight}
                    onChange={e => setAncFundalHeight(e.target.value)}
                    placeholder="24"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">حالة التطعيم للتيتانوس</label>
                  <select
                    value={ancTetanusStatus}
                    onChange={e => setAncTetanusStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="ممنعة (جرعة مكتملة)">ممنعة (جرعة مكتملة)</option>
                    <option value="الجرعة الأولى">الجرعة الأولى</option>
                    <option value="الجرعة الثانية">الجرعة الثانية</option>
                    <option value="غير ممنعة">غير ممنعة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">وضع الجنين (Fetal Lie)</label>
                  <input
                    type="text"
                    value={ancFetalLie}
                    onChange={e => setAncFetalLie(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">نبض الجنين (Fetal Heart Sound)</label>
                  <input
                    type="text"
                    value={ancFetalHeartSound}
                    onChange={e => setAncFetalHeartSound(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">حركة الجنين (Fetal Movement)</label>
                  <input
                    type="text"
                    value={ancFetalMovement}
                    onChange={e => setAncFetalMovement(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">الهيموجلوبين (Hb)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={labHemoglobin}
                    onChange={e => setLabHemoglobin(e.target.value)}
                    placeholder="11.5"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">سكر الدم (Glucose)</label>
                  <input
                    type="number"
                    value={ancBloodGlucose}
                    onChange={e => setAncBloodGlucose(e.target.value)}
                    placeholder="95"
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">السونار (U/S)</label>
                  <input
                    type="text"
                    value={ancUltrasound}
                    onChange={e => setAncUltrasound(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تاريخ الزيارة القادمة</label>
                  <input
                    type="date"
                    value={ancNextVisitDate}
                    onChange={e => setAncNextVisitDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ancSupplements} onChange={e => setAncSupplements(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>صرف الفيتامينات والمكملات (Folic Acid, Iron, Calcium)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ancDentalCheck} onChange={e => setAncDentalCheck(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>تم فحص الأسنان للحامل</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ancUrineAlbumin} onChange={e => setAncUrineAlbumin(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>زلال بالبول (Urine Albumin)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ancPreviousCs} onChange={e => setAncPreviousCs(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>سابقة ولادة قيصرية</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (4): نموذج متابعة ما بعد الولادة والنفاس (ف6ب - Postpartum) */}
          {/* ========================================================================= */}
          {examMode === 'maternal_postpartum' && (
            <div className="bg-rose-50/60 p-5 rounded-2xl border border-rose-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2 text-rose-950 font-black text-sm">
                  <HeartHandshake size={18} className="text-rose-600" />
                  <span>نموذج متابعة ما بعد الولادة والنفاس (Postpartum Visit — ف6ب)</span>
                </div>
                <span className="text-[11px] font-black text-rose-800 bg-white px-2.5 py-1 rounded-lg border border-rose-200">
                  نموذج ف6ب
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">تاريخ الولادة</label>
                  <input
                    type="date"
                    value={ppDeliveryDate}
                    onChange={e => setPpDeliveryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">نوع الولادة</label>
                  <select value={ppDeliveryMode} onChange={e => setPpDeliveryMode(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="ولادة طبيعية">ولادة طبيعية</option>
                    <option value="ولادة قيصرية">ولادة قيصرية</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">ناتج الحمل</label>
                  <select value={ppDeliveryOutcome} onChange={e => setPpDeliveryOutcome(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="طفل حي سليم">طفل حي سليم</option>
                    <option value="توأم حي">توأم حي</option>
                    <option value="طفل ميت">طفل ميت</option>
                    <option value="إجهاض">إجهاض</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">رقم زيارة النفاس</label>
                  <select value={ppVisitNum} onChange={e => setPpVisitNum(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="1">الزيارة الأولى</option>
                    <option value="2">الزيارة الثانية</option>
                    <option value="3">الزيارة الثالثة (نهاية النفاس)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">مكان الولادة</label>
                  <input type="text" value={ppDeliveryPlace} onChange={e => setPpDeliveryPlace(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تقييم الرضاعة والالتقام</label>
                  <input type="text" value={ppLatchPosition} onChange={e => setPpLatchPosition(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">وسيلة تنظيم الأسرة المختارة</label>
                  <input type="text" value={ppContraceptionMethod} onChange={e => setPpContraceptionMethod(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ppVitaminAGiven} onChange={e => setPpVitaminAGiven(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>تم إعطاء كبسولة فيتامين (أ) للأم</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ppExclusiveBf} onChange={e => setPpExclusiveBf(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>رضاعة طبيعية مطلقة (Exclusive Breastfeeding)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ppDepressionScreening} onChange={e => setPpDepressionScreening(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>تم فحص اكتئاب ما بعد الولادة (طبيعي)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={ppSocialAdjustment} onChange={e => setPpSocialAdjustment(e.target.checked)} className="w-4 h-4 rounded text-rose-600" />
                  <span>التكيف الأسري والاجتماعي جيد</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (5): نموذج منتفعة بخدمات تنظيم الأسرة (ف7 - Family Planning) */}
          {/* ========================================================================= */}
          {examMode === 'family_planning' && (
            <div className="bg-pink-50/60 p-5 rounded-2xl border border-pink-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-pink-200">
                <div className="flex items-center gap-2 text-pink-950 font-black text-sm">
                  <Sparkles size={18} className="text-pink-600" />
                  <span>نموذج منتفعة بخدمات تنظيم الأسرة (Family Planning — ف7)</span>
                </div>
                <span className="text-[11px] font-black text-pink-800 bg-white px-2.5 py-1 rounded-lg border border-pink-200">
                  نموذج ف7
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">سبب الزيارة والإجراء المتخذ</label>
                  <select value={fpVisitReason} onChange={e => setFpVisitReason(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="حصول على وسيلة جديدة">حصول على وسيلة جديدة</option>
                    <option value="متابعة وسيلة">متابعة وسيلة</option>
                    <option value="تغيير وسيلة">تغيير وسيلة</option>
                    <option value="مضاعفات طبية">مضاعفات طبية</option>
                    <option value="إزالة لولب / كبسولة">إزالة لولب / كبسولة</option>
                    <option value="مشورة صحة إنجابية">مشورة صحة إنجابية</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوسيلة الحالية / المختارة</label>
                  <select value={fpCurrentMethod} onChange={e => setFpCurrentMethod(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="لولب نحاسي (IUD)">لولب نحاسي (IUD)</option>
                    <option value="حبوب مركبة (COC)">حبوب مركبة (COC)</option>
                    <option value="حبوب أحادية للرضاعة (POP)">حبوب أحادية للرضاعة (POP)</option>
                    <option value="حقن أحادية / مركبة">حقن منع الحمل</option>
                    <option value="كبسولة تحت الجلد (Implant)">كبسولة تحت الجلد (Implant)</option>
                    <option value="وسائل موضعية">وسائل موضعية</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوسيلة المنصرفة والكمية</label>
                  <input type="text" value={fpNewMethodPrescribed} onChange={e => setFpNewMethodPrescribed(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">انتظام الدورة الشهرية</label>
                  <select value={fpMenstrualRegularity} onChange={e => setFpMenstrualRegularity(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="منتظمة">منتظمة</option>
                    <option value="غير منتظمة">غير منتظمة</option>
                    <option value="لا توجد (رضاعة)">لا توجد (رضاعة)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">كمية الحيض</label>
                  <select value={fpMenstrualAmount} onChange={e => setFpMenstrualAmount(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="متوسطة">متوسطة</option>
                    <option value="قليلة">قليلة</option>
                    <option value="كثيرة">كثيرة</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">ضغط الدم (BP)</label>
                  <input type="text" value={vitalBp} onChange={e => setVitalBp(e.target.value)} placeholder="120/80" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تاريخ الزيارة القادمة</label>
                  <input type="date" value={fpNextVisitDate} onChange={e => setFpNextVisitDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">فحص الحوض وعنق الرحم (Pelvic & Speculum Exam)</label>
                  <input type="text" value={fpPelvicExam} onChange={e => setFpPelvicExam(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">وضع وحجم الرحم (Bimanual Uterus Assessment)</label>
                  <input type="text" value={fpUterinePosition} onChange={e => setFpUterinePosition(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                <input type="checkbox" checked={fpBreastSelfExamTaught} onChange={e => setFpBreastSelfExamTaught(e.target.checked)} className="w-4 h-4 rounded text-pink-600" />
                <span>تم تعليم السيدة كيفية الفحص الذاتي للثدي</span>
              </label>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (6): نماذج متابعة الأمراض المزمنة (ف4أ ضغط / ف4ب سكر / ف4ج مزمن آخر) */}
          {/* ========================================================================= */}
          {examMode === 'chronic_followup' && (
            <div className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-200">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                  <Activity size={18} className="text-indigo-600" />
                  <span>نموذج متابعة الأمراض المزمنة (ف4أ ضغط الدم · ف4ب السكر · ف4ج مزمن آخر)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChronicSubForm('f4a_htn')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                      chronicSubForm === 'f4a_htn' ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    ف4أ: مريض ضغط الدم
                  </button>
                  <button
                    type="button"
                    onClick={() => setChronicSubForm('f4b_dm')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                      chronicSubForm === 'f4b_dm' ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    ف4ب: مريض السكر
                  </button>
                  <button
                    type="button"
                    onClick={() => setChronicSubForm('f4c_other')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer ${
                      chronicSubForm === 'f4c_other' ? 'bg-indigo-700 text-white' : 'bg-white text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    ف4ج: أمراض مزمنة أخرى
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold font-mono tabular-nums">
                <div>
                  <label className="block mb-1 text-slate-700 font-sans">ضغط الدم جلوساً (Sitting BP)</label>
                  <input type="text" value={vitalBp} onChange={e => setVitalBp(e.target.value)} placeholder="130/85" className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700 font-sans">ضغط الدم وقوفاً (Standing BP)</label>
                  <input type="text" value={chronicStandingBp} onChange={e => setChronicStandingBp(e.target.value)} placeholder="125/80" className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700 font-sans">سكر صائم (FBS mg/dL)</label>
                  <input type="number" value={chronicFbs} onChange={e => setChronicFbs(e.target.value)} placeholder="110" className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700 font-sans">السكر التراكمي (HbA1c %)</label>
                  <input type="number" step="0.1" value={chronicHba1c} onChange={e => setChronicHba1c(e.target.value)} placeholder="6.8" className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">وظائف الكلى (Creatinine / eGFR)</label>
                  <input type="text" value={chronicCreatinineEgfr} onChange={e => setChronicCreatinineEgfr(e.target.value)} placeholder="0.9 mg/dL" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الكوليسترول والدهون (Lipids)</label>
                  <input type="text" value={chronicTotalCholesterol} onChange={e => setChronicTotalCholesterol(e.target.value)} placeholder="180 mg/dL" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">حالة انضباط المرض</label>
                  <select value={chronicControlStatus} onChange={e => setChronicControlStatus(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="منضبط (Controlled)">منضبط (Controlled)</option>
                    <option value="تحت التعديل الدوائي">تحت التعديل الدوائي</option>
                    <option value="غير منضبط (Uncontrolled)">غير منضبط (Uncontrolled)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">موعد الفحص الدوري القادم</label>
                  <input type="date" value={chronicNextInvestigationDue} onChange={e => setChronicNextInvestigationDue(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
              </div>

              {chronicSubForm === 'f4b_dm' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                  <div>
                    <label className="block mb-1 text-slate-700">فحص قاع العين (Fundus Exam)</label>
                    <input type="text" value={chronicFundusExam} onChange={e => setChronicFundusExam(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">فحص القدم السكري (Foot Examination)</label>
                    <input type="text" value={chronicFootExam} onChange={e => setChronicFootExam(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold items-center">
                <div>
                  <label className="block mb-1 text-slate-700">المضاعفات وتأثر الأعضاء المستهدفة (Complications)</label>
                  <input type="text" value={chronicComplications} onChange={e => setChronicComplications(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer mt-4">
                  <input type="checkbox" checked={chronicMedAdherence} onChange={e => setChronicMedAdherence(e.target.checked)} className="w-4 h-4 rounded text-indigo-600" />
                  <span>المريض منتظم على العلاج والتثقيف الصحي (نظام غذائي وتقليل الملح)</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (7): نموذج فحص وعلاج الأسنان (ف3 - Dental Form) */}
          {/* ========================================================================= */}
          {examMode === 'dental' && (
            <div className="bg-sky-50/60 p-5 rounded-2xl border border-sky-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200">
                <div className="flex items-center gap-2 text-sky-950 font-black text-sm">
                  <Smile size={18} className="text-sky-600" />
                  <span>نموذج فحص وعلاج الأسنان (Dental Examination — ف3)</span>
                </div>
                <span className="text-[11px] font-black text-sky-800 bg-white px-2.5 py-1 rounded-lg border border-sky-200">
                  نموذج ف3
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">نوع الموقع (Location)</label>
                  <select value={dentalLocationType} onChange={e => setDentalLocationType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="حضر (Urban)">1 = حضر (Urban)</option>
                    <option value="ريف (Rural)">2 = ريف (Rural)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الفحص خارج الفم (Extra-Oral)</label>
                  <select value={dentalExtraOralCode} onChange={e => setDentalExtraOralCode(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="0">0 = مظهر طبيعي سليم</option>
                    <option value="1">1 = قرح / التهابات</option>
                    <option value="7">7 = تضخم غدد ليمفاوية</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">مؤشر اللثة (CPI Index)</label>
                  <select value={dentalCpiCode} onChange={e => setDentalCpiCode(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="0">0 = لثة سليمة (Healthy)</option>
                    <option value="1">1 = نزيف لثوي (Bleeding)</option>
                    <option value="2">2 = جير الأسنان (Calculus)</option>
                    <option value="3">3 = جيب لثوي 4-5 مم</option>
                    <option value="4">4 = جيب لثوي 6 مم فأكثر</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">علاقة الإطباق (Occlusion)</label>
                  <select value={dentalOcclusionClass} onChange={e => setDentalOcclusionClass(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="Class I">Class I</option>
                    <option value="Class II">Class II</option>
                    <option value="Class III">Class III</option>
                    <option value="Edge to edge">Edge to edge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-bold font-mono tabular-nums">
                <div className="bg-white p-3 rounded-xl border border-sky-200">
                  <label className="block mb-1 text-slate-700 font-sans">أسنان مسوسة (Decayed - D)</label>
                  <input type="number" min={0} value={dentalDmftDecayed} onChange={e => setDentalDmftDecayed(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-black" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-sky-200">
                  <label className="block mb-1 text-slate-700 font-sans">أسنان مفقودة (Missing - M)</label>
                  <input type="number" min={0} value={dentalDmftMissing} onChange={e => setDentalDmftMissing(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-black" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-sky-200">
                  <label className="block mb-1 text-slate-700 font-sans">أسنان محشوة (Filled - F)</label>
                  <input type="number" min={0} value={dentalDmftFilled} onChange={e => setDentalDmftFilled(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg bg-slate-50 font-black" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dentalTmjClicking} onChange={e => setDentalTmjClicking(e.target.checked)} className="w-4 h-4 rounded text-sky-600" />
                  <span>طقطقة بمفصل الفك (TMJ Clicking)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dentalTmjTenderness} onChange={e => setDentalTmjTenderness(e.target.checked)} className="w-4 h-4 rounded text-sky-600" />
                  <span>ألم عند الجس بمفصل الفك (TMJ Tenderness)</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (8): نموذج تقييم المقبلين على الزواج (ف8أ للزوج / ف8ب للزوجة) */}
          {/* ========================================================================= */}
          {examMode === 'premarital' && (
            <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                  <HeartHandshake size={18} className="text-purple-600" />
                  <span>{activeRouteMeta.formTitle}</span>
                </div>
                <span className="text-[11px] font-black text-purple-800 bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                  {activeRouteMeta.formCodeBadge}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">اسم الطرف الآخر رباعياً</label>
                  <input type="text" value={pmPartnerName} onChange={e => setPmPartnerName(e.target.value)} placeholder="الاسم رباعي..." className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الرقم القومي للطرف الآخر</label>
                  <input type="text" value={pmPartnerNationalId} onChange={e => setPmPartnerNationalId(e.target.value)} placeholder="14 رقماً" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">رقم شهادة الفحص الطبي</label>
                  <input type="text" value={pmCertNumber} onChange={e => setPmCertNumber(e.target.value)} placeholder="رقم الشهادة المميكنة" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">سكر الدم صائم</label>
                  <input type="number" value={pmFbs} onChange={e => setPmFbs(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الهيموجلوبين وصورة الدم</label>
                  <input type="text" value={labHemoglobin} onChange={e => setLabHemoglobin(e.target.value)} placeholder="13.5 g/dL" className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">عامل ريسس (Rh)</label>
                  <select value={labRh} onChange={e => setLabRh(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                    <option value="+">+ (موجب)</option>
                    <option value="-">- (سالب)</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">أشعة الصدر (Chest X-Ray)</label>
                  <input type="text" value={pmChestXray} onChange={e => setPmChestXray(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">الأمراض المعدية والفيروسات (HCV / HBV / HIV)</label>
                  <input type="text" value={pmInfectiousHistory} onChange={e => setPmInfectiousHistory(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الأمراض الوراثية والعائلية</label>
                  <input type="text" value={pmHereditaryHistory} onChange={e => setPmHereditaryHistory(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pmConsanguinity} onChange={e => setPmConsanguinity(e.target.checked)} className="w-4 h-4 rounded text-purple-600" />
                  <span>توجد صلة قرابة مع الطرف الآخر</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pmHbElectrophoresis} onChange={e => setPmHbElectrophoresis(e.target.checked)} className="w-4 h-4 rounded text-purple-600" />
                  <span>تم إجراء الفصل الكهربائي للهيموجلوبين (Thalassemia)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pmGeneticCounseling} onChange={e => setPmGeneticCounseling(e.target.checked)} className="w-4 h-4 rounded text-purple-600" />
                  <span>تم تقديم المشورة الوراثية والطبية</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pmMutualConsent} onChange={e => setPmMutualConsent(e.target.checked)} className="w-4 h-4 rounded text-purple-600" />
                  <span>تم توقيع إقرار الموافقة المسبقة (Informed Consent)</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (9): نموذج التقييم الشامل للمسنين (ف9 - Geriatric Assessment) */}
          {/* ========================================================================= */}
          {examMode === 'geriatric' && (
            <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
                  <Clock size={18} className="text-amber-600" />
                  <span>نموذج التقييم الشامل للمسنين (Geriatric Assessment — ف9)</span>
                </div>
                <span className="text-[11px] font-black text-amber-800 bg-white px-2.5 py-1 rounded-lg border border-amber-200">
                  نموذج ف9
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-amber-950 block">1. فحص الوهن (Frailty Screening):</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={gerWeightLoss} onChange={e => setGerWeightLoss(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>فقدان وزن</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={gerWeakness} onChange={e => setGerWeakness(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>شعور بالضعف</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={gerPoorEndurance} onChange={e => setGerPoorEndurance(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>قلة التحمل</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={gerSlowness} onChange={e => setGerSlowness(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>بطء الحركة</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input type="checkbox" checked={gerInactivity} onChange={e => setGerInactivity(e.target.checked)} className="w-4 h-4 rounded text-amber-600" />
                    <span>خمول بدني</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">الوظائف الأساسية (Basic ADLs)</label>
                  <input type="text" value={gerBasicAdls} onChange={e => setGerBasicAdls(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الوظائف الفعالة (Instrumental ADLs)</label>
                  <input type="text" value={gerInstrumentalAdls} onChange={e => setGerInstrumentalAdls(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">اختبار الوقوف والمشي (Timed Up & Go)</label>
                  <input type="text" value={gerTimedUpAndGo} onChange={e => setGerTimedUpAndGo(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-700">المزاج والاكتئاب (Mood)</label>
                  <input type="text" value={gerMoodAssessment} onChange={e => setGerMoodAssessment(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">الرؤية والسمع وسلس البول</label>
                  <input type="text" value={gerVisionHearingIncontinence} onChange={e => setGerVisionHearingIncontinence(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">تطعيمات المسنين (Immunizations)</label>
                  <input type="text" value={gerImmunizations} onChange={e => setGerImmunizations(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                </div>
                <div>
                  <label className="block mb-1 text-slate-700">اختبار الإدراك (Mini-Cog 0-5)</label>
                  <input type="number" min={0} max={5} value={gerMiniCogScore} onChange={e => setGerMiniCogScore(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums" />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* وضع (10): القسم الأساسي للكشف العام (نموذج ف1 - الفحص الشامل) */}
          {/* ========================================================================= */}
          {examMode === 'general' && (
            <>
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-sm">
                    <Activity size={18} className="text-primary-600" />
                    <span>العلامات الحيوية والفحص السريري العام (نموذج ف1)</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    نموذج ف1
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono tabular-nums">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">ضغط الدم (BP)</label>
                    <input type="text" value={vitalBp} onChange={e => setVitalBp(e.target.value)} placeholder="120/80" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">النبض (Pulse)</label>
                    <input type="text" value={vitalPulse} onChange={e => setVitalPulse(e.target.value)} placeholder="72" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">الحرارة (Temp)</label>
                    <input type="text" value={vitalTemp} onChange={e => setVitalTemp(e.target.value)} placeholder="37.0" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">التنفس (RR)</label>
                    <input type="text" value={vitalRespRate} onChange={e => setVitalRespRate(e.target.value)} placeholder="16" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">الوزن (كجم)</label>
                    <input type="number" step="0.1" value={vitalWeight} onChange={e => setVitalWeight(e.target.value)} placeholder="70" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none font-bold" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block font-sans">الطول (سم)</label>
                    <input type="number" step="1" value={vitalHeight} onChange={e => setVitalHeight(e.target.value)} placeholder="170" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white outline-none font-bold" />
                  </div>
                </div>

                {computedBmi && (
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-primary-600" />
                      <span className="text-xs font-bold text-slate-700">مؤشر كتلة الجسم (BMI):</span>
                      <span className="text-sm font-black font-mono tabular-nums text-slate-900">{computedBmi} kg/m²</span>
                    </div>
                    {bmiCategory && (
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${bmiCategory.color}`}>
                        {bmiCategory.label}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    الفحص العام والمظهر الإكلينيكي (General Appearance)
                  </label>
                  <input
                    type="text"
                    value={generalAppearance}
                    onChange={e => setGeneralAppearance(e.target.value)}
                    placeholder="الحالة العامة للمريض، الوعي، وجود شحوب، زرقة، صفراء..."
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs bg-white outline-none"
                  />
                </div>
              </div>

              {/* قسم (ب): تفاصيل الفحص الشامل (نموذج ف1) */}
              <div className="border border-indigo-100 rounded-2xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setShowComprehensiveDetails(!showComprehensiveDetails)}
                  className="w-full p-4 bg-indigo-50/60 hover:bg-indigo-100/60 transition-colors flex items-center justify-between text-right cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 text-indigo-950">
                    <Shield size={18} className="text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-black text-sm">
                        {showComprehensiveDetails ? 'إخفاء تفاصيل التاريخ المرضي والعائلي والمعمل (ف1) ▴' : 'إضافة تفاصيل التاريخ المرضي والعائلي والمعمل (نموذج ف1) ▾'}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 bg-white rounded-lg text-indigo-700 border border-indigo-200">
                    {showComprehensiveDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {showComprehensiveDetails && (
                  <div className="p-5 space-y-5 border-t border-indigo-100 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                      <div>
                        <label className="block mb-1 text-slate-600">دخول مستشفى سابق (Hospitalization)</label>
                        <input type="text" value={hospitalization} onChange={e => setHospitalization(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">عمليات جراحية سابقة (Previous Operations)</label>
                        <input type="text" value={previousOperations} onChange={e => setPreviousOperations(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">أدوية حالية ومستمرة (Current Medications)</label>
                        <input type="text" value={currentMedications} onChange={e => setCurrentMedications(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">حساسية عامة / دوائية (Allergy & ADR)</label>
                        <input type="text" value={allergy} onChange={e => setAllergy(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-800">التاريخ المرضي للعائلة (Family History)</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FAMILY_HISTORY_OPTIONS.map(opt => {
                          const isChecked = familyHistory.includes(opt.key);
                          return (
                            <label key={opt.key} className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer ${
                              isChecked ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <input type="checkbox" checked={isChecked} onChange={() => handleFamilyHistoryToggle(opt.key)} className="rounded text-emerald-600 w-3.5 h-3.5" />
                              <span className="truncate">{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-bold">
                      <div>
                        <label className="block mb-1 text-slate-600">الهيموجلوبين (Hb)</label>
                        <input type="text" value={labHemoglobin} onChange={e => setLabHemoglobin(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50 font-mono tabular-nums" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">فصيلة الدم</label>
                        <select value={labBloodGroup} onChange={e => setLabBloodGroup(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50">
                          <option value="">—</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="AB">AB</option>
                          <option value="O">O</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">عامل ريسس (RH)</label>
                        <select value={labRh} onChange={e => setLabRh(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50">
                          <option value="">—</option>
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">تحليل البول (Urine)</label>
                        <input type="text" value={labUrine} onChange={e => setLabUrine(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                      <div>
                        <label className="block mb-1 text-slate-600">تحليل البراز (Stool)</label>
                        <input type="text" value={labStool} onChange={e => setLabStool(e.target.value)} className="w-full border border-slate-200 rounded-xl p-2 bg-slate-50" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* قسم مشترك لجميع النماذج: الشكوى، التشخيص، خطة العلاج، الإحالة ف10أ، والترحيل التلقائي */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1">
                  الشكوى الرئيسية / سبب الزيارة (Complaint — يُرحّل لنموذج التردد ف2ب)
                </label>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  placeholder="الشكوى الرئيسية للمريض أو سبب المتابعة..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:bg-white outline-none text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1">
                  <span>التقييم الإكلينيكي / التشخيص الطبي (Diagnosis) *</span>
                  <span className="text-[10px] text-emerald-700 font-bold">يُرحّل لـ ف2أ + ف2ب</span>
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  required={examMode === 'general'}
                  placeholder="التشخيص الطبي أو التقييم السريري للحالة..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:bg-white outline-none text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black text-slate-800 block mb-1">
                خطة العلاج والأدوية والمتابعة (Management & Follow-up — يُرحّل لنموذج التردد ف2ب)
              </label>
              <textarea
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                rows={2}
                className="w-full border border-slate-300 rounded-2xl p-3 bg-slate-50/50 focus:bg-white outline-none text-xs font-bold leading-relaxed"
                placeholder="الأدوية الموصوفة، الجرعات، المكملات الغذائية، أو توصيات المتابعة القادمة..."
              />
            </div>

            {/* نموذج الإحالة ف10أ (Referral Form 10A) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeReferralForm10A}
                    onChange={e => setIncludeReferralForm10A(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <Send size={14} className="text-indigo-600" />
                  <span>تحرير نموذج إحالة لمستشفى / أخصائي مع هذا الكشف (نموذج الإحالة ف10أ)</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  نموذج ف10أ
                </span>
              </label>

              {includeReferralForm10A && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 text-xs font-bold">
                  <div>
                    <label className="block mb-1 text-slate-700">الجهة المحول إليها</label>
                    <input type="text" value={refTargetFacility} onChange={e => setRefTargetFacility(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">التخصص المطلوب</label>
                    <input type="text" value={refSpecialty} onChange={e => setRefSpecialty(e.target.value)} className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">درجة الاستعجال (Type of Referral)</label>
                    <select value={refUrgency} onChange={e => setRefUrgency(e.target.value as any)} className="w-full p-2 border border-slate-300 rounded-xl bg-white">
                      <option value="ROUTINE">عادية (Non-urgent)</option>
                      <option value="URGENT">عاجلة (Urgent)</option>
                      <option value="EMERGENCY">طوارئ (Emergency)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-700">سبب الإحالة (Reason for Referral)</label>
                    <input type="text" value={refReason} onChange={e => setRefReason(e.target.value)} placeholder="سبب التحويل..." className="w-full p-2 border border-slate-300 rounded-xl bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* ملخص الترحيل التلقائي الثلاثي للملف العائلي */}
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  الترحيل التلقائي الفوري للملف العائلي عند الحفظ:
                </span>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-800">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordAsSignificantEvent}
                      onChange={e => setRecordAsSignificantEvent(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-emerald-600"
                    />
                    <span>توثيق في ملخص الأحداث الطبية الهامة (ف2أ)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addDiagnosisAsChronic}
                      onChange={e => setAddDiagnosisAsChronic(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-indigo-600"
                    />
                    <span>إدراج ضمن التاريخ المرضي المزمن لأفراد الأسرة</span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-emerald-900">
                {activeRouteMeta.autoSyncTargets.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white rounded-lg border border-emerald-200">
                    ✓ {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-slate-200 sticky bottom-0 bg-white py-3 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors disabled:opacity-50 text-sm text-center cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowRight size={16} />
              <span>العودة لقائمة العيادات</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري حفظ النموذج وترحيل البيانات تلقائياً للملف العائلي...
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>حفظ ({activeRouteMeta.formCodeBadge}) وترحيل تلقائي لسجل التردد (ف2ب) والأحداث الهامة (ف2أ)</span>
                </>
              )}
            </button>
          </div>
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
          initialModule={activeRouteMeta.familyRecordModuleKey}
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
