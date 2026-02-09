
import React, { useEffect, useState } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { 
  Bell, AlertTriangle, Info, CheckCircle2, Clock, 
  ArrowRight, Loader2, Package, CreditCard, Activity, Users
} from 'lucide-react';

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

const QuickStat: React.FC<{ label: string, value: string | number, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
    <div className={`p-3 rounded-xl ${color}`}>
      <Icon size={24} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-bold">{label}</p>
      <p className="text-xl font-black text-gray-800">{value}</p>
    </div>
  </div>
);

const DashboardModule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0,
    activeSessions: 0,
    lowStock: 0,
    pendingPayments: 0
  });

  useEffect(() => {
    async function loadData() {
      try {
        const patients = await DB.getPatients();
        const sessions = await DB.getSessions();
        // محاكاة بيانات
        setStats({
          patients: patients?.length || 0,
          activeSessions: sessions?.filter(s => s.status === 'ACTIVE').length || 0,
          lowStock: 8,
          pendingPayments: 5
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <p className="font-bold">جاري تحديث الإشعارات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Stats Summary */}
      <div className="bg-primary-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-primary-600/20">
         <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
               <h2 className="text-3xl font-black mb-2">مركز الإشعارات الحية</h2>
               <p className="text-primary-100 font-medium">متابعة فورية لجميع أنشطة وحالة المركز الطبي</p>
            </div>
            <div className="flex gap-4">
               <div className="text-center px-6 border-r border-white/20">
                  <div className="text-3xl font-black">24</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">إشعار اليوم</div>
               </div>
               <div className="text-center px-6">
                  <div className="text-3xl font-black text-orange-300">3</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">تنبيهات حرجة</div>
               </div>
            </div>
         </div>
         {/* Decorative Circles */}
         <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
         <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <QuickStat label="إجمالي المرضى" value={stats.patients} icon={Users} color="bg-blue-500" />
         <QuickStat label="جلسات نشطة" value={stats.activeSessions} icon={Activity} color="bg-green-500" />
         <QuickStat label="نواقص المخزن" value={stats.lowStock} icon={Package} color="bg-orange-500" />
         <QuickStat label="فواتير متأخرة" value={stats.pendingPayments} icon={CreditCard} color="bg-red-500" />
      </div>

      {/* Notifications Feed */}
      <div className="space-y-4">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
               <Bell className="text-primary-600" /> 
               آخر التحديثات
            </h3>
            <button className="text-xs font-bold text-primary-600 hover:underline">تحديد الكل كمقروء</button>
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

         <NotificationItem 
           type="info"
           category="المعمل"
           title="نتائج تحاليل جاهزة"
           message="تم رفع نتائج تحاليل مريض 'أحمد محمد علي' من قبل المعمل. يمكن عرضها الآن من ملف المريض."
           time="منذ 3 ساعات"
         />

         <NotificationItem 
           type="info"
           category="الموظفين"
           title="تذكير: تجهيز الرواتب"
           message="باقي 3 أيام على موعد إغلاق سجل الشفتات الشهري وتجهيز كشوف الرواتب."
           time="منذ 5 ساعات"
         />
      </div>

      {/* View More Button */}
      <div className="text-center py-6">
         <button className="px-10 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-all">
            عرض الأرشيف القديم
         </button>
      </div>

    </div>
  );
};

export default DashboardModule;
