
import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { LabTest, Patient } from '../types.ts';
import { FlaskConical, Plus, Search, Calendar, FileText, CheckCircle, X, Loader2, Beaker } from 'lucide-react';

const LabModule: React.FC = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const t = await DB.getLabTests();
      const p = await DB.getPatients();
      setTests(t || []);
      setPatients(p || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addLabTest({
        patientId: target.patientId.value,
        testName: target.testName.value,
        result: target.result.value,
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء حفظ التحليل");
    }
  };

  const filteredTests = tests.filter(t => 
    t.testName.includes(searchTerm) || t.patients?.name.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث باسم التحليل أو المريض..." 
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-md"
        >
          <Plus size={20} /> إضافة نتيجة تحليل
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
            <Loader2 className="animate-spin text-primary-600" size={40} />
            <p className="font-bold">جاري تحميل سجلات المعمل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-600">{AR.date}</th>
                  <th className="px-6 py-4 font-bold text-gray-600">{AR.name}</th>
                  <th className="px-6 py-4 font-bold text-gray-600">{AR.testName}</th>
                  <th className="px-6 py-4 font-bold text-gray-600">{AR.result}</th>
                  <th className="px-6 py-4 font-bold text-gray-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTests.map(test => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 text-sm font-mono flex items-center gap-2">
                      <Calendar size={14} /> {test.date}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{test.patients?.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                        {test.testName}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary-600">{test.result}</td>
                    <td className="px-6 py-4">
                      <button className="text-gray-400 hover:text-primary-600 transition-colors" title="طباعة النتيجة">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-20 text-gray-300 italic">
                      لا توجد نتائج مسجلة مطابقة للبحث
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Beaker size={22} /> تسجيل نتيجة تحليل جديدة
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddTest} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">اختيار المريض</label>
                <select name="patientId" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                  <option value="">اختر مريضاً...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">اسم التحليل</label>
                <input 
                  name="testName" 
                  type="text" 
                  required 
                  placeholder="مثال: وظائف كلى، هيموجلوبين..."
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">النتيجة</label>
                <input 
                  name="result" 
                  type="text" 
                  required 
                  placeholder="أدخل القيمة المقاسة"
                  className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none" 
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600">إلغاء</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors">
                  حفظ النتيجة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabModule;
