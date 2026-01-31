
import React, { useEffect, useState } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { Activity, UserPlus, FileText, AlertTriangle, Bell, Info, Loader2 } from 'lucide-react';

const StatCard: React.FC<{ label: string, value: string | number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-r-4 ${color}`}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('border-r-', 'bg-')}`}>
        {icon}
      </div>
    </div>
  </div>
);

const DashboardModule: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patientsCount: 0,
    sessionsToday: 0,
    fundingCount: 0,
    delayedInvoices: '0 ج.م'
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const patients = await DB.getPatients();
        const funding = await DB.getFundingEntities();
        // Here we simulate some stats until full logic is in place
        setStats({
          patientsCount: patients?.length || 0,
          sessionsToday: 12, // Example
          fundingCount: funding?.length || 0,
          delayedInvoices: '1,250 ج.م'
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const chartData = [
    { name: 'السبت', count: 12 },
    { name: 'الأحد', count: 18 },
    { name: 'الاثنين', count: 15 },
    { name: 'الثلاثاء', count: 21 },
    { name: 'الأربعاء', count: 19 },
    { name: 'الخميس', count: 25 },
    { name: 'الجمعة', count: 10 },
  ];

  const financialData = [
    { month: 'يناير', income: 4000, expense: 2400 },
    { month: 'فبراير', income: 3000, expense: 1398 },
    { month: 'مارس', income: 2000, expense: 9800 },
    { month: 'أبريل', income: 2780, expense: 3908 },
    { month: 'مايو', income: 1890, expense: 4800 },
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'نقص في مخزون الفلاتر (أقل من 50 قطعة)', time: 'منذ ساعتين' },
    { id: 2, type: 'info', message: 'تم إصدار رواتب شهر مايو للمراجعة', time: 'منذ 5 ساعات' },
    { id: 3, type: 'error', message: '5 فواتير متأخرة الدفع تتجاوز 30 يوم', time: 'منذ يوم' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <p className="font-bold">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="المرضى النشطين" value={stats.patientsCount} icon={<UserPlus className="text-primary-600" />} color="border-r-primary-500" />
        <StatCard label="جلسات اليوم" value={stats.sessionsToday} icon={<Activity className="text-green-600" />} color="border-r-green-500" />
        <StatCard label="فواتير متأخرة" value={stats.delayedInvoices} icon={<AlertTriangle className="text-red-600" />} color="border-r-red-500" />
        <StatCard label="عقود التأمين" value={stats.fundingCount} icon={<FileText className="text-yellow-600" />} color="border-r-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-primary-600" />
            تحليل الجلسات الأسبوعي
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Activity size={20} className="text-green-600" />
            نظرة مالية عامة
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#10b981" fill="#dcfce7" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Bell size={20} className="text-orange-500" />
          التنبيهات العاجلة
        </h3>
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-start gap-4 p-4 rounded-xl border-r-4 ${
              alert.type === 'warning' ? 'bg-orange-50 border-orange-500 text-orange-800' :
              alert.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
              'bg-blue-50 border-blue-500 text-blue-800'
            }`}>
              {alert.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
              <div className="flex-1">
                <p className="font-bold">{alert.message}</p>
                <p className="text-xs opacity-70 mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
