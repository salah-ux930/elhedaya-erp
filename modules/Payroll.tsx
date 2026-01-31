import React, { useState } from 'react';
import { AR } from '../constants';
import { DB } from '../store';
import { Users, Upload, Download, RotateCcw, Archive, DollarSign, Wallet } from 'lucide-react';

const PayrollModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('payroll');

  const calculateSalary = (empId: string) => {
    const emp = DB.employees.find(e => e.id === empId);
    if (!emp) return 0;
    const shiftCount = DB.shifts
      .filter(s => s.employeeId === empId)
      .reduce((acc, curr) => acc + curr.count, 0);
    return shiftCount * emp.shiftPrice;
  };

  const totalMonthlyPayroll = DB.employees.reduce((acc, emp) => acc + calculateSalary(emp.id), 0);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('payroll')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'payroll' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {AR.payroll}
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          className={`px-6 py-2 rounded-lg font-bold transition-all ${activeTab === 'employees' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {AR.employees}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users /></div>
            <div>
              <div className="text-sm text-gray-500">عدد الموظفين</div>
              <div className="text-2xl font-bold">{DB.employees.length}</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl"><DollarSign /></div>
            <div>
              <div className="text-sm text-gray-500">إجمالي رواتب الشهر</div>
              <div className="text-2xl font-bold">{totalMonthlyPayroll.toLocaleString()} ج.م</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-r-4 border-purple-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Archive /></div>
            <div>
              <div className="text-sm text-gray-500">الحالة</div>
              <div className="text-lg font-bold">قيد المراجعة</div>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b flex flex-wrap justify-between items-center gap-4">
            <h3 className="font-bold text-lg">سجل الرواتب - {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if(confirm(AR.confirmation)) DB.resetShifts();
                }}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-100"
              >
                <RotateCcw size={16} /> {AR.resetData}
              </button>
              <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200">
                <Upload size={16} /> {AR.uploadData}
              </button>
              <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-700">
                <Download size={16} /> {AR.export}
              </button>
            </div>
          </div>
          <table className="w-full text-right">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600">كود</th>
                <th className="px-6 py-4 font-bold text-gray-600">الاسم</th>
                <th className="px-6 py-4 font-bold text-gray-600">الحساب البنكي</th>
                <th className="px-6 py-4 font-bold text-gray-600">سعر الشفت</th>
                <th className="px-6 py-4 font-bold text-gray-600">عدد الشفتات</th>
                <th className="px-6 py-4 font-bold text-gray-600">إجمالي المستحق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DB.employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-xs">{emp.code}</td>
                  <td className="px-6 py-4 font-bold">{emp.name}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{emp.bankAccount}</td>
                  <td className="px-6 py-4">{emp.shiftPrice}</td>
                  <td className="px-6 py-4 font-bold text-primary-600">
                    {DB.shifts.filter(s => s.employeeId === emp.id).reduce((a, b) => a + b.count, 0)}
                  </td>
                  <td className="px-6 py-4 font-bold">{calculateSalary(emp.id).toLocaleString()} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">بيانات الموظفين الدائمة</h3>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold">+ إضافة موظف</button>
          </div>
          {/* Employee list UI */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {DB.employees.map(emp => (
               <div key={emp.id} className="p-4 border rounded-xl flex items-center gap-4 hover:border-primary-300 transition-colors">
                 <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                   {emp.name[0]}
                 </div>
                 <div>
                   <div className="font-bold">{emp.name}</div>
                   <div className="text-xs text-gray-500">سعر الشفت: {emp.shiftPrice} ج.م</div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;