import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import { 
  DialysisSession, 
  Patient, 
  DialysisNursingAssessment,
  DialysisAccessLine,
  DialysisNursingNote,
  DialysisNursingCarePlan,
  DialysisVitalSignsEws,
  DialysisPainGlucoseLog,
  DialysisMedicalCareLog,
  DialysisMedicationAdmin,
  DialysisHealthEducation,
  DialysisFallRiskReview
} from '../types.ts';
import { 
  X, Activity, AlertTriangle, CheckCircle2, Clock, Plus, Trash2, 
  ShieldAlert, Stethoscope, HeartPulse, FileText, Pill, GraduationCap, 
  Sparkles, Save, UserCheck, Eye, RefreshCw, AlertCircle,
  Scissors, Check, BedDouble, BellRing, Footprints, AlertOctagon, History
} from 'lucide-react';

interface Props {
  session: DialysisSession & { patients?: Patient };
  onClose: () => void;
  onUpdate?: () => void;
  initialTab?: 'assessment' | 'fall_risk' | 'lines' | 'notes_plan' | 'ews' | 'pain_glucose_med' | 'medication' | 'education';
  initialFallStage?: '2_HOURS' | '4_HOURS' | 'EXTRA';
}

export const calculateEwsScores = (values: {
  respiratory_rate?: number;
  oxygen_saturation?: number;
  oxygen_therapy_type?: string;
  systolic_bp?: number;
  heart_rate?: number;
  consciousness_level?: string;
  temperature_celsius?: number;
}) => {
  let rr_score = 0;
  if (values.respiratory_rate !== undefined && values.respiratory_rate !== null && !isNaN(values.respiratory_rate)) {
    const rr = Number(values.respiratory_rate);
    if (rr >= 25) rr_score = 3;
    else if (rr >= 21) rr_score = 2;
    else if (rr >= 12) rr_score = 0;
    else if (rr >= 9) rr_score = 1;
    else rr_score = 3; // <= 8
  }

  let spo2_score = 0;
  if (values.oxygen_saturation !== undefined && values.oxygen_saturation !== null && !isNaN(values.oxygen_saturation)) {
    const spo2 = Number(values.oxygen_saturation);
    if (spo2 >= 96) spo2_score = 0;
    else if (spo2 >= 94) spo2_score = 1;
    else if (spo2 >= 92) spo2_score = 2;
    else spo2_score = 3; // <= 91
  }

  let o2_score = 0;
  if (values.oxygen_therapy_type === 'o2') {
    o2_score = 2;
  } else {
    o2_score = 0; // air
  }

  let bp_score = 0;
  if (values.systolic_bp !== undefined && values.systolic_bp !== null && !isNaN(values.systolic_bp)) {
    const bp = Number(values.systolic_bp);
    if (bp >= 220) bp_score = 3;
    else if (bp >= 111) bp_score = 0;
    else if (bp >= 101) bp_score = 1;
    else if (bp >= 91) bp_score = 2;
    else bp_score = 3; // <= 90
  }

  let hr_score = 0;
  if (values.heart_rate !== undefined && values.heart_rate !== null && !isNaN(values.heart_rate)) {
    const hr = Number(values.heart_rate);
    if (hr >= 131) hr_score = 3;
    else if (hr >= 111) hr_score = 2;
    else if (hr >= 91) hr_score = 1;
    else if (hr >= 51) hr_score = 0;
    else if (hr >= 41) hr_score = 1;
    else hr_score = 3; // <= 40
  }

  let cons_score = 0;
  if (values.consciousness_level === 'alert') {
    cons_score = 0;
  } else if (values.consciousness_level) {
    cons_score = 3; // not_responding_to_voice_pain | unconscious
  }

  let temp_score = 0;
  if (values.temperature_celsius !== undefined && values.temperature_celsius !== null && !isNaN(values.temperature_celsius)) {
    const temp = Number(values.temperature_celsius);
    if (temp >= 39.1) temp_score = 2;
    else if (temp >= 38.1) temp_score = 1;
    else if (temp >= 36.1) temp_score = 0;
    else if (temp >= 35.1) temp_score = 1;
    else temp_score = 3; // <= 35.0
  }

  const total = rr_score + spo2_score + o2_score + bp_score + hr_score + cons_score + temp_score;

  let escalation = 'لا يوجد إجراء إضافي';
  let severity: 'normal' | 'medium' | 'critical' = 'normal';

  const hasExtremeSingle = [rr_score, spo2_score, bp_score, hr_score, cons_score, temp_score].some(s => s >= 3);

  if (total >= 7) {
    escalation = 'استدعاء فريق الاستجابة السريعة (RRT) فوراً';
    severity = 'critical';
  } else if (hasExtremeSingle || total >= 5) {
    escalation = 'إبلاغ الطبيب والتقييم كل ساعة';
    severity = 'medium';
  }

  return {
    rr_score,
    spo2_score,
    o2_score,
    bp_score,
    hr_score,
    cons_score,
    temp_score,
    total,
    escalation,
    severity
  };
};

const DialysisNursingAssessmentModal: React.FC<Props> = ({ 
  session, 
  onClose, 
  onUpdate,
  initialTab = 'assessment',
  initialFallStage = '2_HOURS'
}) => {
  const [activeTab, setActiveTab] = useState<'assessment' | 'fall_risk' | 'lines' | 'notes_plan' | 'ews' | 'pain_glucose_med' | 'medication' | 'education'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fall Risk Reviews State (Integrated)
  const [fallReviews, setFallReviews] = useState<DialysisFallRiskReview[]>([]);
  const [currentFallStage, setCurrentFallStage] = useState<'2_HOURS' | '4_HOURS' | 'EXTRA'>(initialFallStage);
  const [fallRiskLevel, setFallRiskLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [fallReviewerName, setFallReviewerName] = useState(() => {
    try {
      const savedUser = localStorage.getItem('dialysis_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.name) return u.name;
      }
    } catch (e) {}
    return 'تمريض الصالة';
  });
  const [fallClinicalNotes, setFallClinicalNotes] = useState('');
  const [savingFallReview, setSavingFallReview] = useState(false);
  const [savingDisconnection, setSavingDisconnection] = useState(false);

  // 9 Accredited Fall Prevention Precautions
  const [fallPrecautions, setFallPrecautions] = useState({
    card_placed: true,
    bed_low_brakes_locked: true,
    side_rails_raised: true,
    call_bell_within_reach: true,
    safe_environment_clear: true,
    assisted_ambulation_only: true,
    frequent_toilet_check: true,
    patient_relative_educated: true,
    non_slip_footwear: true
  });

  // 1. Assessment State
  const [assessment, setAssessment] = useState<Partial<DialysisNursingAssessment>>({
    session_id: session.id,
    patient_id: session.patient_id,
    assessment_datetime: new Date().toISOString(),
    information_source: 'patient',
    chief_complaint: '',
    medical_care_plan: '',
    doctor_signature: '',
    pre_dialysis_pain: { has_pain: false, onset: '', location: '', duration: '', characteristics: '' },
    allergy: { has_allergy: false, details: '' },
    fall_risk_measures: {
      card_placed: false,
      bed_low_brakes_locked: false,
      safe_environment: false,
      frequent_toilet_check: false,
      staff_assist_walking: false,
      patient_education: false
    },
    access_review: {
      access_type: 'av_fistula',
      insertion_site: '',
      working_efficiently: true,
      pulse_check_result: 'طبيعي وملموس (Thrill & Bruit حاضر)',
      complications: ''
    },
    edema: { present: false, location: '', grade: '0' },
    consciousness_level: 'alert',
    immunization_review: { reviewed_and_updated: true, vaccine_name_if_not: '', reason: '' },
    weight_gain_during_session: 0,
    session_complications: {
      none: true,
      cramps: false,
      nausea: false,
      hypoxia: false,
      high_bp: false,
      low_bp: false,
      dizziness: false,
      cardiac_problems: false,
      other_text: ''
    },
    new_events_since_last_assessment: { has_new: false, details: '' },
    doctor_orders_reviewed: true,
    lab_results_reviewed: true,
    dialysis_machine_check_reviewed: true,
    breathing_difficulty: false,
    chest_pain: false,
    fluid_status: {
      target_weight_kg: Number(session.weight_before || 0),
      tongue_dryness: false,
      neck_veins: 'flat'
    },
    abuse_neglect_signs: false,
    psychological_assessment: 'no_problem',
    skin_assessment: 'healthy',
    spiritual_assessment: 'no_need'
  });

  // 2. Access Lines State
  const [accessLines, setAccessLines] = useState<DialysisAccessLine[]>([]);
  const [showNewLineForm, setShowNewLineForm] = useState(false);
  const [newLineData, setNewLineData] = useState<Partial<DialysisAccessLine>>({
    patient_id: session.patient_id,
    line_type: 'av_fistula',
    insertion_site: 'الطرف العلوي الأيسر (Left Forearm)',
    insertion_datetime: new Date().toISOString(),
    responsible_doctor: '',
    status: 'active'
  });
  const [removingLineId, setRemovingLineId] = useState<string | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalDateTime, setRemovalDateTime] = useState<string>('');

  // 3. Notes & Care Plans State
  const [nursingNotes, setNursingNotes] = useState<DialysisNursingNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [nurseNoteSignature, setNurseNoteSignature] = useState('');

  const [carePlans, setCarePlans] = useState<DialysisNursingCarePlan[]>([]);
  const [newPlanAssessment, setNewPlanAssessment] = useState('');
  const [newPlanDiagnosis, setNewPlanDiagnosis] = useState('');
  const [newPlanGoal, setNewPlanGoal] = useState('');
  const [newPlanInterventions, setNewPlanInterventions] = useState('');
  const [newPlanSignature, setNewPlanSignature] = useState('');

  // 4. Vital Signs EWS State
  const [ewsList, setEwsList] = useState<DialysisVitalSignsEws[]>([]);
  const [newEws, setNewEws] = useState<{
    respiratory_rate?: number;
    oxygen_saturation?: number;
    oxygen_therapy_type: 'air' | 'o2';
    oxygen_flow_lmin?: number;
    systolic_bp?: number;
    heart_rate?: number;
    consciousness_level: string;
    temperature_celsius?: number;
  }>({
    respiratory_rate: 16,
    oxygen_saturation: 98,
    oxygen_therapy_type: 'air',
    oxygen_flow_lmin: 0,
    systolic_bp: session.blood_pressure ? parseInt(session.blood_pressure.split('/')[0]) || 130 : 130,
    heart_rate: 76,
    consciousness_level: 'alert',
    temperature_celsius: 36.8
  });

  // 5. Pain / Glucose Logs & Medical Care Logs
  const [painGlucoseLogs, setPainGlucoseLogs] = useState<DialysisPainGlucoseLog[]>([]);
  const [newPainScore, setNewPainScore] = useState<number>(0);
  const [newGlucose, setNewGlucose] = useState<number | undefined>(undefined);
  const [newWithdrawal, setNewWithdrawal] = useState<number | undefined>(undefined);

  const [medicalLogs, setMedicalLogs] = useState<DialysisMedicalCareLog[]>([]);
  const [newMedComplaint, setNewMedComplaint] = useState('');
  const [newMedFindings, setNewMedFindings] = useState('');

  // 6. Medication Admin (MAR)
  const [medAdmins, setMedAdmins] = useState<DialysisMedicationAdmin[]>([]);
  const [newMedDrug, setNewMedDrug] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedRoute, setNewMedRoute] = useState('IV');
  const [newMedInstructions, setNewMedInstructions] = useState('');
  const [newMedDocSig, setNewMedDocSig] = useState('');
  const [newMedNurseSig, setNewMedNurseSig] = useState('');

  // 7. Health Education
  const [healthEdu, setHealthEdu] = useState<Partial<DialysisHealthEducation>>({
    patient_id: session.patient_id,
    session_id: session.id,
    assessment_date: new Date().toISOString().split('T')[0],
    learning_ability: 'medium',
    learning_barriers: { language: false, illiteracy: false, communication_difficulty: false, other: '' },
    learning_method: { reading: false, listening: true, practice: true },
    topics_covered: {
      diet_explanation: true,
      patient_rights_duties: true,
      fall_prevention: true,
      fistula_site_care: true,
      fluid_restriction: true,
      other: ''
    },
    patient_or_family_signature: session.patients?.name || '',
    nurse_signature: ''
  });

  // Calculate live EWS
  const liveEws = useMemo(() => {
    return calculateEwsScores(newEws);
  }, [newEws]);

  // Calculate elapsed session duration in minutes
  const elapsedMinutes = useMemo(() => {
    if (!session) return 0;
    const now = new Date();
    let startDateTime: Date | null = null;
    if (session.start_time) {
      const parts = session.start_time.split(':');
      if (parts.length >= 2) {
        const dateStr = session.date || now.toISOString().split('T')[0];
        const parsed = new Date(`${dateStr}T${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`);
        if (!isNaN(parsed.getTime())) startDateTime = parsed;
      }
    }
    if (!startDateTime && session.created_at) {
      const parsed = new Date(session.created_at);
      if (!isNaN(parsed.getTime())) startDateTime = parsed;
    }
    if (startDateTime) {
      const mins = Math.floor((now.getTime() - startDateTime.getTime()) / 60000);
      return mins > 0 ? mins : 0;
    }
    return 0;
  }, [session]);

  // Calculate formatted total connection duration (between connection_time and disconnection_time)
  const connectionDurationFormatted = useMemo(() => {
    const conn = assessment.access_review?.connection_time || session.start_time;
    const disconn = assessment.access_review?.disconnection_time || session.disconnection_time;
    if (!conn || !disconn) return null;
    const [h1, m1] = conn.split(':').map(Number);
    const [h2, m2] = disconn.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
    let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMins < 0) diffMins += 24 * 60;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} ساعة و ${mins} دقيقة (${diffMins} دقيقة)`;
  }, [assessment.access_review?.connection_time, assessment.access_review?.disconnection_time, session.start_time, session.disconnection_time]);

  // Fall review indicators
  const has2HReview = useMemo(() => fallReviews.some(r => r.review_stage === '2_HOURS'), [fallReviews]);
  const has4HReview = useMemo(() => fallReviews.some(r => r.review_stage === '4_HOURS'), [fallReviews]);
  const is2HDue = elapsedMinutes >= 120 && !has2HReview;
  const is4HDue = elapsedMinutes >= 240 && !has4HReview;
  const isFallReviewOverdue = is2HDue || is4HDue;

  useEffect(() => {
    loadAllData();
  }, [session.id]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [
        loadedAssessment,
        loadedLines,
        loadedNotes,
        loadedPlans,
        loadedEws,
        loadedPainGlucose,
        loadedMedical,
        loadedMeds,
        loadedEdus,
        loadedFallReviews
      ] = await Promise.all([
        DB.getDialysisNursingAssessment(session.id).catch(() => null),
        DB.getDialysisAccessLines(session.patient_id).catch(() => []),
        DB.getDialysisNursingNotes(session.id).catch(() => []),
        DB.getDialysisNursingCarePlans(session.id).catch(() => []),
        DB.getDialysisVitalSignsEws(session.id).catch(() => []),
        DB.getDialysisPainGlucoseLogs(session.id).catch(() => []),
        DB.getDialysisMedicalCareLogs(session.id).catch(() => []),
        DB.getDialysisMedicationAdmins(session.id).catch(() => []),
        DB.getDialysisHealthEducations(session.patient_id, session.id).catch(() => []),
        DB.getDialysisFallRiskReviews(session.id).catch(() => [])
      ]);

      if (loadedAssessment) {
        setAssessment(loadedAssessment);
      }
      setAccessLines(loadedLines || []);
      setNursingNotes(loadedNotes || []);
      setCarePlans(loadedPlans || []);
      setEwsList(loadedEws || []);
      setPainGlucoseLogs(loadedPainGlucose || []);
      setMedicalLogs(loadedMedical || []);
      setMedAdmins(loadedMeds || []);
      if (loadedEdus && loadedEdus.length > 0) {
        setHealthEdu(loadedEdus[0]);
      }
      setFallReviews(loadedFallReviews || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تحميل بيانات التقييم التمريضي');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Quick sync disconnection time directly to session
  const handleQuickSyncDisconnectionTime = async () => {
    const timeToSave = assessment.access_review?.disconnection_time || new Date().toTimeString().slice(0, 5);
    setSavingDisconnection(true);
    try {
      await DB.recordDisconnectionTime(session.id, timeToSave);
      setAssessment(prev => ({
        ...prev,
        access_review: {
          ...prev.access_review,
          disconnection_time: timeToSave
        }
      }));
      showNotification(`تم تثبيت وقت فك الوصلة (${timeToSave}) ومزامنته مع الجلسة بنجاح`);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ وقت فك الوصلة بالجلسة');
    } finally {
      setSavingDisconnection(false);
    }
  };

  // Toggle all 9 fall prevention precautions
  const handleToggleAllFallPrecautions = (val: boolean) => {
    setFallPrecautions({
      card_placed: val,
      bed_low_brakes_locked: val,
      side_rails_raised: val,
      call_bell_within_reach: val,
      safe_environment_clear: val,
      assisted_ambulation_only: val,
      frequent_toilet_check: val,
      patient_relative_educated: val,
      non_slip_footwear: val
    });
  };

  // Save Fall Risk Review
  const handleSaveFallReview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fallReviewerName.trim()) {
      alert('يرجى كتابة اسم الممرض القائم بالمراجعة');
      return;
    }
    setSavingFallReview(true);
    setErrorMsg(null);
    try {
      const newReview: DialysisFallRiskReview = {
        session_id: session.id,
        patient_id: session.patient_id,
        review_stage: currentFallStage,
        review_time: new Date().toISOString(),
        reviewer_name: fallReviewerName.trim(),
        risk_level: fallRiskLevel,
        risk_score: fallRiskLevel === 'HIGH' ? 3 : fallRiskLevel === 'MEDIUM' ? 2 : 1,
        card_placed: fallPrecautions.card_placed,
        bed_low_brakes_locked: fallPrecautions.bed_low_brakes_locked,
        side_rails_raised: fallPrecautions.side_rails_raised,
        call_bell_within_reach: fallPrecautions.call_bell_within_reach,
        safe_environment_clear: fallPrecautions.safe_environment_clear,
        assisted_ambulation_only: fallPrecautions.assisted_ambulation_only,
        frequent_toilet_check: fallPrecautions.frequent_toilet_check,
        patient_relative_educated: fallPrecautions.patient_relative_educated,
        non_slip_footwear: fallPrecautions.non_slip_footwear,
        clinical_notes: fallClinicalNotes.trim() || undefined
      };

      await DB.saveDialysisFallRiskReview(newReview);
      const updated = await DB.getDialysisFallRiskReviews(session.id);
      setFallReviews(updated);

      // Also sync precautions into main assessment state
      setAssessment(prev => ({
        ...prev,
        fall_risk_measures: {
          card_placed: fallPrecautions.card_placed,
          bed_low_brakes_locked: fallPrecautions.bed_low_brakes_locked,
          safe_environment: fallPrecautions.safe_environment_clear,
          frequent_toilet_check: fallPrecautions.frequent_toilet_check,
          staff_assist_walking: fallPrecautions.assisted_ambulation_only,
          patient_education: fallPrecautions.patient_relative_educated
        }
      }));

      setFallClinicalNotes('');
      showNotification('تم توثيق مراجعة وقاية السقوط بنجاح في السجل الطبي');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ مراجعة وقاية السقوط');
    } finally {
      setSavingFallReview(false);
    }
  };

  const handleDeleteFallReview = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التوثيق للمراجعة؟')) return;
    try {
      await DB.deleteDialysisFallRiskReview(id);
      setFallReviews(prev => prev.filter(r => r.id !== id));
      showNotification('تم حذف توثيق المراجعة');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل الحذف');
    }
  };

  // 1. Save Main Assessment
  const handleSaveAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const saved = await DB.saveDialysisNursingAssessment({
        ...assessment,
        session_id: session.id,
        patient_id: session.patient_id
      });
      setAssessment(saved);

      // Also sync disconnection_time to session if set in access_review
      if (assessment.access_review?.disconnection_time) {
        try {
          await DB.recordDisconnectionTime(session.id, assessment.access_review.disconnection_time);
        } catch (syncErr) {
          console.warn("Could not sync session disconnection_time:", syncErr);
        }
      }

      showNotification('تم حفظ التقييم التمريضي الرئيسي للجلسة بنجاح');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ التقييم التمريضي');
    } finally {
      setSaving(false);
    }
  };

  // 2. Add / Update Access Line
  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      await DB.addDialysisAccessLine({
        ...newLineData,
        patient_id: session.patient_id
      });
      const updated = await DB.getDialysisAccessLines(session.patient_id);
      setAccessLines(updated);
      setShowNewLineForm(false);
      showNotification('تم إضافة بيانات الوصلة / القسطرة بنجاح');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة الوصلة');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRemovalLine = async (lineId: string) => {
    if (!removalReason.trim()) {
      alert('يرجى كتابة سبب الفك أو الاستبدال');
      return;
    }
    setSaving(true);
    try {
      const parsedRemovalIso = removalDateTime ? new Date(removalDateTime).toISOString() : new Date().toISOString();
      await DB.updateDialysisAccessLine(lineId, {
        status: 'removed',
        removal_datetime: parsedRemovalIso,
        removal_or_change_reason: removalReason
      });
      const updated = await DB.getDialysisAccessLines(session.patient_id);
      setAccessLines(updated);
      setRemovingLineId(null);
      setRemovalReason('');
      setRemovalDateTime('');
      showNotification('تم تحديث حالة الوصلة إلى (مفكوكة / مستبدلة) مع توثيق وقت الفك');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تحديث حالة الوصلة');
    } finally {
      setSaving(false);
    }
  };

  // 3. Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setSaving(true);
    try {
      await DB.addDialysisNursingNote({
        session_id: session.id,
        note_time: new Date().toISOString(),
        note_text: newNoteText,
        nurse_signature: nurseNoteSignature
      });
      const updated = await DB.getDialysisNursingNotes(session.id);
      setNursingNotes(updated);
      setNewNoteText('');
      showNotification('تم تسجيل الملاحظة التمريضية بنجاح');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ الملاحظة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('هل تريد حذف هذه الملاحظة التمريضية؟')) return;
    try {
      await DB.deleteDialysisNursingNote(id);
      setNursingNotes(nursingNotes.filter(n => n.id !== id));
      showNotification('تم حذف الملاحظة');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل الحذف');
    }
  };

  // 3b. Add Care Plan
  const handleAddCarePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanDiagnosis.trim() && !newPlanInterventions.trim()) return;
    setSaving(true);
    try {
      await DB.addDialysisNursingCarePlan({
        session_id: session.id,
        plan_time: new Date().toISOString(),
        assessment: newPlanAssessment,
        nursing_diagnosis: newPlanDiagnosis,
        goal: newPlanGoal,
        nursing_interventions: newPlanInterventions,
        signature: newPlanSignature
      });
      const updated = await DB.getDialysisNursingCarePlans(session.id);
      setCarePlans(updated);
      setNewPlanAssessment('');
      setNewPlanDiagnosis('');
      setNewPlanGoal('');
      setNewPlanInterventions('');
      showNotification('تمت إضافة خطة الرعاية التمريضية بنجاح');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ خطة الرعاية');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCarePlan = async (id: string) => {
    if (!confirm('هل تريد حذف خطة الرعاية هذه؟')) return;
    try {
      await DB.deleteDialysisNursingCarePlan(id);
      setCarePlans(carePlans.filter(p => p.id !== id));
      showNotification('تم حذف خطة الرعاية');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل الحذف');
    }
  };

  // 4. Add Vital Signs EWS
  const handleAddEws = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const calculated = calculateEwsScores(newEws);
      await DB.addDialysisVitalSignsEws({
        session_id: session.id,
        recorded_time: new Date().toISOString(),
        respiratory_rate: newEws.respiratory_rate,
        respiratory_rate_score: calculated.rr_score,
        oxygen_saturation: newEws.oxygen_saturation,
        spo2_score: calculated.spo2_score,
        oxygen_therapy_type: newEws.oxygen_therapy_type,
        oxygen_flow_lmin: newEws.oxygen_flow_lmin,
        oxygen_score: calculated.o2_score,
        systolic_bp: newEws.systolic_bp,
        bp_score: calculated.bp_score,
        heart_rate: newEws.heart_rate,
        hr_score: calculated.hr_score,
        consciousness_level: newEws.consciousness_level,
        consciousness_score: calculated.cons_score,
        temperature_celsius: newEws.temperature_celsius,
        temp_score: calculated.temp_score,
        total_ews_score: calculated.total,
        escalation_action: calculated.escalation
      });
      const updated = await DB.getDialysisVitalSignsEws(session.id);
      setEwsList(updated);
      showNotification(`تم تسجيل العلامات الحيوية بنجاح (EWS: ${calculated.total})`);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل العلامات الحيوية');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEws = async (id: string) => {
    if (!confirm('هل تريد حذف هذا السجل للعلامات الحيوية؟')) return;
    try {
      await DB.deleteDialysisVitalSignsEws(id);
      setEwsList(ewsList.filter(item => item.id !== id));
      showNotification('تم حذف القراءة');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل الحذف');
    }
  };

  // 5. Add Pain/Glucose & Medical Logs
  const handleAddPainGlucose = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DB.addDialysisPainGlucoseLog({
        session_id: session.id,
        log_time: new Date().toISOString(),
        pain_assessment_score: newPainScore,
        blood_glucose_level: newGlucose,
        withdrawal_amount_ml: newWithdrawal
      });
      const updated = await DB.getDialysisPainGlucoseLogs(session.id);
      setPainGlucoseLogs(updated);
      setNewGlucose(undefined);
      setNewWithdrawal(undefined);
      showNotification('تم تسجيل قياسات الألم وسكر الدم ومعدل السحب');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ القراءة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePainGlucose = async (id: string) => {
    if (!confirm('حذف هذا القيد؟')) return;
    try {
      await DB.deleteDialysisPainGlucoseLog(id);
      setPainGlucoseLogs(painGlucoseLogs.filter(item => item.id !== id));
      showNotification('تم الحذف');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleAddMedicalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedComplaint.trim() && !newMedFindings.trim()) return;
    setSaving(true);
    try {
      await DB.addDialysisMedicalCareLog({
        session_id: session.id,
        log_time: new Date().toISOString(),
        complaint: newMedComplaint,
        examination_findings: newMedFindings
      });
      const updated = await DB.getDialysisMedicalCareLogs(session.id);
      setMedicalLogs(updated);
      setNewMedComplaint('');
      setNewMedFindings('');
      showNotification('تم تسجيل متابعة المرور الطبي بنجاح');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ المرور الطبي');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedicalLog = async (id: string) => {
    if (!confirm('حذف هذا السجل الطبي؟')) return;
    try {
      await DB.deleteDialysisMedicalCareLog(id);
      setMedicalLogs(medicalLogs.filter(item => item.id !== id));
      showNotification('تم الحذف');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 6. Add Medication Admin
  const handleAddMedAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedDrug.trim()) return;
    setSaving(true);
    try {
      await DB.addDialysisMedicationAdmin({
        session_id: session.id,
        drug_name: newMedDrug,
        dose: newMedDose,
        route: newMedRoute,
        instructions: newMedInstructions,
        administered_datetime: new Date().toISOString(),
        doctor_signature: newMedDocSig,
        nurse_signature: newMedNurseSig
      });
      const updated = await DB.getDialysisMedicationAdmins(session.id);
      setMedAdmins(updated);
      setNewMedDrug('');
      setNewMedDose('');
      setNewMedInstructions('');
      showNotification('تم توثيق إعطاء الدواء بنجاح في سجل MAR');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تسجيل إعطاء الدواء');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMedAdmin = async (id: string) => {
    if (!confirm('حذف هذا الدواء من سجل الجلسة؟')) return;
    try {
      await DB.deleteDialysisMedicationAdmin(id);
      setMedAdmins(medAdmins.filter(item => item.id !== id));
      showNotification('تم الحذف');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // 7. Save Health Education
  const handleSaveHealthEdu = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await DB.saveDialysisHealthEducation({
        ...healthEdu,
        patient_id: session.patient_id,
        session_id: session.id
      });
      setHealthEdu(saved);
      showNotification('تم حفظ تقييم التثقيف الصحي بنجاح');
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ التثقيف الصحي');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-6xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-cyan-800 text-white px-8 py-6 rounded-t-[2.5rem] flex justify-between items-center shrink-0 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center font-black text-2xl text-teal-200">
              <Stethoscope size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">التقييم التمريضي الشامل لوحدة الغسيل الكلوي</h2>
                <span className="bg-teal-500/30 text-teal-100 border border-teal-400/30 px-3 py-0.5 rounded-full text-xs font-bold">
                  نموذج الجلسة المعتمد
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-bold mt-1 flex items-center gap-3">
                <span>المريض: <strong className="text-white text-sm">{session.patients?.name || 'غير محدد'}</strong></span>
                <span>•</span>
                <span>الغرفة: <strong className="text-white">{session.room || 'غير محدد'}</strong></span>
                <span>•</span>
                <span>تاريخ الجلسة: <strong className="text-white">{session.date}</strong></span>
                <span>•</span>
                <span>وقت البدء: <strong className="text-white">{session.start_time}</strong></span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all text-white border border-white/20"
          >
            <X size={24} />
          </button>
        </div>

        {/* Global Alert Notification */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm animate-in fade-in">
            <AlertTriangle className="text-rose-600 shrink-0" size={20} />
            <div className="flex-1">{errorMsg}</div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-700 font-black text-lg">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-4 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm animate-in fade-in">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'assessment'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText size={16} /> 1. التقييم الأساسي وفك الوصلة
          </button>
          <button
            onClick={() => setActiveTab('fall_risk')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'fall_risk'
                ? 'bg-slate-50 border-amber-500 text-amber-900 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle size={16} className={isFallReviewOverdue ? "text-rose-600 animate-bounce" : "text-amber-500"} />
            <span>2. مراجعة وقاية السقوط ({fallReviews.length})</span>
            {isFallReviewOverdue ? (
              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                مطلوب مراجعة!
              </span>
            ) : fallReviews.length > 0 ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                موثقة
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'lines'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Activity size={16} /> 3. الوصلات والقساطر ({accessLines.length})
          </button>
          <button
            onClick={() => setActiveTab('notes_plan')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'notes_plan'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={16} /> 4. الملاحظات وخطة الرعاية
          </button>
          <button
            onClick={() => setActiveTab('ews')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'ews'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <HeartPulse size={16} /> 5. العلامات الحيوية والإنذار المبكر (EWS)
          </button>
          <button
            onClick={() => setActiveTab('pain_glucose_med')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'pain_glucose_med'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert size={16} /> 6. الألم والسكر والمرور الطبي
          </button>
          <button
            onClick={() => setActiveTab('medication')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'medication'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Pill size={16} /> 7. سجل الأدوية (MAR)
          </button>
          <button
            onClick={() => setActiveTab('education')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'education'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <GraduationCap size={16} /> 8. التثقيف الصحي
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
              <RefreshCw className="animate-spin text-teal-600" size={36} />
              <p className="font-bold">جاري تحميل بيانات السجل التمريضي للجلسة...</p>
            </div>
          ) : (
            <>
              {/* ========================================================================= */}
              {/* TAB 1: Main Nursing Assessment Form */}
              {/* ========================================================================= */}
              {activeTab === 'assessment' && (
                <form onSubmit={handleSaveAssessment} className="space-y-8 animate-in fade-in">
                  
                  {/* Section: Basic Data & History */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                      <FileText className="text-teal-600" size={20} /> مصدر المعلومات والشكوى وخطة الرعاية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">مصدر المعلومات</label>
                        <select 
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-sm outline-none focus:border-teal-500"
                          value={assessment.information_source || 'patient'}
                          onChange={(e) => setAssessment({ ...assessment, information_source: e.target.value })}
                        >
                          <option value="patient">المريض نفسه</option>
                          <option value="family">الأسرة</option>
                          <option value="relative">مرافق / قريب</option>
                          <option value="external_facility">منشأة خارجية / تحويل</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">تاريخ ووقت التقييم</label>
                        <input 
                          type="datetime-local" 
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-sm outline-none focus:border-teal-500"
                          value={assessment.assessment_datetime ? assessment.assessment_datetime.slice(0, 16) : ''}
                          onChange={(e) => setAssessment({ ...assessment, assessment_datetime: new Date(e.target.value).toISOString() })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">توقيع الطبيب المتابع</label>
                        <input 
                          type="text" 
                          placeholder="د. ..." 
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-sm outline-none focus:border-teal-500"
                          value={assessment.doctor_signature || ''}
                          onChange={(e) => setAssessment({ ...assessment, doctor_signature: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-bold text-slate-500">الشكوى الرئيسية (Chief Complaint)</label>
                        <input 
                          type="text" 
                          placeholder="مثلاً: تعب عام، انتفاخ في الساقين، ضيق تنفس خفيف.." 
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-sm outline-none focus:border-teal-500"
                          value={assessment.chief_complaint || ''}
                          onChange={(e) => setAssessment({ ...assessment, chief_complaint: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1 md:col-span-3">
                        <label className="text-xs font-bold text-slate-500">الخطة العلاجية والطبية للجلسة (Medical Care Plan)</label>
                        <textarea 
                          placeholder="تعليمات الطبيب، معدل سحب السوائل UF المستهدف، نوع الفلتر، مدة الجلسة.." 
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-sm outline-none focus:border-teal-500 h-20"
                          value={assessment.medical_care_plan || ''}
                          onChange={(e) => setAssessment({ ...assessment, medical_care_plan: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section: Clinical Checks, Pain, Allergies & Fall Risk */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pain & Allergy */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                        <ShieldAlert className="text-teal-600" size={20} /> تقييم الألم والحساسية
                      </h3>
                      
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border">
                        <label className="flex items-center gap-2 font-black text-sm text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded accent-teal-600"
                            checked={!!assessment.pre_dialysis_pain?.has_pain}
                            onChange={(e) => setAssessment({
                              ...assessment,
                              pre_dialysis_pain: {
                                ...assessment.pre_dialysis_pain,
                                has_pain: e.target.checked
                              }
                            })}
                          />
                          يوجد ألم قبل بدء الجلسة
                        </label>
                        {assessment.pre_dialysis_pain?.has_pain && (
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                            <input 
                              placeholder="موضع الألم" 
                              className="p-2 border rounded-xl bg-white text-xs font-bold"
                              value={assessment.pre_dialysis_pain?.location || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                pre_dialysis_pain: { ...assessment.pre_dialysis_pain, has_pain: true, location: e.target.value }
                              })}
                            />
                            <input 
                              placeholder="بدايته ومدته" 
                              className="p-2 border rounded-xl bg-white text-xs font-bold"
                              value={assessment.pre_dialysis_pain?.duration || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                pre_dialysis_pain: { ...assessment.pre_dialysis_pain, has_pain: true, duration: e.target.value }
                              })}
                            />
                            <input 
                              placeholder="خصائص الألم (حاد، نابض..)" 
                              className="col-span-2 p-2 border rounded-xl bg-white text-xs font-bold"
                              value={assessment.pre_dialysis_pain?.characteristics || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                pre_dialysis_pain: { ...assessment.pre_dialysis_pain, has_pain: true, characteristics: e.target.value }
                              })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-slate-50 rounded-2xl space-y-3 border">
                        <label className="flex items-center gap-2 font-black text-sm text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded accent-rose-600"
                            checked={!!assessment.allergy?.has_allergy}
                            onChange={(e) => setAssessment({
                              ...assessment,
                              allergy: { ...assessment.allergy, has_allergy: e.target.checked }
                            })}
                          />
                          يوجد حساسية معروفة (أدوية / أطعمة / أخرى)
                        </label>
                        {assessment.allergy?.has_allergy && (
                          <input 
                            placeholder="تفاصيل الحساسية والمواد المسببة.." 
                            className="w-full p-2 border rounded-xl bg-white text-xs font-bold"
                            value={assessment.allergy?.details || ''}
                            onChange={(e) => setAssessment({
                              ...assessment,
                              allergy: { has_allergy: true, details: e.target.value }
                            })}
                          />
                        )}
                      </div>
                    </div>

                    {/* Fall Risk Prevention Measures */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="text-amber-600" size={20} />
                          <div>
                            <h3 className="text-base font-black text-teal-900">إجراءات الوقاية من خطر السقوط</h3>
                            <p className="text-[11px] text-slate-500 font-bold">معايير السلامة الإلزامية للمريض قبل وأثناء وبعد الجلسة</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('fall_risk')}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <ShieldAlert size={14} className="text-amber-600" />
                          <span>المراجعة الدورية للسقوط ({fallReviews.length})</span>
                          {isFallReviewOverdue && (
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                          )}
                        </button>
                      </div>

                      {/* Status summary banner */}
                      {isFallReviewOverdue ? (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-900 font-bold">
                          <span className="flex items-center gap-2">
                            <AlertCircle size={16} className="text-rose-600 animate-pulse shrink-0" />
                            تنبيه: مراجعة الساعتين أو الـ 4 ساعات مستحقة الآن لحماية المريض!
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab('fall_risk')}
                            className="text-rose-700 underline hover:text-rose-900 font-black text-xs"
                          >
                            توثيق الآن ←
                          </button>
                        </div>
                      ) : fallReviews.length > 0 ? (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-bold">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            تم توثيق {fallReviews.length} مراجعة وقاية سقوط لهذه الجلسة بنجاح
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold">
                            آخر مراجعة: {fallReviews[fallReviews.length - 1].reviewer_name}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 pt-1">
                        <span>قائمة التحقق من التدابير الوقائية الأساسية:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssessment(prev => ({
                              ...prev,
                              fall_risk_measures: {
                                card_placed: true,
                                bed_low_brakes_locked: true,
                                safe_environment: true,
                                frequent_toilet_check: true,
                                staff_assist_walking: true,
                                patient_education: true
                              }
                            }));
                          }}
                          className="text-teal-700 hover:text-teal-900 font-black underline text-[11px]"
                        >
                          تحديد كافة التدابير الـ 6
                        </button>
                      </div>

                      <div className="space-y-2">
                        {[
                          { key: 'card_placed', label: 'وضع بطاقة تعريف خطر السقوط بجانب المريض' },
                          { key: 'bed_low_brakes_locked', label: 'خفض السرير لأدنى مستوى وتأمين الفرامل' },
                          { key: 'safe_environment', label: 'توفير بيئة آمنة وخالية من العوائق والأسلاك' },
                          { key: 'frequent_toilet_check', label: 'المتابعة الدورية للذهاب لدورة المياه' },
                          { key: 'staff_assist_walking', label: 'مساعدة طاقم التمريض عند الوقوف والحركة' },
                          { key: 'patient_education', label: 'تثقيف وتوعية المريض والمرافق بمخاطر السقوط' },
                        ].map(measure => (
                          <label key={measure.key} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl hover:bg-teal-50/50 cursor-pointer transition-colors text-xs font-bold text-slate-700 border border-slate-100">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded accent-teal-600"
                              checked={!!(assessment.fall_risk_measures as any)?.[measure.key]}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                fall_risk_measures: {
                                  ...assessment.fall_risk_measures,
                                  [measure.key]: e.target.checked
                                }
                              })}
                            />
                            {measure.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section: Access Review & Fluid Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Access Site Review */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="text-teal-600" size={20} />
                          <div>
                            <h3 className="text-base font-black text-teal-900">فحص وصلة الغسيل وفكها (Vascular Access)</h3>
                            <p className="text-[11px] text-slate-500 font-bold">متابعة كفاءة الوصلة وتوثيق مواعيد التوصيل وفك الوصلة</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-500">نوع الوصلة</label>
                            <select 
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              value={assessment.access_review?.access_type || 'av_fistula'}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                access_review: { ...assessment.access_review, access_type: e.target.value }
                              })}
                            >
                              <option value="av_fistula">ناسور شرياني وريدي (AV Fistula)</option>
                              <option value="cvc_central_line">قسطرة وريدية مركزية (CVC Line)</option>
                              <option value="av_graft">وصلة صناعية (AV Graft)</option>
                              <option value="peripheral_cannula">كانيولا طرفية</option>
                            </select>
                          </div>
                          <div>
                            <label className="font-bold text-slate-500">موضع الوصلة</label>
                            <input 
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              placeholder="مثلاً: الساعد الأيسر"
                              value={assessment.access_review?.insertion_site || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                access_review: { ...assessment.access_review, insertion_site: e.target.value }
                              })}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-500">نتيجة فحص النبض والتدفق (Thrill / Bruit)</label>
                          <input 
                            className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                            placeholder="طبيعي وملموس ومسموع.."
                            value={assessment.access_review?.pulse_check_result || ''}
                            onChange={(e) => setAssessment({
                              ...assessment,
                              access_review: { ...assessment.access_review, pulse_check_result: e.target.value }
                            })}
                          />
                        </div>

                        {/* Dedicated Connection & Disconnection Times Card */}
                        <div className="bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/60 p-4 rounded-2xl border-2 border-blue-200/80 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                              <Scissors size={14} className="text-blue-600" />
                              توثيق أوقات الوصلة وفكها (Connection & Disconnection)
                            </span>
                            {connectionDurationFormatted && (
                              <span className="bg-blue-100 text-blue-900 border border-blue-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                                مدة التوصيل: {connectionDurationFormatted}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold text-slate-600 flex items-center gap-1 mb-1">
                                <Clock size={12} className="text-teal-600" />
                                وقت توصيل الوصلة
                              </label>
                              <input 
                                type="time"
                                className="w-full border p-2.5 rounded-xl bg-white font-bold font-mono text-slate-800"
                                value={assessment.access_review?.connection_time || session.start_time || ''}
                                onChange={(e) => setAssessment({
                                  ...assessment,
                                  access_review: { ...assessment.access_review, connection_time: e.target.value }
                                })}
                              />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="font-bold text-blue-900 flex items-center gap-1">
                                  <Clock size={12} className="text-blue-600" />
                                  وقت فك الوصلة
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const now = new Date().toTimeString().slice(0, 5);
                                    setAssessment({
                                      ...assessment,
                                      access_review: { ...assessment.access_review, disconnection_time: now }
                                    });
                                  }}
                                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-black transition-all shadow-sm"
                                >
                                  الآن
                                </button>
                              </div>
                              <input 
                                type="time"
                                className="w-full border-2 p-2.5 rounded-xl bg-white font-bold font-mono text-blue-950 border-blue-300 focus:border-blue-600 outline-none"
                                value={assessment.access_review?.disconnection_time || session.disconnection_time || ''}
                                onChange={(e) => setAssessment({
                                  ...assessment,
                                  access_review: { ...assessment.access_review, disconnection_time: e.target.value }
                                })}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {session.disconnection_time ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <Check size={13} /> موثق مسبقاً بالجلسة ({session.disconnection_time})
                                </span>
                              ) : (
                                'يمكنك حفظ وقت فك الوصلة مباشرة بالجلسة دون انتظار حفظ النموذج كاملاً'
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={handleQuickSyncDisconnectionTime}
                              disabled={savingDisconnection}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                            >
                              {savingDisconnection ? <RefreshCw className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                              تثبيت ومزامنة وقت الفك بالجلسة
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-500">مدة الضغط لوقف النزيف (دقائق)</label>
                            <input 
                              type="number"
                              min="0"
                              max="120"
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              placeholder="مثلاً: 15"
                              value={assessment.access_review?.hemostasis_time_minutes ?? ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                access_review: { ...assessment.access_review, hemostasis_time_minutes: e.target.value ? parseInt(e.target.value) : undefined }
                              })}
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-500">حالة موضع الوصلة بعد الفك</label>
                            <input 
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              placeholder="توقف النزيف، ضمادة معقمة، سليم.."
                              value={assessment.access_review?.access_condition_after_removal || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                access_review: { ...assessment.access_review, access_condition_after_removal: e.target.value }
                              })}
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 font-bold cursor-pointer pt-1">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded accent-teal-600"
                            checked={assessment.access_review?.working_efficiently ?? true}
                            onChange={(e) => setAssessment({
                              ...assessment,
                              access_review: { ...assessment.access_review, working_efficiently: e.target.checked }
                            })}
                          />
                          الوصلة تعمل بكفاءة وبدون انسداد أو ارتشاح
                        </label>
                      </div>
                    </div>

                    {/* Fluid Status & Edema */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                        <HeartPulse className="text-teal-600" size={20} /> حالة السوائل والتورم والوزن المستهدف
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-500">الوزن المستهدف / الجاف (كجم)</label>
                            <input 
                              type="number"
                              step="0.1"
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              value={assessment.fluid_status?.target_weight_kg || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                fluid_status: { ...assessment.fluid_status, target_weight_kg: parseFloat(e.target.value) || 0 }
                              })}
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-500">أوردة الرقبة (Neck Veins)</label>
                            <select 
                              className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold"
                              value={assessment.fluid_status?.neck_veins || 'flat'}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                fluid_status: { ...assessment.fluid_status, neck_veins: e.target.value }
                              })}
                            >
                              <option value="flat">مستوية وطبيعية (Flat)</option>
                              <option value="distended">محتقنة / منتفخة (Distended)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 font-bold cursor-pointer bg-slate-50 p-2.5 rounded-xl border">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded accent-teal-600"
                              checked={!!assessment.edema?.present}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                edema: { ...assessment.edema, present: e.target.checked }
                              })}
                            />
                            يوجد تورم (Edema)
                          </label>

                          <label className="flex items-center gap-2 font-bold cursor-pointer bg-slate-50 p-2.5 rounded-xl border">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded accent-teal-600"
                              checked={!!assessment.fluid_status?.tongue_dryness}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                fluid_status: { ...assessment.fluid_status, tongue_dryness: e.target.checked }
                              })}
                            />
                            جفاف اللسان / الفم
                          </label>
                        </div>

                        {assessment.edema?.present && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <input 
                              placeholder="موضع التورم (الكاحلين، الساقين..)" 
                              className="border p-2 rounded-xl bg-white font-bold"
                              value={assessment.edema?.location || ''}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                edema: { ...assessment.edema, present: true, location: e.target.value }
                              })}
                            />
                            <select 
                              className="border p-2 rounded-xl bg-white font-bold"
                              value={assessment.edema?.grade || '+1'}
                              onChange={(e) => setAssessment({
                                ...assessment,
                                edema: { ...assessment.edema, present: true, grade: e.target.value }
                              })}
                            >
                              <option value="+1">+1 (خفيف)</option>
                              <option value="+2">+2 (متوسط)</option>
                              <option value="+3">+3 (شديد)</option>
                              <option value="+4">+4 (شديد جداً Anasarca)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section: Checklists & Systems Review */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                      <CheckCircle2 className="text-teal-600" size={20} /> مراجعة أوامر الطبيب والفحوصات والأجهزة
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-teal-600"
                          checked={!!assessment.doctor_orders_reviewed}
                          onChange={(e) => setAssessment({ ...assessment, doctor_orders_reviewed: e.target.checked })}
                        />
                        تمت مراجعة أوامر الطبيب للجلسة
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-teal-600"
                          checked={!!assessment.lab_results_reviewed}
                          onChange={(e) => setAssessment({ ...assessment, lab_results_reviewed: e.target.checked })}
                        />
                        تمت مراجعة نتائج التحاليل الأخيرة
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-teal-600"
                          checked={!!assessment.dialysis_machine_check_reviewed}
                          onChange={(e) => setAssessment({ ...assessment, dialysis_machine_check_reviewed: e.target.checked })}
                        />
                        تم فحص واختبار ماكينة الغسيل
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-rose-600"
                          checked={!!assessment.breathing_difficulty}
                          onChange={(e) => setAssessment({ ...assessment, breathing_difficulty: e.target.checked })}
                        />
                        يوجد صعوبة في التنفس (Dyspnea)
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-rose-600"
                          checked={!!assessment.chest_pain}
                          onChange={(e) => setAssessment({ ...assessment, chest_pain: e.target.checked })}
                        />
                        يوجد ألم بالصدر (Chest Pain)
                      </label>

                      <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border font-bold text-xs text-slate-700 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded accent-amber-600"
                          checked={!!assessment.abuse_neglect_signs}
                          onChange={(e) => setAssessment({ ...assessment, abuse_neglect_signs: e.target.checked })}
                        />
                        علامات إهمال أو سوء معاملة
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">التقييم النفسي</label>
                        <select 
                          className="w-full border rounded-2xl p-2.5 bg-slate-50 font-bold text-xs outline-none"
                          value={assessment.psychological_assessment || 'no_problem'}
                          onChange={(e) => setAssessment({ ...assessment, psychological_assessment: e.target.value })}
                        >
                          <option value="no_problem">مستقر ومتعاون (No Problem)</option>
                          <option value="tense">متوتر وقلق (Tense)</option>
                          <option value="frustrated">محبط / مكتئب (Frustrated)</option>
                          <option value="uncooperative">غير متعاون (Uncooperative)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">تقييم الجلد</label>
                        <select 
                          className="w-full border rounded-2xl p-2.5 bg-slate-50 font-bold text-xs outline-none"
                          value={assessment.skin_assessment || 'healthy'}
                          onChange={(e) => setAssessment({ ...assessment, skin_assessment: e.target.value })}
                        >
                          <option value="healthy">سليم وطبيعي (Healthy)</option>
                          <option value="wrinkled">جاف ومتجعد (Wrinkled / Dry)</option>
                          <option value="inflamed">ملتهب أو به كدمات (Inflamed / Bruised)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">الدعم المعنوي والروحي</label>
                        <select 
                          className="w-full border rounded-2xl p-2.5 bg-slate-50 font-bold text-xs outline-none"
                          value={assessment.spiritual_assessment || 'no_need'}
                          onChange={(e) => setAssessment({ ...assessment, spiritual_assessment: e.target.value })}
                        >
                          <option value="no_need">لا يحتاج تدخل خاص</option>
                          <option value="needs_support">يحتاج دعم معنوي وإرشاد</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-4 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-black shadow-lg shadow-teal-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                      حفظ التقييم التمريضي الأساسي
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: Periodic Fall Risk Review (Accredited Protocol)                   */}
              {/* ========================================================================= */}
              {activeTab === 'fall_risk' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* Top Status & Timing Banner */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-teal-500/10 p-6 rounded-3xl border border-amber-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-600" size={24} />
                        <h3 className="text-xl font-black text-amber-950">بروتوكول المراجعة الدورية لوقاية السقوط</h3>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-0.5 rounded-full text-xs font-bold">
                          المعيار الدولي لجودة وأمان المرضى
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold mt-1">
                        مراجعة إلزامية وتوثيق دوري بعد ساعتين (منتصف الجلسة) وبعد 4 ساعات (نهاية الجلسة وقبل مغادرة السرير)
                      </p>
                    </div>

                    <div className="bg-white px-4 py-2.5 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3">
                      <Clock className="text-amber-600 shrink-0" size={20} />
                      <div className="text-xs">
                        <span className="text-slate-500 font-bold block">الوقت المنقضي من الجلسة:</span>
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {Math.floor(elapsedMinutes / 60)} ساعة و {elapsedMinutes % 60} دقيقة ({elapsedMinutes} دقيقة)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Status Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 2-Hour Milestone Card */}
                    <div className={`p-5 rounded-3xl border-2 transition-all ${
                      has2HReview 
                        ? 'bg-emerald-50/70 border-emerald-300' 
                        : is2HDue 
                        ? 'bg-rose-50/80 border-rose-400 shadow-md shadow-rose-200/50' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                          <Footprints size={16} className={has2HReview ? "text-emerald-600" : is2HDue ? "text-rose-600" : "text-slate-400"} />
                          مراجعة الساعتين (2 Hours)
                        </span>
                        {has2HReview ? (
                          <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                            <CheckCircle2 size={11} /> مكتملة
                          </span>
                        ) : is2HDue ? (
                          <span className="bg-rose-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                            <AlertCircle size={11} /> مستحقة الآن!
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            متبقي {Math.max(0, 120 - elapsedMinutes)} دقيقة
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        تقييم منتصف الجلسة لتأكيد ثبات المريض، سلامة الحواجز، وتأمين فرامل السرير والجرس.
                      </p>
                      {is2HDue && !has2HReview && (
                        <button
                          type="button"
                          onClick={() => setCurrentFallStage('2_HOURS')}
                          className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          اختيار هذه المرحلة للتوثيق ←
                        </button>
                      )}
                    </div>

                    {/* 4-Hour Milestone Card */}
                    <div className={`p-5 rounded-3xl border-2 transition-all ${
                      has4HReview 
                        ? 'bg-emerald-50/70 border-emerald-300' 
                        : is4HDue 
                        ? 'bg-rose-50/80 border-rose-400 shadow-md shadow-rose-200/50' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                          <BedDouble size={16} className={has4HReview ? "text-emerald-600" : is4HDue ? "text-rose-600" : "text-slate-400"} />
                          مراجعة 4 ساعات (قبل الوقوف)
                        </span>
                        {has4HReview ? (
                          <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                            <CheckCircle2 size={11} /> مكتملة
                          </span>
                        ) : is4HDue ? (
                          <span className="bg-rose-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">
                            <AlertCircle size={11} /> مستحقة الآن!
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            متبقي {Math.max(0, 240 - elapsedMinutes)} دقيقة
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        تقييم نهاية الجلسة قبل فك الوصلة أو السماح للمريض بالوقوف لتجنب هبوط الضغط والدوخة.
                      </p>
                      {is4HDue && !has4HReview && (
                        <button
                          type="button"
                          onClick={() => setCurrentFallStage('4_HOURS')}
                          className="mt-3 w-full py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          اختيار هذه المرحلة للتوثيق ←
                        </button>
                      )}
                    </div>

                    {/* Extra / Summary Card */}
                    <div className="p-5 rounded-3xl border-2 border-slate-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                          <History size={16} className="text-teal-600" />
                          إجمالي المراجعات الموثقة
                        </span>
                        <span className="bg-teal-100 text-teal-900 text-xs px-2.5 py-0.5 rounded-full font-black">
                          {fallReviews.length} مراجعة
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        يمكن تسجيل مراجعات إضافية في أي وقت عند حدوث تغير بحالة المريض أو عند الانتقال.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCurrentFallStage('EXTRA')}
                        className="mt-3 w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1"
                      >
                        توثيق مراجعة إضافية / طارئة
                      </button>
                    </div>
                  </div>

                  {/* Fall Risk Form */}
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                      <div>
                        <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <ShieldAlert className="text-amber-600" size={20} />
                          تسجيل مراجعة جديدة لوقاية السقوط
                        </h4>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          تحقق من تطبيق التدابير الوقائية الـ 9 واعتمد المراجعة بالسجل الطبي
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAllFallPrecautions(true)}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-black transition-all"
                        >
                          تحديد كافة التدابير الـ 9
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAllFallPrecautions(false)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                    </div>

                    {/* Stage & Risk Level Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Review Stage */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">مرحلة المراجعة</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: '2_HOURS', label: 'بعد ساعتين', sub: 'منتصف الجلسة' },
                            { value: '4_HOURS', label: 'بعد 4 ساعات', sub: 'نهاية الجلسة' },
                            { value: 'EXTRA', label: 'إضافية', sub: 'عند اللزوم' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setCurrentFallStage(opt.value as any)}
                              className={`p-3 rounded-2xl border-2 text-center transition-all ${
                                currentFallStage === opt.value
                                  ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-black shadow-sm'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold'
                              }`}
                            >
                              <div className="text-xs">{opt.label}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Risk Level */}
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-2">مستوى خطورة السقوط المقدر</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'HIGH', label: 'عالي الخطورة', score: 3, bg: 'bg-rose-50 border-rose-400 text-rose-900', active: 'border-rose-600 bg-rose-600 text-white' },
                            { value: 'MEDIUM', label: 'متوسط الخطورة', score: 2, bg: 'bg-amber-50 border-amber-400 text-amber-900', active: 'border-amber-500 bg-amber-500 text-white' },
                            { value: 'LOW', label: 'منخفض الخطورة', score: 1, bg: 'bg-emerald-50 border-emerald-400 text-emerald-900', active: 'border-emerald-600 bg-emerald-600 text-white' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setFallRiskLevel(opt.value as any)}
                              className={`p-3 rounded-2xl border-2 text-center transition-all ${
                                fallRiskLevel === opt.value
                                  ? opt.active + ' font-black shadow-md'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold'
                              }`}
                            >
                              <div className="text-xs">{opt.label}</div>
                              <div className="text-[10px] opacity-80 mt-0.5">درجة: {opt.score}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 9 Precautions Checklist */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-3">
                        قائمة تدابير وإجراءات الوقاية الـ 9 المعتمدة:
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { key: 'card_placed', label: 'وضع بطاقة تعريف خطر السقوط بجانب السرير / الكرسي', icon: AlertOctagon },
                          { key: 'bed_low_brakes_locked', label: 'خفض السرير لأدنى مستوى وتأمين قفل الفرامل', icon: BedDouble },
                          { key: 'side_rails_raised', label: 'رفع الحواجز الجانبية للسرير / الكرسي طوال الجلسة', icon: ShieldAlert },
                          { key: 'call_bell_within_reach', label: 'وضع جرس الاستدعاء في متناول يد المريض مباشرة', icon: BellRing },
                          { key: 'safe_environment_clear', label: 'توفير بيئة آمنة وخالية من العوائق والأسلاك والأرضيات المبتلة', icon: Sparkles },
                          { key: 'assisted_ambulation_only', label: 'المساعدة التمريضية الإلزامية عند النهوض أو المشي', icon: Footprints },
                          { key: 'frequent_toilet_check', label: 'المتابعة الدورية للذهاب لدورة المياه وتفريغ المثانة', icon: Clock },
                          { key: 'patient_relative_educated', label: 'توعية وتثقيف المريض والمرافق بمخاطر السقوط والدوخة', icon: GraduationCap },
                          { key: 'non_slip_footwear', label: 'التأكد من ارتداء أحذية مانعة للانزلاق قبل النزول من السرير', icon: UserCheck }
                        ].map(item => {
                          const IconComp = item.icon;
                          const isChecked = !!(fallPrecautions as any)[item.key];
                          return (
                            <label
                              key={item.key}
                              className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-amber-50/60 border-amber-300 text-amber-950 font-bold shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 font-medium'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded accent-amber-600 mt-0.5 shrink-0"
                                checked={isChecked}
                                onChange={(e) => setFallPrecautions({
                                  ...fallPrecautions,
                                  [item.key]: e.target.checked
                                })}
                              />
                              <div className="flex-1 text-xs leading-snug">
                                <span className="flex items-center gap-1.5 mb-1 font-black text-slate-800">
                                  <IconComp size={14} className={isChecked ? "text-amber-600" : "text-slate-400"} />
                                </span>
                                {item.label}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reviewer Name and Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">اسم الممرض القائم بالمراجعة *</label>
                        <input
                          type="text"
                          required
                          value={fallReviewerName}
                          onChange={(e) => setFallReviewerName(e.target.value)}
                          placeholder="اسم الممرض / الممرضة.."
                          className="w-full border p-2.5 rounded-2xl bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1">ملاحظات سريرية إضافية (اختياري)</label>
                        <input
                          type="text"
                          value={fallClinicalNotes}
                          onChange={(e) => setFallClinicalNotes(e.target.value)}
                          placeholder="استقرار العلامات، عدم وجود دوخة، تنبيه المرافق.."
                          className="w-full border p-2.5 rounded-2xl bg-slate-50 font-bold text-xs text-slate-800 outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSaveFallReview}
                        disabled={savingFallReview}
                        className="px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {savingFallReview ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                        حفظ واعتماد مراجعة وقاية السقوط بالسجل الطبي
                      </button>
                    </div>
                  </div>

                  {/* Previous Reviews Log Table */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <History size={16} className="text-teal-600" />
                      سجل مراجعات وقاية السقوط الموثقة لهذه الجلسة ({fallReviews.length})
                    </h4>

                    {fallReviews.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 font-bold text-xs space-y-1">
                        <AlertTriangle className="mx-auto text-slate-300" size={32} />
                        <p>لم يتم تسجيل أي مراجعة دورية لوقاية السقوط لهذه الجلسة حتى الآن.</p>
                        <p className="text-[11px] text-slate-400">يرجى تسجيل مراجعة الساعتين بعد ساعتين من بدء الجلسة لضمان أمان المريض.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-black border-b">
                              <th className="p-3">مرحلة المراجعة</th>
                              <th className="p-3">الوقت والتاريخ</th>
                              <th className="p-3">الممرض القائم بالمراجعة</th>
                              <th className="p-3">مستوى الخطورة</th>
                              <th className="p-3">التدابير المطبقة</th>
                              <th className="p-3">ملاحظات</th>
                              <th className="p-3 text-center">إجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                            {fallReviews.map(review => {
                              const appliedCount = [
                                review.card_placed,
                                review.bed_low_brakes_locked,
                                review.side_rails_raised,
                                review.call_bell_within_reach,
                                review.safe_environment_clear,
                                review.assisted_ambulation_only,
                                review.frequent_toilet_check,
                                review.patient_relative_educated,
                                review.non_slip_footwear
                              ].filter(Boolean).length;

                              const stageLabel = review.review_stage === '2_HOURS' 
                                ? 'مراجعة الساعتين (منتصف الجلسة)' 
                                : review.review_stage === '4_HOURS' 
                                ? 'مراجعة 4 ساعات (نهاية الجلسة)' 
                                : 'مراجعة إضافية';

                              return (
                                <tr key={review.id} className="hover:bg-amber-50/30 transition-colors">
                                  <td className="p-3 font-black text-slate-900">
                                    <span className="bg-slate-100 px-2.5 py-1 rounded-xl">
                                      {stageLabel}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {review.review_time ? new Date(review.review_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                  </td>
                                  <td className="p-3 text-teal-800 font-black">
                                    {review.reviewer_name}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      review.risk_level === 'HIGH' 
                                        ? 'bg-rose-100 text-rose-800' 
                                        : review.risk_level === 'MEDIUM' 
                                        ? 'bg-amber-100 text-amber-800' 
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {review.risk_level === 'HIGH' ? 'عالي الخطورة (3)' : review.risk_level === 'MEDIUM' ? 'متوسط الخطورة (2)' : 'منخفض الخطورة (1)'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-black">
                                      {appliedCount} من 9 تدابير
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-500 font-medium">
                                    {review.clinical_notes || '-'}
                                  </td>
                                  <td className="p-3 text-center">
                                    {review.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteFallReview(review.id!)}
                                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                        title="حذف المراجعة"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: Vascular & Access Lines (Cumulative) */}
              {/* ========================================================================= */}
              {activeTab === 'lines' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">سجل التركيبات والقساطر والوصلات الوريدية للمريض</h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">سجل تراكمي يُسجل لمرة واحدة ويُحدث عند الفك أو الاستبدال</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewLineForm(!showNewLineForm)}
                      className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-md"
                    >
                      <Plus size={16} /> تركيب وصلة / قسطرة جديدة
                    </button>
                  </div>

                  {/* New Line Form Modal/Box */}
                  {showNewLineForm && (
                    <form onSubmit={handleAddLine} className="bg-teal-50/70 p-6 rounded-3xl border-2 border-teal-200 space-y-4">
                      <h4 className="font-black text-teal-900 text-sm">تسجيل وصلة أو قسطرة جديدة</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">نوع الوصلة / الأنبوب</label>
                          <select 
                            required
                            className="w-full border rounded-2xl p-3 bg-white font-bold text-xs"
                            value={newLineData.line_type || 'av_fistula'}
                            onChange={(e) => setNewLineData({ ...newLineData, line_type: e.target.value })}
                          >
                            <option value="av_fistula">ناسور شرياني وريدي (AV Fistula)</option>
                            <option value="cvc_central_line">قسطرة وريدية مركزية (CVC Line)</option>
                            <option value="peripheral_cannula">كانيولا طرفية (Peripheral Cannula)</option>
                            <option value="urinary_catheter">قسطرة بولية (Urinary Catheter)</option>
                            <option value="tracheal_tube">أنبوبة حنجرية (Tracheal Tube)</option>
                            <option value="tracheostomy">شق حنجري (Tracheostomy)</option>
                            <option value="chest_tube">أنبوبة صدرية (Chest Tube)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">موضع التركيب</label>
                          <input 
                            required
                            placeholder="مثلاً: الوريد الوداجي الأيمن / الساعد الأيسر"
                            className="w-full border rounded-2xl p-3 bg-white font-bold text-xs"
                            value={newLineData.insertion_site || ''}
                            onChange={(e) => setNewLineData({ ...newLineData, insertion_site: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-600">تاريخ ووقت التركيب</label>
                          <input 
                            type="datetime-local"
                            required
                            className="w-full border rounded-2xl p-3 bg-white font-bold text-xs"
                            value={newLineData.insertion_datetime ? newLineData.insertion_datetime.slice(0, 16) : ''}
                            onChange={(e) => setNewLineData({ ...newLineData, insertion_datetime: new Date(e.target.value).toISOString() })}
                          />
                        </div>

                        <div className="space-y-1 md:col-span-3">
                          <label className="text-xs font-bold text-slate-600">الطبيب / الأخصائي المسؤول عن التركيب</label>
                          <input 
                            placeholder="اسم الطبيب"
                            className="w-full border rounded-2xl p-3 bg-white font-bold text-xs"
                            value={newLineData.responsible_doctor || ''}
                            onChange={(e) => setNewLineData({ ...newLineData, responsible_doctor: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowNewLineForm(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white rounded-xl border"
                        >
                          إلغاء
                        </button>
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="px-6 py-2 bg-teal-700 text-white rounded-xl text-xs font-black"
                        >
                          حفظ الوصلة
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Access Lines */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/70 border-b text-slate-600 font-black">
                        <tr>
                          <th className="p-4">نوع الوصلة</th>
                          <th className="p-4">الموضع</th>
                          <th className="p-4">تاريخ التركيب</th>
                          <th className="p-4">الطبيب المسؤول</th>
                          <th className="p-4">الحالة</th>
                          <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {accessLines.map(line => (
                          <tr key={line.id} className={line.status === 'removed' ? 'bg-slate-50/70 opacity-60' : 'hover:bg-teal-50/30'}>
                            <td className="p-4 font-black text-slate-800">
                              {line.line_type === 'av_fistula' && 'ناسور شرياني وريدي (AV Fistula)'}
                              {line.line_type === 'cvc_central_line' && 'قسطرة وريدية مركزية (CVC Line)'}
                              {line.line_type === 'peripheral_cannula' && 'كانيولا طرفية'}
                              {line.line_type === 'urinary_catheter' && 'قسطرة بولية'}
                              {line.line_type === 'tracheal_tube' && 'أنبوبة حنجرية'}
                              {line.line_type === 'tracheostomy' && 'شق حنجري'}
                              {line.line_type === 'chest_tube' && 'أنبوبة صدرية'}
                              {!['av_fistula', 'cvc_central_line', 'peripheral_cannula', 'urinary_catheter', 'tracheal_tube', 'tracheostomy', 'chest_tube'].includes(line.line_type) && line.line_type}
                            </td>
                            <td className="p-4 font-bold text-slate-600">{line.insertion_site || '-'}</td>
                            <td className="p-4 font-bold text-slate-600">{line.insertion_datetime ? new Date(line.insertion_datetime).toLocaleDateString('ar-EG') : '-'}</td>
                            <td className="p-4 font-bold text-slate-600">{line.responsible_doctor || '-'}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black inline-block ${
                                line.status === 'active' 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {line.status === 'active' ? 'نشطة ومستخدمة' : 'تم الفك / الاستبدال'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {line.status === 'active' ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRemovingLineId(line.id || null);
                                    setRemovalDateTime(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                                  }}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-black text-[11px] border border-rose-200"
                                >
                                  فك / تغيير الوصلة
                                </button>
                              ) : (
                                <div className="space-y-0.5 text-right">
                                  {line.removal_datetime && (
                                    <div className="text-[10px] text-rose-700 font-mono font-bold">
                                      وقت الفك: {new Date(line.removal_datetime).toLocaleDateString('ar-EG')} {new Date(line.removal_datetime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-bold block max-w-xs truncate">
                                    السبب: {line.removal_or_change_reason || 'غير محدد'}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {accessLines.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                              لا يوجد وصلات أو قساطر مسجلة لهذا المريض حتى الآن.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Removal Dialog */}
                  {removingLineId && (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border space-y-4">
                        <h4 className="font-black text-slate-800 text-base flex items-center gap-2">
                          <Clock size={18} className="text-rose-600" />
                          تأكيد فك أو استبدال الوصلة
                        </h4>
                        <p className="text-xs text-slate-500 font-bold">يرجى تسجيل وقت وتاريخ فك الوصلة وسبب الإزالة أو الاستبدال لحفظ التاريخ الطبي بدقة:</p>
                        
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">وقت وتاريخ فك الوصلة</label>
                          <input
                            type="datetime-local"
                            required
                            className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-xs outline-none focus:border-rose-500 font-mono"
                            value={removalDateTime}
                            onChange={(e) => setRemovalDateTime(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">سبب الفك أو الاستبدال</label>
                          <textarea
                            required
                            placeholder="مثلاً: انتهاء الجلسة، انسداد، التهاب، انتهاء مدة الاستخدام، تركيب وصلة جديدة.."
                            className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-xs h-24 outline-none focus:border-rose-500"
                            value={removalReason}
                            onChange={(e) => setRemovalReason(e.target.value)}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button 
                            type="button" 
                            onClick={() => { setRemovingLineId(null); setRemovalReason(''); setRemovalDateTime(''); }}
                            className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                          >
                            إلغاء
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleConfirmRemovalLine(removingLineId)}
                            className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md hover:bg-rose-700"
                          >
                            تأكيد الفك
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: Nursing Notes & Care Plan */}
              {/* ========================================================================= */}
              {activeTab === 'notes_plan' && (
                <div className="space-y-8 animate-in fade-in">
                  
                  {/* Part A: Nursing Notes */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <FileText className="text-teal-600" size={20} /> الملاحظات التمريضية الزمنية أثناء الجلسة (Nursing Notes)
                    </h3>

                    <form onSubmit={handleAddNote} className="flex flex-col sm:flex-row gap-3">
                      <input 
                        required
                        placeholder="أدخل ملاحظة تمريضية جديدة..." 
                        className="flex-1 border rounded-2xl p-3 bg-slate-50 font-bold text-xs outline-none focus:border-teal-500"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                      />
                      <input 
                        placeholder="توقيع الممرض/ة" 
                        className="w-full sm:w-48 border rounded-2xl p-3 bg-slate-50 font-bold text-xs outline-none focus:border-teal-500"
                        value={nurseNoteSignature}
                        onChange={(e) => setNurseNoteSignature(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shrink-0"
                      >
                        <Plus size={16} /> إضافة ملاحظة
                      </button>
                    </form>

                    <div className="space-y-2 pt-2">
                      {nursingNotes.map(note => (
                        <div key={note.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between items-start gap-4">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-bold text-slate-800 leading-relaxed">{note.note_text}</p>
                            <div className="text-[11px] text-slate-400 font-bold flex items-center gap-3">
                              <span className="flex items-center gap-1"><Clock size={12}/> {new Date(note.note_time).toLocaleTimeString('ar-EG')}</span>
                              {note.nurse_signature && <span>• الممرض/ة: {note.nurse_signature}</span>}
                            </div>
                          </div>
                          {note.id && (
                            <button 
                              type="button" 
                              onClick={() => handleDeleteNote(note.id!)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {nursingNotes.length === 0 && (
                        <p className="text-center py-6 text-xs text-slate-400 font-bold">لا توجد ملاحظات تمريضية مسجلة لهذه الجلسة.</p>
                      )}
                    </div>
                  </div>

                  {/* Part B: Nursing Care Plan */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <Sparkles className="text-teal-600" size={20} /> خطة الرعاية والتدخلات التمريضية (Nursing Care Plan)
                    </h3>

                    <form onSubmit={handleAddCarePlan} className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          placeholder="التقييم (Assessment)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newPlanAssessment}
                          onChange={(e) => setNewPlanAssessment(e.target.value)}
                        />
                        <input 
                          required
                          placeholder="التشخيص التمريضي (Nursing Diagnosis)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newPlanDiagnosis}
                          onChange={(e) => setNewPlanDiagnosis(e.target.value)}
                        />
                        <input 
                          placeholder="الهدف (Goal)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newPlanGoal}
                          onChange={(e) => setNewPlanGoal(e.target.value)}
                        />
                        <input 
                          required
                          placeholder="التدخلات التمريضية (Interventions)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newPlanInterventions}
                          onChange={(e) => setNewPlanInterventions(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <input 
                          placeholder="توقيع الممرض/ة المسؤول" 
                          className="border rounded-xl p-2 bg-white text-xs font-bold w-64"
                          value={newPlanSignature}
                          onChange={(e) => setNewPlanSignature(e.target.value)}
                        />
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="px-6 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-black shadow"
                        >
                          حفظ خطة الرعاية
                        </button>
                      </div>
                    </form>

                    <div className="space-y-3 pt-2">
                      {carePlans.map(plan => (
                        <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-black text-xs text-teal-800">التشخيص: {plan.nursing_diagnosis}</span>
                            {plan.id && (
                              <button onClick={() => handleDeleteCarePlan(plan.id!)} className="text-slate-400 hover:text-rose-600">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-slate-600">
                            <div>التقييم: <span className="text-slate-800">{plan.assessment || '-'}</span></div>
                            <div>الهدف: <span className="text-slate-800">{plan.goal || '-'}</span></div>
                            <div>التدخلات: <span className="text-slate-800">{plan.nursing_interventions}</span></div>
                          </div>
                          {plan.signature && (
                            <div className="text-[10px] text-slate-400 font-bold border-t pt-1">
                              التوقيع: {plan.signature} ({new Date(plan.plan_time).toLocaleTimeString('ar-EG')})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 4: Vital Signs & Live Early Warning Score (EWS) */}
              {/* ========================================================================= */}
              {activeTab === 'ews' && (
                <div className="space-y-6 animate-in fade-in">
                  
                  {/* Live EWS Input Card */}
                  <form onSubmit={handleAddEws} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b pb-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                          <HeartPulse className="text-rose-600" size={22} /> تسجيل العلامات الحيوية وحساب نظام الإنذار المبكر (EWS)
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">يتم احتساب درجات الخطورة وإجراءات التصعيد تلقائياً وفورياً</p>
                      </div>

                      {/* Live Score Display Badge */}
                      <div className={`px-5 py-2.5 rounded-2xl border-2 flex items-center gap-3 shadow-md ${
                        liveEws.severity === 'critical'
                          ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                          : liveEws.severity === 'medium'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-emerald-600 text-white border-emerald-700'
                      }`}>
                        <div className="text-center">
                          <div className="text-[10px] font-bold opacity-80 uppercase">مجموع درجات EWS</div>
                          <div className="text-2xl font-black">{liveEws.total}</div>
                        </div>
                        <div className="border-r border-white/30 pr-3 text-right">
                          <div className="text-[10px] font-bold opacity-90">إجراء التصعيد المطلوب:</div>
                          <div className="text-xs font-black">{liveEws.escalation}</div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
                      {/* Respiratory Rate */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>معدل التنفس / دقيقة</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.rr_score}</span>
                        </div>
                        <input 
                          type="number"
                          required
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-sm outline-none"
                          value={newEws.respiratory_rate ?? ''}
                          onChange={(e) => setNewEws({ ...newEws, respiratory_rate: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] text-slate-400">الطبيعي: 12 - 20</span>
                      </div>

                      {/* SpO2 */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>تشبع الأكسجين (SpO2 %)</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.spo2_score}</span>
                        </div>
                        <input 
                          type="number"
                          required
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-sm outline-none"
                          value={newEws.oxygen_saturation ?? ''}
                          onChange={(e) => setNewEws({ ...newEws, oxygen_saturation: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] text-slate-400">الطبيعي: ≥ 96%</span>
                      </div>

                      {/* Oxygen Therapy Type */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>نوع الأكسجين</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.o2_score}</span>
                        </div>
                        <select 
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-xs outline-none"
                          value={newEws.oxygen_therapy_type}
                          onChange={(e) => setNewEws({ ...newEws, oxygen_therapy_type: e.target.value as any })}
                        >
                          <option value="air">هواء الغرفة العادي (Air)</option>
                          <option value="o2">أكسجين مُعطى (O2)</option>
                        </select>
                        <span className="text-[10px] text-slate-400">O2 يضيف 2 درجات</span>
                      </div>

                      {/* Systolic BP */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>الضغط الانقباضي (mmHg)</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.bp_score}</span>
                        </div>
                        <input 
                          type="number"
                          required
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-sm outline-none"
                          value={newEws.systolic_bp ?? ''}
                          onChange={(e) => setNewEws({ ...newEws, systolic_bp: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] text-slate-400">الطبيعي: 111 - 219</span>
                      </div>

                      {/* Heart Rate */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>ضربات القلب / دقيقة</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.hr_score}</span>
                        </div>
                        <input 
                          type="number"
                          required
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-sm outline-none"
                          value={newEws.heart_rate ?? ''}
                          onChange={(e) => setNewEws({ ...newEws, heart_rate: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] text-slate-400">الطبيعي: 51 - 90</span>
                      </div>

                      {/* Consciousness Level */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>درجة الوعي</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.cons_score}</span>
                        </div>
                        <select 
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-xs outline-none"
                          value={newEws.consciousness_level}
                          onChange={(e) => setNewEws({ ...newEws, consciousness_level: e.target.value })}
                        >
                          <option value="alert">واعٍ ومدرك تماماً (Alert)</option>
                          <option value="not_responding_to_voice_pain">استجابة للصوت/الألم فقط</option>
                          <option value="unconscious">فاقد الوعي تماماً (Unconscious)</option>
                        </select>
                        <span className="text-[10px] text-slate-400">غير الواعي = 3 درجات</span>
                      </div>

                      {/* Temperature */}
                      <div className="p-4 bg-slate-50 rounded-2xl border space-y-1.5">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>درجة الحرارة (°C)</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">Score: {liveEws.temp_score}</span>
                        </div>
                        <input 
                          type="number"
                          step="0.1"
                          required
                          className="w-full border rounded-xl p-2.5 bg-white font-black text-sm outline-none"
                          value={newEws.temperature_celsius ?? ''}
                          onChange={(e) => setNewEws({ ...newEws, temperature_celsius: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-[10px] text-slate-400">الطبيعي: 36.1 - 38.0</span>
                      </div>

                      {/* Save Action Button */}
                      <div className="flex items-end">
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Save size={18} /> حفظ القراءة في السجل
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Vitals History Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-100/80 border-b flex justify-between items-center">
                      <h4 className="font-black text-slate-800 text-sm">سجل العلامات الحيوية للجلسة الحالية</h4>
                      <span className="text-xs text-slate-500 font-bold">{ewsList.length} قراءات مسجلة</span>
                    </div>
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-black border-b">
                        <tr>
                          <th className="p-3">الوقت</th>
                          <th className="p-3">التنفس</th>
                          <th className="p-3">SpO2</th>
                          <th className="p-3">الضغط</th>
                          <th className="p-3">النبض</th>
                          <th className="p-3">الحرارة</th>
                          <th className="p-3">الوعي</th>
                          <th className="p-3 text-center">مجموع EWS</th>
                          <th className="p-3">إجراء التصعيد</th>
                          <th className="p-3 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ewsList.map(record => (
                          <tr key={record.id} className="hover:bg-slate-50 font-bold">
                            <td className="p-3 text-slate-500">{new Date(record.recorded_time).toLocaleTimeString('ar-EG')}</td>
                            <td className="p-3">{record.respiratory_rate}</td>
                            <td className="p-3">{record.oxygen_saturation}% {record.oxygen_therapy_type === 'o2' ? '(O2)' : ''}</td>
                            <td className="p-3">{record.systolic_bp} mmHg</td>
                            <td className="p-3">{record.heart_rate} bpm</td>
                            <td className="p-3">{record.temperature_celsius}°C</td>
                            <td className="p-3 text-[11px]">{record.consciousness_level === 'alert' ? 'واعٍ' : 'غير واعٍ'}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-block ${
                                (record.total_ews_score || 0) >= 7
                                  ? 'bg-rose-600 text-white'
                                  : (record.total_ews_score || 0) >= 5
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {record.total_ews_score}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 font-black">{record.escalation_action || 'مستقر'}</td>
                            <td className="p-3 text-center">
                              {record.id && (
                                <button onClick={() => handleDeleteEws(record.id!)} className="text-slate-400 hover:text-rose-600">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {ewsList.length === 0 && (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                              لم يتم تسجيل أي قراءات علامات حيوية لهذه الجلسة حتى الآن.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: Pain, Glucose, Withdrawal & Medical Log */}
              {/* ========================================================================= */}
              {activeTab === 'pain_glucose_med' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                  
                  {/* Pain, Glucose & Withdrawal Log */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <ShieldAlert className="text-teal-600" size={20} /> سجل الألم وسكر الدم وكمية السحب
                    </h3>

                    <form onSubmit={handleAddPainGlucose} className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">درجة الألم (0-10)</label>
                          <input 
                            type="number"
                            min="0"
                            max="10"
                            className="w-full border rounded-xl p-2 bg-white font-bold text-xs"
                            value={newPainScore}
                            onChange={(e) => setNewPainScore(parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">سكر الدم (mg/dL)</label>
                          <input 
                            type="number"
                            placeholder="مثال: 120"
                            className="w-full border rounded-xl p-2 bg-white font-bold text-xs"
                            value={newGlucose ?? ''}
                            onChange={(e) => setNewGlucose(parseFloat(e.target.value) || undefined)}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">كمية السحب (ml)</label>
                          <input 
                            type="number"
                            placeholder="مثال: 500"
                            className="w-full border rounded-xl p-2 bg-white font-bold text-xs"
                            value={newWithdrawal ?? ''}
                            onChange={(e) => setNewWithdrawal(parseFloat(e.target.value) || undefined)}
                          />
                        </div>
                      </div>
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black"
                      >
                        إضافة قراءة
                      </button>
                    </form>

                    <div className="space-y-2">
                      {painGlucoseLogs.map(log => (
                        <div key={log.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center text-xs font-bold">
                          <div>
                            <span className="text-slate-400 text-[10px] ml-2">{new Date(log.log_time).toLocaleTimeString('ar-EG')}</span>
                            <span className="text-teal-900 ml-3">الألم: {log.pain_assessment_score ?? '-'}/10</span>
                            <span className="text-teal-900 ml-3">السكر: {log.blood_glucose_level ?? '-'} mg/dL</span>
                            <span className="text-teal-900">السحب: {log.withdrawal_amount_ml ?? '-'} ml</span>
                          </div>
                          {log.id && (
                            <button onClick={() => handleDeletePainGlucose(log.id!)} className="text-slate-400 hover:text-rose-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Medical Care / Doctor Rounds Log */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <Stethoscope className="text-teal-600" size={20} /> سجل المرور والرعاية الطبية
                    </h3>

                    <form onSubmit={handleAddMedicalLog} className="bg-slate-50 p-4 rounded-2xl border space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">شكوى المريض أثناء المرور</label>
                        <input 
                          placeholder="الشكوى.."
                          className="w-full border rounded-xl p-2 bg-white font-bold text-xs"
                          value={newMedComplaint}
                          onChange={(e) => setNewMedComplaint(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">نتائج الفحص والتدخل الطبي</label>
                        <input 
                          placeholder="الفحص والقرارات الطبية.."
                          className="w-full border rounded-xl p-2 bg-white font-bold text-xs"
                          value={newMedFindings}
                          onChange={(e) => setNewMedFindings(e.target.value)}
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={saving}
                        className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black"
                      >
                        تسجيل المرور الطبي
                      </button>
                    </form>

                    <div className="space-y-2">
                      {medicalLogs.map(log => (
                        <div key={log.id} className="p-3 bg-slate-50 rounded-xl border flex justify-between items-start text-xs font-bold">
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-400">{new Date(log.log_time).toLocaleTimeString('ar-EG')}</div>
                            <div>الشكوى: <span className="text-slate-800">{log.complaint || '-'}</span></div>
                            <div>نتائج الفحص: <span className="text-slate-800">{log.examination_findings || '-'}</span></div>
                          </div>
                          {log.id && (
                            <button onClick={() => handleDeleteMedicalLog(log.id!)} className="text-slate-400 hover:text-rose-600">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 6: Medication Administration Record (MAR) */}
              {/* ========================================================================= */}
              {activeTab === 'medication' && (
                <div className="space-y-6 animate-in fade-in">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                      <Pill className="text-teal-600" size={20} /> سجل إعطاء الأدوية أثناء الجلسة (MAR)
                    </h3>

                    <form onSubmit={handleAddMedAdmin} className="bg-teal-50/50 p-5 rounded-2xl border border-teal-100 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          required
                          placeholder="اسم الدواء (مثلاً: هيبارين، إيبوتين..)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newMedDrug}
                          onChange={(e) => setNewMedDrug(e.target.value)}
                        />
                        <input 
                          placeholder="الجرعة (مثلاً: 2500 وحدة، 4000 IU..)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newMedDose}
                          onChange={(e) => setNewMedDose(e.target.value)}
                        />
                        <select 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newMedRoute}
                          onChange={(e) => setNewMedRoute(e.target.value)}
                        >
                          <option value="IV">حقن وريدي (IV)</option>
                          <option value="SC">تحت الجلد (SC)</option>
                          <option value="Oral">عن طريق الفم (Oral)</option>
                          <option value="IM">حقن عضلي (IM)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          placeholder="تعليمات الإعطاء (مع بداية الجلسة..)" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold sm:col-span-1"
                          value={newMedInstructions}
                          onChange={(e) => setNewMedInstructions(e.target.value)}
                        />
                        <input 
                          placeholder="توقيع الطبيب الموصي" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newMedDocSig}
                          onChange={(e) => setNewMedDocSig(e.target.value)}
                        />
                        <input 
                          placeholder="توقيع الممرض/ة المنفذ" 
                          className="border rounded-xl p-2.5 bg-white text-xs font-bold"
                          value={newMedNurseSig}
                          onChange={(e) => setNewMedNurseSig(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button 
                          type="submit" 
                          disabled={saving}
                          className="px-6 py-2.5 bg-teal-700 text-white rounded-xl text-xs font-black shadow"
                        >
                          توثيق إعطاء الدواء
                        </button>
                      </div>
                    </form>

                    <table className="w-full text-right text-xs mt-4">
                      <thead className="bg-slate-100 text-slate-600 font-black border-b">
                        <tr>
                          <th className="p-3">الدواء</th>
                          <th className="p-3">الجرعة</th>
                          <th className="p-3">طريقة الإعطاء</th>
                          <th className="p-3">وقت الإعطاء</th>
                          <th className="p-3">الطبيب</th>
                          <th className="p-3">التمريض</th>
                          <th className="p-3 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {medAdmins.map(med => (
                          <tr key={med.id} className="hover:bg-slate-50 font-bold">
                            <td className="p-3 font-black text-slate-800">{med.drug_name}</td>
                            <td className="p-3">{med.dose || '-'}</td>
                            <td className="p-3">{med.route || 'IV'}</td>
                            <td className="p-3 text-slate-500">{med.administered_datetime ? new Date(med.administered_datetime).toLocaleTimeString('ar-EG') : '-'}</td>
                            <td className="p-3">{med.doctor_signature || '-'}</td>
                            <td className="p-3">{med.nurse_signature || '-'}</td>
                            <td className="p-3 text-center">
                              {med.id && (
                                <button onClick={() => handleDeleteMedAdmin(med.id!)} className="text-slate-400 hover:text-rose-600">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {medAdmins.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                              لم يتم تسجيل أدوية لهذه الجلسة حتى الآن.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 7: Health Education */}
              {/* ========================================================================= */}
              {activeTab === 'education' && (
                <form onSubmit={handleSaveHealthEdu} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-in fade-in">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <GraduationCap className="text-teal-600" size={22} /> نموذج التثقيف والتوعية الصحية لمرضى الغسيل الكلوي
                    </h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">تقييم قدرات المريض وتوثيق الموضوعات التثقيفية المنفذة</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Learning Ability & Barriers */}
                    <div className="p-5 bg-slate-50 rounded-2xl border space-y-3">
                      <label className="text-xs font-bold text-slate-600">القدرة العامة على التعلم والاستيعاب</label>
                      <select 
                        className="w-full border rounded-xl p-2.5 bg-white font-bold text-xs"
                        value={healthEdu.learning_ability || 'medium'}
                        onChange={(e) => setHealthEdu({ ...healthEdu, learning_ability: e.target.value as any })}
                      >
                        <option value="high">عالية (High)</option>
                        <option value="medium">متوسطة (Medium)</option>
                        <option value="low">منخفضة / تحتاج تكرار (Low)</option>
                      </select>

                      <label className="text-xs font-bold text-slate-600 block pt-2">عوائق التعلم (إن وُجدت)</label>
                      <div className="space-y-1.5 text-xs font-bold text-slate-700">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded accent-teal-600"
                            checked={!!healthEdu.learning_barriers?.illiteracy}
                            onChange={(e) => setHealthEdu({
                              ...healthEdu,
                              learning_barriers: { ...healthEdu.learning_barriers, illiteracy: e.target.checked }
                            })}
                          />
                          أمية / صعوبة القراءة
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded accent-teal-600"
                            checked={!!healthEdu.learning_barriers?.communication_difficulty}
                            onChange={(e) => setHealthEdu({
                              ...healthEdu,
                              learning_barriers: { ...healthEdu.learning_barriers, communication_difficulty: e.target.checked }
                            })}
                          />
                          صعوبة في السمع أو النطق أو التواصل
                        </label>
                      </div>
                    </div>

                    {/* Topics Covered */}
                    <div className="p-5 bg-slate-50 rounded-2xl border space-y-3">
                      <label className="text-xs font-bold text-slate-600">الموضوعات التثقيفية التي تم شرحها</label>
                      <div className="space-y-2 text-xs font-bold text-slate-700">
                        {[
                          { key: 'diet_explanation', label: 'شرح النظام الغذائي المناسب لمرضى الغسيل' },
                          { key: 'fluid_restriction', label: 'تقييد وتنظيم كميات السوائل اليومية' },
                          { key: 'fistula_site_care', label: 'العناية بنظافة موضع الفيسولا وتجنب الضغط عليها' },
                          { key: 'fall_prevention', label: 'إرشادات الوقاية من السقوط والدوخة بعد الجلسة' },
                          { key: 'patient_rights_duties', label: 'حقوق وواجبات المريض والالتزام بمواعيد الجلسات' },
                        ].map(topic => (
                          <label key={topic.key} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="rounded accent-teal-600"
                              checked={!!(healthEdu.topics_covered as any)?.[topic.key]}
                              onChange={(e) => setHealthEdu({
                                ...healthEdu,
                                topics_covered: {
                                  ...healthEdu.topics_covered,
                                  [topic.key]: e.target.checked
                                }
                              })}
                            />
                            {topic.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">توقيع المريض / الأسرة</label>
                      <input 
                        className="w-full border rounded-xl p-2.5 bg-slate-50 font-bold text-xs"
                        value={healthEdu.patient_or_family_signature || ''}
                        onChange={(e) => setHealthEdu({ ...healthEdu, patient_or_family_signature: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">توقيع أخصائي / ممرض التثقيف</label>
                      <input 
                        className="w-full border rounded-xl p-2.5 bg-slate-50 font-bold text-xs"
                        value={healthEdu.nurse_signature || ''}
                        onChange={(e) => setHealthEdu({ ...healthEdu, nurse_signature: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="px-8 py-3.5 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-black shadow-lg shadow-teal-900/20 text-xs flex items-center gap-2"
                    >
                      <Save size={16} /> حفظ التثقيف الصحي
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-500 shrink-0">
          <span>جلسة الغسيل #{session.id.slice(0, 8)} • مريض: {session.patients?.name || '-'}</span>
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-black transition-all"
          >
            إغلاق النموذج
          </button>
        </div>

      </div>
    </div>
  );
};

export default DialysisNursingAssessmentModal;
