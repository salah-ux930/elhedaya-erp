
import React, { useState, useEffect } from 'react';
import { AR, CLINIC_SPECIALTIES } from '../constants.ts';
import { DB } from '../store.ts';
import { Clinic, Doctor, ClinicAppointment, Patient, FamilyFile } from '../types.ts';
import { 
  Building2, Users, Calendar, Plus, Search, 
  Clock, CheckCircle2, XCircle, MoreVertical, 
  ClipboardList, Stethoscope, Save, UserPlus, Loader2, X, History,
  FolderOpen, MapPin, Phone, FileText, Info, Activity, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { ClinicExaminationModal } from '../components/ClinicExaminationModal.tsx';
import QuickClinicBookingModal from '../components/QuickClinicBookingModal.tsx';
import PatientClinical360Modal from '../components/PatientClinical360Modal.tsx';
import { HospitalOperationalEngine, PatientOperationalProfile } from '../services/hospitalOperationalEngine.ts';
import { evaluateClinicalModuleEligibility } from '../services/followupSuggestions.ts';

function getLocalTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getLocalTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function mapClinicToEligibilityModule(clinic?: Clinic | null): 'child' | 'maternal' | 'family_planning' | 'geriatric' | 'premarital' | null {
  if (!clinic) return null;
  const text = `${clinic.name || ''} ${clinic.specialty || ''}`;
  if (/تنظيم الأسرة/.test(text)) return 'family_planning';
  if (/حوامل|الأمومة|متابعة الحمل/.test(text)) return 'maternal';
  if (/أطفال|طفل/.test(text)) return 'child';
  if (/مسنين|شيخوخة/.test(text)) return 'geriatric';
  if (/راغبي الزواج|ما قبل الزواج/.test(text)) return 'premarital';
  return null;
}

const ClinicsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'doctors' | 'clinics' | 'clinic_history'>('appointments');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [physicalExams, setPhysicalExams] = useState<any[]>([]);
  const [patientFor360, setPatientFor360] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, d, a, p, ff, probs, pExams] = await Promise.all([
        DB.getClinics(),
        DB.getDoctors(),
        DB.getClinicAppointments(),
        DB.getPatients(),
        DB.getFamilyFiles(),
        DB.getPatientProblems(),
        DB.getPhysicalExams()
      ]);
      setClinics(c || []);
      setDoctors(d || []);
      // Deduplicate appointments by id
      const seenIds = new Set<string>();
      const uniqueApps = (a || []).filter((item: any) => {
        if (!item || !item.id || seenIds.has(item.id)) return false;
        seenIds.add(item.id);
        return true;
      });
      setAppointments(uniqueApps);
      setPatients(p || []);
      setFamilyFiles(ff || []);
      setProblems(probs || []);
      setPhysicalExams(pExams || []);
    } catch (err) {
      console.error(err);
      setLoadError('تعذر تحميل بيانات العيادات والمواعيد. يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  const patientProfilesMap = React.useMemo(() => {
    const map = new Map<string, PatientOperationalProfile>();
    patients.forEach(p => {
      map.set(
        p.id,
        HospitalOperationalEngine.buildPatientOperationalProfile(p, {
          familyFiles,
          problems: problems.filter(pr => pr.patient_id === p.id),
          physicalExams: physicalExams.filter(ex => ex.patient_id === p.id)
        })
      );
    });
    return map;
  }, [patients, familyFiles, problems, physicalExams]);

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addClinic({
        name: target.name.value,
        specialty: target.specialty.value,
        room: target.room.value
      });
      setShowAddClinic(false);
      loadData();
    } catch (err) {
      alert("خطأ في إضافة العيادة");
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addDoctor({
        name: target.name.value,
        specialty: target.specialty.value,
        phone: target.phone.value,
        clinic_id: target.clinic_id.value
      });
      setShowAddDoctor(false);
      loadData();
    } catch (err) {
      alert("خطأ في إضافة الطبيب");
    }
  };

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    const patientId = target.patient_id?.value;
    const clinicId = target.clinic_id?.value;
    const dateVal = target.date?.value;
    const timeVal = target.time?.value;
    const todayStr = getLocalTodayStr();
    const nowHHMM = getLocalTimeHHMM();

    if (!dateVal || dateVal < todayStr || (dateVal === todayStr && timeVal && timeVal < nowHHMM)) {
      alert('لا يمكن حجز موعد معلق في تاريخ أو وقت مضى.');
      return;
    }

    const pt = patients.find(p => p.id === patientId);
    const cl = clinics.find(c => c.id === clinicId);
    const modId = mapClinicToEligibilityModule(cl);
    if (pt && modId) {
      const check = evaluateClinicalModuleEligibility(pt, modId);
      if (!check.eligible) {
        alert(`لا يمكن حجز هذا الموعد: ${check.reason}`);
        return;
      }
    }

    try {
      await DB.addClinicAppointment({
        patient_id: patientId,
        doctor_id: target.doctor_id.value,
        clinic_id: clinicId,
        date: dateVal,
        time: timeVal,
        status: 'WAITING'
      });
      setShowAddAppointment(false);
      loadData();
    } catch (err) {
      alert("خطأ في حجز الموعد");
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await DB.updateAppointmentStatus(id, status);
      loadData();
    } catch (err) {
      alert("خطأ في تحديث الحالة");
    }
  };

  const todayStr = getLocalTodayStr();

  const searchMatchedAppointments = appointments.filter(a => {
    if (!searchTerm.trim()) return true;
    return (
      (a.patients?.name || '').includes(searchTerm) ||
      (a.doctors?.name || '').includes(searchTerm) ||
      (a.clinics?.name || '').includes(searchTerm)
    );
  });

  const activeQueueAppointments = searchMatchedAppointments.filter(
    a => a.status === 'WAITING' || a.status === 'IN_PROGRESS'
  );
  const historyAppointments = searchMatchedAppointments.filter(
    a => a.status === 'COMPLETED' || a.status === 'CANCELLED'
  );

  const filteredAppointments =
    activeTab === 'appointments'
      ? activeQueueAppointments
      : activeTab === 'clinic_history'
        ? historyAppointments
        : searchMatchedAppointments;

  const waitingTodayCount = activeQueueAppointments.filter(a => a.status === 'WAITING' && (!a.date || a.date >= todayStr)).length;
  const pastWaitingCount = activeQueueAppointments.filter(a => a.status === 'WAITING' && a.date && a.date < todayStr).length;
  const inProgressCount = activeQueueAppointments.filter(a => a.status === 'IN_PROGRESS').length;
  const completedCount = historyAppointments.filter(a => a.status === 'COMPLETED').length;

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

      {/* Header Tabs */}
      <div className="flex flex-wrap gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Calendar size={18} /> {AR.appointments} ({activeQueueAppointments.length})
        </button>
        <button 
          onClick={() => setActiveTab('clinic_history')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'clinic_history' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <History size={18} /> أرشيف الكشوفات ({historyAppointments.length})
        </button>
        <button 
          onClick={() => setActiveTab('doctors')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'doctors' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Stethoscope size={18} /> {AR.doctors} ({doctors.length})
        </button>
        <button 
          onClick={() => setActiveTab('clinics')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'clinics' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Building2 size={18} /> {AR.clinics} ({clinics.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100">
             <div className="relative w-full max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="بحث في القائمة..."
                  className="w-full pr-10 pl-4 py-2 bg-gray-50 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 animate-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <button 
               onClick={() => {
                 if (activeTab === 'appointments') setShowAddAppointment(true);
                 if (activeTab === 'doctors') setShowAddDoctor(true);
                 if (activeTab === 'clinics') setShowAddClinic(true);
               }}
               className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-700 shadow-md transition-all whitespace-nowrap"
             >
               <Plus size={18} /> 
               {activeTab === 'appointments' ? AR.newAppointment : activeTab === 'doctors' ? "إضافة طبيب" : activeTab === 'clinics' ? "إضافة عيادة" : "بحث في الأرشيف"}
             </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
            ) : activeTab === 'appointments' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAppointments.map((app: any) => {
                  const prof = patientProfilesMap.get(app.patient_id);
                  const isPastWaiting = app.status === 'WAITING' && app.date && app.date < todayStr;
                  return (
                  <div key={app.id} className={`bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all ${isPastWaiting ? 'border-amber-300 bg-amber-50/10' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold">
                            {app.patients?.name?.[0]}
                         </div>
                         <div>
                            <h4 className="font-bold text-gray-800">{app.patients?.name}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-xs text-gray-400">#{app.id.slice(0, 8)}</span>
                              {prof?.familyFile && (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold font-mono">
                                  {prof.familyFile.file_code}
                                </span>
                              )}
                              {prof?.hasAllergyAlert && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-black flex items-center gap-1">
                                  <ShieldAlert size={11} /> حساسية
                                </span>
                              )}
                              {isPastWaiting && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-black flex items-center gap-1">
                                  <AlertTriangle size={11} /> موعد معلق بتاريخ سابق
                                </span>
                              )}
                            </div>
                         </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        app.status === 'WAITING' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                        app.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        app.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {app.status === 'WAITING' ? 'في الانتظار' : app.status === 'IN_PROGRESS' ? 'قيد الكشف' : app.status === 'COMPLETED' ? 'مكتمل' : 'ملغي'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-6">
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Stethoscope size={14} className="text-primary-500" />
                          <span>د/ {app.doctors?.name} ({app.clinics?.name})</span>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={14} className="text-gray-400" />
                          <span>{app.date} | {app.time}</span>
                       </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                       <button
                         onClick={() => {
                           const pObj = patients.find(p => p.id === app.patient_id) || app.patients;
                           if (pObj) setPatientFor360(pObj);
                         }}
                         className="px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                       >
                         <Activity size={13} className="text-primary-600" /> بطاقة المريض
                       </button>
                       {app.status === 'WAITING' && (
                         <button 
                           onClick={() => updateAppointmentStatus(app.id, 'IN_PROGRESS')}
                           className="flex-1 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                         >
                           دخول للطبيب
                         </button>
                       )}
                       {app.status === 'IN_PROGRESS' && (
                         <button 
                           onClick={() => setSelectedAppointment(app)}
                           className="flex-1 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-lg hover:bg-green-600 hover:text-white transition-all flex items-center justify-center gap-1"
                         >
                           <ClipboardList size={14} /> تسجيل الكشف
                         </button>
                       )}
                       {app.status === 'COMPLETED' && (
                         <div className="flex-1 text-center py-2 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg">
                           تم الكشف بنجاح
                         </div>
                       )}
                    </div>
                  </div>
                )})}
              </div>
            ) : activeTab === 'clinic_history' ? (
              <div className="space-y-4">
                {filteredAppointments.map((app: any) => (
                  <div key={app.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-black text-xl">
                            {app.patients?.name?.[0]}
                         </div>
                         <div>
                            <h4 className="font-black text-gray-800 text-lg">{app.patients?.name}</h4>
                            <div className="flex items-center gap-4 mt-1">
                               <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-500">#{app.id.slice(0, 8)}</span>
                               <span className="text-[10px] font-bold text-primary-600 flex items-center gap-1"><Clock size={10}/> {app.date} | {app.time}</span>
                            </div>
                         </div>
                      </div>
                      <div className="text-left">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${
                          app.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {app.status === 'COMPLETED' ? 'كشف مكتمل' : 'موعد ملغي'}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-2 font-bold">د/ {app.doctors?.name} - {app.clinics?.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <label className="text-[10px] font-black text-gray-400 mb-2 block">التشخيص الطبي</label>
                          <p className="text-sm font-bold text-gray-700 leading-relaxed">{app.diagnosis || 'لا يوجد تفاصيل.'}</p>
                       </div>
                       <div className="p-4 bg-primary-50/30 rounded-2xl border border-primary-100">
                          <label className="text-[10px] font-black text-primary-400 mb-2 block">الروشتة والعلاج</label>
                          <p className="text-sm font-bold text-primary-800 leading-relaxed">{app.prescription || 'لا يوجد علاج مسجل.'}</p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'doctors' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {doctors.filter(d => (d.name || '').includes(searchTerm)).map(doc => (
                   <div key={doc.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                         <Stethoscope size={28} />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-800">{doc.name}</h4>
                         <p className="text-xs text-indigo-600 font-bold mb-1">{doc.specialty}</p>
                         <p className="text-[10px] text-gray-400">العيادة: {(doc as any).clinics?.name || '---'}</p>
                      </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                 {clinics.filter(c => (c.name || '').includes(searchTerm)).map(clinic => (
                   <div key={clinic.id} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                         <Building2 size={28} />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-800">{clinic.name}</h4>
                         <p className="text-xs text-emerald-600 font-bold mb-1">{clinic.specialty}</p>
                         <p className="text-[10px] text-gray-400">غرفة: {clinic.room || '---'}</p>
                      </div>
                   </div>
                 ))}
              </div>
            )}
            {!loading && (activeTab === 'appointments' || activeTab === 'clinic_history') && filteredAppointments.length === 0 && (
              <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">
                لا توجد مواعيد مطابقة للعرض في هذا التبويب
              </div>
            )}
          </div>
        </div>

        {/* Stats / Actions Sidebar */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 rounded-3xl text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 opacity-90">إحصائيات المواعيد</h3>
              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">القائمة الحالية (النشطة)</span>
                    <span className="text-xl font-bold">{activeQueueAppointments.length}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">في الانتظار (اليوم/القادم)</span>
                    <span className="text-xl font-bold text-yellow-300">{waitingTodayCount}</span>
                 </div>
                 {pastWaitingCount > 0 && (
                   <div className="flex justify-between items-center">
                      <span className="text-sm opacity-75">معلقة من تاريخ سابق</span>
                      <span className="text-xl font-bold text-amber-300">{pastWaitingCount}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">قيد الكشف الآن</span>
                    <span className="text-xl font-bold text-sky-200">{inProgressCount}</span>
                 </div>
                 <div className="flex justify-between items-center pt-2 border-t border-white/15">
                    <span className="text-sm opacity-75">الكشوفات المكتملة</span>
                    <span className="text-xl font-bold text-green-300">{completedCount}</span>
                 </div>
              </div>
              <button 
                onClick={() => setActiveTab('appointments')}
                className="w-full mt-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all"
              >
                عرض القائمة النشطة
              </button>
           </div>

           <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                 <Clock size={18} className="text-primary-500" />
                 تنبيهات العيادات
              </h4>
              <div className="space-y-4">
                 <div className="p-3 bg-orange-50 rounded-xl border-r-4 border-orange-400">
                    <p className="text-[10px] font-bold text-orange-800">مريض متأخر</p>
                    <p className="text-[9px] text-orange-600 mt-1">يوجد مريض في الانتظار بالعيادة الباطنة منذ 45 دقيقة.</p>
                 </div>
                 <div className="p-3 bg-blue-50 rounded-xl border-r-4 border-blue-400">
                    <p className="text-[10px] font-bold text-blue-800">تحديث جدول</p>
                    <p className="text-[9px] text-blue-600 mt-1">د/ أحمد علي اعتذر عن عيادة المساء الغد.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modals */}
      {showAddClinic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
             <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">إضافة عيادة جديدة</h3>
                <button onClick={() => setShowAddClinic(false)}><X size={20} /></button>
             </div>
             <form onSubmit={handleAddClinic} className="p-6 space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500">اسم العيادة</label>
                   <input name="name" required className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">التخصص</label>
                   <select name="specialty" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                      {CLINIC_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">رقم الغرفة</label>
                   <input name="room" className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">حفظ العيادة</button>
             </form>
          </div>
        </div>
      )}

      {showAddDoctor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
             <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">إضافة طبيب جديد</h3>
                <button onClick={() => setShowAddDoctor(false)}><X size={20} /></button>
             </div>
             <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500">اسم الطبيب</label>
                   <input name="name" required className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">التخصص</label>
                   <select name="specialty" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                      {CLINIC_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">رقم الهاتف</label>
                   <input name="phone" className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">العيادة التابع لها</label>
                   <select name="clinic_id" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                      {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg">حفظ الطبيب</button>
             </form>
          </div>
        </div>
      )}

      {showAddAppointment && (
        <QuickClinicBookingModal
          isOpen={showAddAppointment}
          onClose={() => setShowAddAppointment(false)}
          allPatients={patients}
          onBookingSuccess={() => {
            loadData();
          }}
        />
      )}

      {selectedAppointment && (
        <ClinicExaminationModal
          isOpen={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          appointment={selectedAppointment}
          onSaved={() => {
            setSelectedAppointment(null);
            loadData();
          }}
        />
      )}

      <PatientClinical360Modal
        isOpen={!!patientFor360}
        onClose={() => setPatientFor360(null)}
        patient={patientFor360}
        onDataUpdated={loadData}
      />

    </div>
  );
};

export default ClinicsModule;
