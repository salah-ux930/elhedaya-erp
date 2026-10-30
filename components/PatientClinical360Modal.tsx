import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { Patient } from '../types.ts';
import {
  HospitalOperationalEngine,
  PatientOperationalProfile
} from '../services/hospitalOperationalEngine.ts';
import QuickClinicBookingModal from './QuickClinicBookingModal.tsx';
import FamilyComprehensiveHealthRecordModal from './FamilyComprehensiveHealthRecordModal.tsx';
import {
  X,
  ShieldAlert,
  HeartPulse,
  Stethoscope,
  FlaskConical,
  Pill,
  Users,
  Activity,
  CalendarCheck,
  CreditCard,
  Plus,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Home,
  FileText,
  Phone,
  User
} from 'lucide-react';

interface PatientClinical360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onDataUpdated?: () => void;
}

export const PatientClinical360Modal: React.FC<PatientClinical360ModalProps> = ({
  isOpen,
  onClose,
  patient,
  onDataUpdated
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<PatientOperationalProfile | null>(null);

  // Quick Add Problem / Allergy inline state
  const [showQuickAddAlert, setShowQuickAddAlert] = useState<boolean>(false);
  const [alertEntryType, setAlertEntryType] = useState<'CHRONIC' | 'ALLERGY'>('CHRONIC');
  const [alertText, setAlertText] = useState<string>('');
  const [alertNotes, setAlertNotes] = useState<string>('');
  const [savingAlert, setSavingAlert] = useState<boolean>(false);

  // Sub-modals
  const [bookingContext, setBookingContext] = useState<{
    patient: Patient;
    module?: any;
    reason?: string;
  } | null>(null);
  const [showFullComprehensive, setShowFullComprehensive] = useState<boolean>(false);

  const load360Profile = async () => {
    if (!patient?.id) return;
    setLoading(true);
    try {
      const [
        familyFiles,
        fundingEntities,
        patientProblems,
        physicalExams,
        patientVisits,
        appointments,
        sessions,
        labTests,
        dispenseOrders
      ] = await Promise.all([
        DB.getFamilyFiles(),
        DB.getFundingEntities(),
        DB.getPatientProblems(patient.id),
        DB.getPhysicalExams(patient.id),
        DB.getPatientVisits(patient.id),
        DB.getClinicAppointments ? DB.getClinicAppointments(undefined, undefined, undefined, patient.id) : Promise.resolve([]),
        DB.getSessions(),
        DB.getLabTests(),
        DB.getPharmacyDispenseOrders ? DB.getPharmacyDispenseOrders().catch(() => []) : Promise.resolve([])
      ]);

      const built = HospitalOperationalEngine.buildPatientOperationalProfile(patient, {
        familyFiles: familyFiles || [],
        fundingEntities: fundingEntities || [],
        patientProblems: patientProblems || [],
        physicalExams: physicalExams || [],
        patientVisits: patientVisits || [],
        appointments: appointments || [],
        sessions: sessions || [],
        labTests: labTests || [],
        dispenseOrders: dispenseOrders || []
      });
      setProfile(built);
    } catch (err) {
      console.error('Error loading Patient 360 profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && patient) {
      load360Profile();
    }
  }, [isOpen, patient?.id]);

  if (!isOpen || !patient) return null;

  const handleQuickSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertText.trim()) return;
    setSavingAlert(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (alertEntryType === 'CHRONIC') {
        await DB.addPatientProblem({
          patient_id: patient.id,
          problem_name: alertText.trim(),
          onset_date: todayStr,
          problem_type: 'chronic',
          notes: alertNotes.trim() || 'تم التسجيل السريع من بطاقة المريض',
          status: 'active'
        });
      } else {
        // Save allergy directly to physical exam history so it triggers across Clinic & Pharmacy
        await DB.addPhysicalExam({
          patient_id: patient.id,
          exam_date: todayStr,
          allergy: alertText.trim(),
          adverse_drug_reactions: alertNotes.trim() || null,
          other_history: 'تحديث تنبيه حساسية دوائية من بطاقة المريض'
        });
      }
      setAlertText('');
      setAlertNotes('');
      setShowQuickAddAlert(false);
      await load360Profile();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      console.error('Failed saving quick clinical alert:', err);
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 md:p-5 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact & Calm Patient Card Header */}
        <div className="bg-primary-700 text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-lg text-white shrink-0">
              {patient.name?.[0] || 'م'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-black">
                  بطاقة المريض
                </span>
                <h3 className="text-base md:text-lg font-black text-white truncate">
                  {patient.name}
                </h3>
                {patient.blood_type && (
                  <span className="px-2 py-0.5 bg-white/15 rounded-md text-[11px] font-mono font-bold">
                    {patient.blood_type}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-primary-50 mt-1">
                <span className="font-mono tabular-nums">
                  {profile?.ageYears !== null && profile?.ageYears !== undefined
                    ? `${profile.ageYears} سنة`
                    : 'العمر غير محدد'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 font-mono tabular-nums">
                  <Phone size={11} /> {patient.phone || '---'}
                </span>
                <span>·</span>
                {profile?.familyFile ? (
                  <span className="font-bold text-emerald-200">
                    ملف الأسرة: {profile.familyFile.family_code}
                  </span>
                ) : (
                  <span className="text-amber-200 font-bold">بدون ملف عائلي</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowQuickAddAlert(!showQuickAddAlert)}
              className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="إضافة تنبيه حساسية أو مرض مزمن"
            >
              <Plus size={13} /> تنبيه طبي
            </button>
            <button
              type="button"
              onClick={() => setShowFullComprehensive(true)}
              className="px-2.5 py-1.5 bg-white text-primary-800 hover:bg-primary-50 rounded-lg text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
              title="فتح السجل الصحي الشامل"
            >
              <FileText size={13} /> السجل الشامل
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-primary-100 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Inline Quick Add Allergy / Chronic Problem Bar */}
        {showQuickAddAlert && (
          <form
            onSubmit={handleQuickSaveAlert}
            className="bg-rose-50/90 border-b border-rose-200 px-5 py-3 flex flex-col sm:flex-row items-end gap-2.5 shrink-0"
          >
            <div className="w-full sm:w-40">
              <label className="text-[11px] font-bold text-rose-900 block mb-1">نوع التنبيه</label>
              <select
                value={alertEntryType}
                onChange={(e) => setAlertEntryType(e.target.value as 'CHRONIC' | 'ALLERGY')}
                className="w-full p-2 rounded-lg border border-rose-200 bg-white text-xs font-bold outline-none"
              >
                <option value="ALLERGY">حساسية دوائية</option>
                <option value="CHRONIC">مرض مزمن</option>
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-rose-900 block mb-1">
                {alertEntryType === 'ALLERGY' ? 'اسم الدواء / المادة *' : 'اسم المرض المزمن *'}
              </label>
              <input
                type="text"
                required
                value={alertText}
                onChange={(e) => setAlertText(e.target.value)}
                placeholder={
                  alertEntryType === 'ALLERGY'
                    ? 'مثال: بنسلين، أسبرين...'
                    : 'مثال: سكري، ضغط دم مرتفع...'
                }
                className="w-full p-2 rounded-lg border border-rose-200 bg-white text-xs font-bold outline-none"
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-rose-900 block mb-1">ملاحظات مختصرة</label>
              <input
                type="text"
                value={alertNotes}
                onChange={(e) => setAlertNotes(e.target.value)}
                placeholder="توجيه للطبيب أو الصيدلي..."
                className="w-full p-2 rounded-lg border border-rose-200 bg-white text-xs font-bold outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowQuickAddAlert(false)}
                className="px-2.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingAlert}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                {savingAlert ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                حفظ
              </button>
            </div>
          </form>
        )}

        {/* Compact Card Body */}
        {loading || !profile ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2.5">
            <Loader2 size={30} className="animate-spin text-primary-600" />
            <p className="text-xs font-bold text-slate-500">جاري تحميل بطاقة المريض...</p>
          </div>
        ) : (
          <div className="p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
            {/* Strip 1: Social Eligibility + Allergy/Chronic Alerts in Compact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Social & Billing Eligibility */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  profile.billingEligibility.status === 'FREE_SOCIAL'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                    : profile.billingEligibility.status === 'FUNDED'
                    ? 'bg-teal-50/80 border-teal-200 text-teal-950'
                    : profile.billingEligibility.status === 'SUBSIDIZED_PENSION'
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                    <CreditCard size={13} />
                    <span>الاستحقاق الاجتماعي والمالي</span>
                  </div>
                  <h4 className="text-sm font-black mt-0.5 truncate">
                    {profile.billingEligibility.label}
                  </h4>
                  <p className="text-[11px] opacity-80 line-clamp-1 mt-0.5">
                    {profile.billingEligibility.reason}
                  </p>
                </div>
                {profile.billingEligibility.discountPercent > 0 && (
                  <div className="text-left shrink-0 font-mono tabular-nums bg-white/70 px-2.5 py-1 rounded-lg border border-black/5">
                    <span className="text-[10px] font-bold block opacity-70">تغطية</span>
                    <span className="text-sm font-black">
                      {profile.billingEligibility.discountPercent}%
                    </span>
                  </div>
                )}
              </div>

              {/* Allergy & Chronic Safety Status */}
              <div
                className={`p-3.5 rounded-xl border ${
                  profile.allergies.length > 0
                    ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                    : profile.chronicProblems.length > 0
                    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold opacity-80">
                  <ShieldAlert
                    size={14}
                    className={profile.allergies.length > 0 ? 'text-rose-600' : 'text-amber-600'}
                  />
                  <span>الحساسية والأمراض المزمنة</span>
                </div>
                {profile.allergies.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs font-black text-rose-800 line-clamp-1">
                      حساسية: {profile.allergies.join(' · ')}
                    </p>
                    {profile.chronicProblems.length > 0 && (
                      <p className="text-[11px] font-bold text-rose-700 line-clamp-1">
                        مزمن: {profile.chronicProblems.map((c) => c.name).join('، ')}
                      </p>
                    )}
                  </div>
                ) : profile.chronicProblems.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs font-black text-amber-900 line-clamp-1">
                      مزمن: {profile.chronicProblems.map((c) => c.name).join('، ')}
                    </p>
                    <p className="text-[11px] text-amber-800">لا توجد حساسية دوائية مسجلة</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-1.5">
                    <CheckCircle2 size={14} />
                    <span>لا توجد حساسية أو أمراض مزمنة مسجلة</span>
                  </div>
                )}
              </div>
            </div>

            {/* Strip 2: Compact 3-Column Clinical Summary (Vitals | Labs | Medications) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Vitals */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Activity size={14} className="text-primary-600" />
                    المؤشرات الحيوية
                  </h5>
                  {profile.latestVitals?.date && (
                    <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                      {profile.latestVitals.date}
                    </span>
                  )}
                </div>
                {profile.latestVitals ? (
                  <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">الضغط</span>
                      <span className="font-black text-slate-900">
                        {profile.latestVitals.bp || '---'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">الوزن</span>
                      <span className="font-black text-slate-900">
                        {profile.latestVitals.weight ? `${profile.latestVitals.weight} كجم` : '---'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">النبض/الحرارة</span>
                      <span className="font-bold text-slate-700 text-[11px]">
                        {profile.latestVitals.pulse || '-'} / {profile.latestVitals.temp || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">المصدر</span>
                      <span className="text-[10px] font-sans font-bold text-primary-700">
                        {profile.latestVitals.source}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 py-3 text-center">لا توجد قراءات مسجلة</p>
                )}
              </div>

              {/* Latest Labs */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <FlaskConical size={14} className="text-primary-600" />
                    آخر التحاليل ({profile.latestLabs.length})
                  </h5>
                </div>
                {profile.latestLabs.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {profile.latestLabs.slice(0, 3).map((lab) => (
                      <div
                        key={lab.id}
                        className="flex items-center justify-between text-[11px] border-b border-slate-50 pb-1 last:border-none"
                      >
                        <span className="font-bold text-slate-800 truncate">{lab.testName}</span>
                        <span className="font-mono tabular-nums font-black text-primary-700 shrink-0 mr-1">
                          {lab.result}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 py-3 text-center">لا توجد تحاليل سابقة</p>
                )}
              </div>

              {/* Latest Dispensed Medications */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Pill size={14} className="text-emerald-600" />
                    آخر الأدوية ({profile.latestMedications.length})
                  </h5>
                </div>
                {profile.latestMedications.length > 0 ? (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {profile.latestMedications.slice(0, 3).map((med) => (
                      <div
                        key={med.id}
                        className="text-[11px] border-b border-slate-50 pb-1 last:border-none"
                      >
                        <p className="font-bold text-slate-800 line-clamp-1">{med.summary}</p>
                        <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {med.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 py-3 text-center">لا توجد أدوية منصرفة</p>
                )}
              </div>
            </div>

            {/* Strip 3: Compact Due Follow-ups & Family Alerts */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <CalendarCheck size={15} className="text-primary-600" />
                  المتابعات المستحقة وتنبيهات الأسرة
                </h5>
                <button
                  type="button"
                  onClick={() =>
                    setBookingContext({
                      patient,
                      reason: 'كشف ومتابعة من بطاقة المريض'
                    })
                  }
                  className="px-2.5 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  + حجز عيادة للمريض
                </button>
              </div>

              {profile.dueFollowups.length > 0 ? (
                <div className="space-y-2">
                  {profile.dueFollowups.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{sug.title}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-1">{sug.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setBookingContext({
                            patient,
                            module: sug.module_type,
                            reason: `${sug.title} - ${sug.reason}`
                          })
                        }
                        className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        حجز الآن
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>جميع المتابعات الدورية لهذا المريض مكتملة ومحدثة.</span>
                </div>
              )}

              {(profile.housingRisks.length > 0 || profile.familyOtherMembersDue.length > 0) && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {profile.housingRisks.length > 0 && (
                    <div className="text-[11px] text-rose-800 bg-rose-50/60 px-3 py-1.5 rounded-lg border border-rose-200 flex items-center gap-1.5 font-bold">
                      <Home size={13} className="shrink-0" />
                      <span>بيئة السكن: {profile.housingRisks.join(' · ')}</span>
                    </div>
                  )}

                  {profile.familyOtherMembersDue.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <span className="font-black text-slate-800">{item.patientName}</span>
                        <span className="text-slate-500 mx-1">({item.relationship}):</span>
                        <span className="text-primary-700 font-bold">{item.followup.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const famMemberPat = profile.familyFile?.members?.find(
                            (m: any) => m.patient_id === item.patientId
                          )?.patients;
                          if (famMemberPat) {
                            setBookingContext({
                              patient: famMemberPat,
                              module: item.followup.module_type,
                              reason: item.followup.title
                            });
                          }
                        }}
                        className="px-2 py-1 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 rounded-md font-bold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        حجز للفرد
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-modal: Quick Clinic Booking */}
      {bookingContext && (
        <QuickClinicBookingModal
          isOpen={!!bookingContext}
          onClose={() => setBookingContext(null)}
          patient={bookingContext.patient}
          initialModule={bookingContext.module}
          prefilledReason={bookingContext.reason}
          onBookingSuccess={() => {
            setBookingContext(null);
            load360Profile();
            if (onDataUpdated) onDataUpdated();
          }}
        />
      )}

      {/* Sub-modal: Full Comprehensive Family Health Record */}
      {showFullComprehensive && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showFullComprehensive}
          onClose={() => {
            setShowFullComprehensive(false);
            load360Profile();
            if (onDataUpdated) onDataUpdated();
          }}
          patient={patient}
          familyFile={profile?.familyFile || undefined}
          initialModule="history"
        />
      )}
    </div>
  );
};

export default PatientClinical360Modal;
