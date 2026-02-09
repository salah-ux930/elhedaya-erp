
import React from 'react';
import { Bell, AlertTriangle, Info, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

const NotificationItem: React.FC<{ 
  type: 'error' | 'warning' | 'info' | 'success', 
  title: string, 
  message: string, 
  time: string,
  category: string
}> = ({ type, title, message, time, category }) => {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800 icon-red',
    warning: 'bg-orange-50 border-orange-200 text-orange-800 icon-orange',
    info: 'bg-blue-50 border-blue-200 text-blue-800 icon-blue',
    success: 'bg-green-50 border-green-200 text-green-800 icon-green',
  };

  const icons = {
    error: <AlertTriangle className="text-red-600" size={24} />,
    warning: <AlertTriangle className="text-orange-600" size={24} />,
    info: <Info className="text-blue-600" size={24} />,
    success: <CheckCircle2 className="text-green-600" size={24} />,
  };

  return (
    <div className={`p-5 rounded-2xl border-2 mb-4 flex items-start gap-4 transition-all hover:shadow-md animate-in slide-in-from-right-4 ${styles[type]}`}>
      <div className="p-3 bg-white rounded-xl shadow-sm">
        {icons[type]}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">{category}</span>
          <span className="text-[10px] font-medium flex items-center gap-1 opacity-60"><Clock size={10} /> {time}</span>
        </div>
        <h4 className="font-bold text-lg mb-1">{title}</h4>
        <p className="text-sm opacity-80 leading-relaxed">{message}</p>
      </div>
      <button className="self-center p-2 hover:bg-black/5 rounded-full transition-colors">
        <ArrowRight size={20} />
      </button>
    </div>
  );
};

const NotificationsModule: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
       <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
             <Bell className="text-primary-600" size={32} /> 
             مركز الإشعارات الحية
          </h3>
          <button className="text-sm font-bold text-primary-600 hover:underline">تحديد الكل كمقروء</button>
       </div>

       <NotificationItem 
         type="error"
         category="المخازن"
         title="نقص حاد في رصيد الفلاتر"
         message="رصيد 'فلتر غسيل 1.8' وصل إلى 5 قطع فقط في المخزن الرئيسي. يرجى عمل طلب توريد عاجل."
         time="منذ 10 دقائق"
       />

       <NotificationItem 
         type="warning"
         category="الحسابات"
         title="فواتير بانتظار التحصيل"
         message="يوجد 5 فواتير لم يتم تحصيل قيمتها من جهة تعاقد 'مؤسسة مصر الخير' تجاوزت مدة الاستحقاق."
         time="منذ ساعة"
       />

       <NotificationItem 
         type="success"
         category="الاستقبال"
         title="اكتمال جلسات الفترة الصباحية"
         message="تم إنهاء جميع جلسات الفترة الأولى بنجاح (12 مريض). جميع الغرف جاهزة لاستقبال الفترة الثانية."
         time="منذ ساعتين"
       />
    </div>
  );
};

export default NotificationsModule;
