
import React, { useEffect, useState } from 'react';
import { DB } from '../store.ts';
import { 
  Loader2, Package, CreditCard, Activity, Users, TrendingUp, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const QuickStat: React.FC<{ label: string, value: string | number, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
    <div className={`p-4 rounded-2xl ${color}`}>
      <Icon size={28} className="text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-gray-800">{value}</p>
    </div>
  </div>
);

const DashboardModule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patients: 0,
    activeSessions: 0,
    lowStock: 8,
    pendingPayments: 5
  });

  const chartData = [
    { name: 'السبت', value: 12 },
    { name: 'الأحد', value: 18 },
    { name: 'الاثنين', value: 15 },
    { name: 'الثلاثاء', value: 20 },
    { name: 'الأربعاء', value: 17 },
    { name: 'الخميس', value: 14 },
    { name: 'الجمعة', value: 5 },
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const patients = await DB.getPatients();
        const sessions = await DB.getSessions();
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
        <p className="font-bold">جاري تحليل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <QuickStat label="المرضى المسجلين" value={stats.patients} icon={Users} color="bg-blue-600 shadow-blue-200 shadow-lg" />
         <QuickStat label="جلسات جارية" value={stats.activeSessions} icon={Activity} color="bg-emerald-600 shadow-emerald-200 shadow-lg" />
         <QuickStat label="نواقص مخزنية" value={stats.lowStock} icon={Package} color="bg-amber-600 shadow-amber-200 shadow-lg" />
         <QuickStat label="تحصيلات متأخرة" value={stats.pendingPayments} icon={CreditCard} color="bg-rose-600 shadow-rose-200 shadow-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
               <TrendingUp className="text-primary-600" /> إحصائيات الجلسات الأسبوعية
            </h3>
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                     <Tooltip 
                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                        cursor={{fill: '#f8fafc'}}
                     />
                     <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={index === 3 ? '#0284c7' : '#bae6fd'} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
               <BarChart3 className="text-emerald-600" /> توزيع جهات التعاقد
            </h3>
            <div className="flex flex-col items-center justify-center h-80">
               <div className="text-gray-400 italic text-center">
                  (رسم بياني دائري لتوزيع المرضى حسب جهة التعاقد)
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DashboardModule;
