import React, { useState, useEffect, useMemo } from 'react';
import { AR, calculateAge, BLOOD_TYPES } from '../constants.ts';
import { DB } from '../store.ts';
import PatientTimeline from '../components/PatientTimeline.tsx';
import QuickClinicBookingModal from '../components/QuickClinicBookingModal.tsx';
import PatientClinical360Modal from '../components/PatientClinical360Modal.tsx';
import { HospitalOperationalEngine, PatientOperationalProfile } from '../services/hospitalOperationalEngine.ts';
import {
  classifyAndDeduplicateAppointments,
  isRecordDateInPast
} from '../utils/permissions.ts';
import { resolveBookingVisitAndForm } from '../utils/clinicalBookingRouter.ts';
import { Patient } from '../types.ts';
import {
  UserPlus,
  Search,
  Clock,
  Activity,
  CheckCircle2,
  Loader2,
  X,
  BellRing,
  Users,
  Calendar,
  Stethoscope,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

function getLocalTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface ReceptionProps {
  initialMode?: 'clinics';
}

const ReceptionModule: React.FC<ReceptionProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [clinicAppointments, setClinicAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [physicalExams, setPhysicalExams] = useState<any[]>([]);
  const [fundingEntities, setFundingEntities] = useState<any[]>([]);
  const [patientFor360, setPatientFor360] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showClinicBookingModal, setShowClinicBookingModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, ca, ff, probs, pExams, fe] = await Promise.all([
        DB.getPatients(),
        DB.getClinicAppointments(),
        DB.getFamilyFiles(),
        DB.getPatientProblems(),
        DB.getPhysicalExams(),
        DB.getFundingEntities()
      ]);

      const seenAppIds = new Set<string>();
      const uniqueApps = (ca || []).filter((item: any) => {
        if (!item || !item.id || seenAppIds.has(item.id)) return false;
        seenAppIds.add(item.id);
        return true;
      });

      setPatients(p || []);
      setClinicAppointments(uniqueApps);
      setFamilyFiles(ff || []);
      setProblems(probs || []);
      setPhysicalExams(pExams || []);
      setFundingEntities(fe || []);
    } catch (err) {
      console.error(err);
      setLoadError('تعذر تحميل قوائم الاستقبال. يرجى التحقق من الاتصال وإعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  // خريطة الملف التشغيلي الموحد لكل مريض لظهور الاستحقاق والحساسية والمتابعات فوراً في الاستقبال
  const patientProfilesMap = useMemo(() => {
    const map = new Map<string, PatientOperationalProfile>();
    patients.forEach((p) => {
      const prof = HospitalOperationalEngine.buildPatientOperationalProfile(p, {
        familyFiles,
        problems: problems.filter((pr) => pr.patient_id === p.id),
        physicalExams: physicalExams.filter((ex) => ex.patient_id === p.id),
        fundingEntities
      });
      map.set(p.id, prof);
    });
    return map;
  }, [patients, familyFiles, problems, physicalExams, fundingEntities]);

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      setLoading(true);
      await DB.updateAppointmentStatus(id, status);
      loadData();
    } catch (err) {
      alert('خطأ في تحديث الحالة');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      setLoading(true);
      const newPatient = await DB.addPatient({
        name: target.name.value,
        national_id: target.national_id.value,
        phone: target.phone.value,
        blood_type: target.blood_type.value,
        date_of_birth: target.dob.value,
        address: target.address.value
      });

      setShowQuickAddModal(false);
      setSearchTerm('');
      await loadData();

      if (newPatient) {
        setSelectedPatient(newPatient);
        setShowClinicBookingModal(true);
      }
    } catch (err) {
      alert('خطأ في إضافة المريض الجديد');
    } finally {
      setLoading(false);
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      (p.name || '').includes(searchTerm) ||
      (p.phone || '').includes(searchTerm) ||
      p.national_id?.includes(searchTerm)
  );

  const todayStr = getLocalTodayStr();
  const classifiedAppointments = useMemo(
    () => classifyAndDeduplicateAppointments(clinicAppointments, todayStr),
    [clinicAppointments, todayStr]
  );

  // القائمة النشطة الموحدة للعيادات: تستبعد السجلات المكتملة/الملغاة تماماً وتمنع تكرار نفس المعرف
  const activeClinicsList = classifiedAppointments.allNonCompletedAppointments;
  const waitingClinicsCount = classifiedAppointments.currentWaitingAppointments.length;
  const inClinicCount = classifiedAppointments.currentInProgressAppointments.length;
  const completedTodayCount = classifiedAppointments.completedAppointments.filter(
    (a) => a.date === todayStr
  ).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800 text-sm font-bold">
            <AlertTriangle size={20} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-blue-500 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">إجمالي قائمة العيادات النشطة</p>
            <h3 className="text-2xl font-bold font-mono">{activeClinicsList.length}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-indigo-500 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">بانتظار الكشف (اليوم)</p>
            <h3 className="text-2xl font-bold font-mono">{waitingClinicsCount}</h3>
            {classifiedAppointments.abandonedOldAppointments.length > 0 && (
              <span className="text-[11px] font-bold text-amber-700 block mt-0.5">
                +{classifiedAppointments.abandonedOldAppointments.length} موعد قديم متروك
              </span>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-500 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">داخل العيادة (اليوم)</p>
            <h3 className="text-2xl font-bold font-mono">{inClinicCount}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-emerald-500 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-gray-500 text-sm">كشوفات مكتملة (اليوم)</p>
            <h3 className="text-2xl font-bold font-mono">{completedTodayCount}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-4 py-2 font-black text-primary-900 border-r-4 border-primary-600 text-sm">
                قائمة انتظار واستقبال العيادات ({activeClinicsList.length})
              </div>

              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setShowClinicBookingModal(true);
                }}
                className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer mr-2"
                title="حجز موعد كشف مع عرض الفترات والمواعيد المتاحة"
              >
                <Stethoscope size={15} />
                <span>حجز كشف جديد</span>
              </button>
            </div>
            <button onClick={loadData} className="p-2 text-primary-600 cursor-pointer" title="تحديث القائمة">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Clock size={20} />}
            </button>
          </div>

          <div className="space-y-3">
            {activeClinicsList.map((app) => {
              const prof = patientProfilesMap.get(app.patient_id);
              const isOldAbandonedAppointment = isRecordDateInPast(app.date, todayStr);
              const pObj = patients.find((pt) => pt.id === app.patient_id) || app.patients;
              const routeInfo = resolveBookingVisitAndForm(app.clinics, pObj, app.notes || app.triggered_by || '');
              return (
                <div
                  key={app.id}
                  className={`bg-white p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md ${
                    isOldAbandonedAppointment
                      ? 'border-amber-300 bg-amber-50/15'
                      : app.status === 'IN_PROGRESS'
                      ? 'border-blue-100 bg-blue-50/20'
                      : 'border-yellow-100 bg-yellow-50/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                      {app.patients?.name?.[0] || 'م'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-gray-800">{app.patients?.name}</h4>
                        {prof?.familyFile && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md text-[10px] font-bold font-mono">
                            {prof.familyFile.file_code || prof.familyFile.family_code}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded-md text-[10px] font-black">
                          {routeInfo.formCodeBadge}: {routeInfo.visitTypeLabel} (ف2ب كود {routeInfo.visitCode})
                        </span>
                        {prof && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              prof.billingEligibility.status === 'FREE_SOCIAL'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : prof.billingEligibility.status === 'FUNDED'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {prof.billingEligibility.badgeText}
                          </span>
                        )}
                        {prof?.hasAllergyAlert && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-[10px] font-black flex items-center gap-1">
                            <ShieldAlert size={11} /> حساسية
                          </span>
                        )}
                        {isOldAbandonedAppointment && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-black flex items-center gap-1">
                            <AlertTriangle size={11} /> موعد قديم متروك ({app.date})
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-indigo-600 flex items-center gap-1 font-bold">
                          <Stethoscope size={12} /> د/ {app.doctors?.name || 'طبيب العيادة'} ({app.clinics?.name || 'العيادة'})
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} /> {app.date ? `${app.date} | ` : ''}
                          {app.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => {
                        const pObj = patients.find((pt) => pt.id === app.patient_id) || app.patients;
                        if (pObj) setPatientFor360(pObj);
                      }}
                      className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Activity size={13} className="text-primary-600" /> بطاقة المريض
                    </button>
                    <div
                      className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                        isOldAbandonedAppointment
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : app.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}
                    >
                      {isOldAbandonedAppointment
                        ? 'موعد قديم متروك'
                        : app.status === 'WAITING'
                        ? 'انتظار الكشف'
                        : 'داخل العيادة'}
                    </div>
                    {app.status === 'WAITING' && !isOldAbandonedAppointment && (
                      <button
                        onClick={() => updateAppointmentStatus(app.id, 'IN_PROGRESS')}
                        className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-primary-700 cursor-pointer"
                      >
                        دخول العيادة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {activeClinicsList.length === 0 && !loading && (
              <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">
                لا توجد مواعيد عيادات نشطة حالياً
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-primary-600" />
              بحث واستقبال مريض بالعيادات
            </h3>

            <div className="relative mb-6">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="ابحث بالاسم، الرقم القومي أو الهاتف..."
                className="w-full pr-10 pl-10 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  title="مسح البحث"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {searchTerm &&
                filteredPatients.length > 0 &&
                filteredPatients.map((p) => {
                  const prof = patientProfilesMap.get(p.id);
                  return (
                    <div
                      key={p.id}
                      className="w-full flex flex-col gap-2 p-3 rounded-xl hover:bg-primary-50/60 border border-slate-100 hover:border-primary-200 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowHistoryModal(true);
                          }}
                          className="text-right hover:text-primary-600 transition-colors cursor-pointer"
                        >
                          <div className="font-bold text-gray-800 group-hover:text-primary-700 flex items-center gap-1.5 flex-wrap">
                            <span>{p.name}</span>
                            <span className="text-primary-500 text-[10px]">
                              ({calculateAge(p.date_of_birth)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{p.phone}</div>
                        </button>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setPatientFor360(p)}
                            title="بطاقة المريض"
                            className="px-2.5 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            بطاقة المريض
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setShowClinicBookingModal(true);
                            }}
                            title="حجز موعد عيادة"
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                          >
                            <Stethoscope size={17} />
                          </button>
                        </div>
                      </div>

                      {/* شريط الاستحقاق الاجتماعي والملف العائلي في نتائج بحث الاستقبال */}
                      {prof && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
                          {prof.familyFile ? (
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold font-mono">
                              ملف: {prof.familyFile.file_code || prof.familyFile.family_code}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-bold">
                              بدون ملف عائلي
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              prof.billingEligibility.status === 'FREE_SOCIAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {prof.billingEligibility.badgeText}
                          </span>
                          {prof.hasAllergyAlert && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-black">
                              حساسية دوائية
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {searchTerm && filteredPatients.length === 0 && (
                <div className="p-6 text-center bg-indigo-50/80 rounded-2xl border-2 border-dashed border-indigo-200 animate-in zoom-in-95 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <p className="text-indigo-900 font-black text-sm">لم يتم العثور على أي مريض</p>
                    <p className="text-xs text-indigo-600/80 font-medium mt-0.5">
                      "{searchTerm}" غير مسجل بقاعدة البيانات
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQuickAddModal(true)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus size={16} /> إضافة مريض جديد بالاسم "{searchTerm}"
                  </button>
                </div>
              )}

              {!searchTerm && (
                <div className="text-center py-10 text-gray-300 italic text-sm">
                  ابدأ بكتابة الاسم أو الهاتف للبحث عن المريض وحجز العيادة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Patient Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={22} /> إضافة مريض جديد وحجز عيادة
              </h3>
              <button onClick={() => setShowQuickAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleQuickAddPatient} className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">الاسم بالكامل</label>
                  <input
                    name="name"
                    defaultValue={
                      !/^\d{14}$/.test(searchTerm.trim()) && !/^01\d{9}$/.test(searchTerm.trim())
                        ? searchTerm.trim()
                        : ''
                    }
                    required
                    placeholder="اسم المريض"
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">الرقم القومي</label>
                  <input
                    name="national_id"
                    defaultValue={/^\d{14}$/.test(searchTerm.trim()) ? searchTerm.trim() : ''}
                    required
                    placeholder="14 رقم"
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">رقم الهاتف</label>
                  <input
                    name="phone"
                    defaultValue={/^01\d{9}$/.test(searchTerm.trim()) ? searchTerm.trim() : ''}
                    required
                    placeholder="01xxxxxxxxx"
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">تاريخ الميلاد</label>
                  <input
                    name="dob"
                    type="date"
                    required
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">فصيلة الدم</label>
                  <select name="blood_type" className="w-full border rounded-xl p-3 bg-gray-50">
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 mr-2">العنوان</label>
                  <input
                    name="address"
                    placeholder="عنوان المريض"
                    className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 items-center mt-4">
                <BellRing size={24} className="text-blue-600" />
                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                  سيتم حفظ ملف المريض وفتح نافذة حجز الموعد بالعيادة المختصة مباشرة.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                حفظ المريض والمتابعة لحجز العيادة
              </button>
            </form>
          </div>
        </div>
      )}

      {showClinicBookingModal && (
        <QuickClinicBookingModal
          isOpen={showClinicBookingModal}
          onClose={() => {
            setShowClinicBookingModal(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
          allPatients={patients}
          onBookingSuccess={() => {
            loadData();
          }}
        />
      )}

      {showHistoryModal && selectedPatient && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <PatientTimeline patient={selectedPatient} onClose={() => setShowHistoryModal(false)} />
          </div>
        </div>
      )}

      {/* بطاقة المريض المدمجة */}
      <PatientClinical360Modal
        isOpen={!!patientFor360}
        onClose={() => setPatientFor360(null)}
        patient={patientFor360}
        onDataUpdated={loadData}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ReceptionModule;
