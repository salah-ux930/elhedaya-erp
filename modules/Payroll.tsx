
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Employee, ShiftRecord } from '../types.ts';
import { 
  Users, Download, RotateCcw, DollarSign, Loader2, Plus, X, 
  Search, Trash2, Edit, FileDown, UploadCloud, CheckCircle, Wallet
} from 'lucide-react';

const PayrollModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('payroll');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
   const [showEmpModal, setShowEmpModal] = useState(false);
   const [showConfirmReset, setShowConfirmReset] = useState(false);
   const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null);
   const [empFormData, setEmpFormData] = useState<Partial<Employee>>({
     name: '', code: '', bank_account: '', shift_price: 150, type: 'PERMANENT', salary_type: 'PER_SHIFT', monthly_salary: 0
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

  const handleResetCycle = async () => {
    setLoading(true);
    try {
      await DB.resetShifts();
      loadData();
    } catch (err: any) {
      alert(err.message || "خطأ أثناء تصفير الدورة.");
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return 0;
    if (emp.salary_type === 'MONTHLY') {
      return emp.monthly_salary || 0;
    }
    const shiftCount = shifts.filter(s => s.employee_id === empId).reduce((a, b) => a + b.count, 0);
    return shiftCount * (emp.shift_price || 0);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-primary-600" size={48}/>
      <p className="font-black text-gray-400">جاري تحميل بيانات الموظفين والرواتب...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-[1.2rem] w-fit">
          <button onClick={() => setActiveTab('payroll')} className={`px-8 py-3 rounded-[1rem] font-black transition-all ${activeTab === 'payroll' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>مسير الرواتب</button>
          <button onClick={() => setActiveTab('employees')} className={`px-8 py-3 rounded-[1rem] font-black transition-all ${activeTab === 'employees' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>إدارة الموظفين</button>
        </div>

        <div className="flex gap-2">
           <button onClick={() => setShowConfirmReset(true)} className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black flex items-center gap-2 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
             <RotateCcw size={18}/> تصفير الدورة المالية
           </button>
           <button onClick={() => { setEmpFormData({ name: '', code: '', bank_account: '', shift_price: 150, type: 'PERMANENT', salary_type: 'PER_SHIFT', monthly_salary: 0 }); setShowEmpModal(true); }} className="bg-primary-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all flex items-center gap-2">
             <Plus size={20}/> إضافة موظف
           </button>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
          <div className="p-8 border-b bg-gray-50/50">
             <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-800">كشف المستحقات المالية - الدورة الحالية</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">إجمالي المستحقات بناءً على الشفتات الموثقة</p>
                </div>
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 flex items-center gap-3">
                   <Wallet size={24}/>
                   <div>
                      <p className="text-[10px] font-black uppercase leading-none">إجمالي الرواتب المستحقة</p>
                      <p className="text-lg font-black">{employees.reduce((sum, emp) => sum + calculateSalary(emp.id), 0).toLocaleString()} ج.م</p>
                   </div>
                </div>
             </div>
          </div>
          <table className="w-full text-right">
             <thead className="bg-gray-50/50 border-b">
                <tr>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest">الموظف</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest">نوع التوظيف</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest text-center">عدد الشفتات</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest text-center">سعر الشفت</th>
                   <th className="px-10 py-5 font-black text-xs text-gray-400 uppercase tracking-widest text-left">صافي المستحق</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-primary-50/20 transition-all group">
                    <td className="px-10 py-6">
                       <div className="font-black text-gray-800 text-lg">{emp.name}</div>
                       <div className="text-[10px] text-gray-400 font-mono">CODE: {emp.code}</div>
                    </td>
                    <td className="px-10 py-6">
                       <span className={`px-3 py-1 rounded-lg text-[10px] font-black border ${emp.type === 'PERMANENT' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {emp.type === 'PERMANENT' ? 'تعيين دائم' : 'تعاقد مؤقت'}
                       </span>
                    </td>
                    <td className="px-10 py-6 text-center">
                       <div className="font-black text-primary-600 text-2xl">
                          {emp.salary_type === 'MONTHLY' ? '---' : shifts.filter(s => s.employee_id === emp.id).reduce((a, b) => a + b.count, 0)}
                       </div>
                    </td>
                    <td className="px-10 py-6 text-center font-bold text-gray-500">
                      {emp.salary_type === 'MONTHLY' ? 'راتب شهري' : `${emp.shift_price} ج.م`}
                    </td>
                    <td className="px-10 py-6 text-left">
                       <div className="font-black text-2xl text-emerald-700">{calculateSalary(emp.id).toLocaleString()} <span className="text-[10px] text-emerald-400">ج.م</span></div>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {employees.map(emp => (
             <div key={emp.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:border-primary-200 transition-all relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-primary-600"></div>
                <div className="flex justify-between items-start mb-6">
                   <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center font-black text-2xl border border-primary-100 shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-all">
                     {emp.name[0]}
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => { setEmpFormData(emp); setShowEmpModal(true); }} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-transparent hover:border-primary-100"><Edit size={16}/></button>
                      <button onClick={() => setShowConfirmDelete(emp.id)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Trash2 size={16}/></button>
                   </div>
                </div>
                <h4 className="font-black text-gray-800 text-xl leading-tight mb-1">{emp.name}</h4>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-4">كود البصمة: {emp.code}</p>
                
                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">طريقة الحساب</p>
                      <p className="font-black text-primary-600">{emp.salary_type === 'MONTHLY' ? `${emp.monthly_salary} ج.م (شهري)` : `${emp.shift_price} ج.م (بالشفت)`}</p>
                   </div>
                   <div className="text-left">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">النوع</p>
                      <p className="font-black text-gray-700 text-xs">{emp.type === 'PERMANENT' ? 'دائم' : 'مؤقت'}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-4">حذف الموظف؟</h3>
            <p className="text-gray-500 font-bold mb-8">هل أنت متأكد من حذف هذا الموظف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmDelete(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all">إلغاء</button>
              <button onClick={async () => { 
                const id = showConfirmDelete;
                setShowConfirmDelete(null); 
                try {
                  await DB.deleteEmployee(id);
                  loadData();
                } catch (err: any) {
                  alert(err.message || "حدث خطأ أثناء الحذف");
                }
              }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmReset && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 text-center">
            <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <RotateCcw size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-4">تصفير الدورة المالية؟</h3>
            <p className="text-gray-500 font-bold mb-8">تنبيه هام: هل أنت متأكد من تصفير كافة الشفتات المسجلة لبدء دورة مالية جديدة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowConfirmReset(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all">إلغاء</button>
              <button onClick={() => { setShowConfirmReset(false); handleResetCycle(); }} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">تأكيد التصفير</button>
            </div>
          </div>
        </div>
      )}

      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-gray-800">بيانات الموظف</h3>
                <button onClick={() => setShowEmpModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={28}/></button>
             </div>
             <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if(empFormData.id) await DB.updateEmployee(empFormData.id, empFormData);
                  else await DB.addEmployee(empFormData);
                  setShowEmpModal(false);
                  loadData();
                } catch (err: any) {
                  alert(err.message || "حدث خطأ أثناء حفظ البيانات");
                }
             }} className="space-y-6">
                <div className="space-y-1">
                   <label className="text-xs font-black text-gray-400 mr-2 uppercase">الاسم الكامل</label>
                   <input required className="w-full border-2 border-gray-100 rounded-2xl p-5 bg-gray-50 outline-none font-black text-gray-700 focus:border-primary-500 focus:bg-white transition-all" value={empFormData.name} onChange={v => setEmpFormData({...empFormData, name: v.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2 uppercase">الكود الوظيفي</label>
                      <input required className="w-full border-2 border-gray-100 rounded-2xl p-5 bg-gray-50 outline-none font-mono font-black text-primary-600 focus:border-primary-500 focus:bg-white transition-all" value={empFormData.code} onChange={v => setEmpFormData({...empFormData, code: v.target.value})} />
                   </div>
                   <div className="space-y-1">
                      <label className="text-xs font-black text-gray-400 mr-2 uppercase">طريقة الحساب</label>
                      <select required className="w-full border-2 border-gray-100 rounded-2xl p-5 bg-gray-50 outline-none font-black text-primary-600 focus:border-primary-500 focus:bg-white transition-all" value={empFormData.salary_type || 'PER_SHIFT'} onChange={v => setEmpFormData({...empFormData, salary_type: v.target.value as any})}>
                        <option value="PER_SHIFT">بالشفت</option>
                        <option value="MONTHLY">راتب شهري</option>
                      </select>
                   </div>
                </div>
                {empFormData.salary_type === 'MONTHLY' ? (
                  <div className="space-y-1">
                     <label className="text-xs font-black text-gray-400 mr-2 uppercase">الراتب الشهري</label>
                     <input required type="number" className="w-full border-2 border-gray-100 rounded-2xl p-5 bg-gray-50 outline-none font-black text-primary-600 focus:border-primary-500 focus:bg-white transition-all" value={empFormData.monthly_salary || 0} onChange={v => setEmpFormData({...empFormData, monthly_salary: parseFloat(v.target.value)})} />
                  </div>
                ) : (
                  <div className="space-y-1">
                     <label className="text-xs font-black text-gray-400 mr-2 uppercase">سعر الشفت</label>
                     <input required type="number" className="w-full border-2 border-gray-100 rounded-2xl p-5 bg-gray-50 outline-none font-black text-primary-600 focus:border-primary-500 focus:bg-white transition-all" value={empFormData.shift_price || 0} onChange={v => setEmpFormData({...empFormData, shift_price: parseFloat(v.target.value)})} />
                  </div>
                )}
                <button type="submit" className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all">
                  {empFormData.id ? 'تحديث البيانات' : 'حفظ موظف جديد'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollModule;
