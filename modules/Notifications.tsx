
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Bell, AlertTriangle, Info, CheckCircle2, Clock, ArrowRight, Loader2 } from 'lucide-react';

const NotificationsModule: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await DB.getNotifications();
    setNotifications(data || []);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
       <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
             <Bell className="text-primary-600" size={32} /> 
             مركز الإشعارات الحية
          </h3>
          <button onClick={loadNotifications} className="text-sm font-bold text-primary-600">تحديث</button>
       </div>

       {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-600" /></div>
       ) : (
         notifications.map(n => (
           <div key={n.id} className={`p-6 rounded-3xl border-2 mb-4 flex items-start gap-4 transition-all bg-white hover:border-primary-200 shadow-sm`}>
              <div className={`p-4 rounded-2xl ${n.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {n.type === 'error' ? <AlertTriangle size={24}/> : <Info size={24}/>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{n.category}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-bold"><Clock size={10} /> {new Date(n.created_at).toLocaleTimeString()}</span>
                </div>
                <h4 className="font-black text-gray-800 text-lg">{n.title}</h4>
                <p className="text-sm text-gray-500 font-bold leading-relaxed">{n.message}</p>
              </div>
           </div>
         ))
       )}
       
       {!loading && notifications.length === 0 && (
         <div className="text-center py-20 text-gray-300 italic font-bold">لا توجد إشعارات جديدة</div>
       )}
    </div>
  );
};

export default NotificationsModule;
