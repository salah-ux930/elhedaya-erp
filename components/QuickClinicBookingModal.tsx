import React, { useState, useEffect } from 'react';
import { Patient, Clinic, Doctor, LinkedModuleType, AppointmentTriggerType } from '../types.ts';
import { DB } from '../store.ts';
import { 
  X, Calendar, Clock, Stethoscope, User, AlertCircle, CheckCircle, 
  Loader2, Sparkles, Building2
} from 'lucide-react';

interface QuickClinicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  suggestedModule?: LinkedModuleType | string;
  initialModule?: LinkedModuleType | string;
  suggestedReason?: string;
  prefilledReason?: string;
  defaultTrigger?: AppointmentTriggerType;
  onBooked?: (appointment: any) => void;
  onBookingSuccess?: (appointment: any) => void;
}

export const QuickClinicBookingModal: React.FC<QuickClinicBookingModalProps> = ({
  isOpen,
  onClose,
  patient,
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
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  const [notes, setNotes] = useState(activeReason ? `[اقتراح متابعة مستحقة] ${activeReason}` : '');
  const [triggerType, setTriggerType] = useState<AppointmentTriggerType>(defaultTrigger);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadClinicsAndDoctors();
      if (activeReason) {
        setNotes(`[اقتراح متابعة مستحقة] ${activeReason}`);
      }
    }
  }, [isOpen, activeModuleRaw, activeReason]);

  const loadClinicsAndDoctors = async () => {
    setLoading(true);
    try {
      const [allClinics, allDoctors] = await Promise.all([
        DB.getClinics(),
        DB.getDoctors()
      ]);
      setClinics(allClinics || []);
      setDoctors(allDoctors || []);

      // مطابقة العيادة الأنسب بناءً على normalizedModule
      let matchedClinic = allClinics.find((c: Clinic) => c.linked_module === normalizedModule);
      if (!matchedClinic && normalizedModule) {
        if (normalizedModule === 'child_followup') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('طفل') || c.specialty?.includes('أطفال'));
        } else if (normalizedModule === 'maternal_care') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('أمومة') || c.name.includes('حوامل') || c.name.includes('نساء'));
        } else if (normalizedModule === 'family_planning') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('تنظيم') || c.specialty?.includes('تنظيم'));
        } else if (normalizedModule === 'geriatric_care') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('مسن') || c.name.includes('كبار'));
        } else if (normalizedModule === 'dental') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('أسنان') || c.specialty?.includes('أسنان'));
        } else if (normalizedModule === 'premarital') {
          matchedClinic = allClinics.find((c: Clinic) => c.name.includes('زواج') || c.name.includes('مقبلين'));
        }
      }

      if (matchedClinic) {
        setSelectedClinicId(matchedClinic.id);
        const matchingDoc = allDoctors.find((d: Doctor) => d.clinic_id === matchedClinic.id);
        if (matchingDoc) setSelectedDoctorId(matchingDoc.id);
      } else if (allClinics.length > 0) {
        setSelectedClinicId(allClinics[0].id);
        const matchingDoc = allDoctors.find((d: Doctor) => d.clinic_id === allClinics[0].id);
        if (matchingDoc) setSelectedDoctorId(matchingDoc.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClinicChange = (cId: string) => {
    setSelectedClinicId(cId);
    const matchingDoc = doctors.find(d => d.clinic_id === cId);
    setSelectedDoctorId(matchingDoc ? matchingDoc.id : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinicId) {
      alert('يرجى اختيار العيادة');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        patient_id: patient.id,
        clinic_id: selectedClinicId,
        doctor_id: selectedDoctorId || null,
        date,
        time,
        status: 'WAITING',
        notes: notes.trim(),
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
    <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-black text-base">حجز عيادة وموعد كشف</h3>
              <p className="text-xs text-indigo-200 font-bold">{patient.name} ({patient.national_id || '—'})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Reason / Context Alert */}
        {suggestedReason && (
          <div className="bg-amber-50 border-b border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-black">متابعة مقترحة من النظام: </span>
              <span>{suggestedReason}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="text-xs font-bold">جاري تحميل بيانات العيادات والأطباء...</span>
            </div>
          ) : (
            <>
              {/* اختيار العيادة */}
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

              {/* اختيار الطبيب (اختياري) */}
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

              {/* التاريخ والوقت */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    تاريخ الحجز <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full pr-10 pl-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    الوقت المقدر
                  </label>
                  <div className="relative">
                    <Clock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="time"
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full pr-10 pl-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* مصدر الحجز */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5">
                  مصدر ونوع الحجز
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriggerType('staff_scheduled')}
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all ${
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
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all ${
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
                    className={`p-2.5 rounded-xl border text-[11px] font-black transition-all ${
                      triggerType === 'patient_request'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    طلب شخصي من المريض
                  </button>
                </div>
              </div>

              {/* ملاحظات / شكوى */}
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

              {/* أزرار الإجراء */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || success}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري الحجز...</span>
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle size={16} className="text-emerald-300" />
                      <span>تم الحجز بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      <span>تأكيد حجز الموعد</span>
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
