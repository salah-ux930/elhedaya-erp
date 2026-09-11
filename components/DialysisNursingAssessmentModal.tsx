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
  DialysisHealthEducation
} from '../types.ts';
import { 
  X, Activity, AlertTriangle, CheckCircle2, Clock, Plus, Trash2, 
  ShieldAlert, Stethoscope, HeartPulse, FileText, Pill, GraduationCap, 
  Sparkles, Save, UserCheck, Eye, RefreshCw, AlertCircle
} from 'lucide-react';

interface Props {
  session: DialysisSession & { patients?: Patient };
  onClose: () => void;
  onUpdate?: () => void;
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

const DialysisNursingAssessmentModal: React.FC<Props> = ({ session, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'assessment' | 'lines' | 'notes_plan' | 'ews' | 'pain_glucose_med' | 'medication' | 'education'>('assessment');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
        loadedEdus
      ] = await Promise.all([
        DB.getDialysisNursingAssessment(session.id).catch(() => null),
        DB.getDialysisAccessLines(session.patient_id).catch(() => []),
        DB.getDialysisNursingNotes(session.id).catch(() => []),
        DB.getDialysisNursingCarePlans(session.id).catch(() => []),
        DB.getDialysisVitalSignsEws(session.id).catch(() => []),
        DB.getDialysisPainGlucoseLogs(session.id).catch(() => []),
        DB.getDialysisMedicalCareLogs(session.id).catch(() => []),
        DB.getDialysisMedicationAdmins(session.id).catch(() => []),
        DB.getDialysisHealthEducations(session.patient_id, session.id).catch(() => [])
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
      await DB.updateDialysisAccessLine(lineId, {
        status: 'removed',
        removal_datetime: new Date().toISOString(),
        removal_or_change_reason: removalReason
      });
      const updated = await DB.getDialysisAccessLines(session.patient_id);
      setAccessLines(updated);
      setRemovingLineId(null);
      setRemovalReason('');
      showNotification('تم تحديث حالة الوصلة إلى (مفكوكة / مستبدلة)');
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
            <FileText size={16} /> 1. التقييم التمريضي الأساسي
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'lines'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Activity size={16} /> 2. الوصلات والقساطر ({accessLines.length})
          </button>
          <button
            onClick={() => setActiveTab('notes_plan')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'notes_plan'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={16} /> 3. الملاحظات وخطة الرعاية
          </button>
          <button
            onClick={() => setActiveTab('ews')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'ews'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <HeartPulse size={16} /> 4. العلامات الحيوية والإنذار المبكر (EWS)
          </button>
          <button
            onClick={() => setActiveTab('pain_glucose_med')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'pain_glucose_med'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert size={16} /> 5. الألم والسكر والمرور الطبي
          </button>
          <button
            onClick={() => setActiveTab('medication')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'medication'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Pill size={16} /> 6. سجل الأدوية (MAR)
          </button>
          <button
            onClick={() => setActiveTab('education')}
            className={`px-5 py-3.5 rounded-t-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all border-t-2 border-x-2 ${
              activeTab === 'education'
                ? 'bg-slate-50 border-teal-600 text-teal-800 shadow-sm border-b-2 border-b-slate-50 -mb-[2px] z-10'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <GraduationCap size={16} /> 7. التثقيف الصحي
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
                      <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                        <AlertTriangle className="text-amber-600" size={20} /> إجراءات الوقاية من خطر السقوط
                      </h3>
                      <div className="space-y-2">
                        {[
                          { key: 'card_placed', label: 'وضع بطاقة تعريف خطر السقوط' },
                          { key: 'bed_low_brakes_locked', label: 'خفض السرير وتأمين الفرامل' },
                          { key: 'safe_environment', label: 'توفير بيئة آمنة وخالية من العوائق' },
                          { key: 'frequent_toilet_check', label: 'المتابعة الدورية للذهاب لدورة المياه' },
                          { key: 'staff_assist_walking', label: 'مساعدة طاقم التمريض عند الحركة' },
                          { key: 'patient_education', label: 'تثقيف وتوعية المريض والمرافق' },
                        ].map(measure => (
                          <label key={measure.key} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl hover:bg-teal-50/50 cursor-pointer transition-colors text-xs font-bold text-slate-700">
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
                      <h3 className="text-base font-black text-teal-900 flex items-center gap-2 border-b pb-3">
                        <Activity className="text-teal-600" size={20} /> فحص وصلة الغسيل (Vascular Access)
                      </h3>
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
                                  onClick={() => setRemovingLineId(line.id || null)}
                                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-black text-[11px] border border-rose-200"
                                >
                                  فك / تغيير الوصلة
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold block max-w-xs truncate">
                                  السبب: {line.removal_or_change_reason || 'غير محدد'}
                                </span>
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
                        <h4 className="font-black text-slate-800 text-base">تأكيد فك أو استبدال الوصلة</h4>
                        <p className="text-xs text-slate-500 font-bold">يرجى تسجيل سبب إزالة الوصلة أو استبدالها لحفظ التاريخ الطبي بدقة:</p>
                        <textarea
                          required
                          placeholder="مثلاً: انسداد، التهاب، انتهاء مدة الاستخدام، تركيب فيسولا جديدة.."
                          className="w-full border rounded-2xl p-3 bg-slate-50 font-bold text-xs h-24 outline-none focus:border-rose-500"
                          value={removalReason}
                          onChange={(e) => setRemovalReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button 
                            type="button" 
                            onClick={() => { setRemovingLineId(null); setRemovalReason(''); }}
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
