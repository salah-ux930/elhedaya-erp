
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { calculateAge, AR } from '../constants.ts';
import PatientTimeline from '../components/PatientTimeline.tsx';
import { 
  Search, FileText, History, User, Calendar, 
  ArrowRight, Loader2, MapPin, Download,
  Scale, HeartPulse
} from 'lucide-react';

const MedicalRecordsModule: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await DB.getSessions();
      setSessions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = sessions.filter(s => {
    const matchesSearch = s.patients?.name.includes(searchTerm) || s.patients?.national_id?.includes(searchTerm);
    const matchesDate = filterDate ? s.date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  if (selectedPatient) {
    return <PatientTimeline patient={selectedPatient} onClose={() => setSelectedPatient(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الرقم القومي للمريض..." 
              className="w-full pr-12 pl-4 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-56">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-12 pl-4 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button onClick={loadSessions} className="p-4 bg-white text-gray-400 rounded-2xl border hover:text-primary-600 transition-all shadow-sm">
             <History size={20}/>
           </button>
           <button className="flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
             <Download size={18}/> تصدير الأرشيف
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary-600" size={48}/>
            <p className="font-black text-gray-400">جاري استرجاع سجلات المرضى...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">المريض والسجل</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">التاريخ</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">الموقع الطبي</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">المؤشرات الحيوية</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest text-center">الحالة</th>
                  <th className="px-8 py-5 font-black text-gray-400 text-xs uppercase tracking-widest text-left no-print">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-primary-50/20 transition-all group">
                    <td className="px-8 py-6">
                       <button 
                         onClick={() => setSelectedPatient(s.patients)}
                         className="flex items-center gap-4 text-right hover:text-primary-600 transition-colors"
                       >
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-primary-600 font-black border group-hover:bg-white transition-colors shadow-sm">
                            {s.patients?.name?.[0]}
                          </div>
                          <div>
                             <div className="font-black text-gray-800 text-lg leading-tight group-hover:text-primary-600">{s.patients?.name}</div>
                             <div className="text-[10px] text-gray-400 font-mono mt-1">{s.patients?.national_id}</div>
                          </div>
                       </button>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-bold text-gray-600">{s.date}</div>
                       <div className="text-[10px] text-gray-400 font-mono">البدء: {s.start_time}</div>
                       {s.end_time && <div className="text-[10px] text-emerald-500 font-mono">الانتهاء: {s.end_time}</div>}
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-1 text-sm font-black text-gray-500">
                          <MapPin size={14} className="text-gray-300"/>
                          الغرفة {s.room}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <Scale size={14} className="text-indigo-300"/>
                             <span className="text-xs font-black text-indigo-600">ق: {s.weight_before || '--'} | ب: {s.weight_after || '--'} كجم</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <HeartPulse size={14} className="text-rose-300"/>
                             <span className="text-xs font-black text-rose-600">{s.blood_pressure}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${s.status === 'FINISHED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : s.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                         {s.status === 'FINISHED' ? 'مكتملة' : s.status === 'ACTIVE' ? 'قيد المعالجة' : 'انتظار'}
                       </span>
                    </td>
                    <td className="px-8 py-6 text-left no-print">
                       <button className="p-3 bg-white text-gray-400 rounded-xl border group-hover:text-primary-600 group-hover:border-primary-200 transition-all shadow-sm">
                          <FileText size={18}/>
                       </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                       <div className="flex flex-col items-center gap-4 text-gray-300 italic font-black">
                          <Search size={48}/>
                          لا توجد سجلات تطابق معايير البحث
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicalRecordsModule;
