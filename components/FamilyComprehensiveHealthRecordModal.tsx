import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, User, Calendar, Shield, Activity, FileText, ClipboardList, 
  Baby, HeartHandshake, Sparkles, Smile, Clock, CheckCircle2, 
  AlertCircle, Plus, Trash2, Printer, ArrowRight, Stethoscope,
  ChevronDown, ChevronUp, ExternalLink, Save, Check, Filter,
  Eye, Droplets, Info, CalendarCheck, CheckCircle, AlertTriangle
} from 'lucide-react';
import { DB } from '../store.ts';
import { calculateAge, BLOOD_TYPES } from '../constants.ts';
import { LinkedModuleType } from '../types.ts';
import HistoryPhysicalModal from './HistoryPhysicalModal.tsx';
import { QuickClinicBookingModal } from './QuickClinicBookingModal.tsx';
import { ModuleProgressRing, UnsavedChangesModal } from './clinical-record/ClinicalFormComponents.tsx';
import { MaternalAncPoCView } from './clinical-record/MaternalAncPoCView.tsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  familyFile?: any;
  initialModule?: string;
  initialModuleId?: string;
  activeAppointment?: any;
  onAppointmentCompleted?: (appointmentId: string) => void;
  onRefresh?: () => void;
}

export const FamilyComprehensiveHealthRecordModal: React.FC<Props> = ({
  isOpen,
  onClose,
  patient,
  familyFile,
  initialModule,
  initialModuleId,
  activeAppointment,
  onAppointmentCompleted,
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
  const [quickBookingState, setQuickBookingState] = useState<{ module: LinkedModuleType; reason: string } | null>(null);

  // Data states for modules
  const [loading, setLoading] = useState(true);
  const [clinicAppointments, setClinicAppointments] = useState<any[]>([]);
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
  const [childSubTab, setChildSubTab] = useState<'under5' | 'over5'>(isUnder5 ? 'under5' : 'over5');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tableErrors, setTableErrors] = useState<Record<string, string>>({});
  const [statusBanner, setStatusBanner] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Form dirty state & Unsaved changes confirmation dialog
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const handleTabClick = (targetTabId: string) => {
    if (activeTab === targetTabId) return;
    if (isFormDirty) {
      setPendingTabSwitch(targetTabId);
      setShowUnsavedConfirm(true);
    } else {
      setActiveTab(targetTabId);
      setShowAddForm(false);
    }
  };

  const handleCloseModal = () => {
    if (isFormDirty) {
      setPendingTabSwitch('CLOSE_MODAL');
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const showNotification = (type: 'error' | 'success', message: string) => {
    setStatusBanner({ type, message });
    if (type === 'success') {
      setTimeout(() => {
        setStatusBanner((prev) => (prev?.message === message ? null : prev));
      }, 5000);
    }
  };

  const handleRecordSaved = async (tableName: string, label: string) => {
    showNotification('success', `تم حفظ ${label} بنجاح في قاعدة البيانات.`);
    if (activeAppointment?.id) {
      try {
        await DB.updateAppointmentStatus(activeAppointment.id, 'COMPLETED');
        if (onAppointmentCompleted) {
          onAppointmentCompleted(activeAppointment.id);
        }
      } catch (err) {
        console.error("Error updating appointment status:", err);
      }
    }
    setShowAddForm(false);
    loadAllData();
    if (onRefresh) onRefresh();
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
    setTableErrors({});
    try {
      const results = await Promise.allSettled([
        DB.getPhysicalExams(patient.id),
        DB.getPatientVisits(patient.id),
        DB.getClinicAppointments(undefined, undefined, undefined, patient.id),
        DB.getAccreditationRecords('maternal_antenatal_followups', patient.id),
        DB.getAccreditationRecords('maternal_postpartum_followups', patient.id),
        DB.getAccreditationRecords('child_under5_followups', patient.id),
        DB.getAccreditationRecords('child_over5_followups', patient.id),
        DB.getAccreditationRecords('family_planning_followups', patient.id),
        DB.getAccreditationRecords('premarital_assessments', patient.id),
        DB.getAccreditationRecords('geriatric_assessments', patient.id),
        DB.getAccreditationRecords('dental_assessments', patient.id)
      ]);

      const [
        examsRes,
        visitsRes,
        apptsRes,
        ancRes,
        postpartumRes,
        cUnder5Res,
        cOver5Res,
        fpRes,
        premaritalRes,
        geriatricRes,
        dentalRes
      ] = results;

      if (examsRes.status === 'fulfilled') setPhysicalExams(examsRes.value || []);
      if (visitsRes.status === 'fulfilled') setVisits(visitsRes.value || []);
      if (apptsRes.status === 'fulfilled') setClinicAppointments(apptsRes.value || []);
      if (ancRes.status === 'fulfilled') setAncRecords(ancRes.value || []);
      if (postpartumRes.status === 'fulfilled') setPostpartumRecords(postpartumRes.value || []);
      if (cUnder5Res.status === 'fulfilled') setChildUnder5Records(cUnder5Res.value || []);
      if (cOver5Res.status === 'fulfilled') setChildOver5Records(cOver5Res.value || []);
      if (fpRes.status === 'fulfilled') setFamilyPlanningRecords(fpRes.value || []);
      if (premaritalRes.status === 'fulfilled') setPremaritalRecords(premaritalRes.value || []);
      if (geriatricRes.status === 'fulfilled') setGeriatricRecords(geriatricRes.value || []);
      if (dentalRes.status === 'fulfilled') setDentalRecords(dentalRes.value || []);

      const errMap: Record<string, string> = {};
      const missingTableNames: string[] = [];

      const recordResError = (res: PromiseSettledResult<any>, tableName: string) => {
        if (res.status === 'rejected') {
          const msg = res.reason?.message || String(res.reason);
          errMap[tableName] = msg;
          missingTableNames.push(tableName);
        }
      };

      recordResError(examsRes, 'history_physical_exams');
      recordResError(visitsRes, 'patient_visits');
      recordResError(apptsRes, 'clinic_appointments');
      recordResError(ancRes, 'maternal_antenatal_followups');
      recordResError(postpartumRes, 'maternal_postpartum_followups');
      recordResError(cUnder5Res, 'child_under5_followups');
      recordResError(cOver5Res, 'child_over5_followups');
      recordResError(fpRes, 'family_planning_followups');
      recordResError(premaritalRes, 'premarital_assessments');
      recordResError(geriatricRes, 'geriatric_assessments');
      recordResError(dentalRes, 'dental_assessments');

      setTableErrors(errMap);
      if (missingTableNames.length > 0) {
        setLoadError(`تم استرجاع السجلات المتاحة بنجاح. تنبيه: الجداول (${missingTableNames.join('، ')}) غير متوفرة حالياً في Schema Cache لقاعدة البيانات.`);
      }
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

  // Rollup all clinical events, clinic appointments, and examinations into a unified chronology
  const rollupVisits = useMemo(() => {
    const all: any[] = [];

    // 1. Clinic appointments
    clinicAppointments.forEach(a => {
      all.push({
        id: `appt-${a.id}`,
        date: a.date,
        time: a.time,
        type: 'حجز ومراجعة عيادة',
        clinicName: a.clinics?.name || 'عيادة تخصصية',
        doctor: a.doctors?.name,
        complaint: a.notes,
        diagnosis: a.diagnosis,
        management: a.prescription,
        status: a.status,
        source: 'حجز عيادة',
        sourceColor: 'bg-indigo-100 text-indigo-900 border-indigo-200'
      });
    });

    // 2. Physical comprehensive exams
    physicalExams.forEach(e => {
      all.push({
        id: `exam-${e.id}`,
        date: e.exam_date || e.created_at,
        time: '',
        type: 'فحص سريري وتاريخ مرضي شامل',
        clinicName: 'عيادة طب الأسرة',
        doctor: e.doctor_name,
        complaint: e.hospitalization ? `دخول مستشفى: ${e.hospitalization}` : 'فحص شامل دوري',
        diagnosis: e.current_medications ? `أدوية مستمرة: ${e.current_medications}` : 'فحص سريري مكتمل',
        management: e.adverse_drug_reactions ? `حساسية: ${e.adverse_drug_reactions}` : 'تم الفحص',
        status: 'COMPLETED',
        source: 'فحص شامل',
        sourceColor: 'bg-purple-100 text-purple-900 border-purple-200'
      });
    });

    // 3. Child under 5 followups
    childUnder5Records.forEach(c => {
      all.push({
        id: `c5-${c.id}`,
        date: c.created_at,
        time: '',
        type: `متابعة نمو طفل (${c.age_months} شهر)`,
        clinicName: 'عيادة رعاية الطفل والنمو',
        doctor: c.doctor_signature,
        complaint: `الوزن: ${c.weight_kg || '—'} كجم | الطول: ${c.height_cm || '—'} سم | المحيط: ${c.head_circumference_cm || '—'} سم`,
        diagnosis: c.clinical_assessment || 'نمو طبيعي متطابق مع المعايير',
        management: c.feeding_type ? `الرضاعة: ${c.feeding_type}` : 'متابعة دورية',
        status: 'COMPLETED',
        source: 'رعاية طفل',
        sourceColor: 'bg-emerald-100 text-emerald-900 border-emerald-200'
      });
    });

    // 3.1 Child over 5 followups (School Age & Adolescents Form 5D)
    childOver5Records.forEach(c => {
      all.push({
        id: `cOver5-${c.id}`,
        date: c.created_at || new Date().toISOString(),
        time: '',
        type: `متابعة صحة السن المدرسي (${c.educational_stage || c.school_stage || 'فوق 5 سنوات'})`,
        clinicName: 'عيادة الصحة المدرسية ونمو الأطفال',
        doctor: c.doctor_signature || c.doctor_name,
        complaint: `الوزن: ${c.weight_kg || '—'} كجم | الطول: ${c.height_cm || '—'} سم | BMI: ${c.bmi || '—'}`,
        diagnosis: `بصر: ${c.vision_screening || 'سليم'} | سمع: ${c.hearing_screening || 'سليم'} | سلوكي: ${c.psychiatric_behavioral_screening || 'طبيعي'}`,
        management: `Hb: ${c.hb_level ? `${c.hb_level} g/dL` : '—'} | بول: ${c.urine_analysis_result || '—'} | براز: ${c.stool_analysis_result || '—'}${c.health_education_given ? ` | تثقيف: ${c.health_education_given}` : ''}`,
        status: 'COMPLETED',
        source: 'صحة مدرسية',
        sourceColor: 'bg-teal-100 text-teal-900 border-teal-200'
      });
    });

    // 4. Maternal Antenatal (ANC)
    ancRecords.forEach(m => {
      all.push({
        id: `anc-${m.id}`,
        date: m.created_at,
        time: '',
        type: `متابعة حمل (G${m.gravida || 0} P${m.para || 0})`,
        clinicName: 'عيادة رعاية الأمومة والحوامل',
        doctor: m.doctor_signature,
        complaint: m.complications_concerns || 'متابعة حمل روتينية',
        diagnosis: m.fundal_height_cm ? `ارتفاع الرحم: ${m.fundal_height_cm} سم | نبض: ${m.fetal_heart_sound || 'طبيعي'}` : 'فحص سليم',
        management: m.next_visit_date ? `الموعد القادم: ${m.next_visit_date}` : 'متابعة دورية',
        status: 'COMPLETED',
        source: 'رعاية أمومة',
        sourceColor: 'bg-rose-100 text-rose-900 border-rose-200'
      });
    });

    // 5. Maternal Postpartum
    postpartumRecords.forEach(p => {
      all.push({
        id: `pp-${p.id}`,
        date: p.created_at,
        time: '',
        type: 'متابعة ورعاية النفاس',
        clinicName: 'عيادة رعاية النفاس والأمومة',
        doctor: p.doctor_signature,
        complaint: `ولادة: ${p.delivery_mode || 'طبيعي'} | صحة المولود: ${p.delivery_outcome || 'سليم'}`,
        diagnosis: p.maternal_concerns || 'فحص نفاس سليم',
        management: p.contraception_method ? `تنظيم مقترح: ${p.contraception_method}` : 'تشجيع الرضاعة الطبيعية',
        status: 'COMPLETED',
        source: 'رعاية نفاس',
        sourceColor: 'bg-rose-100 text-rose-900 border-rose-200'
      });
    });

    // 6. Family planning
    familyPlanningRecords.forEach(f => {
      all.push({
        id: `fp-${f.id}`,
        date: f.created_at,
        time: '',
        type: `تنظيم أسرة (${f.current_method || f.new_method_prescribed || 'استشارة'})`,
        clinicName: 'عيادة تنظيم الأسرة والصحة الإنجابية',
        doctor: f.doctor_signature,
        complaint: f.visit_reason || 'صرف وتجديد وسيلة',
        diagnosis: f.side_effects ? `آثار: ${f.side_effects}` : 'طمث منتظم',
        management: f.new_method_prescribed ? `الموصوف: ${f.new_method_prescribed}` : 'استمرار على الوسيلة',
        status: 'COMPLETED',
        source: 'تنظيم أسرة',
        sourceColor: 'bg-pink-100 text-pink-900 border-pink-200'
      });
    });

    // 7. Geriatric
    geriatricRecords.forEach(g => {
      all.push({
        id: `ger-${g.id}`,
        date: g.created_at,
        time: '',
        type: 'تقييم صحي شامل للمسنين',
        clinicName: 'عيادة رعاية كبار السن',
        doctor: g.doctor_signature,
        complaint: `الأنشطة اليومية: ${g.basic_adls_score || 'مستقل'} | الذاكرة: ${g.mini_cog_score !== null ? `${g.mini_cog_score}/5` : '—'}`,
        diagnosis: `سقوط: ${g.fall_risk_timed_up_go || 'طبيعي'} | ${g.depression_mood_assessment || 'المزاج جيد'}`,
        management: g.management_plan || 'خطة متابعة دورية',
        status: 'COMPLETED',
        source: 'كبار سن',
        sourceColor: 'bg-amber-100 text-amber-900 border-amber-200'
      });
    });

    // 8. Dental
    dentalRecords.forEach(d => {
      all.push({
        id: `den-${d.id}`,
        date: d.created_at,
        time: '',
        type: 'فحص وصحة الفم والأسنان',
        clinicName: 'عيادة طب الفم والأسنان',
        doctor: d.doctor_signature,
        complaint: `مؤشر DMFT (تسوس: ${d.dmft_decayed || 0}, فقد: ${d.dmft_missing || 0}, حشو: ${d.dmft_filled || 0})`,
        diagnosis: d.tmj_clicking ? 'صوت طقطقة بمفصل الفك TMJ' : 'فحص سليم',
        management: d.treatment_plan || 'تنظيف وإرشادات',
        status: 'COMPLETED',
        source: 'طب أسنان',
        sourceColor: 'bg-blue-100 text-blue-900 border-blue-200'
      });
    });

    // 9. Premarital
    premaritalRecords.forEach(p => {
      all.push({
        id: `prem-${p.id}`,
        date: p.created_at,
        time: '',
        type: 'فحص المشورة للمقبلين على الزواج',
        clinicName: 'عيادة الفحص قبل الزواج',
        doctor: p.doctor_signature,
        complaint: `الطرف الآخر: ${p.partner_name || '—'} (قرابة: ${p.consanguinity_with_partner ? 'نعم' : 'لا'})`,
        diagnosis: p.certificate_status || 'لائق للزواج',
        management: p.certificate_number ? `شهادة رقم: ${p.certificate_number}` : 'تم استلام المشورة',
        status: 'COMPLETED',
        source: 'قبل الزواج',
        sourceColor: 'bg-cyan-100 text-cyan-900 border-cyan-200'
      });
    });

    // 10. Legacy visits
    visits.forEach(v => {
      all.push({
        id: `vis-${v.id}`,
        date: v.visit_date || v.created_at,
        time: '',
        type: v.visit_type_name || v.visit_type || 'زيارة عيادة',
        clinicName: 'عيادة طب الأسرة',
        doctor: v.doctor_signature,
        complaint: v.patient_complaint,
        diagnosis: v.diagnosis,
        management: v.management_plan,
        status: 'COMPLETED',
        source: 'سجل تردد',
        sourceColor: 'bg-teal-100 text-teal-900 border-teal-200'
      });
    });

    return all.sort((a, b) => new Date(b.date || '2000-01-01').getTime() - new Date(a.date || '2000-01-01').getTime());
  }, [clinicAppointments, physicalExams, childUnder5Records, childOver5Records, ancRecords, postpartumRecords, familyPlanningRecords, geriatricRecords, dentalRecords, premaritalRecords, visits]);

  // 3 Organized Groups for the 10 Clinical Modules
  const moduleGroups = [
    {
      id: 'general',
      title: 'السجلات الأساسية والزيارات',
      subtitle: 'العام والمشترك لكافة الأعمار',
      modules: [
        {
          id: 'history',
          title: 'التاريخ المرضي والوراثي',
          subtitle: 'Medical & Family History',
          icon: Shield,
          color: 'purple',
          badge: 'عام لجميع الأعمار',
          available: true,
          count: physicalExams.length
        },
        {
          id: 'significant',
          title: 'الأحداث الطبية الهامة',
          subtitle: 'Significant Data Sheet',
          icon: ClipboardList,
          color: 'amber',
          badge: 'سجل الأمراض والمحطات',
          available: true,
          count: significantEventsCount
        },
        {
          id: 'clinical',
          title: 'الفحص الإكلينيكي والبدني',
          subtitle: 'Clinical Findings & Physical Examination',
          icon: Activity,
          color: 'indigo',
          badge: 'فحص أجهزة الجسم',
          available: true,
          count: physicalExams.length
        },
        {
          id: 'visits',
          title: 'سجل الزيارات',
          subtitle: 'Visits & Clinical Chronology',
          icon: FileText,
          color: 'teal',
          badge: 'سجل مجمّع للتردد والعيادات',
          available: true,
          count: rollupVisits.length
        },
        {
          id: 'dental',
          title: 'فحص الأسنان',
          subtitle: 'Oral & Dental Health',
          icon: Smile,
          color: 'blue',
          badge: 'فحص الفم والأسنان ومؤشر DMFT',
          available: true,
          count: dentalRecords.length
        }
      ]
    },
    {
      id: 'demographic',
      title: 'حسب الفئة العمرية والنوع',
      subtitle: 'بروتوكولات الفئات المخصصة',
      modules: [
        {
          id: 'child',
          title: 'متابعة نمو الطفل والتطعيمات',
          subtitle: 'Child Growth & Immunizations',
          icon: Baby,
          color: 'emerald',
          badge: isChild ? 'متاح (< 18 سنة)' : 'خاص بالأطفال (< 18 سنة)',
          available: isChild,
          reason: 'يتاح للأفراد دون سن 18 عاماً فقط',
          count: childUnder5Records.length + childOver5Records.length
        },
        {
          id: 'maternal',
          title: 'متابعة الحمل وصحة الأم',
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
          title: 'تنظيم الأسرة',
          subtitle: 'Family Planning & Reproductive Health',
          icon: Sparkles,
          color: 'pink',
          badge: isReproductiveAge ? 'متاح (15 - 49 سنة)' : (isFemale ? 'سن الإنجاب (15-49)' : 'خاص بالإناث'),
          available: isFemale,
          reason: 'يتاح للإناث في سن الإنجاب',
          count: familyPlanningRecords.length
        },
        {
          id: 'geriatric',
          title: 'تقييم كبار السن',
          subtitle: 'Comprehensive Geriatric Assessment',
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
      title: 'الفحص والمشورة الخاصة',
      subtitle: 'بروتوكول نوعي',
      modules: [
        {
          id: 'premarital',
          title: 'فحص ما قبل الزواج',
          subtitle: 'Premarital Screening & Counseling',
          icon: HeartHandshake,
          color: 'cyan',
          badge: 'مشورة وفحص وراثي',
          available: true,
          count: premaritalRecords.length
        }
      ]
    }
  ];

  const activeTabModule = useMemo(() => {
    return moduleGroups.flatMap(g => g.modules).find(m => m.id === activeTab);
  }, [moduleGroups, activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 print:static print:bg-white print:p-0 print:m-0 print:block" dir="rtl">
      <div className="bg-slate-50 w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] print:static print:w-full print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:overflow-visible">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-md print:bg-white print:text-black print:border-b-2 print:border-slate-800 print:p-4 print:shadow-none">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-500/20 shrink-0 print:bg-slate-100 print:text-slate-900 print:shadow-none print:border print:border-slate-300">
              <Stethoscope size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-black print:text-slate-900">{patient.name}</h3>
                <span className="bg-white/15 text-indigo-200 text-xs px-2.5 py-0.5 rounded-full font-bold print:bg-slate-100 print:text-slate-800 print:border print:border-slate-300">
                  {patient.gender || 'غير محدد'} • {age !== null ? `${age} سنة` : 'تاريخ الميلاد غير مدون'}
                </span>
                {familyFile && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold font-mono print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                    ملف الأسرة: {familyFile.family_code} ({familyFile.head_name})
                  </span>
                )}
                {activeAppointment ? (
                  <span className="bg-emerald-500 text-slate-950 text-xs px-3 py-1 rounded-full font-black shadow-md flex items-center gap-1.5 animate-pulse print:hidden">
                    <CalendarCheck size={14} /> وضع جلسة كشف نشطة (معتمد)
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-slate-700 print:hidden">
                    وضع استعراض الملف (سجل تراكمي)
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200 font-bold mt-1 print:text-slate-600">
                الرقم القومي: <span className="font-mono" dir="ltr">{patient.national_id || '—'}</span> | الهاتف: <span className="font-mono" dir="ltr">{patient.phone || '—'}</span> | فصيلة الدم: <span className="text-amber-300 font-black print:text-red-700">{patient.blood_type || '—'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              title="طباعة السجل الصحي الشامل"
            >
              <Printer size={15} /> طباعة النموذج
            </button>
            <button
              onClick={handleCloseModal}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-all cursor-pointer"
              title="إغلاق السجل"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Active Appointment Banner */}
        {activeAppointment && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 flex items-center justify-between gap-4 text-xs shrink-0 print:hidden">
            <div className="flex items-center gap-2 text-emerald-950 font-bold">
              <CheckCircle className="text-emerald-600 shrink-0" size={16} />
              <span>
                جلسة كشف نشطة للعيادة: <strong className="text-emerald-900 font-black">{activeAppointment.clinics?.name || 'عيادة تخصصية'}</strong>
                {activeAppointment.doctors?.name && ` • الطبيب: د/ ${activeAppointment.doctors.name}`}
                {` • تاريخ الحجز: ${activeAppointment.date || 'اليوم'}`}
              </span>
            </div>
            <div className="text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
              أي فحص يتم حفظه سيُربط آلياً بهذه الزيارة وتُعتمد كزيارة مكتملة (COMPLETED)
            </div>
          </div>
        )}

        {/* Navigation Tabs grouped into 3 distinctive visual clusters */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-3 overflow-x-auto shrink-0 print:hidden">
          <div className="flex items-stretch gap-3 min-w-max">
            {moduleGroups.map((grp, gIdx) => {
              const clusterStyles: Record<string, { container: string; badge: string; dot: string }> = {
                general: {
                  container: 'bg-gradient-to-b from-indigo-50/70 via-indigo-50/30 to-white border-2 border-indigo-200/90',
                  badge: 'bg-indigo-100/80 text-indigo-900 border-indigo-200',
                  dot: 'bg-indigo-600'
                },
                demographic: {
                  container: 'bg-gradient-to-b from-emerald-50/70 via-emerald-50/30 to-white border-2 border-emerald-200/90',
                  badge: 'bg-emerald-100/80 text-emerald-900 border-emerald-200',
                  dot: 'bg-emerald-600'
                },
                specialized: {
                  container: 'bg-gradient-to-b from-purple-50/70 via-purple-50/30 to-white border-2 border-purple-200/90',
                  badge: 'bg-purple-100/80 text-purple-900 border-purple-200',
                  dot: 'bg-purple-600'
                }
              };
              const c = clusterStyles[grp.id] || clusterStyles.general;

              return (
                <div key={grp.id} className={`rounded-2xl p-2.5 flex flex-col gap-2 shadow-sm ${c.container}`}>
                  <div className="flex items-center justify-between px-1 text-[10px] font-black">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
                      <span>{grp.title}</span>
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.2 rounded-full border ${c.badge}`}>
                      {grp.subtitle}
                    </span>
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
                          onClick={() => handleTabClick(mod.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                              : isAllowed
                              ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 hover:border-slate-300'
                              : 'bg-slate-100/60 text-slate-400 opacity-50 cursor-not-allowed border border-transparent'
                          }`}
                          title={!isAllowed ? mod.reason : mod.title}
                        >
                          <ModuleProgressRing
                            percent={mod.count > 0 ? 100 : 0}
                            hasData={mod.count > 0}
                            size={16}
                            strokeWidth={2.5}
                            color={isActive ? '#ffffff' : (mod.id === 'maternal' ? '#e11d48' : '#4f46e5')}
                          />

                          <Icon size={14} className={isActive ? 'text-white' : 'text-slate-600 shrink-0'} />
                          <span className="whitespace-nowrap">{mod.title}</span>

                          {mod.id === 'maternal' && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                              isActive ? 'bg-rose-400/90 text-white' : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              PoC ✨
                            </span>
                          )}

                          {mod.count > 0 ? (
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full ${
                              isActive ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-700'
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
              );
            })}
          </div>
        </div>

        {/* Module Content Body with Sticky Clinical Header */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Sticky Clinical Header Bar */}
          <div className="sticky -top-4 sm:-top-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 z-10 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeTabModule && (
                <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-black shrink-0 border border-white/10">
                  <activeTabModule.icon size={16} className="text-white" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-white truncate">
                    {activeTabModule?.title}
                  </span>
                  <span className="text-[10px] text-slate-300 font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                    المريض: {patient.name}
                  </span>
                  {familyFile && (
                    <span className="text-[10px] text-emerald-300 font-mono font-bold bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full hidden md:inline-block">
                      ملف الأسرة: {familyFile.family_code}
                    </span>
                  )}
                  {activeTab === 'maternal' && (
                    <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full font-bold">
                      نموذج مطوّر (PoC) ✨
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isFormDirty && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2.5 py-1 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
                  <AlertTriangle size={12} />
                  <span className="hidden sm:inline">تعديلات غير محفوظة</span>
                </span>
              )}
              <div className="text-[11px] font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${activeTabModule && activeTabModule.count > 0 ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                <span>{activeTabModule && activeTabModule.count > 0 ? `${activeTabModule.count} سجلات مسجلة` : 'لا توجد سجلات بعد'}</span>
              </div>
            </div>
          </div>
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

          {/* Persistent Database Load Status Banner */}
          {loadError && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-black text-sm">تنبيه المزامنة مع قاعدة البيانات المركزية</p>
                  <p className="text-xs text-amber-900 font-mono mt-0.5">{loadError}</p>
                  <p className="text-[11px] text-amber-800 mt-1 font-bold">
                    تم استرجاع السجلات المتاحة بنجاح. النماذج المرتبطة بالجداول غير المفعلة تتطلب تطبيق ملف Migration في Supabase.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadAllData}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black shadow transition-all shrink-0 cursor-pointer"
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
              {/* ======================= التاريخ المرضي والوراثي ======================= */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-purple-950 text-base flex items-center gap-2">
                        <Shield size={18} className="text-purple-600" />
                        التاريخ المرضي والوراثي (Medical & Family History)
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

              {/* ======================= الأحداث الطبية الهامة ======================= */}
              {activeTab === 'significant' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-amber-950 text-base flex items-center gap-2">
                        <ClipboardList size={18} className="text-amber-600" />
                        الأحداث الطبية الهامة (Significant Data Sheet)
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

              {/* ======================= الفحص الإكلينيكي والبدني ======================= */}
              {activeTab === 'clinical' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-indigo-950 text-base flex items-center gap-2">
                        <Activity size={18} className="text-indigo-600" />
                        الفحص الإكلينيكي والبدني (Clinical Findings & Physical Examination)
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

              {/* ======================= سجل الزيارات ======================= */}
              {activeTab === 'visits' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-teal-50 border border-teal-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-teal-950 text-base flex items-center gap-2">
                        <FileText size={18} className="text-teal-600" />
                        سجل الزيارات (Visits & Clinical Chronology)
                      </h4>
                      <p className="text-xs text-teal-800 font-bold mt-0.5">
                        عرض مجمّع وتلقائي لكافة مراجعات العيادات، جلسات الكشف، وفحوصات المريض بالترتيب الزمني
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-teal-200/80 text-teal-900 text-xs px-3 py-1.5 rounded-xl font-black border border-teal-300">
                        إجمالي الزيارات: {rollupVisits.length}
                      </span>
                    </div>
                  </div>

                  {rollupVisits.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                      لا توجد سجلات تردد أو زيارات عيادات مسجلة للمريض حتى الآن.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-teal-50/70 border-b border-teal-100 text-teal-950 font-black">
                          <tr>
                            <th className="p-3">التاريخ / المصدر</th>
                            <th className="p-3">نوع النشاط / العيادة</th>
                            <th className="p-3">البيانات الإكلينيكية / الشكوى</th>
                            <th className="p-3">التشخيص / التقييم</th>
                            <th className="p-3">الإجراء / الخطة</th>
                            <th className="p-3">الطبيب</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {rollupVisits.map((item) => (
                            <tr key={item.id} className="hover:bg-teal-50/30 transition-colors">
                              <td className="p-3">
                                <div className="font-mono text-slate-800 font-black">
                                  {item.date ? new Date(item.date).toLocaleDateString('ar-EG') : '—'}
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border inline-block mt-1 ${item.sourceColor}`}>
                                  {item.source}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="text-slate-900 font-black">{item.type}</div>
                                <div className="text-slate-500 text-[11px]">{item.clinicName}</div>
                              </td>
                              <td className="p-3 text-slate-700 max-w-xs">
                                {item.complaint || '—'}
                              </td>
                              <td className="p-3 text-teal-900 font-black max-w-xs">
                                {item.diagnosis || '—'}
                              </td>
                              <td className="p-3 text-slate-800 max-w-xs">
                                {item.management || '—'}
                              </td>
                              <td className="p-3 text-slate-600">
                                {item.doctor ? `د/ ${item.doctor}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ======================= متابعة نمو الطفل والتطعيمات ======================= */}
              {activeTab === 'child' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-emerald-950 text-base flex items-center gap-2">
                        <Baby size={18} className="text-emerald-600" />
                        متابعة نمو الطفل والتطعيمات (Child Growth & Immunizations)
                      </h4>
                      <p className="text-xs text-emerald-800 font-bold mt-0.5">
                        متابعة معايير النمو للأطفال دون 5 سنوات (WHO)، والفحص الشامل للسن المدرسي والمراهقين (Form 5D)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickBookingState({ module: 'child', reason: 'متابعة وفحص نمو وتطعيمات الطفل' })}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <CalendarCheck size={14} /> حجز عيادة الأطفال
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} /> {showAddForm ? 'إلغاء' : (childSubTab === 'under5' ? 'تسجيل فحص دون 5 سنوات' : 'تسجيل فحص مدرسي فوق 5 سنوات')}
                      </button>
                    </div>
                  </div>

                  {/* Sub-Tabs: Under 5 vs Over 5 */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChildSubTab('under5');
                        setShowAddForm(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        childSubTab === 'under5'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>أطفال أقل من 5 سنوات (Form 5A & 5C)</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        childSubTab === 'under5' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {childUnder5Records.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChildSubTab('over5');
                        setShowAddForm(false);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                        childSubTab === 'over5'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>السن المدرسي والمراهقين فوق 5 سنوات (Form 5D)</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        childSubTab === 'over5' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {childOver5Records.length}
                      </span>
                    </button>
                  </div>

                  {/* Under 5 Content */}
                  {childSubTab === 'under5' && (
                    <>
                      {showAddForm && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmitting(true);
                            const t = e.target as any;
                            try {
                              const saved = await DB.addAccreditationRecord('child_under5_followups', {
                                patient_id: patient.id,
                                appointment_id: activeAppointment?.id || null,
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
                              await handleRecordSaved('child_under5_followups', 'فحص نمو الطفل');
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
                          <h5 className="font-black text-sm text-emerald-950">نموذج فحص نمو الطفل دون 5 سنوات (Form 5A / 5C)</h5>
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

                      {tableErrors['child_under5_followups'] ? (
                        <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                          <AlertCircle className="mx-auto text-amber-600" size={28} />
                          <p className="text-sm font-black">تعذر استرجاع سجلات متابعة نمو الطفل من قاعدة البيانات</p>
                          <p className="text-xs text-amber-700 font-mono">{tableErrors['child_under5_followups']}</p>
                        </div>
                      ) : childUnder5Records.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                          لا توجد سجلات متابعة نمو مسجلة للطفل دون 5 سنوات حتى الآن. اضغط على الزر أعلاه لإضافة فحص.
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
                    </>
                  )}

                  {/* Over 5 (School Age & Adolescent Form 5D) Content */}
                  {childSubTab === 'over5' && (
                    <>
                      {showAddForm && (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setSubmitting(true);
                            const t = e.target as any;
                            const weight = Number(t.weight_kg.value) || null;
                            const height = Number(t.height_cm.value) || null;
                            let computedBmi = Number(t.bmi.value) || null;
                            if (!computedBmi && weight && height && height > 0) {
                              const heightInMeters = height / 100;
                              computedBmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
                            }
                            try {
                              const saved = await DB.addAccreditationRecord('child_over5_followups', {
                                patient_id: patient.id,
                                appointment_id: activeAppointment?.id || null,
                                educational_stage: t.educational_stage.value || null,
                                weight_kg: weight,
                                height_cm: height,
                                bmi: computedBmi,
                                vision_screening: t.vision_screening.value || null,
                                hearing_screening: t.hearing_screening.value || null,
                                school_achievement_concerns: t.school_achievement_concerns.checked,
                                psychiatric_behavioral_screening: t.psychiatric_behavioral_screening.value || null,
                                hb_level: Number(t.hb_level.value) || null,
                                urine_analysis_result: t.urine_analysis_result.value || null,
                                stool_analysis_result: t.stool_analysis_result.value || null,
                                health_education_given: t.health_education_given.value || null,
                                doctor_signature: t.doctor_signature.value || null
                              });
                              if (!saved || !saved.id) {
                                throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                              }
                              await handleRecordSaved('child_over5_followups', 'فحص السن المدرسي والمراهقين');
                            } catch (err: any) {
                              console.error("Save error child_over5_followups:", err);
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
                          <h5 className="font-black text-sm text-emerald-950">نموذج فحص الصحة المدرسية والمراهقين فوق 5 سنوات (Form 5D)</h5>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
                            <div>
                              <label className="block mb-1 text-slate-700">المرحلة التعليمية</label>
                              <select name="educational_stage" className="w-full p-2.5 border rounded-xl">
                                <option value="رياض أطفال (KG)">رياض أطفال (KG)</option>
                                <option value="ابتدائي (Primary)">المرحلة الابتدائية (Primary)</option>
                                <option value="إعدادي (Preparatory)">المرحلة الإعدادية (Preparatory)</option>
                                <option value="ثانوي (Secondary)">المرحلة الثانوية (Secondary)</option>
                                <option value="غير ملتحق / متسرب">غير ملتحق / متسرب من التعليم</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">الوزن (كجم)</label>
                              <input name="weight_kg" type="number" step="0.1" placeholder="مثال: 28" className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">الطول (سم)</label>
                              <input name="height_cm" type="number" step="0.5" placeholder="مثال: 125" className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">مؤشر كتلة الجسم (BMI)</label>
                              <input name="bmi" type="number" step="0.1" placeholder="يُحسب آلياً إن ترك فارغاً" className="w-full p-2.5 border rounded-xl" />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                            <div>
                              <label className="block mb-1 text-slate-700">فحص وقوة الإبصار (Vision Screening)</label>
                              <input name="vision_screening" defaultValue="6/6 بالعينين - سليم" placeholder="مثال: 6/6 أو ضعف إبصار / يرتدي نظارة" className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">فحص السمع (Hearing Screening)</label>
                              <input name="hearing_screening" defaultValue="طبيعي وسليم" placeholder="مثال: طبيعي أو فحص الشوكة الرنانة طبيعي" className="w-full p-2.5 border rounded-xl" />
                            </div>
                          </div>

                          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3 text-xs font-bold">
                            <span className="text-emerald-950 block font-black">التحاليل والفحوصات المخبرية الإلزامية:</span>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block mb-1 text-slate-700">نسبة الهيموجلوبين Hb (g/dL)</label>
                                <input name="hb_level" type="number" step="0.1" placeholder="مثال: 12.5" className="w-full p-2.5 border rounded-xl bg-white" />
                              </div>
                              <div>
                                <label className="block mb-1 text-slate-700">تحليل البول (Urine Analysis)</label>
                                <input name="urine_analysis_result" placeholder="سليم، خالٍ من السكر والزلال" className="w-full p-2.5 border rounded-xl bg-white" />
                              </div>
                              <div>
                                <label className="block mb-1 text-slate-700">تحليل البراز (Stool Analysis)</label>
                                <input name="stool_analysis_result" placeholder="خالٍ من الطفيليات والديدان" className="w-full p-2.5 border rounded-xl bg-white" />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold">
                            <div>
                              <label className="block mb-1 text-slate-700">الفحص النفسي والسلوكي (Behavioral Screening)</label>
                              <input name="psychiatric_behavioral_screening" defaultValue="لا توجد اضطرابات سلوكية أو انفعالية" className="w-full p-2.5 border rounded-xl" />
                            </div>
                            <div>
                              <label className="block mb-1 text-slate-700">التثقيف الصحي الموجه للطفل وولي الأمر</label>
                              <input name="health_education_given" defaultValue="التغذية السليمة، نظافة الفم والأسنان، النشاط البدني" className="w-full p-2.5 border rounded-xl" />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs font-bold">
                            <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                              <input name="school_achievement_concerns" type="checkbox" className="w-4 h-4 rounded text-emerald-600" />
                              <span>يوجد شكوى من صعوبات تعلم أو تأخر تحصيلي دراسي</span>
                            </label>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <label className="text-slate-700 whitespace-nowrap">طبيب الصحة المدرسية:</label>
                              <input name="doctor_signature" placeholder="اسم الطبيب" className="p-2 border rounded-xl text-xs w-full sm:w-48" />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-600">إلغاء</button>
                            <button type="submit" disabled={submitting} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md">
                              {submitting ? 'جاري الحفظ في قاعدة البيانات...' : 'حفظ الفحص المدرسي'}
                            </button>
                          </div>
                        </form>
                      )}

                      {tableErrors['child_over5_followups'] ? (
                        <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                          <AlertCircle className="mx-auto text-amber-600" size={28} />
                          <p className="text-sm font-black">تعذر استرجاع سجلات الصحة المدرسية من قاعدة البيانات</p>
                          <p className="text-xs text-amber-700 font-mono">{tableErrors['child_over5_followups']}</p>
                        </div>
                      ) : childOver5Records.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 font-bold">
                          لا توجد فحوصات سن مدرسي ومراهقين مسجلة حتى الآن. اضغط على الزر أعلاه لإضافة فحص.
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-emerald-50 border-b border-emerald-100 text-emerald-950 font-black">
                              <tr>
                                <th className="p-3">تاريخ الفحص</th>
                                <th className="p-3">المرحلة والنمو</th>
                                <th className="p-3">الفحص الحسي والسلوكي</th>
                                <th className="p-3">المختبر (Hb / بول / براز)</th>
                                <th className="p-3">التثقيف والتوقيع</th>
                                <th className="p-3 text-center">إجراءات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-bold">
                              {childOver5Records.map((c) => (
                                <tr key={c.id} className="hover:bg-emerald-50/20">
                                  <td className="p-3 font-mono text-slate-600">
                                    {new Date(c.created_at).toLocaleDateString('ar-EG')}
                                  </td>
                                  <td className="p-3">
                                    <div className="text-emerald-950 font-black">{c.educational_stage || c.school_stage || 'السن المدرسي'}</div>
                                    <div className="text-slate-500 text-[11px]">
                                      وزن: {c.weight_kg ? `${c.weight_kg} كجم` : '—'} | طول: {c.height_cm ? `${c.height_cm} سم` : '—'} | BMI: {c.bmi || '—'}
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-700">
                                    <div>بصر: {c.vision_screening || 'سليم'} | سمع: {c.hearing_screening || 'سليم'}</div>
                                    <div className="text-slate-500 text-[11px]">
                                      سلوك: {c.psychiatric_behavioral_screening || 'طبيعي'}
                                      {c.school_achievement_concerns && <span className="text-amber-700 mr-1">(صعوبات تعلم ⚠️)</span>}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-mono text-slate-900">Hb: {c.hb_level ? `${c.hb_level} g/dL` : '—'}</div>
                                    <div className="text-[11px] text-slate-600">
                                      بول: {c.urine_analysis_result || '—'} | براز: {c.stool_analysis_result || '—'}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="text-slate-800">{c.health_education_given || 'تثقيف روتيني'}</div>
                                    <div className="text-slate-500 text-[11px]">{c.doctor_signature ? `د/ ${c.doctor_signature}` : ''}</div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRecord('child_over5_followups', c.id, 'فحص السن المدرسي')}
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
                    </>
                  )}
                </div>
              )}

              {/* ======================= متابعة الحمل وصحة الأم (PoC) ======================= */}
              {activeTab === 'maternal' && (
                <MaternalAncPoCView
                  patient={patient}
                  activeAppointment={activeAppointment}
                  ancRecords={ancRecords}
                  tableError={tableErrors['maternal_antenatal_followups']}
                  isFormDirty={isFormDirty}
                  setIsFormDirty={setIsFormDirty}
                  onBookClinic={() => setQuickBookingState({ module: 'maternal', reason: 'متابعة رعاية حوامل / ما بعد الولادة' })}
                  onDeleteRecord={(id, label) => handleDeleteRecord('maternal_antenatal_followups', id, label)}
                  onSaveRecord={async (payload) => {
                    const saved = await DB.addAccreditationRecord('maternal_antenatal_followups', payload);
                    if (!saved || !saved.id) {
                      throw new Error("لم يتم استلام تأكيد المعرّف (ID) من قاعدة البيانات.");
                    }
                    await handleRecordSaved('maternal_antenatal_followups', 'سجل متابعة الحمل (ANC)');
                  }}
                />
              )}

              {/* ======================= تنظيم الأسرة ======================= */}
              {activeTab === 'family_planning' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-pink-50 border border-pink-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-pink-950 text-base flex items-center gap-2">
                        <Sparkles size={18} className="text-pink-600" />
                        تنظيم الأسرة (Family Planning & Reproductive Health)
                      </h4>
                      <p className="text-xs text-pink-800 font-bold mt-0.5">
                        توثيق وسيلة تنظيم الأسرة الحالية والموصوفة، الآثار الجانبية، ومواعيد المتابعة والتجديد
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickBookingState({ module: 'family_planning', reason: 'استشارة ومتابعة تنظيم الأسرة' })}
                        className="px-3.5 py-2 bg-pink-700 hover:bg-pink-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <CalendarCheck size={14} /> حجز عيادة تنظيم الأسرة
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 bg-white text-pink-800 border border-pink-300 hover:bg-pink-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل متابعة مباشرة'}
                      </button>
                    </div>
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
                            appointment_id: activeAppointment?.id || null,
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
                          await handleRecordSaved('family_planning_followups', 'سجل تنظيم الأسرة');
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

                  {tableErrors['family_planning_followups'] ? (
                    <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-amber-600" size={28} />
                      <p className="text-sm font-black">جدول تنظيم الأسرة (family_planning_followups) غير متوفر في قاعدة البيانات</p>
                      <p className="text-xs text-amber-700 font-mono">{tableErrors['family_planning_followups']}</p>
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

              {/* ======================= فحص ما قبل الزواج ======================= */}
              {activeTab === 'premarital' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-cyan-950 text-base flex items-center gap-2">
                        <HeartHandshake size={18} className="text-cyan-600" />
                        فحص ما قبل الزواج (Premarital Screening & Counseling)
                      </h4>
                      <p className="text-xs text-cyan-800 font-bold mt-0.5">
                        الفحص الوراثي والمعدي، فصائل الدم، أنيميا البحر المتوسط، ورقم الشهادة الصحية الرسمية (إجراء عند الطلب)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickBookingState({ module: 'premarital', reason: 'فحص واستشارة المشورة للمقبلين على الزواج' })}
                        className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <CalendarCheck size={14} /> حجز عيادة الزواج
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 bg-white text-cyan-800 border border-cyan-300 hover:bg-cyan-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل فحص مباشرة'}
                      </button>
                    </div>
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
                            appointment_id: activeAppointment?.id || null,
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
                          await handleRecordSaved('premarital_assessments', 'فحص ما قبل الزواج');
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

                  {tableErrors['premarital_assessments'] ? (
                    <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-amber-600" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات فحص ما قبل الزواج من قاعدة البيانات</p>
                      <p className="text-xs text-amber-700 font-mono">{tableErrors['premarital_assessments']}</p>
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

              {/* ======================= تقييم كبار السن ======================= */}
              {activeTab === 'geriatric' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-amber-950 text-base flex items-center gap-2">
                        <Clock size={18} className="text-amber-600" />
                        تقييم كبار السن (Comprehensive Geriatric Assessment)
                      </h4>
                      <p className="text-xs text-amber-800 font-bold mt-0.5">
                        تقييم متلازمة الوهن والهشاشة، الأنشطة اليومية (ADL)، الذاكرة (Mini-Cog)، وخطر السقوط
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickBookingState({ module: 'geriatric', reason: 'تقييم شامل لطب ورعاية كبار السن' })}
                        className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <CalendarCheck size={14} /> حجز عيادة كبار السن
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل تقييم مباشرة'}
                      </button>
                    </div>
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
                            appointment_id: activeAppointment?.id || null,
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
                          await handleRecordSaved('geriatric_assessments', 'تقييم المسن');
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

                  {tableErrors['geriatric_assessments'] ? (
                    <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-amber-600" size={28} />
                      <p className="text-sm font-black">تعذر استرجاع سجلات تقييم المسنين من قاعدة البيانات</p>
                      <p className="text-xs text-amber-700 font-mono">{tableErrors['geriatric_assessments']}</p>
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

              {/* ======================= فحص الأسنان ======================= */}
              {activeTab === 'dental' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div>
                      <h4 className="font-black text-blue-950 text-base flex items-center gap-2">
                        <Smile size={18} className="text-blue-600" />
                        فحص الأسنان (Oral & Dental Health Protocol)
                      </h4>
                      <p className="text-xs text-blue-800 font-bold mt-0.5">
                        فحص الأنسجة الرخوة ومفصل الفك (TMJ)، ومؤشر تسوس وحشو وفقد الأسنان (DMFT Index)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickBookingState({ module: 'dental', reason: 'فحص وطب علاج الأسنان واللثة' })}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <CalendarCheck size={14} /> حجز عيادة الأسنان
                      </button>
                      <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="px-3.5 py-2 bg-white text-blue-800 border border-blue-300 hover:bg-blue-50 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <Plus size={14} /> {showAddForm ? 'إلغاء' : 'تسجيل فحص مباشرة'}
                      </button>
                    </div>
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
                            appointment_id: activeAppointment?.id || null,
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
                          await handleRecordSaved('dental_assessments', 'فحص الأسنان');
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

                  {tableErrors['dental_assessments'] ? (
                    <div className="p-8 text-center bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-800 font-bold space-y-2">
                      <AlertCircle className="mx-auto text-amber-600" size={28} />
                      <p className="text-sm font-black">جدول فحص الأسنان (dental_assessments) غير متوفر في قاعدة البيانات</p>
                      <p className="text-xs text-amber-700 font-mono">{tableErrors['dental_assessments']}</p>
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

      {/* Quick Clinic Booking Modal */}
      {quickBookingState && (
        <QuickClinicBookingModal
          isOpen={!!quickBookingState}
          onClose={() => setQuickBookingState(null)}
          patient={patient}
          initialModule={quickBookingState.module}
          prefilledReason={quickBookingState.reason}
          onBookingSuccess={(appointment) => {
            showNotification('success', `تم حجز عيادة المريض بنجاح برقم حجز #${appointment.id.slice(0, 8)}`);
            loadAllData();
            if (onRefresh) onRefresh();
          }}
        />
      )}
      {/* Unsaved Changes Confirmation Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedConfirm}
        tabTitle={activeTabModule?.title}
        onStay={() => {
          setShowUnsavedConfirm(false);
          setPendingTabSwitch(null);
        }}
        onDiscard={() => {
          setIsFormDirty(false);
          setShowUnsavedConfirm(false);
          if (pendingTabSwitch === 'CLOSE_MODAL') {
            onClose();
          } else if (pendingTabSwitch) {
            setActiveTab(pendingTabSwitch);
            setShowAddForm(false);
          }
          setPendingTabSwitch(null);
        }}
      />
    </div>
  );
};

export default FamilyComprehensiveHealthRecordModal;
