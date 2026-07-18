
import React, { useState, useEffect } from 'react';
import { AR, CLINIC_SPECIALTIES } from '../constants.ts';
import { DB } from '../store.ts';
import { Clinic, Doctor, ClinicAppointment, Patient, FamilyFile } from '../types.ts';
import { 
  Building2, Users, Calendar, Plus, Search, 
  Clock, CheckCircle2, XCircle, MoreVertical, 
  ClipboardList, Stethoscope, Save, UserPlus, Loader2, X, History,
  FolderOpen, MapPin, Phone, FileText, Info
} from 'lucide-react';

const ClinicsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'appointments' | 'doctors' | 'clinics' | 'clinic_history'>('appointments');
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const [c, d, a, p] = await Promise.all([
        DB.getClinics(),
        DB.getDoctors(),
        DB.getClinicAppointments(),
        DB.getPatients()
      ]);
      setClinics(c);
      setDoctors(d);
      setAppointments(a);
      setPatients(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    try {
      await DB.addClinicAppointment({
        patient_id: target.patient_id.value,
        doctor_id: target.doctor_id.value,
        clinic_id: target.clinic_id.value,
        date: target.date.value,
        time: target.time.value,
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

  const handleDiagnosisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.updateAppointmentStatus(
        selectedAppointment.id, 
        'COMPLETED', 
        target.diagnosis.value, 
        target.prescription.value
      );
      setSelectedAppointment(null);
      loadData();
    } catch (err) {
      alert("خطأ في حفظ البيانات الطبية");
    }
  };

  const filteredAppointments = appointments.filter(a => {
    const matchesSearch = a.patients?.name.includes(searchTerm) || 
                         a.doctors?.name.includes(searchTerm) ||
                         a.clinics?.name.includes(searchTerm);
    
    if (activeTab === 'appointments') {
      return matchesSearch && (a.status === 'WAITING' || a.status === 'IN_PROGRESS');
    }
    if (activeTab === 'clinic_history') {
      return matchesSearch && (a.status === 'COMPLETED' || a.status === 'CANCELLED');
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Tabs */}
      <div className="flex flex-wrap gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
        <button 
          onClick={() => setActiveTab('appointments')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Calendar size={18} /> {AR.appointments}
        </button>
        <button 
          onClick={() => setActiveTab('clinic_history')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'clinic_history' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <History size={18} /> أرشيف الكشوفات
        </button>
        <button 
          onClick={() => setActiveTab('doctors')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'doctors' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Stethoscope size={18} /> {AR.doctors}
        </button>
        <button 
          onClick={() => setActiveTab('clinics')}
          className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'clinics' ? 'bg-primary-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Building2 size={18} /> {AR.clinics}
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
                {filteredAppointments.map((app: any) => (
                  <div key={app.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-bold">
                            {app.patients?.name?.[0]}
                         </div>
                         <div>
                            <h4 className="font-bold text-gray-800">{app.patients?.name}</h4>
                            <p className="text-xs text-gray-400">#{app.id.slice(0, 8)}</p>
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
                ))}
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
                 {doctors.filter(d => d.name.includes(searchTerm)).map(doc => (
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
                 {clinics.filter(c => c.name.includes(searchTerm)).map(clinic => (
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
            {!loading && appointments.length === 0 && <div className="text-center py-20 text-gray-300">لا توجد بيانات مسجلة</div>}
          </div>
        </div>

        {/* Stats / Actions Sidebar */}
        <div className="space-y-6">
           <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 rounded-3xl text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 opacity-90">إحصائيات اليوم</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">إجمالي المواعيد</span>
                    <span className="text-xl font-bold">{appointments.length}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">في الانتظار</span>
                    <span className="text-xl font-bold text-yellow-300">{appointments.filter(a => a.status === 'WAITING').length}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="text-sm opacity-75">تم الانتهاء</span>
                    <span className="text-xl font-bold text-green-300">{appointments.filter(a => a.status === 'COMPLETED').length}</span>
                 </div>
              </div>
              <button 
                onClick={() => setActiveTab('appointments')}
                className="w-full mt-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all"
              >
                المزيد من التفاصيل
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl animate-in zoom-in-95">
             <div className="p-6 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg">حجز موعد كشف</h3>
                <button onClick={() => setShowAddAppointment(false)}><X size={20} /></button>
             </div>
             <form onSubmit={handleAddAppointment} className="p-8 space-y-4">
                <div>
                   <label className="text-xs font-bold text-gray-500">المريض</label>
                   <select name="patient_id" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500">العيادة</label>
                    <select name="clinic_id" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">الطبيب</label>
                    <select name="doctor_id" className="w-full mt-1 border rounded-xl p-3 bg-gray-50">
                        {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500">التاريخ</label>
                    <input name="date" type="date" required className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">الوقت</label>
                    <input name="time" type="time" required className="w-full mt-1 border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all">تأكيد حجز الموعد</button>
             </form>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
             <div className="p-6 bg-primary-700 text-white flex justify-between items-center rounded-t-2xl">
                <div>
                   <h3 className="font-bold text-xl">تسجيل الكشف الطبي</h3>
                   <p className="text-xs opacity-75 mt-1">{selectedAppointment.patients?.name} | د/ {selectedAppointment.doctors?.name}</p>
                </div>
                <button onClick={() => setSelectedAppointment(null)}><X size={24} /></button>
             </div>
             <form onSubmit={handleDiagnosisSubmit} className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                   <label className="text-sm font-bold text-gray-600">التشخيص (Diagnosis)</label>
                   <textarea name="diagnosis" rows={4} required className="w-full border rounded-xl p-4 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="اكتب التشخيص هنا..."></textarea>
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-bold text-gray-600">العلاج الموصوف (Prescription)</label>
                   <textarea name="prescription" rows={6} className="w-full border rounded-xl p-4 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="الأدوية والجرعات..."></textarea>
                </div>
                <div className="flex gap-4 pt-6 border-t">
                   <button type="button" onClick={() => setSelectedAppointment(null)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600">إلغاء</button>
                   <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                      <Save size={20} /> إنهاء الكشف وحفظ البيانات
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default ClinicsModule;
