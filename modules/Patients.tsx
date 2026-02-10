
import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES, calculateAge, ROOMS } from '../constants.ts';
import { DB } from '../store.ts';
import { Patient, FundingEntity, DialysisSession, Service, Store } from '../types.ts';
import { 
  Plus, Search, UserPlus, History, Phone, FileText, Loader2, 
  Calendar as CalendarIcon, X, User, Activity, MapPin, 
  Droplets, CreditCard, ShieldCheck, HeartPulse, Clock, FilePlus, Scale, CheckCircle, Package, ListChecks
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect.tsx';

interface PatientModuleProps {
  setTab?: (tab: string) => void;
}

const PatientModule: React.FC<PatientModuleProps> = ({ setTab }) => {
  const [view, setView] = useState<'list' | 'add' | 'details'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<FundingEntity[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<DialysisSession[]>([]);
  
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, fe, s, st] = await Promise.all([
        DB.getPatients(),
        DB.getFundingEntities(),
        DB.getServices(),
        DB.getStores()
      ]);
      setPatients(p || []);
      setFundingEntities(fe || []);
      setServices(s || []);
      setStores(st || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientClick = async (patient: Patient) => {
    setSelectedPatient(patient);
    setView('details');
    try {
      const history = await DB.getPatientSessions(patient.id);
      setPatientHistory(history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addPatient({
        name: target.name.value,
        national_id: target.national_id.value,
        phone: target.phone.value,
        blood_type: target.blood_type.value,
        date_of_birth: target.dob.value,
        funding_entity_id: target.funding.value,
        address: target.address.value,
        emergency_contact: {
          name: target.emergency_name.value,
          phone: target.emergency_phone.value,
          relation: target.emergency_relation.value
        }
      });
      alert("تمت إضافة المريض بنجاح");
      setView('list');
      loadData();
    } catch (err) {
      alert("خطأ في إضافة المريض");
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    const target = e.target as any;
    try {
      await DB.addSession({
        patient_id: selectedPatient.id,
        service_id: selectedService?.id,
        date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().split(' ')[0],
        room: target.room.value,
        weight_before: parseFloat(target.weight_before.value),
        blood_pressure: target.bp.value,
        status: 'ACTIVE',
        custom_data: customFieldsData
      }, target.storeId.value);
      
      alert("تم بدء الجلسة وخصم المستهلكات بنجاح.");
      setShowSessionModal(false);
      if (setTab) setTab('activePatients');
    } catch (err) {
      alert("فشل في بدء الجلسة: " + (err as Error).message);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.national_id.includes(searchTerm) || p.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث بالاسم أو الرقم القومي..." 
                className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setView('add')}
              className="bg-primary-600 text-white px-8 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all font-black shadow-lg"
            >
              <UserPlus size={20} /> إضافة مريض جديد
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
                <Loader2 className="animate-spin text-primary-600" size={40} />
                <p className="font-bold">جاري تحميل السجلات...</p>
              </div>
            ) : (
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">المريض</th>
                    <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">الرقم القومي</th>
                    <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">العمر</th>
                    <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">فصيلة الدم</th>
                    <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="hover:bg-primary-50/30 transition-all cursor-pointer group" onClick={() => handlePatientClick(p)}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">{p.name[0]}</div>
                          <div className="font-black text-gray-800">{p.name}</div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-gray-500">{p.national_id}</td>
                      <td className="px-8 py-6 font-bold text-primary-700">{calculateAge(p.date_of_birth)}</td>
                      <td className="px-8 py-6">
                        <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg font-black border border-red-100 text-xs">{p.blood_type}</span>
                      </td>
                      <td className="px-8 py-6">
                        <button className="text-primary-600 hover:bg-primary-600 hover:text-white p-2 rounded-xl transition-all"><History size={18}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {view === 'add' && (
        <div className="bg-white rounded-[3rem] shadow-xl border p-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-gray-800">بيانات المريض الجديد</h3>
              <button onClick={() => setView('list')} className="p-3 bg-gray-100 rounded-2xl"><X size={24}/></button>
           </div>
           <form onSubmit={handleAddPatient} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">الاسم بالكامل</label>
                    <input name="name" required className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">الرقم القومي (14 رقم)</label>
                    <input name="national_id" required className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-mono focus:border-primary-500" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">رقم الهاتف</label>
                    <input name="phone" required className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">تاريخ الميلاد</label>
                    <input name="dob" type="date" required className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">فصيلة الدم</label>
                    <select name="blood_type" className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500">
                       {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 mr-2">جهة التعاقد</label>
                    <select name="funding" className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold focus:border-primary-500">
                       <option value="">دفع نقدي (كاش)</option>
                       {fundingEntities.map(fe => <option key={fe.id} value={fe.id}>{fe.name}</option>)}
                    </select>
                 </div>
              </div>
              
              <div className="space-y-1">
                 <label className="text-xs font-black text-gray-400 mr-2">العنوان السكني</label>
                 <textarea name="address" className="w-full border-2 border-gray-50 rounded-2xl p-4 bg-gray-50 outline-none font-bold h-24 resize-none focus:border-primary-500"></textarea>
              </div>

              <div className="bg-indigo-50 p-8 rounded-3xl border-2 border-indigo-100 space-y-6">
                 <h4 className="font-black text-indigo-700 flex items-center gap-2"><Phone size={18}/> بيانات الاتصال للطوارئ</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <input name="emergency_name" placeholder="اسم جهة الاتصال" className="bg-white rounded-xl p-3 outline-none font-bold" />
                    <input name="emergency_phone" placeholder="رقم الهاتف" className="bg-white rounded-xl p-3 outline-none font-bold" />
                    <input name="emergency_relation" placeholder="صلة القرابة" className="bg-white rounded-xl p-3 outline-none font-bold" />
                 </div>
              </div>

              <div className="flex gap-4">
                 <button type="button" onClick={() => setView('list')} className="flex-1 py-5 bg-gray-100 rounded-2xl font-black text-gray-500">إلغاء</button>
                 <button type="submit" className="flex-[2] py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-200">حفظ بيانات المريض</button>
              </div>
           </form>
        </div>
      )}

      {view === 'details' && selectedPatient && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border">
              <div className="flex items-center gap-6">
                 <div className="w-24 h-24 bg-primary-600 text-white rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-xl border-4 border-white">{selectedPatient.name[0]}</div>
                 <div>
                    <h3 className="text-3xl font-black text-gray-800">{selectedPatient.name}</h3>
                    <div className="flex gap-4 mt-2">
                       <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Droplets size={14} className="text-red-500"/> {selectedPatient.blood_type}</span>
                       <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><User size={14} className="text-primary-600"/> {calculateAge(selectedPatient.date_of_birth)}</span>
                       <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><CreditCard size={14} className="text-emerald-600"/> {fundingEntities.find(fe => fe.id === selectedPatient.funding_entity_id)?.name || 'نقدي'}</span>
                    </div>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setShowSessionModal(true)} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 flex items-center gap-2"><Plus size={20}/> بدء جلسة غسيل</button>
                 <button onClick={() => setView('list')} className="p-4 bg-gray-100 rounded-2xl text-gray-500"><X size={24}/></button>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-sm border p-10">
                 <h4 className="text-xl font-black mb-8 flex items-center gap-2"><History size={24} className="text-primary-600"/> السجل الطبي للجلسات</h4>
                 <div className="space-y-4">
                    {patientHistory.map(session => (
                      <div key={session.id} className="p-6 bg-gray-50 rounded-[2rem] border hover:border-primary-200 transition-all flex justify-between items-center group">
                         <div className="flex items-center gap-6">
                            <div className="text-center bg-white p-3 rounded-2xl border shadow-sm group-hover:bg-primary-50 transition-colors">
                               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(session.date).toLocaleDateString('ar-EG', {month: 'short'})}</div>
                               <div className="text-2xl font-black text-primary-600">{new Date(session.date).getDate()}</div>
                            </div>
                            <div>
                               <div className="font-black text-gray-800 text-lg">جلسة غسيل كلى</div>
                               <div className="text-xs text-gray-400 font-bold flex items-center gap-3 mt-1">
                                  <span className="flex items-center gap-1"><MapPin size={12}/> {session.room}</span>
                                  <span className="flex items-center gap-1"><Clock size={12}/> {session.start_time}</span>
                                  <span className="flex items-center gap-1"><HeartPulse size={12}/> {session.blood_pressure}</span>
                               </div>
                            </div>
                         </div>
                         <button className="p-3 bg-white text-gray-400 rounded-xl hover:text-primary-600 transition-all"><FileText size={20}/></button>
                      </div>
                    ))}
                    {patientHistory.length === 0 && <div className="py-20 text-center text-gray-300 italic">لا يوجد سجل جلسات سابق لهذا المريض</div>}
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <h4 className="text-xl font-black mb-6 flex items-center gap-2"><ShieldCheck size={24}/> بيانات الطوارئ</h4>
                    <div className="space-y-4 relative z-10">
                       <div>
                          <p className="text-indigo-200 text-xs font-black uppercase mb-1">جهة الاتصال</p>
                          <p className="font-bold text-lg">{selectedPatient.emergency_contact?.name || '---'}</p>
                       </div>
                       <div>
                          <p className="text-indigo-200 text-xs font-black uppercase mb-1">رقم الهاتف</p>
                          <p className="font-bold text-lg font-mono">{selectedPatient.emergency_contact?.phone || '---'}</p>
                       </div>
                       <div>
                          <p className="text-indigo-200 text-xs font-black uppercase mb-1">صلة القرابة</p>
                          <p className="font-bold text-lg">{selectedPatient.emergency_contact?.relation || '---'}</p>
                       </div>
                    </div>
                 </div>
                 <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-6">
                    <h4 className="font-black text-gray-800 border-b pb-4">بيانات السكن</h4>
                    <p className="text-gray-500 font-bold leading-relaxed">{selectedPatient.address || 'لا يوجد عنوان مسجل'}</p>
                    <div className="pt-4 border-t">
                       <p className="text-gray-400 text-xs font-black mb-1">رقم هاتف المريض</p>
                       <p className="text-xl font-black text-gray-800 font-mono tracking-tighter">{selectedPatient.phone}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Session Modal */}
      {showSessionModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center rounded-t-[3rem] shrink-0">
                 <div>
                    <h3 className="text-2xl font-black">بدء جلسة غسيل جديدة</h3>
                    <p className="text-xs opacity-80 mt-1 uppercase tracking-widest">{selectedPatient.name}</p>
                 </div>
                 <button onClick={() => setShowSessionModal(false)}><X size={32}/></button>
              </div>
              <form onSubmit={handleAddSession} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">نوع الجلسة / الخدمة</label>
                       <select 
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500"
                        onChange={(e) => {
                          const s = services.find(serv => serv.id === e.target.value);
                          setSelectedService(s || null);
                          setCustomFieldsData({});
                        }}
                       >
                          <option value="">-- اختر نوع الجلسة --</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price} ج.م)</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">المخزن المعتمد للسحب</label>
                       <select name="storeId" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500">
                          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                 </div>

                 {selectedService && selectedService.config?.required_fields && selectedService.config.required_fields.length > 0 && (
                   <div className="p-8 bg-emerald-50 rounded-[2.5rem] border-2 border-dashed border-emerald-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-emerald-700 text-sm flex items-center gap-2"><FilePlus size={18}/> بيانات النموذج الطبي الملحق</h4>
                        <span className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-md">
                          <ListChecks size={14}/> {selectedService.config.required_fields.length} حقول مطلوبة
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {selectedService.config.required_fields.map(field => (
                          <div key={field} className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{field}</label>
                            <input 
                              required 
                              className="w-full border-2 border-white rounded-xl p-3 bg-white outline-none font-bold focus:border-emerald-500 shadow-sm"
                              placeholder={field}
                              onChange={(e) => setCustomFieldsData({...customFieldsData, [field]: e.target.value})}
                            />
                          </div>
                        ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">الغرفة / الماكينة</label>
                       <select name="room" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none">
                          {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">الوزن قبل (كجم)</label>
                       <input name="weight_before" type="number" step="0.1" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-black text-gray-400 mr-2">ضغط الدم</label>
                       <input name="bp" required placeholder="120/80" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-black outline-none" />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                    <CheckCircle size={24}/> تسجيل البيانات وبدء الجلسة
                 </button>
              </form>
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
