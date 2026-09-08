
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { calculateAge, AR } from '../constants.ts';
import PatientTimeline from '../components/PatientTimeline.tsx';
import FamilyComprehensiveHealthRecordModal from '../components/FamilyComprehensiveHealthRecordModal.tsx';
import { 
  Search, FileText, History, User, Calendar, 
  ArrowRight, Loader2, MapPin, Download,
  Scale, HeartPulse, Stethoscope, Activity, Users, Shield
} from 'lucide-react';

const MedicalRecordsModule: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  // Modals state
  const [selectedTimelinePatient, setSelectedTimelinePatient] = useState<any | null>(null);
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [comprehensivePatient, setComprehensivePatient] = useState<any | null>(null);
  const [comprehensiveFamilyFile, setComprehensiveFamilyFile] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, filesData] = await Promise.all([
        DB.getSessions(),
        DB.getFamilyFiles()
      ]);
      setSessions(sessionsData || []);
      setFamilyFiles(filesData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenComprehensive = (patient: any) => {
    if (!patient) return;
    const linked = familyFiles.find(ff =>
      ff.members?.some((m: any) => m.patient_id === patient.id || m.patients?.id === patient.id)
    );
    setComprehensivePatient(patient);
    setComprehensiveFamilyFile(linked || null);
    setShowComprehensiveModal(true);
  };

  const filtered = sessions.filter(s => {
    const matchesSearch = s.patients?.name?.includes(searchTerm) || s.patients?.national_id?.includes(searchTerm);
    const matchesDate = filterDate ? s.date === filterDate : true;
    return matchesSearch && matchesDate;
  });

  if (selectedTimelinePatient) {
    return <PatientTimeline patient={selectedTimelinePatient} onClose={() => setSelectedTimelinePatient(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* عنوان وتوصيف الصفحة بوضوح كـ سجل جلسات الغسيل الكلوي لتجنب الخلط */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black">سجل جلسات الغسيل الكلوي</h2>
              <span className="bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-xs px-3 py-1 rounded-full font-bold">
                أرشيف الجلسات والمؤشرات الحيوية
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-1">
              متابعة أوزان وضغط دم وغرف جلسات الغسيل، مع إمكانية الدخول المباشر للملف الصحي الشامل (10 موديولات سريرية) لأي مريض.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button 
            onClick={loadData} 
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center gap-2 text-xs font-bold"
            title="تحديث البيانات"
          >
            <History size={16} /> تحديث
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="بحث بالاسم أو الرقم القومي للمريض..." 
              className="w-full pr-12 pl-4 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-full md:w-56">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="date" 
              className="w-full pr-12 pl-4 py-4 border-2 border-transparent rounded-[1.5rem] outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 bg-white shadow-sm font-bold transition-all text-sm"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary-600" size={48}/>
            <p className="font-black text-gray-400">جاري استرجاع سجلات جلسات الغسيل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">المريض والبيانات</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">تاريخ وتوقيت الجلسة</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">الغرفة والموقع</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs">المؤشرات الحيوية</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs text-center">حالة الجلسة</th>
                  <th className="px-6 py-5 font-black text-gray-400 text-xs text-center no-print">السجلات والملفات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const patient = s.patients;
                  const linkedFile = familyFiles.find(ff => 
                    ff.members?.some((m: any) => m.patient_id === patient?.id || m.patients?.id === patient?.id)
                  );

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3 text-right">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-black border border-indigo-100 shadow-sm shrink-0">
                            {patient?.name?.[0] || 'م'}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenComprehensive(patient)}
                              className="font-black text-slate-900 text-base leading-tight hover:text-indigo-600 transition-colors text-right"
                              title="فتح الملف الصحي الشامل للمريض"
                            >
                              {patient?.name || 'غير معروف'}
                            </button>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>{patient?.national_id || '—'}</span>
                              {linkedFile && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full font-bold border border-emerald-200">
                                  <Users size={10} /> {linkedFile.family_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-gray-700">{s.date}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">البدء: {s.start_time || '—'}</div>
                        {s.end_time && <div className="text-[11px] text-emerald-600 font-mono">الانتهاء: {s.end_time}</div>}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-sm font-black text-gray-700">
                          <MapPin size={14} className="text-indigo-500"/>
                          الغرفة {s.room}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Scale size={14} className="text-indigo-500"/>
                            <span className="text-xs font-black text-indigo-700">قبل: {s.weight_before || '--'} | بعد: {s.weight_after || '--'} كجم</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <HeartPulse size={14} className="text-rose-500"/>
                            <span className="text-xs font-black text-rose-600 font-mono">{s.blood_pressure || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                          s.status === 'FINISHED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : s.status === 'ACTIVE' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {s.status === 'FINISHED' ? 'مكتملة' : s.status === 'ACTIVE' ? 'قيد المعالجة' : 'انتظار'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center no-print">
                        <div className="flex items-center justify-center gap-2">
                          {/* زر الملف الصحي الشامل */}
                          <button
                            onClick={() => handleOpenComprehensive(patient)}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                            title="فتح الملف الصحي الشامل للمريض (10 موديولات سريرية)"
                          >
                            <Stethoscope size={14} />
                            <span>الملف الصحي الشامل</span>
                          </button>

                          {/* زر سجل جلسات الغسيل الكلوي */}
                          <button 
                            onClick={() => setSelectedTimelinePatient(patient)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200"
                            title="عرض المخطط الزمني لجلسات الغسيل للمريض"
                          >
                            <Activity size={14} className="text-primary-600" />
                            <span>سجل الجلسات</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 text-gray-300 italic font-black">
                        <Search size={48}/>
                        لا توجد جلسات تطابق معايير البحث
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال الملف الصحي الشامل للمريض المختار */}
      {showComprehensiveModal && comprehensivePatient && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showComprehensiveModal}
          onClose={() => {
            setShowComprehensiveModal(false);
            setComprehensivePatient(null);
            setComprehensiveFamilyFile(null);
          }}
          patient={comprehensivePatient}
          familyFile={comprehensiveFamilyFile || undefined}
        />
      )}
    </div>
  );
};

export default MedicalRecordsModule;
