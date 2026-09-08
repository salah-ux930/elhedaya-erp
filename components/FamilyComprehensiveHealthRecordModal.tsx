import React, { useState, useEffect } from 'react';
import { 
  X, User, Calendar, Shield, Activity, FileText, ClipboardList, 
  Baby, HeartHandshake, Sparkles, Smile, Clock, CheckCircle2, 
  AlertCircle, Plus, Trash2, Printer, ArrowRight, Stethoscope,
  ChevronDown, ChevronUp, ExternalLink, Save, Check, Filter,
  Eye, Droplets, Info
} from 'lucide-react';
import { DB } from '../store.ts';
import { calculateAge, BLOOD_TYPES } from '../constants.ts';
import HistoryPhysicalModal from './HistoryPhysicalModal.tsx';
import VisitsFormModal from './VisitsFormModal.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  familyFile?: any;
  initialModule?: string;
  initialModuleId?: string;
  onRefresh?: () => void;
}

export const FamilyComprehensiveHealthRecordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  familyFile,
  initialModule,
  initialModuleId,
  onRefresh
}) => {
  if (!isOpen || !patient) return null;

  const getNumericAge = (dob?: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let ageYears = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageYears--;
    }
    return ageYears;
  };

  const age = getNumericAge(patient.date_of_birth);
  const isFemale = patient.gender === 'أنثى' || patient.gender === 'female' || patient.gender === 'Female';
  const isChild = age !== null && age < 18;
  const isUnder5 = age !== null && age < 5;
  const isElderly = age !== null && age >= 60;
  const isReproductiveAge = isFemale && age !== null && age >= 15 && age <= 49;

  // Active Module Tab
  const [activeTab, setActiveTab] = useState<string>(initialModule || initialModuleId || 'history');

  // Modals for sub-components
  const [showHistoryExamModal, setShowHistoryExamModal] = useState(false);
  const [historyExamInitialTab, setHistoryExamInitialTab] = useState<'history' | 'significant' | 'clinical' | 'full'>('full');
  const [showVisitsModal, setShowVisitsModal] = useState(false);

  // Data states for modules
  const [loading, setLoading] = useState(true);
  const [physicalExams, setPhysicalExams] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [ancRecords, setAncRecords] = useState<any[]>([]);
  const [postpartumRecords, setPostpartumRecords] = useState<any[]>([]);
  const [childUnder5Records, setChildUnder5Records] = useState<any[]>([]);
  const [childOver5Records, setChildOver5Records] = useState<any[]>([]);
  const [familyPlanningRecords, setFamilyPlanningRecords] = useState<any[]>([]);
  const [premaritalRecords, setPremaritalRecords] = useState<any[]>([]);
  const [geriatricRecords, setGeriatricRecords] = useState<any[]>([]);
  const [dentalRecords, setDentalRecords] = useState<any[]>([]);

  // Sub-forms open state (Add new records)
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const showNotification = (type: 'error' | 'success', message: string) => {
    setStatusBanner({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setStatusBanner((prev) => (prev?.message === message ? null : prev));
      }, 5000);
    }
  };

  const handleDeleteRecord = async (tableName: string, id: string, recordLabel: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${recordLabel} نهائياً من قاعدة البيانات المركزية؟`)) return;
    try {
      await DB.deleteAccreditationRecord(tableName, id);
      showNotification('success', `تم حذف ${recordLabel} بنجاح من قاعدة البيانات.`);
      loadAllData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error("Delete error:", err);
      const errMsg = err?.message || "تعذر الحذف من قاعدة البيانات";
      const userMessage = `فشل حذف البيانات من قاعدة البيانات. لم يتم الحذف. تفاصيل الخطأ: ${errMsg}`;
      showNotification('error', userMessage);
      alert(userMessage);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [
        examsData,
        visitsData,
        ancData,
        postpartumData,
        cUnder5Data,
        cOver5Data,
        fpData,
        premaritalData,
        geriatricData,
        dentalData
      ] = await Promise.all([
        DB.getPhysicalExams(patient.id),
        DB.getPatientVisits(patient.id),
        DB.getAccreditationRecords('maternal_antenatal_followups', patient.id),
        DB.getAccreditationRecords('maternal_postpartum_followups', patient.id),
        DB.getAccreditationRecords('child_under5_followups', patient.id),
        DB.getAccreditationRecords('child_over5_followups', patient.id),
        DB.getAccreditationRecords('family_planning_followups', patient.id),
        DB.getAccreditationRecords('premarital_assessments', patient.id),
        DB.getAccreditationRecords('geriatric_assessments', patient.id),
        DB.getAccreditationRecords('dental_assessments', patient.id)
      ]);

      setPhysicalExams(examsData || []);
      setVisits(visitsData || []);
      setAncRecords(ancData || []);
      setPostpartumRecords(postpartumData || []);
      setChildUnder5Records(cUnder5Data || []);
      setChildOver5Records(cOver5Data || []);
      setFamilyPlanningRecords(fpData || []);
      setPremaritalRecords(premaritalData || []);
      setGeriatricRecords(geriatricData || []);
      setDentalRecords(dentalData || []);
    } catch (e: any) {
      console.error("Error loading patient comprehensive record:", e);
      const msg = e?.message || "تعذر الاتصال بقاعدة البيانات لتحميل السجلات.";
      setLoadError(msg);
      showNotification('error', `تعذر تحميل السجلات الطبية من قاعدة البيانات: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [patient.id]);

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // Count calculations for modules
  const significantEventsCount = physicalExams.reduce((sum, exam) => {
    try {
      const parsed = typeof exam.significant_events === 'string' 
        ? JSON.parse(exam.significant_events) 
        : exam.significant_events;
      return sum + (Array.isArray(parsed) ? parsed.filter((e: any) => e && (e.description || e.date)).length : 0);
    } catch {
      return sum;
    }
  }, 0);

  // 3 Organized Groups for the 10 Clinical Modules
  const moduleGroups = [
    {
      id: 'general',
      title: 'عام لكل الأعمار',
      subtitle: 'العام والمشترك',
      modules: [
        {
          id: 'history',
          number: '١',
          title: 'التاريخ المرضي والصحي',
          subtitle: 'Medical History Sheet',
          icon: Shield,
          color: 'purple',
          badge: 'عام لجميع الأعمار',
          available: true,
          count: physicalExams.length
        },
        {
          id: 'significant',
          number: '٢',
          title: 'ملخص الأحداث الهامة',
          subtitle: 'Significant Data Sheet',
          icon: ClipboardList,
          color: 'amber',
          badge: 'سجل الأمراض والمحطات',
          available: true,
          count: significantEventsCount
        },
        {
          id: 'clinical',
          number: '٣',
          title: 'الفحص السريري والعلامات الحيوية',
          subtitle: 'Clinical Findings & Vitals',
          icon: Activity,
          color: 'indigo',
          badge: 'فحص أجهزة الجسم',
          available: true,
          count: physicalExams.length
        },
        {
          id: 'visits',
          number: '٤',
          title: 'نموذج التردد والزيارات',
          subtitle: 'Patient Visits Form',
          icon: FileText,
          color: 'teal',
          badge: 'سجل العيادة اليومي',
          available: true,
          count: visits.length
        },
        {
          id: 'dental',
          number: '١٠',
          title: 'طب وصحة الفم والأسنان',
          subtitle: 'Oral & Dental Health',
          icon: Smile,
          color: 'blue',
          badge: 'فحص الفم ومؤشر DMFT',
          available: true,
          count: dentalRecords.length
        }
      ]
    },
    {
      id: 'demographic',
      title: 'حسب الفئة العمرية / النوع',
      subtitle: 'فئات مخصصة',
      modules: [
        {
          id: 'child',
          number: '٥',
          title: 'صحة ورعاية الطفل والنمو',
          subtitle: 'Child Health & Growth',
          icon: Baby,
          color: 'emerald',
          badge: isChild ? 'متاح (< 18 سنة)' : 'خاص بالأطفال (< 18 سنة)',
          available: isChild,
          reason: 'يتاح للأفراد دون سن 18 عاماً فقط',
          count: childUnder5Records.length + childOver5Records.length
        },
        {
          id: 'maternal',
          number: '٦',
          title: 'رعاية الأمومة والحوامل والنفاس',
          subtitle: 'Maternal ANC & Postpartum',
          icon: HeartHandshake,
          color: 'rose',
          badge: isFemale ? 'متاح (إناث)' : 'خاص بالإناث فقط',
          available: isFemale,
          reason: 'يتاح للإناث فقط',
          count: ancRecords.length + postpartumRecords.length
        },
        {
          id: 'family_planning',
          number: '٧',
          title: 'تنظيم الأسرة والصحة الإنجابية',
          subtitle: 'Family Planning',
          icon: Sparkles,
          color: 'pink',
          badge: isReproductiveAge ? 'متاح (15 - 49 سنة)' : (isFemale ? 'سن الإنجاب (15-49)' : 'خاص بالإناث'),
          available: isFemale,
          reason: 'يتاح للإناث في سن الإنجاب',
          count: familyPlanningRecords.length
        },
        {
          id: 'geriatric',
          number: '٩',
          title: 'رعاية كبار السن والمسنين',
          subtitle: 'Geriatric Assessment',
          icon: Clock,
          color: 'amber',
          badge: isElderly ? 'متاح (≥ 60 سنة)' : 'خاص بالمسنين (≥ 60)',
          available: isElderly,
          reason: 'يتاح للمسنين من سن 60 عاماً فأكثر',
          count: geriatricRecords.length
        }
      ]
    },
    {
      id: 'specialized',
      title: 'خاص',
      subtitle: 'بروتوكول نوعي',
      modules: [
        {
          id: 'premarital',
          number: '٨',
          title: 'فحص المقبلين على الزواج',
          subtitle: 'Premarital Screening',
          icon: HeartHandshake,
          color: 'cyan',
          badge: 'مشورة وفحص وراثي',
          available: true,
          count: premaritalRecords.length
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20 shrink-0">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black">{patient.name}</h3>
                <span className="bg-white/15 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {patient.gender || 'غير محدد'} • {age !== null ? `${age} سنة` : 'تاريخ الميلاد غير مدون'}
                </span>
                {familyFile && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    ملف الأسرة: {familyFile.family_code} ({familyFile.head_name})
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 font-bold mt-1">
                الرقم القومي: <span className="font-mono">{patient.national_id || '—'}</span> | الهاتف: <span className="font-mono">{patient.phone || '—'}</span> | فصيلة الدم: <span className="text-amber-300 font-black">{patient.blood_type || '—'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all border border-white/10"
              title="طباعة السجل الصحي الشامل"
            >
              <Printer size={14} /> طباعة
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 10 Modules Navigation Tabs grouped into 3 categories */}
        <div className="bg-slate-100/80 border-b border-slate-200 p-2.5 overflow-x-auto shrink-0">
          <div className="flex items-stretch gap-2.5 min-w-max">
            {moduleGroups.map((grp) => (
              <div key={grp.id} className="bg-white rounded-2xl border border-slate-200/90 p-2 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between px-2 text-[10px] font-black text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {grp.title}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold">{grp.subtitle}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {grp.modules.map((mod) => {
                    const Icon = mod.icon;
                    const isActive = activeTab === mod.id;
                    const isAllowed = mod.available;

                    return (
                      <button
                        key={mod.id}
                        disabled={!isAllowed}
                        onClick={() => {
                          setActiveTab(mod.id);
                          setShowAddForm(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                            : isAllowed
                            ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/70'
                            : 'bg-slate-100/50 text-slate-400 opacity-60 cursor-not-allowed border border-transparent'
                        }`}
                        title={!isAllowed ? mod.reason : mod.title}
                      >
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-700 border border-slate-200'
                        }`}>
                          {mod.number}
                        </div>
                        <Icon size={14} className={isActive ? 'text-white' : 'text-indigo-600 shrink-0'} />
                        <span className="whitespace-nowrap">{mod.title}</span>
                        {mod.count > 0 ? (
                          <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-white/30 text-white' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            ({mod.count})
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-300">
                            (0)
                          </span>
                        )}
                        {!isAllowed && (
                          <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-normal shrink-0">
                            غير منطبق
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Message Notification Banner */}
          {statusBanner && (
            <div
              className={`p-4 rounded-2xl flex items-start justify-between gap-3 shadow-sm border-2 animate-in fade-in ${
                statusBanner.type === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {statusBanner.type === 'error' ? (
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                ) : (
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                )}
                <div>
                  <p className="font-black text-sm">
                    {statusBanner.type === 'error' ? 'تنبيه: فشلت العملية في قاعدة البيانات' : 'تمت العملية بنجاح'}
                  </p>
                  <p className="text-xs font-bold mt-0.5 whitespace-pre-wrap">{statusBanner.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg shrink-0 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Persistent Database Load Error Banner */}
          {loadError && (
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-black text-sm">تعذر استرجاع بيانات السجل الطبي من قاعدة البيانات المركزية</p>
                  <p className="text-xs text-red-800 font-mono mt-0.5">{loadError}</p>
                  <p className="text-[11px] text-red-600 mt-1 font-bold">تم إيقاف العرض المحلي تفادياً لعرض بيانات غير متزامنة مع السيرفر.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadAllData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow transition-all shrink-0 cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400 font-bold">
              جاري تحميل بيانات السجل الصحي الشامل...
            </div>
          ) : (
            <>
              {/* ======================= موديول 1: التاريخ المرضي الشامل ======================= */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-purple-950 text-base flex items-center gap-2">
                        <Shield size={18} className="text-purple-600" />
                        ١. موديول التاريخ المرضي والصحي الشامل (Medical & Family History Sheet)
                      </h4>
                      <p className="text-xs text-purple-700 font-bold mt-0.5">
                        يوثق العمليات السابقة، الحجز بالمستشفيات، الأدوية المزمنة، الحساسية، والعادات والتاريخ العائلي
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setHistoryExamInitialTab('history');
                        setShowHistoryExamModal(true);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> إضافة / تعديل فحص وتاريخ مرضي
                    </button>
                  </div>

                  {physicalExams.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا يوجد سجل تاريخ مرضي مدون للمريض حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {physicalExams.map((exam) => (
                        <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                              <Calendar size={13} className="text-purple-600" />
                              تاريخ الفحص: {new Date(exam.exam_date || exam.created_at).toLocaleDateString('ar-EG')}
                            </span>
                            <div className="flex items-center gap-2">
                              {exam.doctor_name && (
                                <span className="text-xs font-bold text-slate-600">
                                  الطبيب: د/ {exam.doctor_name}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setHistoryExamInitialTab('history');
                                  setShowHistoryExamModal(true);
                                }}
                                className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold transition-all border border-purple-200"
                              >
                                تعديل / عرض كامل
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                              <span className="font-black text-slate-600 block">العمليات السابقة والأدوية:</span>
                              <div className="font-bold text-slate-800">عمليات: {exam.previous_operations || 'لا يوجد'}</div>
                              <div className="font-bold text-purple-700">أدوية: {exam.current_medications || 'لا يوجد'}</div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                              <span className="font-black text-slate-600 block">الحساسية والآثار العكسية:</span>
                              <div className="font-bold text-red-700">حساسية: {exam.allergy || 'لا يوجد'}</div>
                              <div className="font-bold text-amber-800">آثار عكسية: {exam.adverse_drug_reactions || 'لا يوجد'}</div>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                              <span className="font-black text-slate-600 block">التاريخ العائلي والعادات:</span>
                              <div className="font-bold text-slate-800">تاريخ عائلي: {exam.family_history || 'لا يوجد'}</div>
                              <div className="font-bold text-slate-800">عادات: {exam.special_habits || 'لا يوجد'}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 2: الأحداث الهامة ======================= */}
              {activeTab === 'significant' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-amber-950 text-base flex items-center gap-2">
                        <ClipboardList size={18} className="text-amber-600" />
                        ٢. موديول صحيفة الأحداث الطبية الهامة (Significant Data Sheet)
                      </h4>
                      <p className="text-xs text-amber-800 font-bold mt-0.5">
                        توثيق المحطات والتشخيصات الهامة والأمراض المزمنة في مسيرة المريض الصحية
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setHistoryExamInitialTab('significant');
                        setShowHistoryExamModal(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> إضافة / تعديل أحداث هامة
                    </button>
                  </div>

                  {(() => {
                    let allEvents: any[] = [];
                    physicalExams.forEach((exam) => {
                      if (exam.significant_events) {
                        try {
                          const parsed = typeof exam.significant_events === 'string' 
                            ? JSON.parse(exam.significant_events) 
                            : exam.significant_events;
                          if (Array.isArray(parsed)) {
                            parsed.forEach((evt) => allEvents.push({ ...evt, examDate: exam.exam_date }));
                          }
                        } catch (e) {}
                      }
                    });

                    if (allEvents.length === 0) {
                      return (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                          لا توجد أحداث طبية هامة مدونة حتى الآن.
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-amber-50/70 border-b border-amber-100 text-amber-950 font-black">
                            <tr>
                              <th className="p-3">تاريخ الحدث</th>
                              <th className="p-3">تفاصيل وتشخيص الحدث الهام</th>
                              <th className="p-3">الطبيب القائم بالتوثيق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold">
                            {allEvents.map((evt, idx) => (
                              <tr key={idx} className="hover:bg-amber-50/20">
                                <td className="p-3 font-mono text-slate-600">{evt.date || evt.examDate || '—'}</td>
                                <td className="p-3 text-slate-900 font-black">{evt.description}</td>
                                <td className="p-3 text-amber-900">{evt.doctor ? `د/ ${evt.doctor}` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ======================= موديول 3: الفحص السريري الإكلينيكي ======================= */}
              {activeTab === 'clinical' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-indigo-950 text-base flex items-center gap-2">
                        <Activity size={18} className="text-indigo-600" />
                        ٣. موديول الفحص السريري والعلامات الحيوية (Clinical Findings & Physical Examination)
                      </h4>
                      <p className="text-xs text-indigo-800 font-bold mt-0.5">
                        العلامات الحيوية الكاملة وفحص أجهزة الجسم (القلب، الصدر، البطن، العظام، الأعصاب)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setHistoryExamInitialTab('clinical');
                        setShowHistoryExamModal(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> إضافة / فحص إكلينيكي جديد
                    </button>
                  </div>

                  {physicalExams.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد فحوصات إكلينيكية مسجلة للمريض حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {physicalExams.map((exam) => {
                        let parsedClin: any = {};
                        try {
                          if (exam.clinical_findings) {
                            parsedClin = typeof exam.clinical_findings === 'string'
                              ? JSON.parse(exam.clinical_findings)
                              : exam.clinical_findings;
                          }
                        } catch (e) {}

                        return (
                          <div key={exam.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-black text-indigo-900">
                                تاريخ الفحص: {new Date(exam.exam_date || exam.created_at).toLocaleDateString('ar-EG')}
                              </span>
                              <span className="text-xs font-bold text-slate-500">
                                الطبيب: {exam.doctor_name ? `د/ ${exam.doctor_name}` : '—'}
                              </span>
                            </div>

                            {/* Vitals row */}
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                              {parsedClin.vital_bp && (
                                <span className="bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-lg">
                                  ضغط الدم: {parsedClin.vital_bp}
                                </span>
                              )}
                              {parsedClin.vital_pulse && (
                                <span className="bg-red-100 text-red-900 px-2.5 py-1 rounded-lg">
                                  النبض: {parsedClin.vital_pulse} / دقيقة
                                </span>
                              )}
                              {parsedClin.vital_temp && (
                                <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg">
                                  الحرارة: {parsedClin.vital_temp}°
                                </span>
                              )}
                              {parsedClin.vital_weight && (
                                <span className="bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-lg">
                                  الوزن: {parsedClin.vital_weight} كجم
                                </span>
                              )}
                              {parsedClin.vital_height && (
                                <span className="bg-sky-100 text-sky-900 px-2.5 py-1 rounded-lg">
                                  الطول: {parsedClin.vital_height} سم
                                </span>
                              )}
                            </div>

                            {/* Systems examination */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                              <div>
                                <span className="font-black text-slate-500 block mb-0.5">المظهر العام والرأس:</span>
                                <div className="font-bold text-slate-800">المظهر: {parsedClin.general_appearance || 'طبيعي'}</div>
                                <div className="font-bold text-slate-800">الرأس والعنق: {parsedClin.head_neck || 'طبيعي'}</div>
                              </div>
                              <div>
                                <span className="font-black text-slate-500 block mb-0.5">القلب والصدر:</span>
                                <div className="font-bold text-slate-800">القلب: {parsedClin.cardiovascular || 'طبيعي'}</div>
                                <div className="font-bold text-slate-800">الصدر: {parsedClin.respiratory || 'طبيعي'}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 4: نموذج التردد والزيارات ======================= */}
              {activeTab === 'visits' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-teal-50 border border-teal-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-teal-950 text-base flex items-center gap-2">
                        <FileText size={18} className="text-teal-600" />
                        ٤. موديول نموذج التردد والزيارات (Visits Form)
                      </h4>
                      <p className="text-xs text-teal-800 font-bold mt-0.5">
                        سجل الترددات الطبية اليومية، الشكوى، التشخيص، وخطة العلاج والفحوصات
                      </p>
                    </div>
                    <button
                      onClick={() => setShowVisitsModal(true)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> إضافة / فتح جدول التردد
                    </button>
                  </div>

                  {visits.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد زيارات مسجلة للمريض حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-teal-50/70 border-b border-teal-100 text-teal-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الزيارة</th>
                            <th className="p-3">نوع الزيارة</th>
                            <th className="p-3">الشكوى والتشخيص</th>
                            <th className="p-3">العلاج والفحوصات</th>
                            <th className="p-3">الطبيب</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {visits.map((v) => (
                            <tr key={v.id} className="hover:bg-teal-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(v.visit_date || v.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[11px] font-black">
                                  {v.visit_type_name || v.visit_type || 'زيارة'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900">شكوى: {v.patient_complaint || '—'}</div>
                                <div className="text-teal-800 font-black">تشخيص: {v.diagnosis || '—'}</div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-800">علاج: {v.management_plan || '—'}</div>
                                <div className="text-slate-500 text-[11px]">فحوصات: {v.investigations_requested || '—'}</div>
                              </td>
                              <td className="p-3 text-slate-700">
                                {v.doctor_signature ? `د/ ${v.doctor_signature}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 5: صحة ورعاية الطفل ======================= */}
              {activeTab === 'child' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-emerald-950 text-base flex items-center gap-2">
                        <Baby size={18} className="text-emerald-600" />
                        ٥. موديول صحة ورعاية الطفل والنمو (Child Growth & Health Care)
                      </h4>
                      <p className="text-xs text-emerald-800 font-bold mt-0.5">
                        متابعة معايير منظمة الصحة العالمية (WHO) للوزن، الطول، محيط الرأس، التطعيمات، والنمو المدرسي
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء النموذج' : 'تسجيل متابعة نمو طفل جديدة'}
                    </button>
                  </div>

                  {/* Add form */}
                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('child_under5_followups', {
                            patient_id: patient.id,
                            age_months: Number(t.age_months.value) || 0,
                            weight_kg: Number(t.weight_kg.value) || null,
                            height_cm: Number(t.height_cm.value) || null,
                            head_circumference_cm: Number(t.head_circumference_cm.value) || null,
                            feeding_type: t.feeding_type.value || null,
                            mandatory_vaccines_up_to_date: t.mandatory_vaccines.checked,
                            vitamin_a_supplement_given: t.vitamin_a.checked,
                            vitamin_d_supplement_given: t.vitamin_d.checked,
                            clinical_assessment: t.clinical_assessment.value || null,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ فحص نمو الطفل بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error child_under5_followups:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-emerald-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-emerald-950">نموذج فحص نمو الطفل (سجل المتابعة)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">العمر بالشهور *</label>
                          <input name="age_months" type="number" required placeholder="مثال: 6" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">الوزن (كجم)</label>
                          <input name="weight_kg" type="number" step="0.1" placeholder="مثال: 7.5" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">الطول (سم)</label>
                          <input name="height_cm" type="number" step="0.5" placeholder="مثال: 68" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">محيط الرأس (سم)</label>
                          <input name="head_circumference_cm" type="number" step="0.5" placeholder="مثال: 42" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">نوع التغذية والرضاعة</label>
                          <select name="feeding_type" className="w-full p-2.5 border rounded-xl">
                            <option value="طبيعية مطلقة">طبيعية مطلقة (Exclusive Breastfeeding)</option>
                            <option value="صناعية">ألبان صناعية بديلة</option>
                            <option value="مختلطة">مختلطة (طبيعية + صناعية)</option>
                            <option value="تغذية تكميلية وفطام">بدء التغذية التكميلية والفطام</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">اسم الطبيب الفاحص</label>
                          <input name="doctor_signature" placeholder="اسم الطبيب" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 py-2 text-xs font-bold text-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="mandatory_vaccines" type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                          <span>التطعيمات الإجبارية المقررة مكتملة حسب السن</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="vitamin_a" type="checkbox" className="w-4 h-4 rounded text-emerald-600" />
                          <span>تم إعطاء كبسولة فيتامين (أ) المقررة</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="vitamin_d" type="checkbox" defaultChecked className="w-4 h-4 rounded text-emerald-600" />
                          <span>يتناول جرعات فيتامين (د) الوقائية</span>
                        </label>
                      </div>

                      <div>
                        <label className="block mb-1 text-xs font-bold text-slate-700">التقييم الإكلينيكي وتطور النمو</label>
                        <textarea name="clinical_assessment" rows={2} placeholder="تطور الحركة، التواصل، الأسنان، ملاحظات الأم..." className="w-full p-2.5 border rounded-xl text-xs" />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ الفحص'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات متابعة نمو الطفل من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : childUnder5Records.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد سجلات متابعة نمو مسجلة للطفل حتى الآن. اضغط على الزر أعلاه لإضافة فحص.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-emerald-50 border-b border-emerald-100 text-emerald-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الفحص</th>
                            <th className="p-3">العمر</th>
                            <th className="p-3">الوزن / الطول / الرأس</th>
                            <th className="p-3">الرضاعة والتغذية</th>
                            <th className="p-3">التطعيمات والفيتامينات</th>
                            <th className="p-3">التقييم والتوقيع</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {childUnder5Records.map((c) => (
                            <tr key={c.id} className="hover:bg-emerald-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(c.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-black">
                                  {c.age_months} شهر
                                </span>
                              </td>
                              <td className="p-3 text-slate-800">
                                <div>وزن: {c.weight_kg ? `${c.weight_kg} كجم` : '—'}</div>
                                <div>طول: {c.height_cm ? `${c.height_cm} سم` : '—'}</div>
                                <div className="text-slate-500">رأس: {c.head_circumference_cm ? `${c.head_circumference_cm} سم` : '—'}</div>
                              </td>
                              <td className="p-3 text-slate-700">{c.feeding_type || '—'}</td>
                              <td className="p-3">
                                <div className={c.mandatory_vaccines_up_to_date ? 'text-emerald-700' : 'text-amber-700'}>
                                  تطعيمات: {c.mandatory_vaccines_up_to_date ? 'مكتملة ✓' : 'غير مكتملة'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  فيتامين أ: {c.vitamin_a_supplement_given ? 'نعم' : 'لا'} | فيتامين د: {c.vitamin_d_supplement_given ? 'نعم' : 'لا'}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900">{c.clinical_assessment || 'سليم'}</div>
                                <div className="text-slate-500 text-[11px]">{c.doctor_signature ? `د/ ${c.doctor_signature}` : ''}</div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('child_under5_followups', c.id, 'فحص نمو الطفل')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 6: رعاية الأمومة والحوامل ======================= */}
              {activeTab === 'maternal' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-rose-950 text-base flex items-center gap-2">
                        <HeartHandshake size={18} className="text-rose-600" />
                        ٦. موديول رعاية الأمومة والحوامل والنفاس (Maternal ANC & Postpartum)
                      </h4>
                      <p className="text-xs text-rose-800 font-bold mt-0.5">
                        بروتوكول متابعة الحمل، التاريخ التوليدي (G/P/A)، تطعيم التيتانوس، السونار، ورعاية ما بعد الولادة
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء النموذج' : 'تسجيل متابعة حمل جديدة (ANC)'}
                    </button>
                  </div>

                  {/* ANC Add Form */}
                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('maternal_antenatal_followups', {
                            patient_id: patient.id,
                            gravida: Number(t.gravida.value) || 0,
                            para: Number(t.para.value) || 0,
                            abortions: Number(t.abortions.value) || 0,
                            lmp_date: t.lmp_date.value || null,
                            edd_date: t.edd_date.value || null,
                            fundal_height_cm: Number(t.fundal_height_cm.value) || null,
                            fetal_heart_sound: t.fetal_heart_sound.value || null,
                            fetal_movement: t.fetal_movement.value || null,
                            blood_glucose: Number(t.blood_glucose.value) || null,
                            hb_result: Number(t.hb_result.value) || null,
                            urine_albumin: t.urine_albumin.checked,
                            supplements_prescribed: t.supplements.checked,
                            health_education_given: t.health_education.value || null,
                            next_visit_date: t.next_visit_date.value || null,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ سجل متابعة الحمل (ANC) بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error maternal_antenatal_followups:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-rose-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-rose-950">نموذج فحص ومتابعة الحامل (Antenatal Care - Form 6A)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">عدد مرات الحمل (Gravida)</label>
                          <input name="gravida" type="number" defaultValue="1" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">عدد الولادات (Para)</label>
                          <input name="para" type="number" defaultValue="0" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">عدد الإجهاضات (Abortions)</label>
                          <input name="abortions" type="number" defaultValue="0" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">تاريخ أول يوم بآخر دورة (LMP)</label>
                          <input name="lmp_date" type="date" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">التاريخ المتوقع للولادة (EDD)</label>
                          <input name="edd_date" type="date" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">ارتفاع قاع الرحم (سم)</label>
                          <input name="fundal_height_cm" type="number" step="0.5" placeholder="Fundal height" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">نبض الجنين (FHS)</label>
                          <input name="fetal_heart_sound" placeholder="مثال: 140 / دقيقة إيجابي" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">حركة الجنين</label>
                          <input name="fetal_movement" placeholder="مثال: جيدة ونشطة" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">الهيموجلوبين (Hb g/dL)</label>
                          <input name="hb_result" type="number" step="0.1" placeholder="مثال: 11.8" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">سكر الدم (mg/dL)</label>
                          <input name="blood_glucose" type="number" placeholder="مثال: 95" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">موعد الزيارة القادمة</label>
                          <input name="next_visit_date" type="date" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 py-2 text-xs font-bold text-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="urine_albumin" type="checkbox" className="w-4 h-4 rounded text-rose-600" />
                          <span>وجود زلال بالبول (Albuminuria)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="supplements" type="checkbox" defaultChecked className="w-4 h-4 rounded text-rose-600" />
                          <span>تم صرف مكملات الحمل (حديد + حمض فوليك + كالسيوم)</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">التوعية الصحية والملاحظات</label>
                          <input name="health_education" placeholder="تغذية الحامل، علامات الخطر، الرضاعة..." className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">توقيع الطبيب الفاحص</label>
                          <input name="doctor_signature" placeholder="د/ الطبيب" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ سجل الحمل'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات متابعة الحمل من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : ancRecords.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد زيارات متابعة حمل مسجلة حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-rose-50 border-b border-rose-100 text-rose-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الزيارة</th>
                            <th className="p-3">G / P / A</th>
                            <th className="p-3">LMP / EDD</th>
                            <th className="p-3">ارتفاع الرحم ونبض الجنين</th>
                            <th className="p-3">تحاليل (Hb / سكر / زلال)</th>
                            <th className="p-3">الزيارة القادمة والطبيب</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {ancRecords.map((r) => (
                            <tr key={r.id} className="hover:bg-rose-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(r.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded font-black">
                                  G{r.gravida} P{r.para} A{r.abortions}
                                </span>
                              </td>
                              <td className="p-3 text-slate-800">
                                <div>LMP: {r.lmp_date || '—'}</div>
                                <div className="text-rose-800">EDD: {r.edd_date || '—'}</div>
                              </td>
                              <td className="p-3">
                                <div>قاع الرحم: {r.fundal_height_cm ? `${r.fundal_height_cm} سم` : '—'}</div>
                                <div className="text-slate-600">نبض الجنين: {r.fetal_heart_sound || '—'}</div>
                              </td>
                              <td className="p-3">
                                <div>Hb: {r.hb_result ? `${r.hb_result} g/dL` : '—'}</div>
                                <div>سكر: {r.blood_glucose ? `${r.blood_glucose} mg` : '—'}</div>
                                <div className={r.urine_albumin ? 'text-red-600' : 'text-slate-500'}>
                                  زلال: {r.urine_albumin ? 'إيجابي ⚠️' : 'سلبي'}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-rose-900 font-black">
                                  {r.next_visit_date ? `القادمة: ${r.next_visit_date}` : '—'}
                                </div>
                                <div className="text-slate-500 text-[11px]">{r.doctor_signature ? `د/ ${r.doctor_signature}` : ''}</div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('maternal_antenatal_followups', r.id, 'متابعة الحمل')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 7: تنظيم الأسرة ======================= */}
              {activeTab === 'family_planning' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-pink-50 border border-pink-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-pink-950 text-base flex items-center gap-2">
                        <Sparkles size={18} className="text-pink-600" />
                        ٧. موديول تنظيم الأسرة والصحة الإنجابية (Family Planning)
                      </h4>
                      <p className="text-xs text-pink-800 font-bold mt-0.5">
                        توثيق وسيلة تنظيم الأسرة الحالية والموصوفة، الآثار الجانبية، ومواعيد المتابعة والتجديد
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-black shadow-md shadow-pink-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل متابعة تنظيم أسرة'}
                    </button>
                  </div>

                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('family_planning_followups', {
                            patient_id: patient.id,
                            visit_reason: t.visit_reason.value || 'متابعة دورية',
                            current_method: t.current_method.value || null,
                            method_duration: t.method_duration.value || null,
                            side_effects: t.side_effects.value || null,
                            menstrual_regularity: t.menstrual_regularity.value || 'منتظمة',
                            new_method_prescribed: t.new_method.value || null,
                            next_visit_date: t.next_visit_date.value || null,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ سجل تنظيم الأسرة بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error family_planning_followups:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-pink-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-pink-950">نموذج تنظيم الأسرة (Form 7)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">سبب الزيارة</label>
                          <input name="visit_reason" defaultValue="صرف وتجديد وسيلة" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">الوسيلة الحالية</label>
                          <select name="current_method" className="w-full p-2.5 border rounded-xl">
                            <option value="لولب نحاسي">لولب نحاسي (Copper IUD)</option>
                            <option value="لولب هرموني">لولب هرموني (Mirena)</option>
                            <option value="حبوب أحادية الهرمون (رضاعة)">حبوب أحادية الهرمون (رضاعة)</option>
                            <option value="حبوب مركبة">حبوب مركبة (COC)</option>
                            <option value="حقن ثلاثية الشهور">حقن ثلاثية الشهور (DMPA)</option>
                            <option value="كبسولة تحت الجلد">كبسولة تحت الجلد (Implant)</option>
                            <option value="لا توجد وسيلة">لا توجد وسيلة سابقة</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">مدة استخدام الوسيلة</label>
                          <input name="method_duration" placeholder="مثال: سنة واحدة" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">الآثار الجانبية إن وجدت</label>
                          <input name="side_effects" placeholder="صداع، نزف خفيف، ألم..." className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">انتظام الطمث</label>
                          <select name="menstrual_regularity" className="w-full p-2.5 border rounded-xl">
                            <option value="منتظمة">منتظمة</option>
                            <option value="غير منتظمة">غير منتظمة</option>
                            <option value="انقطاع طمث (طبيعي مع الحقن)">انقطاع طمث معتاد مع الوسيلة</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">الوسيلة الموصوفة والمصروفة</label>
                          <input name="new_method" placeholder="الوسيلة المقررة اليوم" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">موعد الزيارة القادمة للتجديد</label>
                          <input name="next_visit_date" type="date" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">توقيع الطبيب / الممرضة</label>
                          <input name="doctor_signature" placeholder="اسم الطبيب" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-pink-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ السجل'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات تنظيم الأسرة من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : familyPlanningRecords.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد سجلات تنظيم أسرة مسجلة حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-pink-50 border-b border-pink-100 text-pink-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الزيارة</th>
                            <th className="p-3">الوسيلة الحالية والمدة</th>
                            <th className="p-3">الآثار الجانبية</th>
                            <th className="p-3">الوسيلة المقررة</th>
                            <th className="p-3">المتابعة القادمة والطبيب</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {familyPlanningRecords.map((fp) => (
                            <tr key={fp.id} className="hover:bg-pink-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(fp.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <span className="bg-pink-100 text-pink-900 px-2 py-0.5 rounded font-black">
                                  {fp.current_method || '—'}
                                </span>
                                <span className="text-slate-500 text-[11px] mr-1.5">({fp.method_duration || 'غير محدد'})</span>
                              </td>
                              <td className="p-3 text-slate-700">{fp.side_effects || 'لا توجد'}</td>
                              <td className="p-3 text-pink-900 font-black">{fp.new_method_prescribed || '—'}</td>
                              <td className="p-3">
                                <div>{fp.next_visit_date || '—'}</div>
                                <div className="text-slate-500 text-[11px]">{fp.doctor_signature ? `د/ ${fp.doctor_signature}` : ''}</div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('family_planning_followups', fp.id, 'متابعة تنظيم الأسرة')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 8: فحص المقبلين على الزواج ======================= */}
              {activeTab === 'premarital' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-cyan-950 text-base flex items-center gap-2">
                        <HeartHandshake size={18} className="text-cyan-600" />
                        ٨. موديول الفحص الطبي الشامل للمقبلين على الزواج (Premarital Examination)
                      </h4>
                      <p className="text-xs text-cyan-800 font-bold mt-0.5">
                        الفحص الوراثي والمعدي، فصائل الدم، أنيميا البحر المتوسط، ورقم الشهادة الصحية الرسمية
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black shadow-md shadow-cyan-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل فحص زواج جديد'}
                    </button>
                  </div>

                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('premarital_assessments', {
                            patient_id: patient.id,
                            partner_name: t.partner_name.value,
                            partner_national_id: t.partner_national_id.value || null,
                            consanguinity_with_partner: t.consanguinity.checked,
                            fasting_blood_sugar: Number(t.fasting_blood_sugar.value) || null,
                            rh_factor: t.rh_factor.value || null,
                            hb_electrophoresis_done: t.hb_electrophoresis.checked,
                            certificate_number: t.cert_num.value || null,
                            certificate_status: t.cert_status.value || 'لائق للزواج',
                            mutual_consent_signed: t.consent.checked,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ سجل فحص ما قبل الزواج بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error premarital_assessments:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-cyan-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-cyan-950">نموذج فحص ما قبل الزواج (Form 8A / 8B)</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">اسم الطرف الآخر (الخطيب / الخطيبة) *</label>
                          <input name="partner_name" required placeholder="الاسم رباعي" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">الرقم القومي للطرف الآخر</label>
                          <input name="partner_national_id" placeholder="الرقم القومي (14 رقم)" className="w-full p-2.5 border rounded-xl font-mono" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">عامل ريسس (Rh Factor)</label>
                          <select name="rh_factor" className="w-full p-2.5 border rounded-xl">
                            <option value="موجب (+)">موجب (+ Rh Positive)</option>
                            <option value="سالب (-)">سالب (- Rh Negative)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">سكر الدم الصائم (mg/dL)</label>
                          <input name="fasting_blood_sugar" type="number" placeholder="مثال: 85" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">رقم الشهادة الطبية المميكنة</label>
                          <input name="cert_num" placeholder="كود الشهادة الرسمية" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">حالة الشهادة الطبية</label>
                          <select name="cert_status" className="w-full p-2.5 border rounded-xl">
                            <option value="لائق للزواج">لائق للزواج (معتمد)</option>
                            <option value="مشورة وراثية مطلوبة">مشورة وراثية مطلوبة</option>
                            <option value="قيد المراجعة والتحاليل">قيد المراجعة والتحاليل</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-6 py-2 text-xs font-bold text-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="consanguinity" type="checkbox" className="w-4 h-4 rounded text-cyan-600" />
                          <span>وجود صلة قرابة بين الطرفين (Consanguinity)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="hb_electrophoresis" type="checkbox" defaultChecked className="w-4 h-4 rounded text-cyan-600" />
                          <span>تم عمل الفصل الكهربائي للهيموجلوبين (Thalassemia screen)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="consent" type="checkbox" defaultChecked className="w-4 h-4 rounded text-cyan-600" />
                          <span>تم توقيع إقرار الموافقة المستنيرة واستلام المشورة</span>
                        </label>
                      </div>

                      <div>
                        <label className="block mb-1 text-xs font-bold text-slate-700">اسم الطبيب المعتمد</label>
                        <input name="doctor_signature" placeholder="د/ الطبيب" className="w-full p-2.5 border rounded-xl text-xs font-bold" />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-cyan-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ الفحص'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات فحص ما قبل الزواج من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : premaritalRecords.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا يوجد فحص مقبلين على الزواج مسجل حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-cyan-50 border-b border-cyan-100 text-cyan-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الفحص</th>
                            <th className="p-3">الطرف الآخر</th>
                            <th className="p-3">صلة القرابة والتحاليل</th>
                            <th className="p-3">الشهادة والحالة</th>
                            <th className="p-3">الطبيب المعتمد</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {premaritalRecords.map((p) => (
                            <tr key={p.id} className="hover:bg-cyan-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(p.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 font-black">{p.partner_name}</div>
                                <div className="text-slate-500 font-mono text-[11px]">{p.partner_national_id || '—'}</div>
                              </td>
                              <td className="p-3 text-slate-700">
                                <div>قرابة: {p.consanguinity_with_partner ? 'نعم (أقارب)' : 'لا توجد'}</div>
                                <div className="text-cyan-800">Rh: {p.rh_factor || '—'} | سكر: {p.fasting_blood_sugar || '—'}</div>
                              </td>
                              <td className="p-3">
                                <span className="bg-cyan-100 text-cyan-950 px-2.5 py-1 rounded-lg font-black block w-max mb-1">
                                  {p.certificate_status || 'لائق للزواج'}
                                </span>
                                <span className="font-mono text-slate-500 text-[11px]">رقم: {p.certificate_number || '—'}</span>
                              </td>
                              <td className="p-3 text-slate-700">
                                {p.doctor_signature ? `د/ ${p.doctor_signature}` : '—'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('premarital_assessments', p.id, 'فحص ما قبل الزواج')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 9: رعاية كبار السن ======================= */}
              {activeTab === 'geriatric' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-amber-950 text-base flex items-center gap-2">
                        <Clock size={18} className="text-amber-600" />
                        ٩. موديول الرعاية الصحية الشاملة للمسنين (Comprehensive Geriatric Assessment)
                      </h4>
                      <p className="text-xs text-amber-800 font-bold mt-0.5">
                        تقييم متلازمة الوهن والهشاشة، الأنشطة اليومية (ADL)، الذاكرة (Mini-Cog)، وخطر السقوط
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md shadow-amber-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل تقييم مسنين جديد'}
                    </button>
                  </div>

                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('geriatric_assessments', {
                            patient_id: patient.id,
                            weight_loss: t.weight_loss.checked,
                            weakness_reported: t.weakness.checked,
                            basic_adls_score: t.adls_score.value || 'مستقل تماماً',
                            mini_cog_score: Number(t.mini_cog.value) || null,
                            fall_risk_timed_up_go: t.fall_risk.value || 'طبيعي (< 12 ثانية)',
                            depression_mood_assessment: t.depression.value || 'لا يوجد اكتئاب',
                            management_plan: t.plan.value || null,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ تقييم المسن بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error geriatric_assessments:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-amber-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-amber-950">نموذج تقييم المسنين الشامل (Form 9)</h5>
                      
                      <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100 space-y-2 text-xs font-bold">
                        <span className="text-amber-900 block font-black">مؤشرات متلازمة الوهن والهشاشة (Frailty Phenotype):</span>
                        <div className="flex flex-wrap gap-6 text-slate-800">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input name="weight_loss" type="checkbox" className="w-4 h-4 rounded text-amber-600" />
                            <span>فقدان وزن غير مقصود (&gt; 4.5 كجم في العام الماضي)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input name="weakness" type="checkbox" className="w-4 h-4 rounded text-amber-600" />
                            <span>ضعف ملحوظ في قبضة اليد والقدرة الحركية</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">مقياس الاستقلالية بالأنشطة اليومية (Katz ADL)</label>
                          <select name="adls_score" className="w-full p-2.5 border rounded-xl">
                            <option value="مستقل تماماً (6/6)">مستقل تماماً (6/6)</option>
                            <option value="اعتماد متوسط (4-5/6)">اعتماد متوسط (4-5/6)</option>
                            <option value="اعتماد شديد (&lt; 4/6)">اعتماد شديد بحاجة لمساعد (&lt; 4/6)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">تقييم الذاكرة والإدراك (Mini-Cog Score 0-5)</label>
                          <input name="mini_cog" type="number" min="0" max="5" defaultValue="5" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">خطر السقوط الحركي (Timed Up &amp; Go)</label>
                          <select name="fall_risk" className="w-full p-2.5 border rounded-xl">
                            <option value="طبيعي (&lt; 12 ثانية)">طبيعي (&lt; 12 ثانية - لا خطر)</option>
                            <option value="خطر سقوط متوسط (12-20 ثانية)">خطر سقوط متوسط (12-20 ثانية)</option>
                            <option value="خطر سقوط مرتفع (&gt; 20 ثانية)">خطر سقوط مرتفع (&gt; 20 ثانية)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">فحص الاكتئاب والمزاج للمسنين (GDS)</label>
                          <input name="depression" defaultValue="المزاج جيد ولا توجد أعراض اكتئابية" className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">توقيع الطبيب القائم بالتقييم</label>
                          <input name="doctor_signature" placeholder="اسم الطبيب" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 text-xs font-bold text-slate-700">خطة الرعاية والوقاية المقترحة</label>
                        <textarea name="plan" rows={2} placeholder="تعديلات الأدوية، التغذية، فحص هشاشة العظام، دعم الأسرة..." className="w-full p-2.5 border rounded-xl text-xs" />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-amber-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ تقييم المسن'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات تقييم المسنين من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : geriatricRecords.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا يوجد تقييم مسنين مسجل حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-amber-50 border-b border-amber-100 text-amber-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ التقييم</th>
                            <th className="p-3">الأنشطة اليومية (ADL)</th>
                            <th className="p-3">الإدراك والذاكرة (Mini-Cog)</th>
                            <th className="p-3">خطر السقوط والوهن</th>
                            <th className="p-3">الخطة والطبيب</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {geriatricRecords.map((g) => (
                            <tr key={g.id} className="hover:bg-amber-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(g.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3 text-slate-900 font-black">{g.basic_adls_score || '—'}</td>
                              <td className="p-3">
                                <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded font-black">
                                  {g.mini_cog_score !== null ? `${g.mini_cog_score} / 5` : '—'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div>سقوط: {g.fall_risk_timed_up_go || '—'}</div>
                                <div className="text-slate-500 text-[11px]">
                                  فقدان وزن: {g.weight_loss ? 'نعم' : 'لا'} | ضعف: {g.weakness_reported ? 'نعم' : 'لا'}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-800">{g.management_plan || 'خطة اعتيادية'}</div>
                                <div className="text-slate-500 text-[11px]">{g.doctor_signature ? `د/ ${g.doctor_signature}` : ''}</div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('geriatric_assessments', g.id, 'تقييم المسن')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= موديول 10: صحة الفم والأسنان ======================= */}
              {activeTab === 'dental' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-blue-950 text-base flex items-center gap-2">
                        <Smile size={18} className="text-blue-600" />
                        ١٠. موديول طب وصحة الفم والأسنان (Oral & Dental Health Protocol)
                      </h4>
                      <p className="text-xs text-blue-800 font-bold mt-0.5">
                        فحص الأنسجة الرخوة ومفصل الفك (TMJ)، ومؤشر تسوس وحشو وفقد الأسنان (DMFT Index)
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                    >
                      <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل فحص أسنان جديد'}
                    </button>
                  </div>

                  {showAddForm && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSubmitting(true);
                        const t = e.target as any;
                        try {
                          const saved = await DB.addAccreditationRecord('dental_assessments', {
                            patient_id: patient.id,
                            tmj_clicking: t.tmj_clicking.checked,
                            tmj_tenderness: t.tmj_tenderness.checked,
                            dmft_decayed: Number(t.decayed.value) || 0,
                            dmft_missing: Number(t.missing.value) || 0,
                            dmft_filled: Number(t.filled.value) || 0,
                            treatment_plan: t.treatment_plan.value || null,
                            doctor_signature: t.doctor_signature.value || null
                          });
                          if (!saved || !saved.id) {
                            throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                          }
                          showNotification('success', "تم حفظ فحص الأسنان بنجاح في قاعدة البيانات المركزية.");
                          setShowAddForm(false);
                          loadAllData();
                          if (onRefresh) onRefresh();
                        } catch (err: any) {
                          console.error("Save error dental_assessments:", err);
                          const errMsg = err?.message || "خطأ غير معروف في الاتصال بقاعدة البيانات";
                          const userMsg = `فشل حفظ البيانات في قاعدة البيانات. لم يتم الحفظ. تفاصيل الخطأ: ${errMsg}`;
                          showNotification('error', userMsg);
                          alert(userMsg);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="p-5 bg-white border-2 border-blue-200 rounded-3xl space-y-4 shadow-md"
                    >
                      <h5 className="font-black text-sm text-blue-950">نموذج فحص الأسنان (Form 3)</h5>
                      
                      <div className="flex flex-wrap gap-6 py-1 text-xs font-bold text-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="tmj_clicking" type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                          <span>صوت طقطقة بمفصل الفك (TMJ Clicking)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input name="tmj_tenderness" type="checkbox" className="w-4 h-4 rounded text-blue-600" />
                          <span>ألم وحساسية بمفصل الفك (TMJ Tenderness)</span>
                        </label>
                      </div>

                      <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2 text-xs font-bold">
                        <span className="text-blue-950 block font-black">مؤشر الأسنان (DMFT Caries Index):</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block mb-1 text-slate-700">عدد الأسنان المسوسة (Decayed - D)</label>
                            <input name="decayed" type="number" min="0" defaultValue="0" className="w-full p-2.5 border rounded-xl" />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-700">عدد الأسنان المفقودة (Missing - M)</label>
                            <input name="missing" type="number" min="0" defaultValue="0" className="w-full p-2.5 border rounded-xl" />
                          </div>
                          <div>
                            <label className="block mb-1 text-slate-700">عدد الأسنان المحشوة (Filled - F)</label>
                            <input name="filled" type="number" min="0" defaultValue="0" className="w-full p-2.5 border rounded-xl" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                        <div>
                          <label className="block mb-1 text-slate-700">خطة العلاج السني والتنظيف</label>
                          <input name="treatment_plan" placeholder="حشو، إزالة جير، علاج عصب، خلع..." className="w-full p-2.5 border rounded-xl" />
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-700">توقيع طبيب الأسنان</label>
                          <input name="doctor_signature" placeholder="اسم طبيب الأسنان" className="w-full p-2.5 border rounded-xl" />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                        <button type="submit" disabled={submitting} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-md">
                          {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ فحص الأسنان'}
                        </button>
                      </div>
                    </form>
                  )}

                  {loadError ? (
                    <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-red-200 text-red-700 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-red-500" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات فحص الأسنان من قاعدة البيانات</p>
                      <p className="text-xs text-red-600 font-mono">{loadError}</p>
                    </div>
                  ) : dentalRecords.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد فحوصات أسنان مسجلة حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-blue-50 border-b border-blue-100 text-blue-950 font-black">
                          <tr>
                            <th className="p-3">تاريخ الفحص</th>
                            <th className="p-3">مؤشر DMFT (تسوس / فقد / حشو)</th>
                            <th className="p-3">مفصل الفك (TMJ)</th>
                            <th className="p-3">خطة العلاج</th>
                            <th className="p-3">طبيب الأسنان</th>
                            <th className="p-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {dentalRecords.map((d) => (
                            <tr key={d.id} className="hover:bg-blue-50/20">
                              <td className="p-3 font-mono text-slate-600">
                                {new Date(d.created_at).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="p-3">
                                <span className="bg-blue-100 text-blue-950 px-2.5 py-1 rounded-lg font-black">
                                  D: {d.dmft_decayed} | M: {d.dmft_missing} | F: {d.dmft_filled}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700">
                                طقطقة: {d.tmj_clicking ? 'نعم' : 'لا'} | ألم: {d.tmj_tenderness ? 'نعم' : 'لا'}
                              </td>
                              <td className="p-3 text-slate-800 font-black">{d.treatment_plan || 'سليم'}</td>
                              <td className="p-3 text-slate-700">
                                {d.doctor_signature ? `د/ ${d.doctor_signature}` : '—'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord('dental_assessments', d.id, 'فحص الأسنان')}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف السجل"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-bold">
            الملف الصحي العائلي الشامل • معايير الهيئة العامة للاعتماد والرقابة الصحية (GAHAR)
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all"
          >
            إغلاق الملف
          </button>
        </div>

      </div>

      {/* Embedded Sub-Modals */}
      {showHistoryExamModal && (
        <HistoryPhysicalModal
          isOpen={showHistoryExamModal}
          onClose={() => setShowHistoryExamModal(false)}
          patient={patient}
          initialTab={historyExamInitialTab}
          onSaved={() => {
            setShowHistoryExamModal(false);
            loadAllData();
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {showVisitsModal && (
        <VisitsFormModal
          isOpen={showVisitsModal}
          onClose={() => setShowVisitsModal(false)}
          patient={patient}
          onSaved={() => {
            loadAllData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default FamilyComprehensiveHealthRecordModal;
