
import React, { useState, useEffect } from 'react';
import { AR, ROOMS } from '../constants';
import { DB } from '../store';
import { DialysisSession, Patient } from '../types';
import { 
  UserPlus, Search, Clock, Activity, ArrowRight, 
  CheckCircle2, AlertCircle, MapPin, Scale, HeartPulse, MoreVertical, Loader2 
} from 'lucide-react';

const ReceptionModule: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await DB.getSessions();
      const p = await DB.getPatients();
      setSessions(s || []);
      setPatients(p || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = (patient: Patient) => {
    setSelectedPatient(patient);
    setShowCheckInModal(true);
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.phone.includes(searchTerm)
  );

  const confirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addSession({
        patientId: selectedPatient?.id,
        status: 'ACTIVE',
        weightBefore: parseFloat(target.weightBefore.value),
        bloodPressure: target.bp.value,
        room: target.room.value,
        startTime: new Date().toTimeString().split(' ')[0]
      });
      setShowCheckInModal(false);
      loadData();
    } catch (err) {
      alert("خطأ في تسجيل الدخول");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-yellow-500 flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><Clock size={24} /></div>
          <div>
            <p className="text-gray-500 text-sm">{AR.waiting}</p>
            <h3 className="text-2xl font-bold">{sessions.filter(s => s.status === 'WAITING').length} مرضى</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-500 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Activity size={24} /></div>
          <div>
            <p className="text-gray-500 text-sm">{AR.inSession}</p>
            <h3 className="text-2xl font-bold">{sessions.filter(s => s.status === 'ACTIVE').length} مريض</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-primary-500 flex items-center gap-4">
          <div className="p-3 bg-primary-50 text-primary-600 rounded-xl"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-gray-500 text-sm">{AR.completed}</p>
            <h3 className="text-2xl font-bold">{sessions.filter(s => s.status === 'FINISHED').length} مرضى</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-800">قائمة الحضور اليومية</h3>
            <button onClick={loadData} className="text-primary-600">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Clock size={20} />}
            </button>
          </div>

          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className={`bg-white p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md ${session.status === 'ACTIVE' ? 'border-green-100 bg-green-50/20' : 'border-gray-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {session.patients?.name?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{session.patients?.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {session.room || 'لم يحدد'}</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> {session.startTime || '--:--'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className={`px-4 py-1.5 rounded-full text-xs font-bold border ${session.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                     {session.status === 'ACTIVE' ? AR.inSession : session.status === 'FINISHED' ? AR.completed : AR.waiting}
                   </div>
                   <button className="p-2 text-gray-400 hover:text-primary-600 bg-gray-50 rounded-lg"><MoreVertical size={18} /></button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && !loading && <div className="text-center py-20 text-gray-300">لا توجد جلسات مسجلة اليوم</div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserPlus size={20} className="text-primary-600" />
              تسجيل حضور مريض
            </h3>
            
            <div className="relative mb-6">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="ابحث بالاسم لتسجيل دخول..." 
                className="w-full pr-10 pl-4 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchTerm && filteredPatients.map(p => (
                <button 
                  key={p.id}
                  onClick={() => handleCheckIn(p)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-primary-50 border border-transparent hover:border-primary-100 transition-all group"
                >
                  <div className="text-right">
                    <div className="font-bold text-gray-700 group-hover:text-primary-700">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.phone}</div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-primary-500" />
                </button>
              ))}
              {!searchTerm && <div className="text-center py-10 text-gray-300 italic text-sm">ابدأ بكتابة الاسم للبحث عن المريض</div>}
            </div>
          </div>
        </div>
      </div>

      {showCheckInModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">تسجيل دخول للجلسة</h3>
                <p className="text-sm opacity-80 mt-1">{selectedPatient.name}</p>
              </div>
              <button onClick={() => setShowCheckInModal(false)} className="hover:opacity-75 transition-opacity">
                <AlertCircle size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={confirmCheckIn} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <Scale size={16} /> {AR.weightBefore} (كجم)
                  </label>
                  <input name="weightBefore" type="number" step="0.1" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="00.0" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                    <HeartPulse size={16} /> {AR.bp}
                  </label>
                  <input name="bp" type="text" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="120/80" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-600">تخصيص الغرفة / الماكينة</label>
                <select name="room" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                  {ROOMS.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowCheckInModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors">إلغاء</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors">
                  تأكيد الحضور وبدء الجلسة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionModule;
