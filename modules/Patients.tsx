
import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES, calculateAge } from '../constants';
import { DB } from '../store';
import { Patient, FundingEntity, DialysisSession } from '../types';
import { 
  Plus, Search, UserPlus, History, Phone, FileText, Loader2, 
  Calendar as CalendarIcon, X, User, Activity, MapPin, 
  Droplets, CreditCard, ShieldCheck, HeartPulse, Clock
} from 'lucide-react';

interface PatientModuleProps {
  setTab?: (tab: string) => void;
}

const PatientModule: React.FC<PatientModuleProps> = ({ setTab }) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<FundingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSessions, setPatientSessions] = useState<DialysisSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    national_id: '',
    phone: '',
    blood_type: '',
    date_of_birth: '',
    address: '',
    emergency_contact: { name: '', phone: '', relation: '' }
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([DB.getPatients(), DB.getFundingEntities()]);
      setPatients(p || []);
      setFundingEntities(f || []);
    } catch (error: any) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingSessions(true);
    try {
      const sessions = await DB.getPatientSessions(patient.id);
      setPatientSessions(sessions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await DB.addPatient(formData);
      await loadPatients();
      setView('list');
      setFormData({
        name: '',
        national_id: '',
        phone: '',
        blood_type: '',
        date_of_birth: '',
        emergency_contact: { name: '', phone: '', relation: '' }
      });
    } catch (error) {
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.national_id.includes(searchTerm) || p.phone.includes(searchTerm)
  );

  if (view === 'add') {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
           <h3 className="text-2xl font-black text-gray-800">{AR.newPatient}</h3>
           <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>
        <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">{AR.name}</label>
            <input required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" 
              onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">{AR.nationalId}</label>
            <input required maxLength={14} className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-mono"
              onChange={e => setFormData({...formData, national_id: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">{AR.phone}</label>
            <input required placeholder="01xxxxxxxxx" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all"
              onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">تاريخ الميلاد</label>
            <input type="date" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all"
              onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">{AR.bloodType}</label>
            <select className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white outline-none font-bold" 
              onChange={e => setFormData({...formData, blood_type: e.target.value})}>
              <option value="">اختر الفصيلة</option>
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 mr-2">جهة التعاقد</label>
            <select className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white outline-none font-bold" 
              onChange={e => setFormData({...formData, funding_entity_id: e.target.value})}>
              <option value="">خـاص (بدون تعاقد)</option>
              {fundingEntities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 pt-4">
            <h4 className="font-black text-lg mb-4 text-primary-700 flex items-center gap-2"><Phone size={20}/> {AR.emergency}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-primary-50 rounded-3xl border-2 border-dashed border-primary-100">
              <input placeholder="اسم قريب المريض" className="border-2 border-white rounded-xl p-3 bg-white outline-none" 
                onChange={e => setFormData({...formData, emergency_contact: {...formData.emergency_contact!, name: e.target.value}})} />
              <input placeholder="رقم هاتف الطوارئ" className="border-2 border-white rounded-xl p-3 bg-white outline-none" 
                onChange={e => setFormData({...formData, emergency_contact: {...formData.emergency_contact!, phone: e.target.value}})} />
              <input placeholder="صلة القرابة" className="border-2 border-white rounded-xl p-3 bg-white outline-none" 
                onChange={e => setFormData({...formData, emergency_contact: {...formData.emergency_contact!, relation: e.target.value}})} />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-8">
            <button type="button" onClick={() => setView('list')} className="px-10 py-4 bg-gray-100 rounded-2xl font-black text-gray-600 hover:bg-gray-200 transition-colors">
              {AR.cancel}
            </button>
            <button type="submit" className="px-16 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20">
              {AR.save}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو الرقم القومي أو الهاتف..." 
            className="w-full pr-12 pl-4 py-4 border rounded-2xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500 font-bold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadPatients}
            className="p-4 text-gray-500 hover:text-primary-600 bg-white border rounded-2xl shadow-sm transition-all"
            title="تحديث البيانات"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Activity size={20} />}
          </button>
          <button 
            onClick={() => setView('add')}
            className="bg-primary-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-primary-700 transition-all font-black shadow-lg shadow-primary-600/20"
          >
            <UserPlus size={20} />
            {AR.newPatient}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
            <Loader2 className="animate-spin text-primary-600" size={48} />
            <p className="font-black text-lg">جاري تحميل سجلات المرضى...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">المريض</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">العمر</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">البيانات الأساسية</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">جهة التعاقد</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest text-center">العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-primary-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white shadow-sm">
                            {p.name[0]}
                         </div>
                         <div>
                            <div className="font-black text-gray-800 text-lg">{p.name}</div>
                            <div className="text-xs text-primary-500 font-bold">فصيلة: {p.blood_type || '---'}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-primary-700 font-black">
                         <CalendarIcon size={16} className="text-primary-300" />
                         {calculateAge(p.date_of_birth)}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-mono text-gray-600 mb-1">{p.national_id}</div>
                       <div className="text-xs text-gray-400 flex items-center gap-1"><Phone size={12}/> {p.phone}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border uppercase ${p.funding_entity_id ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        {fundingEntities.find(f => f.id === p.funding_entity_id)?.name || 'خـاص'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleOpenProfile(p)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                        >
                          <History size={16} /> السجل
                        </button>
                        <button 
                          onClick={() => handleOpenProfile(p)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100"
                        >
                          <FileText size={16} /> الملف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && !loading && (
                   <tr>
                     <td colSpan={5} className="py-20 text-center text-gray-300 italic">لا يوجد مرضى مطابقين للبحث</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Profile & History Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-primary-600 text-white flex justify-between items-start relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
                <div className="relative z-10 flex items-center gap-6">
                   <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-primary-600 font-black text-4xl shadow-2xl border-4 border-primary-500/50">
                      {selectedPatient.name[0]}
                   </div>
                   <div>
                      <h2 className="text-3xl font-black mb-2">{selectedPatient.name}</h2>
                      <div className="flex flex-wrap gap-4 text-sm opacity-90">
                         <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Activity size={14}/> {calculateAge(selectedPatient.date_of_birth)}</span>
                         <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Droplets size={14}/> {selectedPatient.blood_type}</span>
                         <span className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"><Phone size={14}/> {selectedPatient.phone}</span>
                      </div>
                   </div>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="relative z-10 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X size={32}/></button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   {/* Personal Info Sidebar */}
                   <div className="space-y-6">
                      <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200">
                         <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-200 pb-3">
                            <User size={18} className="text-primary-600"/> البيانات الإدارية
                         </h4>
                         <div className="space-y-4">
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">الرقم القومي</label>
                               <div className="font-mono text-gray-700 font-bold bg-white p-2 rounded-lg border">{selectedPatient.national_id}</div>
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">جهة التعاقد</label>
                               <div className="flex items-center gap-2 text-indigo-700 font-bold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                                  <ShieldCheck size={14}/>
                                  {fundingEntities.find(f => f.id === selectedPatient.funding_entity_id)?.name || 'خـاص / نقدي'}
                               </div>
                            </div>
                            <div>
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">العنوان</label>
                               <div className="text-gray-600 text-sm font-bold bg-white p-2 rounded-lg border flex items-start gap-1">
                                  <MapPin size={14} className="mt-1 shrink-0"/> {selectedPatient.address || 'غير مسجل'}
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-dashed border-rose-200">
                         <h4 className="font-black text-rose-800 mb-4 flex items-center gap-2">
                            <Phone size={18}/> حالات الطوارئ
                         </h4>
                         <div className="bg-white p-4 rounded-2xl border border-rose-100">
                            <div className="font-black text-gray-800">{selectedPatient.emergency_contact?.name || '---'}</div>
                            <div className="text-rose-600 font-bold my-1">{selectedPatient.emergency_contact?.phone || '---'}</div>
                            <div className="text-xs text-gray-400">الصلة: {selectedPatient.emergency_contact?.relation || '---'}</div>
                         </div>
                      </div>
                   </div>

                   {/* Session History Main Area */}
                   <div className="lg:col-span-2 space-y-6">
                      <div className="flex justify-between items-center">
                         <h4 className="text-xl font-black text-gray-800 flex items-center gap-3">
                            <History size={24} className="text-primary-600"/> سجل الجلسات الطبية
                         </h4>
                         <div className="text-xs font-bold text-gray-400">إجمالي الجلسات: {patientSessions.length}</div>
                      </div>

                      {loadingSessions ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50 rounded-[2rem] border-2 border-dashed">
                           <Loader2 className="animate-spin text-primary-600" size={40}/>
                           <p className="font-bold">جاري تحميل التاريخ المرضي...</p>
                        </div>
                      ) : patientSessions.length === 0 ? (
                        <div className="py-20 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed text-gray-400 italic">
                           لم يتم تسجيل أي جلسات سابقة لهذا المريض في النظام
                        </div>
                      ) : (
                        <div className="space-y-4">
                           {patientSessions.map(session => (
                             <div key={session.id} className="p-6 bg-white border-2 border-gray-100 rounded-[2rem] flex flex-wrap justify-between items-center gap-4 hover:border-primary-200 transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className="w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl flex flex-col items-center justify-center border group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                      <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(session.date).toLocaleDateString('ar-EG', {month: 'short'})}</span>
                                      <span className="text-xl font-black leading-none">{new Date(session.date).getDate()}</span>
                                   </div>
                                   <div>
                                      <div className="font-black text-gray-800">غرفة: {session.room} | ماكينة: {session.machine_id || '---'}</div>
                                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                         <Clock size={12}/> {session.start_time} - {session.end_time || '--:--'}
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="flex gap-4">
                                   <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                                      <div className="text-[8px] font-black text-emerald-400 uppercase">الوزن (قبل/بعد)</div>
                                      <div className="font-bold text-emerald-700">{session.weight_before} / {session.weight_after || '--'}</div>
                                   </div>
                                   <div className="text-center px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
                                      <div className="text-[8px] font-black text-indigo-400 uppercase">ضغط الدم</div>
                                      <div className="font-bold text-indigo-700">{session.blood_pressure}</div>
                                   </div>
                                </div>

                                <button className="p-2 text-gray-300 hover:text-primary-600 transition-colors"><FileText size={20}/></button>
                             </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-8 border-t bg-gray-50 shrink-0 flex justify-end gap-3 no-print">
                <button onClick={() => setSelectedPatient(null)} className="px-10 py-4 bg-white border-2 rounded-2xl font-black text-gray-600 hover:bg-gray-100 transition-all active:scale-95 shadow-sm">إغلاق الملف</button>
                <button 
                  onClick={() => {
                    if (setTab) {
                      setTab('reception');
                      setSelectedPatient(null);
                    }
                  }}
                  className="px-10 py-4 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center gap-2 active:scale-95"
                >
                   <HeartPulse size={20}/> تسجيل جلسة حضور
                </button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PatientModule;
