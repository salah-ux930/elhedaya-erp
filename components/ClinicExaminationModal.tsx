import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Activity, ChevronDown, ChevronUp, Stethoscope, 
  FileText, Shield, AlertCircle, CheckCircle2, HeartPulse, 
  FlaskConical, Loader2, Sparkles, Scale, Info, Users, User, Clock
} from 'lucide-react';
import { DB } from '../store.ts';

interface ClinicExaminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSaved: () => void;
}

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

export const ClinicExaminationModal: React.FC<ClinicExaminationModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSaved
}) => {
  if (!isOpen || !appointment) return null;

  // Toggle Section B
  const [showComprehensiveDetails, setShowComprehensiveDetails] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              if (parsed.general_appearance) setGeneralAppearance(parsed.general_appearance);
            } catch (e) {
              console.warn("Could not parse clinical findings JSON:", e);
            }
          }

          // If comprehensive details exist, expand Section B automatically
          if (
            existing.hospitalization || existing.previous_operations || 
            existing.current_medications || existing.allergy || 
            existing.special_habits || existing.family_history ||
            existing.lab_hemoglobin
          ) {
            setShowComprehensiveDetails(true);
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
    if (!diagnosis.trim()) {
      setErrorMessage("يرجى كتابة التشخيص الطبي للكشف.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const todayDate = new Date().toISOString().split('T')[0];
    const doctorName = appointment.doctors?.name || appointment.doctor_name || '';

    // Prepare clinical findings JSON for cross-module compatibility
    const clinicalFindingsObj = {
      general_appearance: generalAppearance.trim(),
      vital_bp: vitalBp.trim(),
      vital_pulse: vitalPulse.trim(),
      vital_temp: vitalTemp.trim(),
      vital_resp_rate: vitalRespRate.trim(),
      vital_weight: vitalWeight.trim(),
      vital_height: vitalHeight.trim(),
      vital_bmi: computedBmi
    };

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
      // 1. Save or update physical exam record with strict validation
      await DB.saveClinicPhysicalExam(examRecord);

      // 2. Update clinic appointment status, diagnosis, and prescription
      await DB.updateAppointmentStatus(
        appointment.id,
        'COMPLETED',
        diagnosis.trim(),
        prescription.trim()
      );

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-primary-700 to-indigo-900 text-white flex justify-between items-start shrink-0 rounded-t-3xl">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-white/10 rounded-2xl shrink-0 mt-0.5">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl">تسجيل الكشف الطبي والفحص السريري</h3>
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] font-bold">
                  نموذج ف1
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-85 mt-1.5">
                <span className="font-bold flex items-center gap-1">
                  <User size={13} /> {appointment.patients?.name || 'مريض'}
                </span>
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
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
            title="إغلاق"
          >
            <X size={22} />
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

          {/* ========================================================================= */}
          {/* قسم (أ): العلامات الحيوية والفحص العام (دائم الظهور) */}
          {/* ========================================================================= */}
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

          {/* ========================================================================= */}
          {/* قسم (ب): تفاصيل الفحص الشامل (Collapsible - مغلق افتراضياً) */}
          {/* ========================================================================= */}
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

          {/* ========================================================================= */}
          {/* قسم (ج): التشخيص الطبي والعلاج الموصوف */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-800 flex items-center justify-between">
                <span>التشخيص الطبي (Clinical Diagnosis) *</span>
                <span className="text-[11px] text-rose-600 font-bold">مطلوب لإتمام الكشف</span>
              </label>
              <textarea
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                rows={3}
                required
                className="w-full border border-slate-300 rounded-2xl p-4 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm leading-relaxed"
                placeholder="اكتب التشخيص الطبي النهائي أو المبدئي للحالة..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black text-slate-800">
                الروشتة والعلاج الموصوف (Prescription & Management Plan)
              </label>
              <textarea
                value={prescription}
                onChange={e => setPrescription(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-2xl p-4 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm leading-relaxed"
                placeholder="الأدوية الموصوفة، الجرعات، التوصيات الطبية والمتابعة..."
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-colors disabled:opacity-50 text-sm text-center"
            >
              إلغاء وتراجع
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  جاري حفظ الكشف والسجل الطبي الشامل...
                </>
              ) : (
                <>
                  <Save size={18} />
                  إنهاء الكشف وحفظ البيانات
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
