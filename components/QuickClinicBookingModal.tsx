import React, { useState, useEffect, useMemo } from 'react';
import { Patient, Clinic, Doctor, LinkedModuleType, AppointmentTriggerType } from '../types.ts';
import { DB } from '../store.ts';
import { 
  X, Calendar, Clock, Stethoscope, AlertCircle, CheckCircle, 
  Loader2, Sparkles, Building2, Copy, Check, Info, FileText,
  User, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight,
  Filter, Sun, Moon, Sparkle, RefreshCw, CalendarDays
} from 'lucide-react';
import { getClinicRequirements, formatBookingRequirementsText } from '../constants/clinicRequirements.ts';
import { evaluateClinicalModuleEligibility } from '../services/followupSuggestions.ts';
import { resolveBookingVisitAndForm, ExamFormMode } from '../utils/clinicalBookingRouter.ts';

const getLocalTodayStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getLocalTimeHHMM = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

interface QuickClinicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  allPatients?: Patient[];
  suggestedModule?: LinkedModuleType | string;
  initialModule?: LinkedModuleType | string;
  suggestedReason?: string;
  prefilledReason?: string;
  defaultTrigger?: AppointmentTriggerType;
  onBooked?: (appointment: any) => void;
  onBookingSuccess?: (appointment: any) => void;
}

interface TimeSlot {
  time24: string;      // e.g. "09:20"
  time12: string;      // e.g. "09:20 ص" or "05:40 م"
  period: 'morning' | 'evening';
  isBooked: boolean;
  isPast?: boolean;
  bookedPatientName?: string;
  appointmentStatus?: string;
}

export const QuickClinicBookingModal: React.FC<QuickClinicBookingModalProps> = ({
  isOpen,
  onClose,
  patient: initialPatient,
  allPatients = [],
  suggestedModule,
  initialModule,
  suggestedReason,
  prefilledReason,
  defaultTrigger = 'staff_scheduled',
  onBooked,
  onBookingSuccess
}) => {
  const activeModuleRaw = suggestedModule || initialModule;
  const normalizedModule: LinkedModuleType | undefined = (() => {
    if (!activeModuleRaw) return undefined;
    if (activeModuleRaw === 'child' || activeModuleRaw === 'child_followup') return 'child_followup';
    if (activeModuleRaw === 'maternal' || activeModuleRaw === 'maternal_care') return 'maternal_care';
    if (activeModuleRaw === 'family_planning') return 'family_planning';
    if (activeModuleRaw === 'geriatric' || activeModuleRaw === 'geriatric_care') return 'geriatric_care';
    if (activeModuleRaw === 'dental') return 'dental';
    if (activeModuleRaw === 'premarital') return 'premarital';
    if (activeModuleRaw === 'visits') return 'visits';
    return activeModuleRaw as LinkedModuleType;
  })();

  const activeReason = suggestedReason || prefilledReason || '';

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientsList, setPatientsList] = useState<Patient[]>(allPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatient?.id || '');
  const [patientSearch, setPatientSearch] = useState('');
  
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState(getLocalTodayStr());
  const [time, setTime] = useState('21:00');
  const [slotInterval, setSlotInterval] = useState<number>(20); // 15, 20, 30 min
  const [slotFilter, setSlotFilter] = useState<'available_only' | 'all' | 'morning' | 'evening'>('available_only');
  const [showCustomTimeInput, setShowCustomTimeInput] = useState(false);

  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  const [notes, setNotes] = useState(activeReason ? `[اقتراح متابعة مستحقة] ${activeReason}` : '');
  const [triggerType, setTriggerType] = useState<AppointmentTriggerType>(defaultTrigger);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copiedReqs, setCopiedReqs] = useState(false);

  // Active patient object
  const currentPatient = useMemo(() => {
    if (initialPatient) return initialPatient;
    return patientsList.find(p => p.id === selectedPatientId) || null;
  }, [initialPatient, patientsList, selectedPatientId]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (activeReason) {
        setNotes(`[اقتراح متابعة مستحقة] ${activeReason}`);
      }
      if (initialPatient?.id) {
        setSelectedPatientId(initialPatient.id);
      }
    }
  }, [isOpen, activeModuleRaw, activeReason, initialPatient]);

  // Load clinics, doctors, and patients
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allClinics, allDoctors, allP] = await Promise.all([
        DB.getClinics(),
        DB.getDoctors(),
        patientsList.length > 0 ? Promise.resolve(patientsList) : DB.getPatients()
      ]);
      setClinics(allClinics || []);
      setDoctors(allDoctors || []);
      setPatientsList(allP || []);

      // Auto-match clinic
      let matchedClinic = (allClinics || []).find((c: Clinic) => c.linked_module === normalizedModule);
      if (!matchedClinic && normalizedModule) {
        if (normalizedModule === 'child_followup') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('طفل') || c.specialty?.includes('أطفال'));
        } else if (normalizedModule === 'maternal_care') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('أمومة') || c.name.includes('حوامل') || c.name.includes('نساء'));
        } else if (normalizedModule === 'family_planning') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('تنظيم') || c.specialty?.includes('تنظيم'));
        } else if (normalizedModule === 'geriatric_care') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('مسن') || c.name.includes('كبار'));
        } else if (normalizedModule === 'dental') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('أسنان') || c.specialty?.includes('أسنان'));
        } else if (normalizedModule === 'premarital') {
          matchedClinic = (allClinics || []).find((c: Clinic) => c.name.includes('زواج') || c.name.includes('مقبلين'));
        }
      }

      if (!matchedClinic && normalizedModule && normalizedModule !== 'dental') {
        matchedClinic = (allClinics || []).find(
          (c: Clinic) =>
            c.specialty?.includes('طب الأسرة') ||
            c.name.includes('أسرة') ||
            (!c.name.includes('أسنان') && !c.name.includes('اسنان'))
        );
      }

      if (matchedClinic) {
        setSelectedClinicId(matchedClinic.id);
        const matchingDoc = (allDoctors || []).find((d: Doctor) => d.clinic_id === matchedClinic.id);
        if (matchingDoc) setSelectedDoctorId(matchingDoc.id);
      } else if (allClinics && allClinics.length > 0) {
        setSelectedClinicId(allClinics[0].id);
        const matchingDoc = (allDoctors || []).find((d: Doctor) => d.clinic_id === allClinics[0].id);
        if (matchingDoc) setSelectedDoctorId(matchingDoc.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch appointments for selected clinic, doctor, and date
  useEffect(() => {
    if (isOpen && date && selectedClinicId) {
      loadAppointmentsForDate();
    }
  }, [isOpen, date, selectedClinicId, selectedDoctorId]);

  const loadAppointmentsForDate = async () => {
    setLoadingAppointments(true);
    try {
      const appts = await DB.getClinicAppointments(selectedClinicId, selectedDoctorId || undefined, date);
      setExistingAppointments(appts || []);
    } catch (e) {
      console.error("Error loading clinic appointments for slots:", e);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const [subFormOverride, setSubFormOverride] = useState<ExamFormMode | undefined>(undefined);

  const handleClinicChange = (cId: string) => {
    setSelectedClinicId(cId);
    setSubFormOverride(undefined);
    const matchingDoc = doctors.find(d => d.clinic_id === cId);
    setSelectedDoctorId(matchingDoc ? matchingDoc.id : '');
  };

  const selectedClinic = clinics.find(c => c.id === selectedClinicId);
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const clinicReqs = selectedClinic 
    ? getClinicRequirements(selectedClinic.linked_module, selectedClinic.name)
    : (normalizedModule ? getClinicRequirements(normalizedModule) : null);

  // التحديد التلقائي لنوع الحجز والنموذج الطبي (ف1 - ف10) بناءً على تخصص العيادة المختارة وخصائص المريض
  const resolvedBookingRoute = useMemo(
    () => resolveBookingVisitAndForm(selectedClinic, currentPatient, notes, subFormOverride),
    [selectedClinic, currentPatient, notes, subFormOverride]
  );

  // Determine effective clinical module for eligibility verification
  const effectiveModuleForEligibility = useMemo(() => {
    const linked = selectedClinic?.linked_module || normalizedModule;
    if (linked) return linked;
    const cName = (selectedClinic?.name || '').toLowerCase();
    const cSpec = (selectedClinic?.specialty || '').toLowerCase();
    if (cName.includes('طفل') || cSpec.includes('أطفال')) return 'child_followup';
    if (cName.includes('أمومة') || cName.includes('حوامل')) return 'maternal_care';
    if (cName.includes('تنظيم') || cSpec.includes('تنظيم')) return 'family_planning';
    if (cName.includes('مسن') || cName.includes('كبار')) return 'geriatric_care';
    if (cName.includes('زواج') || cName.includes('مقبلين')) return 'premarital';
    return null;
  }, [selectedClinic, normalizedModule]);

  const clinicalEligibility = useMemo(() => {
    if (!effectiveModuleForEligibility) {
      return { eligible: true, reason: '', badgeText: '' };
    }
    if (!currentPatient) {
      return { eligible: false, reason: 'يرجى اختيار المريض للتحقق من الأهلية السريرية للعيادة.', badgeText: 'غير محدد' };
    }
    return evaluateClinicalModuleEligibility(currentPatient, effectiveModuleForEligibility);
  }, [currentPatient, effectiveModuleForEligibility]);

  // Quick date shortcuts (local date)
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, offsetDays));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
  };

  // Format 24h string to 12h Arabic
  const formatTime12 = (time24: string): string => {
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const isPm = h >= 12;
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h.toString().padStart(2, '0')}:${m} ${isPm ? 'م' : 'ص'}`;
  };

  // Format date display (e.g. الأحد، 12 سبتمبر 2026)
  const formattedDateTitle = useMemo(() => {
    try {
      const [year, month, day] = date.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  }, [date]);

  const todayLocalStr = getLocalTodayStr();
  const nowLocalHHMM = getLocalTimeHHMM();

  const isSelectedDateTimeInPast = useMemo(() => {
    if (!date) return false;
    if (date < todayLocalStr) return true;
    if (date === todayLocalStr && time && time.slice(0, 5) < nowLocalHHMM) return true;
    return false;
  }, [date, time, todayLocalStr, nowLocalHHMM]);

  // Generate Slots with Availability
  const timeSlots = useMemo<TimeSlot[]>(() => {
    const slots: TimeSlot[] = [];
    const isToday = date === todayLocalStr;
    const isBeforeToday = date < todayLocalStr;

    const generatePeriodSlots = (startHour: number, startMin: number, endHour: number, endMin: number, period: 'morning' | 'evening') => {
      let currentMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      while (currentMinutes <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const time24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const time12 = formatTime12(time24);

        // Check if there is an existing appointment occupying this slot
        const matchingApp = existingAppointments.find(app => {
          if (app.status === 'CANCELLED') return false;
          if (!app.time) return false;
          const appTime24 = app.time.trim().slice(0, 5);
          // Check exact or within interval
          const [appH, appM] = appTime24.split(':').map(Number);
          const appMinutes = appH * 60 + appM;
          return Math.abs(appMinutes - currentMinutes) < slotInterval;
        });

        const isPast = isBeforeToday || (isToday && time24 < nowLocalHHMM);

        slots.push({
          time24,
          time12,
          period,
          isBooked: !!matchingApp,
          isPast,
          bookedPatientName: matchingApp ? (matchingApp.patients?.name || 'مريض محجوز') : undefined,
          appointmentStatus: matchingApp?.status
        });

        currentMinutes += slotInterval;
      }
    };

    // Morning shift: 08:30 to 14:00
    generatePeriodSlots(8, 30, 13, 50, 'morning');

    // Evening shift: 16:00 to 21:30
    generatePeriodSlots(16, 0, 21, 20, 'evening');

    return slots;
  }, [slotInterval, existingAppointments, date, todayLocalStr, nowLocalHHMM]);

  // Auto-select first non-past, available slot when date or slots change
  useEffect(() => {
    const firstValid = timeSlots.find(s => !s.isBooked && !s.isPast);
    if (firstValid && isSelectedDateTimeInPast) {
      setTime(firstValid.time24);
    }
  }, [timeSlots, isSelectedDateTimeInPast]);

  // Summary counts (aligned with displayed filters)
  const availableSlotsCount = useMemo(() => timeSlots.filter(s => !s.isBooked && !s.isPast).length, [timeSlots]);
  const bookedSlotsCount = useMemo(() => timeSlots.filter(s => s.isBooked).length, [timeSlots]);

  // Filtered slots for display
  const displayedSlots = useMemo(() => {
    if (slotFilter === 'available_only') {
      return timeSlots.filter(s => !s.isBooked && !s.isPast);
    }
    if (slotFilter === 'morning') {
      return timeSlots.filter(s => s.period === 'morning');
    }
    if (slotFilter === 'evening') {
      return timeSlots.filter(s => s.period === 'evening');
    }
    return timeSlots;
  }, [timeSlots, slotFilter]);

  // Filtered patients for dropdown if patient is not fixed
  const filteredPatientsList = useMemo(() => {
    if (!patientSearch.trim()) return patientsList.slice(0, 50);
    const q = patientSearch.toLowerCase().trim();
    return patientsList.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.phone && p.phone.includes(q)) || 
      (p.national_id && p.national_id.includes(q))
    ).slice(0, 50);
  }, [patientsList, patientSearch]);

  const handleCopyRequirements = () => {
    if (!clinicReqs || !selectedClinic) return;
    const text = formatBookingRequirementsText({
      patientName: currentPatient?.name || 'المريض',
      clinicName: selectedClinic.name,
      doctorName: selectedDoctor?.name,
      date,
      time: formatTime12(time),
      room: selectedClinic.room,
      requirements: clinicReqs.requirements,
      preparationNotes: clinicReqs.preparationNotes
    });
    navigator.clipboard.writeText(text);
    setCopiedReqs(true);
    setTimeout(() => setCopiedReqs(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPatient) {
      alert('يرجى اختيار المريض أولاً');
      return;
    }
    if (!selectedClinicId) {
      alert('يرجى اختيار العيادة');
      return;
    }
    if (!clinicalEligibility.eligible) {
      alert(clinicalEligibility.reason);
      return;
    }
    if (!date || !time) {
      alert('يرجى اختيار تاريخ ووقت الكشف');
      return;
    }
    const currentToday = getLocalTodayStr();
    const currentHHMM = getLocalTimeHHMM();
    if (date < currentToday || (date === currentToday && time.slice(0, 5) < currentHHMM)) {
      alert('لا يمكن إنشاء موعد معلق (في الانتظار) بتاريخ أو وقت مضى. يرجى اختيار تاريخ ووقت مستقبلي صالح.');
      return;
    }

    setSaving(true);
    try {
      const cleanedUserNotes = notes.replace(/\[FORM:[a-z0-9_|:]+\]\s*/gi, '').trim();
      const autoDescription = `${resolvedBookingRoute.formTitle} (${resolvedBookingRoute.formCodeBadge})`;
      const finalNotes = `${resolvedBookingRoute.bookingMetadataTag} ${cleanedUserNotes || autoDescription}`;

      const payload: any = {
        patient_id: currentPatient.id,
        clinic_id: selectedClinicId,
        doctor_id: selectedDoctorId || null,
        date,
        time,
        status: 'WAITING',
        notes: finalNotes,
        triggered_by: triggerType
      };

      const created = await DB.addClinicAppointment(payload);
      setSuccess(true);
      if (onBooked) {
        onBooked(created || payload);
      }
      if (onBookingSuccess) {
        onBookingSuccess(created || payload);
      }
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('حدث خطأ أثناء حجز الموعد: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredDoctors = doctors.filter(d => !selectedClinicId || d.clinic_id === selectedClinicId);

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/25 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shadow-inner">
              <CalendarDays size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">حجز موعد كشف جديد</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                  عرض المواعيد الفارغة
                </span>
              </div>
              <p className="text-xs text-indigo-200 font-bold mt-0.5">
                {currentPatient ? (
                  <span>المريض: {currentPatient.name} {currentPatient.phone ? `(${currentPatient.phone})` : ''}</span>
                ) : (
                  <span>اختيار المريض وجدول المواعيد المتاحة</span>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white cursor-pointer"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Suggested Reason Alert */}
        {suggestedReason && (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
            <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">متابعة مقترحة من النظام: </span>
              <span>{suggestedReason}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={36} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold">جاري تحميل بيانات العيادات والأطباء والمواعيد المتاحة...</span>
            </div>
          ) : (
            <>
              {/* Patient Selector if not passed */}
              {!initialPatient && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-black text-slate-700">
                    اختيار المريض <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو الرقم القومي أو الهاتف..."
                      value={patientSearch}
                      onChange={e => setPatientSearch(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                    />
                    <select
                      required
                      value={selectedPatientId}
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-600"
                    >
                      <option value="">-- اختر المريض من القائمة ({filteredPatientsList.length}) --</option>
                      {filteredPatientsList.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ''} {p.national_id ? `[${p.national_id}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {currentPatient && (
                    <div className="flex items-center gap-2 text-[11px] text-indigo-800 font-bold pt-1">
                      <User size={13} className="text-indigo-600" />
                      <span>المريض المحدد: {currentPatient.name}</span>
                      {currentPatient.date_of_birth && <span className="text-slate-500">| تاريخ الميلاد: {currentPatient.date_of_birth}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Clinic and Doctor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clinic */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    العيادة التخصصية <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      required
                      value={selectedClinicId}
                      onChange={e => handleClinicChange(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
                    >
                      <option value="">-- اختر العيادة --</option>
                      {clinics.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.room ? `(غرفة: ${c.room})` : ''} {c.linked_module ? `[بروتوكول معتمد]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Doctor */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الطبيب المعالج
                  </label>
                  <div className="relative">
                    <Stethoscope size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      value={selectedDoctorId}
                      onChange={e => setSelectedDoctorId(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
                    >
                      <option value="">-- طبيب النوبتجية / متاح --</option>
                      {filteredDoctors.map(d => (
                        <option key={d.id} value={d.id}>
                          د/ {d.name} ({d.specialty || 'عام'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Clinical Eligibility Warning Banner */}
              {!clinicalEligibility.eligible && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950 animate-in fade-in">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">الحجز متوقف للعيادة/الوحدة المحددة:</p>
                    <p className="font-bold mt-0.5">{clinicalEligibility.reason}</p>
                  </div>
                </div>
              )}

              {/* Automatic Booking Type & Family Health Record Form Routing Card */}
              {selectedClinic && (
                <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                    <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>التوجيه التلقائي لنوع الحجز والنموذج الطبي (حسب تخصص العيادة):</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 bg-white text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-black font-mono">
                        كود التردد (ف2ب): {resolvedBookingRoute.visitCode} - {resolvedBookingRoute.visitTypeLabel}
                      </span>
                      <span className="px-2.5 py-0.5 bg-emerald-700 text-white rounded-lg text-[11px] font-black">
                        {resolvedBookingRoute.formCodeBadge}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 space-y-1">
                      <span className="text-[10px] font-black text-slate-500 block">
                        النموذج الذي سيُفتح تلقائياً للطبيب وقت الكشف:
                      </span>
                      <p className="font-black text-emerald-950 text-xs">{resolvedBookingRoute.formTitle}</p>
                      <p className="text-[11px] text-slate-600 font-bold">{resolvedBookingRoute.formSubtitle}</p>

                      {/* Sub-form selector when clinic supports multiple sub-forms (e.g. Maternal ANC vs Postpartum, or Family Medicine general vs chronic) */}
                      {(resolvedBookingRoute.examFormMode === 'maternal_anc' ||
                        resolvedBookingRoute.examFormMode === 'maternal_postpartum') && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSubFormOverride('maternal_anc')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                              resolvedBookingRoute.examFormMode === 'maternal_anc'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                            }`}
                          >
                            متابعة حمل (ف6أ)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubFormOverride('maternal_postpartum')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                              resolvedBookingRoute.examFormMode === 'maternal_postpartum'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-rose-50'
                            }`}
                          >
                            متابعة بعد الولادة والنفاس (ف6ب)
                          </button>
                        </div>
                      )}

                      {(resolvedBookingRoute.examFormMode === 'general' ||
                        resolvedBookingRoute.examFormMode === 'chronic_followup') && (
                        <div className="pt-2 flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSubFormOverride('general')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                              resolvedBookingRoute.examFormMode === 'general'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50'
                            }`}
                          >
                            فحص شامل / زيارة دورية (ف1)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubFormOverride('chronic_followup')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                              resolvedBookingRoute.examFormMode === 'chronic_followup'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-indigo-50'
                            }`}
                          >
                            متابعة أمراض مزمنة ضغط/سكر (ف4أ/ب/ج)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-500 block">
                        الترحيل التلقائي إلى الملف العائلي فور حفظ الكشف:
                      </span>
                      <ul className="space-y-1 text-[11px] font-bold text-slate-800">
                        {resolvedBookingRoute.autoSyncTargets.map((target, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                            <span>{target}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Clinic Requirements Card */}
              {clinicReqs && (
                <div className="bg-sky-50/80 border-2 border-sky-200 rounded-2xl p-3.5 sm:p-4 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 border-b border-sky-200 pb-2">
                    <div className="flex items-center gap-2 text-sky-950 font-black text-xs">
                      <FileText size={16} className="text-sky-600 shrink-0" />
                      <span>متطلبات وإرشادات العيادة:</span>
                      <span className="bg-sky-200/80 text-sky-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {clinicReqs.badge}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyRequirements}
                      className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-800 rounded-lg text-[11px] font-bold border border-sky-300 flex items-center gap-1 transition-all shadow-xs shrink-0 cursor-pointer"
                      title="نسخ رسالة المتطلبات للمريض"
                    >
                      {copiedReqs ? (
                        <>
                          <Check size={12} className="text-emerald-600" />
                          <span className="text-emerald-700">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>نسخ للمريض</span>
                        </>
                      )}
                    </button>
                  </div>

                  <ul className="space-y-1.5 text-xs text-sky-950 font-medium pr-1">
                    {clinicReqs.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0"></span>
                        <span className="font-bold">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Date Selection and Quick Buttons */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-black text-slate-800">
                    تاريخ الحجز <span className="text-rose-500">*</span>
                    <span className="text-slate-500 text-[11px] font-medium mr-2">({formattedDateTitle})</span>
                  </label>

                  {/* Quick Date Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      اليوم
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      غداً
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(2)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      بعد غد
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(7)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                    >
                      + أسبوع
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    required
                    min={todayLocalStr}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                {isSelectedDateTimeInPast && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                    <span>تنبيه: التاريخ أو الوقت المحدد مضى. لا يمكن إنشاء موعد معلق في الماضي، يرجى اختيار موعد مستقبلي.</span>
                  </div>
                )}
              </div>

              {/* 🌟 SLOTS SECTION: EMPTY / AVAILABLE APPOINTMENTS VIEWER 🌟 */}
              <div className="border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/60 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm">
                
                {/* Section Header with Stats & Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-indigo-950 flex items-center gap-1.5">
                        <span>المواعيد والفترات المتاحة للاستقبال</span>
                        {loadingAppointments && <Loader2 size={13} className="animate-spin text-indigo-600" />}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] font-bold mt-0.5">
                        <span className="text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          {availableSlotsCount} موعد فارغ ومتاح
                        </span>
                        <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                          {bookedSlotsCount} موعد محجوز
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slot Interval Configuration */}
                  <div className="flex items-center gap-1 self-end sm:self-auto bg-white p-1 rounded-xl border border-slate-200 text-[10px] font-black text-slate-600">
                    <span className="px-1.5 text-slate-400 font-bold">مدة الكشف:</span>
                    <button
                      type="button"
                      onClick={() => setSlotInterval(15)}
                      className={`px-2 py-1 rounded-lg transition-all ${slotInterval === 15 ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                    >
                      15 د
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotInterval(20)}
                      className={`px-2 py-1 rounded-lg transition-all ${slotInterval === 20 ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                    >
                      20 د
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotInterval(30)}
                      className={`px-2 py-1 rounded-lg transition-all ${slotInterval === 30 ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100'}`}
                    >
                      30 د
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setSlotFilter('available_only')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        slotFilter === 'available_only'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>المواعيد الفارغة فقط ({availableSlotsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        slotFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Calendar size={14} />
                      <span>الكل ({timeSlots.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotFilter('morning')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                        slotFilter === 'morning'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sun size={13} />
                      <span>صباحاً</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotFilter('evening')}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                        slotFilter === 'evening'
                          ? 'bg-indigo-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Moon size={13} />
                      <span>مساءً</span>
                    </button>
                  </div>

                  {/* Selected Slot Banner */}
                  <div className="text-xs font-black px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <span>الموعد المختار: <strong>{formatTime12(time)} ({time})</strong></span>
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                  {displayedSlots.map(slot => {
                    const isSelected = time === slot.time24;
                    const isBooked = slot.isBooked;
                    const isPast = !!slot.isPast;

                    if (isBooked) {
                      return (
                        <div
                          key={slot.time24}
                          className="p-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/50 text-slate-400 flex flex-col justify-between select-none opacity-80"
                          title={`محجوز للمريض: ${slot.bookedPatientName || 'مريض'}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs line-through text-slate-500">{slot.time12}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md">
                              محجوز
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold truncate mt-1">
                            {slot.bookedPatientName || 'محجوز'}
                          </span>
                        </div>
                      );
                    }

                    if (isPast) {
                      return (
                        <div
                          key={slot.time24}
                          className="p-2.5 rounded-2xl border border-slate-200 bg-slate-100/70 text-slate-400 flex flex-col justify-between select-none opacity-70"
                          title="هذه الفترة مضى وقتها ولا يمكن حجز موعد معلق فيها"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs line-through text-slate-400">{slot.time12}</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md">
                              مضى وقته
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold truncate mt-1">
                            فترة سابقة
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={slot.time24}
                        type="button"
                        onClick={() => {
                          setTime(slot.time24);
                          setShowCustomTimeInput(false);
                        }}
                        className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer transform active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-4 ring-emerald-500/20'
                            : 'bg-white hover:bg-emerald-50/70 border-emerald-200 text-slate-800 hover:border-emerald-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span className={`font-black text-xs ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {slot.time12}
                          </span>
                          {isSelected ? (
                            <span className="w-4 h-4 rounded-full bg-white text-emerald-600 flex items-center justify-center">
                              <Check size={11} className="stroke-[3]" />
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                              متاح
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          {slot.period === 'morning' ? 'فترة صباحية' : 'فترة مسائية'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {displayedSlots.length === 0 && (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <AlertTriangle size={24} className="text-amber-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">لا توجد فترات متاحة وفق الفلتر المحدد لهذا اليوم</p>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="text-[11px] font-black text-indigo-600 hover:underline"
                    >
                      عرض مواعيد الغد المتاحة
                    </button>
                  </div>
                )}

                {/* Manual Time Input Toggle */}
                <div className="pt-2 border-t border-indigo-100/60 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setShowCustomTimeInput(!showCustomTimeInput)}
                    className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <Clock size={13} />
                    <span>{showCustomTimeInput ? 'إخفاء الإدخال اليدوي للوقت' : 'تحديد وقت يدوي مخصص (حالات طارئة/استثنائية)'}</span>
                  </button>

                  {showCustomTimeInput && (
                    <div className="flex items-center gap-2 animate-in fade-in">
                      <span className="text-[11px] text-slate-500 font-bold">الوقت اليدوي:</span>
                      <input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Trigger Type Selection */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  مصدر ونوع الحجز
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriggerType('staff_scheduled')}
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                      triggerType === 'staff_scheduled'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    حجز استقبال/طبيب
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriggerType('system_suggested')}
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                      triggerType === 'system_suggested'
                        ? 'bg-amber-50 border-amber-600 text-amber-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    اقتراح نظام دوري
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriggerType('patient_request')}
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer ${
                      triggerType === 'patient_request'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    طلب شخصي من المريض
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  ملاحظات أو سبب الزيارة
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="سبب الزيارة أو ملاحظات الاستقبال..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || success || !clinicalEligibility.eligible || isSelectedDateTimeInPast}
                  title={!clinicalEligibility.eligible ? clinicalEligibility.reason : isSelectedDateTimeInPast ? 'لا يمكن حجز موعد في الماضي' : 'تأكيد حجز الموعد'}
                  className="px-7 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transform hover:-translate-y-0.5"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري تأكيد الحجز...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={16} className="text-emerald-300" />
                      <span>تم حجز الموعد بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <CalendarDays size={16} />
                      <span>تأكيد حجز الموعد ({formatTime12(time)})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default QuickClinicBookingModal;
