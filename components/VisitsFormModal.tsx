import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { PatientVisit } from '../types.ts';
import { 
  Calendar, Stethoscope, Plus, Trash2, Printer, X, Save, 
  FileText, Activity, User, ShieldCheck, CheckCircle2, Clock, Edit2
} from 'lucide-react';

interface VisitsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onVisitsUpdated?: () => void;
}

export const VISIT_TYPES_MAP: Record<number, string> = {
  1: 'متابعة الحمل',
  2: 'تنظيم الأسرة',
  3: 'متابعة طفل',
  4: 'أمراض مزمنة',
  5: 'زيارة دورية',
  6: 'أسنان'
};

export const VISIT_TYPE_OPTIONS = [
  { code: 1, label: '١ - متابعة الحمل' },
  { code: 2, label: '٢ - تنظيم الأسرة' },
  { code: 3, label: '٣ - متابعة طفل' },
  { code: 4, label: '٤ - أمراض مزمنة' },
  { code: 5, label: '٥ - زيارة دورية' },
  { code: 6, label: '٦ - أسنان' },
  { code: 0, label: 'نوع زيارة مخصص...' }
];

const VisitsFormModal: React.FC<VisitsFormModalProps> = ({
  isOpen,
  onClose,
  patient,
  onVisitsUpdated
}) => {
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);

  // Form State
  const [visitDate, setVisitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [visitTypeCode, setVisitTypeCode] = useState<number>(1);
  const [customVisitType, setCustomVisitType] = useState<string>('');
  const [complaint, setComplaint] = useState<string>('');
  const [clinicalExam, setClinicalExam] = useState<string>('');
  const [investigations, setInvestigations] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [management, setManagement] = useState<string>('');
  const [doctorSignature, setDoctorSignature] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchVisits = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const data = await DB.getPatientVisits(patient.id);
      setVisits(data || []);
    } catch (e) {
      console.error('Failed to load visits:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchVisits();
    }
  }, [isOpen, patient?.id]);

  if (!isOpen || !patient) return null;

  const resetForm = () => {
    setVisitDate(new Date().toISOString().split('T')[0]);
    setVisitTypeCode(1);
    setCustomVisitType('');
    setComplaint('');
    setClinicalExam('');
    setInvestigations('');
    setDiagnosis('');
    setManagement('');
    setDoctorSignature('');
    setEditingVisitId(null);
    setShowAddForm(false);
    setErrorMsg(null);
  };

  const handleStartEdit = (v: PatientVisit) => {
    setEditingVisitId(v.id);
    setVisitDate(v.visit_date || new Date().toISOString().split('T')[0]);
    if (v.visit_code && v.visit_code in VISIT_TYPES_MAP) {
      setVisitTypeCode(v.visit_code);
      setCustomVisitType('');
    } else {
      setVisitTypeCode(0);
      setCustomVisitType(v.visit_type || '');
    }
    setComplaint(v.complaint || '');
    setClinicalExam(v.clinical_exam || '');
    setInvestigations(v.investigations || '');
    setDiagnosis(v.diagnosis || '');
    setManagement(v.management || '');
    setDoctorSignature(v.doctor_signature || '');
    setShowAddForm(true);
  };

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const finalTypeString = visitTypeCode === 0
      ? (customVisitType || 'زيارة عامة')
      : `${visitTypeCode} - ${VISIT_TYPES_MAP[visitTypeCode]}`;

    try {
      const visitPayload: any = {
        patient_id: patient.id,
        visit_date: visitDate,
        visit_type: finalTypeString,
        visit_code: visitTypeCode,
        complaint,
        clinical_exam: clinicalExam,
        investigations,
        diagnosis,
        management,
        doctor_signature: doctorSignature
      };

      if (editingVisitId) {
        // Remove existing and re-add for simplicity or edit
        await DB.deletePatientVisit(editingVisitId);
      }

      await DB.addPatientVisit(visitPayload);
      await fetchVisits();
      if (onVisitsUpdated) onVisitsUpdated();
      resetForm();
    } catch (err: any) {
      console.error('Error saving visit:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ بيانات الزيارة');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVisit = async (id: string) => {
    if (!confirm('هل أنت أعدت التأكيد على حذف هذه الزيارة من نموذج التردد؟')) return;
    try {
      await DB.deletePatientVisit(id);
      await fetchVisits();
      if (onVisitsUpdated) onVisitsUpdated();
    } catch (e) {
      console.error('Failed to delete visit', e);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  // Build upper grid data (1 to 16 slots or dynamic)
  const maxUpperSlots = Math.max(16, visits.length);
  const upperSlots = Array.from({ length: maxUpperSlots }, (_, i) => {
    const v = visits[visits.length - 1 - i] || visits[i]; // chronologically or sorted
    return {
      index: i + 1,
      date: visits[i] ? visits[i].visit_date : '',
      type: visits[i] ? (visits[i].visit_code ? `${visits[i].visit_code}` : visits[i].visit_type) : ''
    };
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      
      {/* Container wrapper (Print optimized) */}
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-200 print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:absolute print:inset-0">
        
        {/* Modal Top Header Bar - Hidden in Print */}
        <div className="p-5 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white flex justify-between items-center shrink-0 print:hidden rounded-t-3xl border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md text-amber-400">
              <Activity size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">نموذج التردد / Visits Form</h3>
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold">
                  موديول رقم ٤
                </span>
              </div>
              <p className="text-xs text-gray-300 font-bold mt-0.5">
                المريض: {patient.name} {patient.national_id ? `— الرقم القومي: ${patient.national_id}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (showAddForm) resetForm();
                else setShowAddForm(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md text-xs"
            >
              <Plus size={16} />
              {showAddForm ? 'إلغاء نموذج الإضافة' : 'تسجيل زيارة جديدة'}
            </button>

            <button
              onClick={triggerPrint}
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs border border-slate-600"
            >
              <Printer size={16} /> طباعة النموذج
            </button>

            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
              title="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:p-0 print:overflow-visible">

          {/* Inline Add / Edit Visit Form (Hidden in Print) */}
          {showAddForm && (
            <form onSubmit={handleSaveVisit} className="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-5 space-y-4 print:hidden animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex justify-between items-center border-b border-amber-200/80 pb-3">
                <h4 className="font-black text-amber-950 text-base flex items-center gap-2">
                  <Stethoscope className="text-amber-600" size={20} />
                  {editingVisitId ? 'تعديل بيانا الزيارة المسجلة' : 'تسجيل زيارة جديدة إلى نموذج التردد'}
                </h4>
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="text-amber-800 hover:text-amber-950 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">تاريخ الزيارة *</label>
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">نوع الزيارة (الكود المحدد) *</label>
                  <select
                    value={visitTypeCode}
                    onChange={(e) => setVisitTypeCode(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {VISIT_TYPE_OPTIONS.map(opt => (
                      <option key={opt.code} value={opt.code}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {visitTypeCode === 0 && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">حدد نوع الزيارة المخصص *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: استشارة عيون، جراحة، إلخ"
                      value={customVisitType}
                      onChange={(e) => setCustomVisitType(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">اسم وتوقيع الطبيب المعالج</label>
                  <input
                    type="text"
                    placeholder="د / ..."
                    value={doctorSignature}
                    onChange={(e) => setDoctorSignature(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">الشكوى (Complaint)</label>
                  <textarea
                    rows={2}
                    placeholder="شكوى المريض والأعراض الحالية..."
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">الفحص الإكلينيكي (Clinical Exam)</label>
                  <textarea
                    rows={2}
                    placeholder="نتائج الفحص الطبي الظاهري والأجهزة..."
                    value={clinicalExam}
                    onChange={(e) => setClinicalExam(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">الفحوصات والتحاليل (Investigations)</label>
                  <textarea
                    rows={2}
                    placeholder="التحاليل المطلوبة أو النتائج..."
                    value={investigations}
                    onChange={(e) => setInvestigations(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">التشخيص (Diagnosis)</label>
                  <textarea
                    rows={2}
                    placeholder="التشخيص المبدئي أو النهائي..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">العلاج والمتابعة (Management Follow-up)</label>
                  <textarea
                    rows={2}
                    placeholder="الخطه العلاجية وتاريخ الاستشارة القادمة..."
                    value={management}
                    onChange={(e) => setManagement(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 bg-white font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Save size={16} />
                  {saving ? 'جاري الحفظ...' : (editingVisitId ? 'حفظ التعديلات' : 'إضافة الزيارة إلى نموذج التردد')}
                </button>
              </div>
            </form>
          )}

          {/* OFFICIAL VISITS FORM DOCUMENT (Matches Exact User Screenshot Design) */}
          <div className="bg-white border-2 border-black p-4 sm:p-6 text-black space-y-4 rounded-xl print:border-none print:p-0 print:m-0">
            
            {/* Header Title Box */}
            <div className="text-center space-y-2">
              <div className="inline-block bg-black text-white px-8 py-2 rounded-md font-black text-xl tracking-wider shadow-sm">
                نموذج التردد &nbsp; Visits Form
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-800 leading-relaxed border-b-2 border-black pb-2">
                يكتب في الجدول التجميعي التالي جميع أنواع الزيارات (متابعة حمل - تنظيم أسرة - متابعة الطفل - أمراض مزمنة - زيارة دورية - أسنان)
              </p>
            </div>

            {/* UPPER INDEX GRID (4 columns side-by-side, serials 1 to 16) */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-2 border-black text-center text-xs font-bold">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-black text-[11px]">
                    <th className="border border-black p-1 w-8">م</th>
                    <th className="border border-black p-1">التاريخ</th>
                    <th className="border border-black p-1">نوع الزيارة</th>

                    <th className="border border-black p-1 w-8">م</th>
                    <th className="border border-black p-1">التاريخ</th>
                    <th className="border border-black p-1">نوع الزيارة</th>

                    <th className="border border-black p-1 w-8">م</th>
                    <th className="border border-black p-1">التاريخ</th>
                    <th className="border border-black p-1">نوع الزيارة</th>

                    <th className="border border-black p-1 w-8">م</th>
                    <th className="border border-black p-1">التاريخ</th>
                    <th className="border border-black p-1">نوع الزيارة</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3].map((rowIdx) => {
                    const c1 = visits[rowIdx];
                    const c2 = visits[rowIdx + 4];
                    const c3 = visits[rowIdx + 8];
                    const c4 = visits[rowIdx + 12];

                    return (
                      <tr key={rowIdx} className="h-8 border-b border-black">
                        {/* Col 1 (1, 2, 3, 4) */}
                        <td className="border border-black p-1 bg-gray-50">{rowIdx + 1}</td>
                        <td className="border border-black p-1 font-mono text-[11px]">
                          {c1?.visit_date || '20   /   /  '}
                        </td>
                        <td className="border border-black p-1 text-[11px]">
                          {c1 ? (c1.visit_code ? c1.visit_code : c1.visit_type) : ''}
                        </td>

                        {/* Col 2 (5, 6, 7, 8) */}
                        <td className="border border-black p-1 bg-gray-50">{rowIdx + 5}</td>
                        <td className="border border-black p-1 font-mono text-[11px]">
                          {c2?.visit_date || '20   /   /  '}
                        </td>
                        <td className="border border-black p-1 text-[11px]">
                          {c2 ? (c2.visit_code ? c2.visit_code : c2.visit_type) : ''}
                        </td>

                        {/* Col 3 (9, 10, 11, 12) */}
                        <td className="border border-black p-1 bg-gray-50">{rowIdx + 9}</td>
                        <td className="border border-black p-1 font-mono text-[11px]">
                          {c3?.visit_date || '20   /   /  '}
                        </td>
                        <td className="border border-black p-1 text-[11px]">
                          {c3 ? (c3.visit_code ? c3.visit_code : c3.visit_type) : ''}
                        </td>

                        {/* Col 4 (13, 14, 15, 16) */}
                        <td className="border border-black p-1 bg-gray-50">{rowIdx + 13}</td>
                        <td className="border border-black p-1 font-mono text-[11px]">
                          {c4?.visit_date || '20   /   /  '}
                        </td>
                        <td className="border border-black p-1 text-[11px]">
                          {c4 ? (c4.visit_code ? c4.visit_code : c4.visit_type) : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* LOWER DETAILED VISITS TABLE */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full border-collapse border-2 border-black text-right text-xs">
                <thead>
                  <tr className="bg-gray-400 text-black font-extrabold text-center border-b-2 border-black">
                    <th className="border border-black p-2.5 w-24">
                      Date<br/><span className="text-[11px]">التاريخ</span>
                    </th>
                    <th className="border border-black p-2.5 w-24">
                      Visit Type<br/><span className="text-[11px]">نوع الزيارة</span>
                    </th>
                    <th className="border border-black p-2.5 min-w-[130px]">
                      Complaint<br/><span className="text-[11px]">الشكوى</span>
                    </th>
                    <th className="border border-black p-2.5 min-w-[140px]">
                      Clinical Examination<br/><span className="text-[11px]">الفحص الإكلينيكي</span>
                    </th>
                    <th className="border border-black p-2.5 min-w-[130px]">
                      Investigations<br/><span className="text-[11px]">الفحوصات والتحاليل</span>
                    </th>
                    <th className="border border-black p-2.5 min-w-[130px]">
                      Diagnosis<br/><span className="text-[11px]">(التشخيص)</span>
                    </th>
                    <th className="border border-black p-2.5 min-w-[150px]">
                      Management Follow-up<br/><span className="text-[11px]">العلاج والمتابعة</span>
                    </th>
                    <th className="border border-black p-2.5 w-28">
                      Doctor Signature<br/><span className="text-[11px]">توقيع الطبيب</span>
                    </th>
                    <th className="border border-black p-2.5 w-20 print:hidden text-center">
                      إجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visits.length > 0 ? (
                    visits.map((v, idx) => (
                      <tr key={v.id || idx} className="border-b border-black align-top hover:bg-gray-50/80 transition-colors">
                        <td className="border border-black p-2 text-center font-mono font-bold">
                          {v.visit_date}
                        </td>
                        <td className="border border-black p-2 text-center font-bold">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono">
                            {v.visit_type}
                          </span>
                        </td>
                        <td className="border border-black p-2 whitespace-pre-line leading-relaxed">
                          {v.complaint || '—'}
                        </td>
                        <td className="border border-black p-2 whitespace-pre-line leading-relaxed">
                          {v.clinical_exam || '—'}
                        </td>
                        <td className="border border-black p-2 whitespace-pre-line leading-relaxed">
                          {v.investigations || '—'}
                        </td>
                        <td className="border border-black p-2 whitespace-pre-line font-bold leading-relaxed">
                          {v.diagnosis || '—'}
                        </td>
                        <td className="border border-black p-2 whitespace-pre-line leading-relaxed">
                          {v.management || '—'}
                        </td>
                        <td className="border border-black p-2 text-center font-bold">
                          {v.doctor_signature || '—'}
                        </td>
                        <td className="border border-black p-2 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(v)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                              title="تعديل الزيارة"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVisit(v.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-all"
                              title="حذف الزيارة"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    // Display 3 empty sample rows as shown in the original printed form
                    [1, 2, 3].map((rowNum) => (
                      <tr key={rowNum} className="h-20 border-b border-black">
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2"></td>
                        <td className="border border-black p-2 print:hidden"></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* VISITS TYPE KEY FOOTER (Matches exact footer in uploaded image) */}
            <div className="pt-3 border-t-2 border-black flex flex-wrap justify-between items-center text-xs font-black gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>* ١ - متابعة الحمل</span>
                <span>٢ - تنظيم الأسرة</span>
                <span>٣ - متابعة طفل</span>
                <span>٤ - أمراض مزمنة</span>
                <span>٥ - زيارة دورية</span>
                <span>٦ - أسنان</span>
              </div>
              <div className="text-[11px] font-bold text-gray-700">
                يوضع الرقم الدال علي نوع الزيارة في المكان المحدد
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default VisitsFormModal;
