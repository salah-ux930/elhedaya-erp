
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { calculateAge } from '../constants.ts';
import { 
  History, User, Download, 
  Loader2, MapPin, Scale, HeartPulse, Stethoscope, Beaker, Receipt, ArrowRight, X 
} from 'lucide-react';

interface PatientTimelineProps {
  patient: any;
  onClose: () => void;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ patient, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await DB.getPatientHistory(patient.id);
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [patient.id]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 border-b shrink-0">
         <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-primary-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-primary-100">
               {patient.name[0]}
            </div>
            <div>
               <h2 className="text-2xl font-black text-gray-800">{patient.name}</h2>
               <div className="flex items-center gap-4 text-sm text-gray-400 font-bold mt-1">
                  <span className="flex items-center gap-1"><User size={14}/> {calculateAge(patient.date_of_birth)} سنة</span>
                  <span className="flex items-center gap-1 font-mono tracking-tighter"><History size={14}/> {patient.national_id}</span>
               </div>
            </div>
         </div>
         
         <div className="flex gap-3">
            <button className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black hover:bg-gray-50 transition-all flex items-center gap-2">
               <Download size={18}/> طباعة
            </button>
            <button onClick={onClose} className="p-3 bg-gray-100 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all">
               <X size={24}/>
            </button>
         </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 overflow-y-auto p-8 relative">
         {/* Timeline Line */}
         <div className="absolute right-8 md:right-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-primary-200 via-primary-500 to-primary-200 rounded-full opacity-20 hidden md:block"></div>

         <div className="space-y-12">
            {loading ? (
              <div className="py-20 flex flex-col items-center gap-4">
                 <Loader2 className="animate-spin text-primary-600" size={48}/>
                 <p className="font-black text-gray-400">جاري بناء التايم لاين الطبي...</p>
              </div>
            ) : history.length > 0 ? (
              history.map((item, idx) => (
                <div key={item.id} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-10 duration-700`} style={{ animationDelay: `${idx * 100}ms` }}>
                  {/* Content */}
                  <div className="flex-1 w-full">
                     <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all relative group ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                        {/* Floating Type Badge */}
                        <div className={`absolute -top-4 ${idx % 2 === 0 ? 'left-8' : 'right-8'} px-4 py-2 rounded-xl text-[10px] font-black tracking-widest text-white shadow-lg ${
                          item.type === 'SESSION' ? 'bg-primary-600' :
                          item.type === 'LAB' ? 'bg-emerald-600' :
                          item.type === 'APPOINTMENT' ? 'bg-indigo-600' :
                          'bg-amber-600'
                        }`}>
                          {item.type === 'SESSION' ? 'جلسة غسيل كلوي' :
                           item.type === 'LAB' ? 'نتائج مخبرية' :
                           item.type === 'APPOINTMENT' ? 'كشف عيادة' :
                           'فاتورة خدمات'}
                        </div>

                        <div className="flex flex-col gap-4">
                           <div className="flex items-center justify-between">
                              <div className="text-2xl font-black text-primary-600 font-mono italic">{item.date}</div>
                              {item.type === 'SESSION' && <div className="text-xs font-bold text-gray-400">{item.start_time} - {item.end_time || '--:--'}</div>}
                           </div>

                           {item.type === 'SESSION' && (
                             <div className="space-y-4">
                                <div className="p-4 bg-primary-50 rounded-2xl flex justify-around items-center">
                                   <div className="text-center">
                                      <div className="text-[10px] text-gray-400 font-black mb-1">الوزن</div>
                                      <div className="text-lg font-black text-primary-600">{item.weight_before} <span className="text-[10px]">كجم</span></div>
                                   </div>
                                   <div className="w-px h-8 bg-primary-200"></div>
                                   <div className="text-center">
                                      <div className="text-[10px] text-gray-400 font-black mb-1">الضغط</div>
                                      <div className="text-lg font-black text-rose-600">{item.blood_pressure}</div>
                                   </div>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.notes || 'لا توجد ملاحظات سريرية.'}</p>
                             </div>
                           )}

                           {item.type === 'LAB' && (
                             <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Beaker size={20}/></div>
                                   <h4 className="font-black text-gray-800">{item.lab_test_definitions?.name}</h4>
                                </div>
                                <div className="p-4 bg-emerald-50 rounded-2xl">
                                   <div className="flex justify-between items-center">
                                      <span className="text-sm font-black text-emerald-800">النتيجة:</span>
                                      <span className="text-xl font-black text-emerald-600">{item.result}</span>
                                   </div>
                                </div>
                             </div>
                           )}

                           {item.type === 'APPOINTMENT' && (
                             <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Stethoscope size={20}/></div>
                                   <div>
                                      <h4 className="font-black text-gray-800">عيادة {item.clinics?.name}</h4>
                                      <p className="text-xs text-indigo-500 font-bold">بإشراف د/ {item.doctors?.name}</p>
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <div className="p-4 bg-gray-50 rounded-2xl">
                                      <div className="text-[10px] font-black text-gray-400 mb-1">التشخيص:</div>
                                      <p className="text-sm text-gray-700 font-bold">{item.diagnosis || 'قيد الانتظار...'}</p>
                                   </div>
                                   {item.prescription && (
                                     <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                        <div className="text-[10px] font-black text-indigo-400 mb-1">الروشتة:</div>
                                        <p className="text-xs text-indigo-800 leading-relaxed font-bold">{item.prescription}</p>
                                     </div>
                                   )}
                                </div>
                             </div>
                           )}

                           {item.type === 'INVOICE' && (
                             <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                <div className="flex items-center gap-3">
                                   <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Receipt size={20}/></div>
                                   <div className="text-sm font-black text-gray-700">فاتورة خدمات #{item.id.slice(0, 6)}</div>
                                </div>
                                <div className="text-lg font-black text-amber-600">{item.total_amount} <span className="text-[10px]">ج.م</span></div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>

                  {/* Dot */}
                  <div className="w-16 h-16 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center z-10 shadow-xl hidden md:flex shrink-0">
                     <div className="w-4 h-4 rounded-full bg-primary-600 animate-pulse"></div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 hidden md:block"></div>
                </div>
              ))
            ) : (
              <div className="py-40 text-center text-gray-300 italic font-black">
                 <History size={64} className="mx-auto mb-4 opacity-20"/>
                 لم يتم تسجيل أي سجلات طبية لهذا المريض بعد
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default PatientTimeline;
