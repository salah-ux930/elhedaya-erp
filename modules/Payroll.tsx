
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Employee, ShiftRecord } from '../types.ts';
import { 
  Users, Download, RotateCcw, DollarSign, Loader2, Plus, X, 
  Search, Trash2, Edit, FileDown, UploadCloud, CheckCircle
} from 'lucide-react';

const PayrollModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('payroll');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empFormData, setEmpFormData] = useState<Partial<Employee>>({
    name: '', code: '', bank_account: '', shift_price: 150, type: 'PERMANENT'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([DB.getEmployees(), DB.getShifts()]);
      setEmployees(e || []);
      setShifts(s || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- منطق التصدير والاستيراد ---
  const handleExportTemplate = () => {
    const headers = "الاسم,الكود الوظيفي,رقم الحساب,سعر الشفت,عدد الشفتات المسجلة\n";
    const rows = employees.map(e => `${e.name},${e.code},${e.bank_account || ''},${e.shift_price},""`).join("\n");
    const csvContent = "\uFEFF" + headers + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `حضور_الموظفين_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // تجاهل الرأس
      const updates = lines.map(line => {
        const parts = line.split(",");
        return {
          employee_code: parts[1]?.trim(),
          count: parseFloat(parts[4]?.trim() || "0")
        };
      }).filter(u => u.employee_code && u.count > 0);

      if (updates.length > 0) {
        setLoading(true);
        try {
          await DB.bulkUpdateShifts(updates);
          alert(`تم تحديث شفتات ${updates.length} موظف بنجاح.`);
          loadData();
        } catch (err) { alert("خطأ في قراءة الملف"); } finally { setLoading(false); }
      }
    };
    reader.readAsText(file);
  };

  const calculateSalary = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return 0;
    const shiftCount = shifts.filter(s => s.employee_id === empId).reduce((a, b) => a + b.count, 0);
    return shiftCount * (emp.shift_price || 0);
  };

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button onClick={() => setActiveTab('payroll')} className={`px-8 py-2 rounded-lg font-bold ${activeTab === 'payroll' ? 'bg-white text-primary-600' : 'text-gray-500'}`}>مسير الرواتب</button>
          <button onClick={() => setActiveTab('employees')} className={`px-8 py-2 rounded-lg font-bold ${activeTab === 'employees' ? 'bg-white text-primary-600' : 'text-gray-500'}`}>الموظفين</button>
        </div>

        <div className="flex gap-2">
           <button onClick={handleExportTemplate} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"><FileDown size={18}/> تصدير كشف الحضور</button>
           <label className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer shadow-lg hover:bg-emerald-700">
             <UploadCloud size={18}/> رفع الملف المعبأ
             <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
           </label>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
          <div className="p-8 border-b flex justify-between items-center">
             <div>
                <h3 className="text-xl font-black">كشف المستحقات المالية</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">المبالغ بناءً على شفتات العمل المسجلة</p>
             </div>
             <button onClick={() => { if(confirm('تصفير كافة الشفتات لبدء شهر جديد؟')) DB.resetShifts().then(loadData); }} className="bg-rose-50 text-rose-600 px-5 py-2 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2"><RotateCcw size={14}/> تصفير الدورة</button>
          </div>
          <table className="w-full text-right">
             <thead className="bg-gray-50 border-b">
                <tr>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest">الكود</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest">الموظف</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest text-center">عدد الشفتات</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest text-center">المستحق</th>
                </tr>
             </thead>
             <tbody className="divide-y">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-10 py-6 font-mono font-bold text-gray-400">{emp.code}</td>
                    <td className="px-10 py-6 font-black text-gray-800">{emp.name}</td>
                    <td className="px-10 py-6 text-center font-black text-primary-600 text-lg">
                      {shifts.filter(s => s.employee_id === emp.id).reduce((a, b) => a + b.count, 0)}
                    </td>
                    <td className="px-10 py-6 text-center font-black text-xl text-emerald-700">{calculateSalary(emp.id).toLocaleString()} ج.م</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black">إدارة الكادر البشري</h3>
              <button onClick={() => { setEmpFormData({ name: '', code: '', shift_price: 150 }); setShowEmpModal(true); }} className="bg-primary-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary-600/20"><Plus size={20}/> إضافة موظف</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map(emp => (
                <div key={emp.id} className="bg-gray-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-primary-200 transition-all relative group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center font-black text-2xl text-primary-600 border shadow-sm">{emp.name[0]}</div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                         <button onClick={() => { setEmpFormData(emp); setShowEmpModal(true); }} className="p-2 bg-white text-primary-600 rounded-lg shadow-sm"><Edit size={14}/></button>
                         <button onClick={() => { if(confirm('حذف الموظف؟')) DB.deleteEmployee(emp.id).then(loadData); }} className="p-2 bg-white text-red-600 rounded-lg shadow-sm"><Trash2 size={14}/></button>
                      </div>
                   </div>
                   <div className="font-black text-gray-800 text-lg mb-1">{emp.name}</div>
                   <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">كود: {emp.code}</div>
                   <div className="pt-4 border-t flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-400">سعر الشفت:</span>
                      <span className="font-black text-primary-600">{emp.shift_price} ج.م</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
             <h3 className="text-2xl font-black mb-8">بيانات الموظف</h3>
             <form onSubmit={async (e) => {
                e.preventDefault();
                if(empFormData.id) await DB.updateEmployee(empFormData.id, empFormData);
                else await DB.addEmployee(empFormData);
                setShowEmpModal(false);
                loadData();
             }} className="space-y-6">
                <input required placeholder="الاسم بالكامل" className="w-full border-2 border-gray-100 rounded-2xl p-4 outline-none font-bold" value={empFormData.name} onChange={v => setEmpFormData({...empFormData, name: v.target.value})} />
                <input required placeholder="الكود الوظيفي (يستخدم في الرفع)" className="w-full border-2 border-gray-100 rounded-2xl p-4 outline-none font-mono" value={empFormData.code} onChange={v => setEmpFormData({...empFormData, code: v.target.value})} />
                <input required type="number" placeholder="سعر الشفت" className="w-full border-2 border-gray-100 rounded-2xl p-4 outline-none font-black text-primary-600" value={empFormData.shift_price} onChange={v => setEmpFormData({...empFormData, shift_price: parseFloat(v.target.value)})} />
                <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black text-lg">حفظ البيانات</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;
