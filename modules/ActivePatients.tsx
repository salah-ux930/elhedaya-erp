
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { DialysisSession, Patient } from '../types.ts';
import { calculateAge } from '../constants.ts';
import { Loader2, Activity, MapPin, Clock, HeartPulse, Scale, User, FilePlus } from 'lucide-react';

const ActivePatients: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const s = await DB.getSessions();
        setActiveSessions(s?.filter(session => session.status === 'ACTIVE') || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
                <div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                  في الجلسة الآن
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="bg-gray-50 p-3 rounded-2xl border">
                <div className="text-[10px] text-gray-400 font-black uppercase mb-1 flex items-center gap-1">
                  <MapPin size={10}/> الغرفة
                </div>
                <div className="font-black text-gray-700">{session.room}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl border">
                <div className="text-[10px] text-gray-400 font-black uppercase mb-1 flex items-center gap-1">
                  <Clock size={10}/> وقت البدء
                </div>
                <div className="font-black text-gray-700">{session.start_time}</div>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                <div className="text-[10px] text-emerald-600 font-black uppercase mb-1 flex items-center gap-1">
                  <HeartPulse size={10}/> ضغط الدم
                </div>
                <div className="font-black text-emerald-700">{session.blood_pressure}</div>
              </div>
              <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100">
                <div className="text-[10px] text-indigo-600 font-black uppercase mb-1 flex items-center gap-1">
                  <Scale size={10}/> الوزن قبل
                </div>
                <div className="font-black text-indigo-700">{session.weight_before} كجم</div>
              </div>
            </div>

            <button className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
              <FilePlus size={18} /> إضافة تقرير (سجل)
            </button>
          </div>
        ))}

        {activeSessions.length === 0 && (
          <div className="col-span-full py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center gap-4">
            <User size={64} className="text-gray-200" />
            <p className="text-gray-400 font-bold text-lg">لا يوجد مرضى في جلسات غسيل حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivePatients;
