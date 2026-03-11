
import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES, calculateAge, ROOMS } from '../constants.ts';
import { DB } from '../store.ts';
import { Patient, FundingEntity, DialysisSession, Service, Store } from '../types.ts';
import { 
  Plus, Search, UserPlus, History, Phone, FileText, Loader2, 
  Calendar as CalendarIcon, X, User, Activity, MapPin, 
  Droplets, CreditCard, ShieldCheck, HeartPulse, Clock, FilePlus, Scale, CheckCircle, Package, ListChecks
} from 'lucide-react';

const PatientModule: React.FC<{ setTab?: (tab: string) => void }> = ({ setTab }) => {
  const [view, setView] = useState<'list' | 'add' | 'details'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<FundingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<DialysisSession[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, fe] = await Promise.all([DB.getPatients(), DB.getFundingEntities()]);
      setPatients(p || []);
      setFundingEntities(fe || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    
    // التحقق المسبق من رقم الهاتف
    const phone = target.phone.value;
    if (!/^01\d{9}$/.test(phone)) {
      alert("رقم الهاتف غير صحيح! يجب أن يبدأ بـ 01 ويتكون من 11 رقم.");
      return;
    }

    try {
      setLoading(true);
      await DB.addPatient({
        name: target.name.value,
        national_id: target.national_id.value,
        phone: phone,
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
    } catch (err: any) {
      alert(err.message || "خطأ في إضافة المريض");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" placeholder="بحث..." 
                className="w-full pr-10 pl-4 py-3 border rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setView('add')} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-black shadow-lg flex items-center gap-2">
              <UserPlus size={20} /> إضافة مريض
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden min-h-[400px]">
            {loading ? (
               <div className="flex justify-center py-40"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
            ) : (
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-8 py-4 font-black text-xs text-gray-400">الاسم</th>
                    <th className="px-8 py-4 font-black text-xs text-gray-400">الهاتف</th>
                    <th className="px-8 py-4 font-black text-xs text-gray-400">جهة التعاقد</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {patients.filter(p => p.name.includes(searchTerm)).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedPatient(p); setView('details'); }}>
                      <td className="px-8 py-4 font-bold">{p.name}</td>
                      <td className="px-8 py-4 font-mono">{p.phone}</td>
                      <td className="px-8 py-4 text-xs font-bold text-primary-600">
                        {fundingEntities.find(fe => fe.id === p.funding_entity_id)?.name || 'نقدي'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : view === 'add' ? (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black">تسجيل مريض جديد</h3>
            <button onClick={() => setView('list')}><X size={24}/></button>
          </div>
          <form onSubmit={handleAddPatient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="name" required placeholder="الاسم بالكامل" className="p-4 border-2 rounded-2xl outline-none font-bold" />
              <input name="phone" required placeholder="رقم الهاتف (01xxxxxxxxx)" className="p-4 border-2 rounded-2xl outline-none font-bold" />
              <input name="national_id" required placeholder="الرقم القومي" className="p-4 border-2 rounded-2xl outline-none font-mono" />
              <input name="dob" type="date" required className="p-4 border-2 rounded-2xl outline-none" />
              <select name="blood_type" className="p-4 border-2 rounded-2xl outline-none font-bold">
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
              <select name="funding" className="p-4 border-2 rounded-2xl outline-none font-bold">
                <option value="">نقدي (كاش)</option>
                {fundingEntities.map(fe => <option key={fe.id} value={fe.id}>{fe.name}</option>)}
              </select>
            </div>
            
            <div className="bg-indigo-50 p-6 rounded-3xl space-y-4">
              <h4 className="font-black text-indigo-700">جهة اتصال الطوارئ</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="emergency_name" placeholder="الاسم" className="p-3 rounded-xl border-none outline-none shadow-sm" />
                <input name="emergency_phone" placeholder="الهاتف" className="p-3 rounded-xl border-none outline-none shadow-sm" />
                <input name="emergency_relation" placeholder="الصلة" className="p-3 rounded-xl border-none outline-none shadow-sm" />
              </div>
            </div>

            <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black shadow-lg">حفظ البيانات</button>
          </form>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm animate-in fade-in">
           <button onClick={() => setView('list')} className="mb-6 flex items-center gap-2 text-gray-400 font-bold"><X size={20}/> العودة للقائمة</button>
           <h2 className="text-3xl font-black text-gray-800 mb-8">{selectedPatient?.name}</h2>
           {/* تفاصيل المريض تظهر هنا */}
        </div>
      )}
    </div>
  );
};

export default PatientModule;
