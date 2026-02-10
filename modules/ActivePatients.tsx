
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { DialysisSession, Patient, Service, Store } from '../types.ts';
import { calculateAge } from '../constants.ts';
import { Loader2, Activity, MapPin, Clock, HeartPulse, Scale, User, FilePlus, X, CheckCircle, Package, ListChecks } from 'lucide-react';

const ActivePatients: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [sess, serv, stor] = await Promise.all([
        DB.getSessions(),
        DB.getServices(),
        DB.getStores()
      ]);
      setActiveSessions(sess?.filter(session => session.status === 'ACTIVE') || []);
      setServices(serv || []);
      setStores(stor || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForReport) return;
    const target = e.target as any;

    try {
      await DB.addSession({
        patient_id: selectedSessionForReport.patient_id,
        service_id: selectedService?.id,
        status: 'ACTIVE', 
        date: selectedSessionForReport.date,
        room: selectedSessionForReport.room,
        weight_before: selectedSessionForReport.weight_before,
        blood_pressure: target.bp.value,
        notes: target.notes.value,
        custom_data: customFieldsData
      }, target.storeId.value);

      alert("تم تسجيل التقرير الطبي وخصم المستهلكات بنجاح.");
      setSelectedSessionForReport(null);
      setSelectedService(null);
      setCustomFieldsData({});
      load();
    } catch (e) {
      alert("فشل حفظ التقرير: " + (e as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="font-black text-lg">جاري تحميل قائمة المرضى الحاليين...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeSessions.map(session => (
          <div key={session.id} className="bg-white p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors"></div>
            
            <div className="relative z-10 flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-4 border-emerald-100">
                {session.patients?.name?.[0] || '?'}
              </div>
              <div>
                <h4 className="font-black text-xl text-gray-800 leading-tight">{session.patients?.name}</h4>
                <div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">في الجلسة الآن</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-gray-50 p-3 rounded-2xl border">
                <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1"><MapPin size={10}/> الغرفة</div>
                <div className="font-black text-gray-700">{session.room}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border">
                <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1"><Clock size={10}/> البدء</div>
                <div className="font-black text-gray-700">{session.start_time}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <div className="text-[10px] text-emerald-600 font-black mb-1 flex items-center gap-1"><HeartPulse size={10}/> الضغط</div>
                <div className="font-black text-emerald-700">{session.blood_pressure}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                <div className="text-[10px] text-indigo-600 font-black mb-1 flex items-center gap-1"><Scale size={10}/> الوزن قبل</div>
                <div className="font-black text-indigo-700">{session.weight_before} كجم</div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedSessionForReport(session)}
              className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg"
            >
              <FilePlus size={18} /> إضافة تقرير طبي (سجل)
            </button>
          </div>
        ))}
        {activeSessions.length === 0 && (
          <div className="col-span-full py-20 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
            <p className="text-gray-400 font-bold">لا يوجد مرضى في جلسات غسيل حالياً.</p>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedSessionForReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center rounded-t-[3rem] shrink-0">
                 <div>
                    <h3 className="text-xl font-black">إضافة تقرير طبي للجلسة</h3>
                    <p className="text-xs opacity-80 mt-1">{selectedSessionForReport.patients?.name}</p>
                 </div>
                 <button onClick={() => setSelectedSessionForReport(null)}><X size={28} /></button>
              </div>
              <form onSubmit={handleSaveReport} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">نوع الخدمة الطبية</label>
                       <select 
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500"
                        onChange={(e) => {
                          const s = services.find(serv => serv.id === e.target.value);
                          setSelectedService(s || null);
                          setCustomFieldsData({});
                        }}
                       >
                          <option value="">-- اختر من النماذج المعدة --</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">المخزن المراد سحب المستلزمات منه</label>
                       <select name="storeId" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500">
                          {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_main ? '(رئيسي)' : ''}</option>)}
                       </select>
                    </div>
                 </div>

                 {selectedService && selectedService.config?.required_fields && selectedService.config.required_fields.length > 0 && (
                   <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-emerald-700 text-sm flex items-center gap-2"><FilePlus size={16}/> بيانات النموذج الطبي</h4>
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm">
                          <ListChecks size={12}/> {selectedService.config.required_fields.length} حقول مطلوبة
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedService.config.required_fields.map(field => (
                          <div key={field} className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-400 uppercase">{field}</label>
                            <input 
                              required 
                              className="w-full border-2 border-white rounded-xl p-3 bg-white outline-none font-bold"
                              placeholder={field}
                              onChange={(e) => setCustomFieldsData({...customFieldsData, [field]: e.target.value})}
                            />
                          </div>
                        ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">ضغط الدم الحالي</label>
                       <input name="bp" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500" defaultValue={selectedSessionForReport.blood_pressure} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">ملاحظات التمريض</label>
                       <input name="notes" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500" placeholder="مثلاً: المريض مستقر.." />
                    </div>
                 </div>
                 
                 <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                    <CheckCircle size={20} /> تسجيل السجل الطبي وخصم الأصناف
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ActivePatients;
