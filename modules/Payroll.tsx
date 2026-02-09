
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { Employee, ShiftRecord } from '../types.ts';
import { 
  Users, Upload, Download, RotateCcw, Archive, DollarSign, Wallet, 
  Loader2, Plus, X, Search, Trash2, Edit, CreditCard, UserCheck, ShieldAlert 
} from 'lucide-react';

const PayrollModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('payroll');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empFormData, setEmpFormData] = useState<Partial<Employee>>({
    name: '',
    code: '',
    bank_account: '',
    shift_price: 0,
    type: 'PERMANENT'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([DB.getEmployees(), DB.getShifts()]);
      setEmployees(e || []);
      setShifts(s || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSalary = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return 0;
    const shiftCount = shifts
      .filter(s => s.employee_id === empId)
      .reduce((acc, curr) => acc + curr.count, 0);
    return shiftCount * (emp.shift_price || 0);
  };

  const totalMonthlyPayroll = employees.reduce((acc, emp) => acc + calculateSalary(emp.id), 0);

  const handlePreparePayroll = async () => {
    const confirmed = confirm("هل أنت متأكد من رغبتك في تجهيز المرتبات؟ سيتم ترحيل سجلات هذا الشهر وتصفير العدادات لبدء شهر جديد.");
    if (confirmed) {
      try {
        await DB.resetShifts();
        await loadData();
        alert("تم تجهيز المرتبات بنجاح.");
      } catch (err) {
        alert("حدث خطأ أثناء المعالجة.");
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditingEmpId(null);
    setEmpFormData({ name: '', code: '', bank_account: '', shift_price: 150, type: 'PERMANENT' });
    setShowEmpModal(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpFormData(emp);
    setShowEmpModal(true);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الموظف ${name} نهائياً من النظام؟`)) {
      try {
        await DB.deleteEmployee(id);
        await loadData();
      } catch (err: any) {
        alert(err.message || "فشل الحذف");
      }
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingEmpId) {
        await DB.updateEmployee(editingEmpId, empFormData);
      } else {
        await DB.addEmployee(empFormData);
      }
      setShowEmpModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حفظ بيانات الموظف");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.includes(searchTerm) || e.code.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={40} />
        <p className="font-bold">جاري تحميل بيانات الموارد البشرية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit no-print">
          <button 
            onClick={() => setActiveTab('payroll')}
            className={`px-8 py-2 rounded-lg font-bold transition-all ${activeTab === 'payroll' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {AR.payroll}
          </button>
          <button 
            onClick={() => setActiveTab('employees')}
            className={`px-8 py-2 rounded-lg font-bold transition-all ${activeTab === 'employees' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {AR.employees}
          </button>
        </div>

        {activeTab === 'employees' && (
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="بحث باسم الموظف..." 
              className="w-full pr-10 pl-4 py-2 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-primary-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Users size={28} /></div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">عدد الموظفين</div>
            <div className="text-2xl font-black text-gray-800">{employees.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl"><DollarSign size={28} /></div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">إجمالي رواتب الشهر</div>
            <div className="text-2xl font-black text-emerald-700">{totalMonthlyPayroll.toLocaleString()} ج.م</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-2xl"><Archive size={28} /></div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">حالة المسير</div>
            <div className="text-lg font-black text-indigo-700 uppercase tracking-tighter">جاري العمل</div>
          </div>
        </div>
      </div>

      {activeTab === 'payroll' ? (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          <div className="p-8 border-b flex flex-wrap justify-between items-center gap-4">
            <div>
              <h3 className="font-black text-xl text-gray-800">مسير رواتب الفترة الحالية</h3>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">{new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handlePreparePayroll}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 shadow-xl shadow-primary-600/20 transition-all active:scale-95"
              >
                <RotateCcw size={18} /> {AR.preparePayroll}
              </button>
              <button className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-all">
                <Download size={18} /> {AR.export} PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">كود</th>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">الموظف</th>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest">بيانات التحويل</th>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center">سعر الشفت</th>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center">عدد الشفتات</th>
                  <th className="px-8 py-4 font-black text-gray-400 text-xs uppercase tracking-widest text-center">إجمالي المستحق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs text-gray-400">{emp.code || '---'}</td>
                    <td className="px-8 py-5 font-black text-gray-800">{emp.name}</td>
                    <td className="px-8 py-5 text-xs text-gray-500">
                       <div className="flex items-center gap-1"><Wallet size={12} className="text-gray-300"/> {emp.bank_account || '---'}</div>
                    </td>
                    <td className="px-8 py-5 text-center font-bold text-gray-600">{emp.shift_price} ج.م</td>
                    <td className="px-8 py-5 text-center font-black text-primary-600">
                      {shifts.filter(s => s.employee_id === emp.id).reduce((a, b) => a + b.count, 0)}
                    </td>
                    <td className="px-8 py-5 text-center font-black text-lg text-emerald-700">{calculateSalary(emp.id).toLocaleString()} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 min-h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-black text-xl text-gray-800">سجل الموظفين والكوادر</h3>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">إدارة البيانات الوظيفية والمالية</p>
            </div>
            <button 
              onClick={handleOpenAddModal}
              className="bg-primary-600 text-white px-8 py-4 rounded-2xl text-sm font-black shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center gap-2"
            >
              <Plus size={20} /> إضافة موظف جديد
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredEmployees.map(emp => (
               <div key={emp.id} className="bg-gray-50 p-6 rounded-[2rem] border-2 border-transparent hover:border-primary-200 transition-all cursor-pointer group relative overflow-hidden">
                 <div className="absolute top-4 left-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={(e) => { e.stopPropagation(); handleEditEmployee(emp); }} className="p-2 bg-white text-primary-600 rounded-lg shadow-sm hover:bg-primary-600 hover:text-white transition-all"><Edit size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp.id, emp.name); }} className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                 </div>
                 
                 <div className="flex items-center gap-4 mb-6" onClick={() => handleEditEmployee(emp)}>
                   <div className="w-16 h-16 bg-white text-primary-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border group-hover:bg-primary-600 group-hover:text-white transition-all">
                     {emp.name[0]}
                   </div>
                   <div>
                     <div className="font-black text-gray-800 text-lg leading-none mb-1">{emp.name}</div>
                     <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{emp.type === 'PERMANENT' ? 'موظف دائم' : 'موظف مؤقت'}</div>
                   </div>
                 </div>

                 <div className="space-y-3 pt-4 border-t border-gray-100">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">كود الموظف</span>
                       <span className="font-mono text-sm font-bold text-gray-700">{emp.code || '---'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">سعر الشفت</span>
                       <span className="font-black text-primary-600">{emp.shift_price} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">البنك</span>
                       <span className="text-xs font-bold text-gray-500">{emp.bank_account ? 'مسجل' : 'غير مسجل'}</span>
                    </div>
                 </div>
               </div>
             ))}
             {filteredEmployees.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-300 italic">لا يوجد موظفين مسجلين بهذا الاسم</div>
             )}
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-primary-600 text-white flex justify-between items-center shrink-0">
                <h3 className="text-2xl font-black">{editingEmpId ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</h3>
                <button onClick={() => setShowEmpModal(false)}><X size={32} /></button>
             </div>
             
             <form id="empForm" onSubmit={handleSaveEmployee} className="p-10 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">الاسم بالكامل</label>
                      <input 
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-bold" 
                        value={empFormData.name} 
                        onChange={e => setEmpFormData({...empFormData, name: e.target.value})} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">كود الموظف (الباركود)</label>
                      <input 
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-mono" 
                        value={empFormData.code} 
                        onChange={e => setEmpFormData({...empFormData, code: e.target.value})} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">نوع التوظيف</label>
                      <select 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white outline-none font-bold"
                        value={empFormData.type}
                        onChange={e => setEmpFormData({...empFormData, type: e.target.value as any})}
                      >
                         <option value="PERMANENT">موظف دائم (ثابت)</option>
                         <option value="TEMPORARY">موظف مؤقت (يومية)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">رقم الحساب البنكي / وسيلة الدفع</label>
                      <input 
                        placeholder="EG00 0000 0000 0000..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all" 
                        value={empFormData.bank_account} 
                        onChange={e => setEmpFormData({...empFormData, bank_account: e.target.value})} 
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 mr-2">سعر الشفت / اليومية (ج.م)</label>
                      <input 
                        type="number"
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none transition-all font-black text-primary-600 text-xl" 
                        value={empFormData.shift_price} 
                        onChange={e => setEmpFormData({...empFormData, shift_price: parseFloat(e.target.value)})} 
                      />
                   </div>
                </div>
             </form>

             <div className="p-8 border-t bg-gray-50 flex gap-4 shrink-0">
                <button type="button" onClick={() => setShowEmpModal(false)} className="flex-1 py-5 bg-white border-2 rounded-2xl font-black text-gray-500">إلغاء</button>
                <button 
                  type="submit" 
                  form="empForm" 
                  disabled={submitting}
                  className="flex-[2] py-5 bg-primary-600 text-white rounded-2xl font-black shadow-xl shadow-primary-600/30 hover:bg-primary-700 disabled:opacity-70 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                   {submitting ? <Loader2 className="animate-spin" /> : editingEmpId ? <Edit size={20}/> : <Plus size={20}/>}
                   {submitting ? 'جاري الحفظ...' : 'حفظ بيانات الموظف'}
                </button>
             </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default PayrollModule;
