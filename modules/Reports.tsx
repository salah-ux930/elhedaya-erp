
import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { 
  Loader2, TrendingUp, DollarSign, Activity, Users, 
  BarChart3, PieChart as PieChartIcon, Download, FileText, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, Legend
} from 'recharts';

const ReportsModule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    revenueByDay: [],
    sessionStats: [],
    stockUsage: [],
    totals: { revenue: 0, sessions: 0, patients: 0 }
  });

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [txs, sessions, patients] = await Promise.all([
        DB.getTransactions(),
        DB.getSessions(),
        DB.getPatients()
      ]);
      
      // Process revenue (last 10 days)
      const last10Days = Array.from({length: 10}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const revenueByDay = last10Days.map(date => {
        const dailyTxs = txs.filter(t => t.date === date && t.type === 'INCOME');
        const amount = dailyTxs.reduce((sum, t) => sum + Number(t.amount), 0);
        return { date: date.split('-').slice(1).join('/'), value: amount };
      });

      const sessionStats = [
        { name: 'مكتملة', value: sessions.filter(s => s.status === 'FINISHED').length },
        { name: 'قيد التنفيذ', value: sessions.filter(s => s.status === 'ACTIVE').length },
        { name: 'انتظار', value: sessions.filter(s => s.status === 'WAITING').length }
      ];

      const totalRevenue = txs.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);

      setData({
        revenueByDay,
        sessionStats,
        totals: {
          revenue: totalRevenue,
          sessions: sessions.length,
          patients: patients.length
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-primary-600" size={48}/>
      <p className="font-black text-gray-400">جاري إنشاء التقارير التحليلية...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <BarChart3 className="text-primary-600" size={32}/>
          التقارير التحليلية المتقدمة
        </h2>
        <div className="flex gap-2">
           <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-all">
             <FileText size={18}/> طباعة التقرير الشامل
           </button>
        </div>
      </div>

      {/* Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-50 flex items-center gap-6">
          <div className="p-4 bg-emerald-600 rounded-3xl text-white shadow-lg shadow-emerald-100">
            <DollarSign size={32}/>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase mb-1">إجمالي الإيرادات</p>
            <h4 className="text-3xl font-black text-emerald-700">{data.totals.revenue.toLocaleString()} ج.م</h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-primary-50 flex items-center gap-6">
          <div className="p-4 bg-primary-600 rounded-3xl text-white shadow-lg shadow-primary-100">
            <Activity size={32}/>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase mb-1">إجمالي الجلسات</p>
            <h4 className="text-3xl font-black text-primary-700">{data.totals.sessions} جلسة</h4>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-indigo-50 flex items-center gap-6">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-lg shadow-indigo-100">
            <Users size={32}/>
          </div>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase mb-1">المرضى المسجلين</p>
            <h4 className="text-3xl font-black text-indigo-700">{data.totals.patients} مريض</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-xl font-black mb-6 flex items-center gap-3">
             <TrendingUp className="text-emerald-500" /> تحليل نمو الإيرادات (آخر 10 أيام)
           </h3>
           <div className="h-80">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.revenueByDay}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                 <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                 <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontFamily: 'Cairo'}} />
                 <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={5} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Sessions Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-xl font-black mb-6 flex items-center gap-3">
             <Activity className="text-primary-500" /> الحالة التشغيلية للجلسات
           </h3>
           <div className="h-80 flex flex-col items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data.sessionStats}
                   cx="50%"
                   cy="50%"
                   innerRadius={70}
                   outerRadius={110}
                   paddingAngle={8}
                   dataKey="value"
                 >
                   <Cell fill="#10b981" />
                   <Cell fill="#0ea5e9" />
                   <Cell fill="#f59e0b" />
                 </Pie>
                 <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                 <Legend verticalAlign="bottom" iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
        <h3 className="text-xl font-black mb-8 flex items-center gap-3">
          <Activity size={24} className="text-primary-600"/>
          أداء الأقسام والخدمات
        </h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: 'غسيل كلى', value: 450, growth: 12 },
              { name: 'تحاليل معملية', value: 280, growth: 8 },
              { name: 'صيدلية', value: 390, growth: 15 },
              { name: 'أخرى', value: 120, growth: 5 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 'bold'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                 <Cell fill="#0ea5e9" />
                 <Cell fill="#6366f1" />
                 <Cell fill="#10b981" />
                 <Cell fill="#f59e0b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;
