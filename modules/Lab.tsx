import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES } from '../constants.ts';
import { DB } from '../store.ts';
import { LabTest, Patient, LabTestDefinition } from '../types.ts';
import { FlaskConical, Plus, Search, Calendar, FileText, CheckCircle, X, Loader2, Beaker, BookOpen, Clock, Lock, UserPlus } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect.tsx';

const LabModule: React.FC = () => {
  const [view, setView] = useState<'results' | 'definitions'>('results');
  const [tests, setTests] = useState<any[]>([]);
  const [definitions, setDefinitions] = useState<LabTestDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDefModal, setShowDefModal] = useState(false);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // State for form controlled components
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedTestDefId, setSelectedTestDefId] = useState('');

  useEffect(() => {
    loadData();
  }, [view]);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await DB.getPatients();
      setPatients(p || []);
      const defs = await DB.getLabDefinitions();
      setDefinitions(defs || []);
      
      if (view === 'results') {
        const t = await DB.getLabTests();
        setTests(t || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedTestDefId) return alert("يرجى اختيار المريض ونوع التحليل");
    try {
      await DB.addLabTest({
        patientId: selectedPatientId,
        testDefinitionId: selectedTestDefId,
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddModal(false);
      setSelectedPatientId('');
      setSelectedTestDefId('');
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء حجز التحليل");
    }
  };

  const handleAddDefinition = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.addLabDefinition({
        name: target.name.value,
        category: target.category.value,
        sampleType: target.sampleType.value,
        normalRangeMale: target.rangeMale.value,
        normalRangeFemale: target.rangeFemale.value,
        normalRangeChild: target.rangeChild.value
      });
      setShowDefModal(false);
      loadData();
    } catch (err) {
      alert("حدث خطأ أثناء حفظ التعريف");
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      const newP = await DB.addPatient({
        name: target.name.value,
        nationalId: target.nationalId.value,
        phone: target.phone.value,
        bloodType: target.bloodType.value,
        dateOfBirth: target.dateOfBirth.value
      });
      setPatients([...patients, newP]);
      setSelectedPatientId(newP.id);
      setShowPatientModal(false);
    } catch (err) {
      alert("خطأ في إضافة المريض");
    }
  };

  const handleUpdateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      await DB.updateLabResult(showResultModal.id, target.result.value);
      setShowResultModal(null);
      loadData();
    } catch (err) {
      alert("خطأ أثناء تحديث النتيجة");
    }
  };

  const calculateAgeStr = (dob?: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `(${age} سنة)`;
  };

  const filteredTests = tests.filter(t => 
    t.lab_test_definitions?.name.includes(searchTerm) || t.patients?.name.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
        <button 
          onClick={() => setView('results')}
          className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${view === 'results' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
        >
          <FlaskConical size={18} /> سجل النتائج
        </button>
        <button 
          onClick={() => setView('definitions')}
          className={`px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${view === 'definitions' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
        >
          <BookOpen size={18} /> قاموس التحاليل
        </button>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={view === 'results' ? "بحث بالمريض أو التحليل..." : "بحث في القاموس..."} 
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {view === 'results' ? (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-md"
          >
            <Plus size={20} /> حجز تحليل لمريض
          </button>
        ) : (
          <button 
            onClick={() => setShowDefModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-md"
          >
            <Plus size={20} /> تعريف تحليل جديد
          </button>
        )}
      </div>

      {view === 'results' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
              <Loader2 className="animate-spin text-primary-600" size={40} />
              <p className="font-bold">جاري تحميل السجلات...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-gray-600">التاريخ</th>
                    <th className="px-6 py-4 font-bold text-gray-600">المريض</th>
                    <th className="px-6 py-4 font-bold text-gray-600">التحليل</th>
                    <th className="px-6 py-4 font-bold text-gray-600">الحالة</th>
                    <th className="px-6 py-4 font-bold text-gray-600">النتيجة</th>
                    <th className="px-6 py-4 font-bold text-gray-600">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTests.map(test => (
                    <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 text-sm font-mono">{test.date}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{test.patients?.name}</div>
                        {/* Fix: Access the dateOfBirth property defined in the Patient interface */}
                        <div className="text-[10px] text-primary-600">{calculateAgeStr(test.patients?.dateOfBirth)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary-700">{test.lab_test_definitions?.name}</div>
                        <div className="text-[10px] text-gray-400">عينة: {test.lab_test_definitions?.sampleType}</div>
                      </td>
                      <td className="px-6 py-4">
                        {test.status === 'PENDING' ? (
                          <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg text-xs font-bold border border-orange-100">
                            <Clock size={12} /> تحت التنفيذ
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-bold border border-green-100">
                            <CheckCircle size={12} /> مكتمل
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {test.status === 'COMPLETED' ? (
                          <div className="flex items-center gap-2">
                             <span className="text-primary-600 text-lg">{test.result}</span>
                             <Lock size={12} className="text-gray-300" />
                          </div>
                        ) : '---'}
                      </td>
                      <td className="px-6 py-4">
                        {test.status === 'PENDING' ? (
                          <button 
                            onClick={() => setShowResultModal(test)}
                            className="bg-primary-50 text-primary-600 px-3 py-1 rounded-lg font-bold text-xs hover:bg-primary-600 hover:text-white transition-all"
                          >
                            إدخال النتيجة
                          </button>
                        ) : (
                          <button className="text-gray-400 hover:text-primary-600 transition-colors">
                            <FileText size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {definitions.filter(d => d.name.includes(searchTerm)).map(def => (
            <div key={def.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-300 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl"><Beaker size={20} /></div>
                <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">{def.category}</span>
              </div>
              <h4 className="font-bold text-lg mb-1">{def.name}</h4>
              <p className="text-xs text-gray-400 mb-4">نوع العينة: {def.sampleType}</p>
              
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">للذكور:</span>
                  <span className="font-bold text-indigo-600">{def.normalRangeMale || '---'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">للإناث:</span>
                  <span className="font-bold text-pink-600">{def.normalRangeFemale || '---'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">للأطفال:</span>
                  <span className="font-bold text-green-600">{def.normalRangeChild || '---'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Test to Patient */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2"><FlaskConical size={22} /> حجز تحليل جديد</h3>
              <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddTestRequest} className="p-8 space-y-6">
              <div className="relative group">
                 <div className="flex items-end gap-2">
                    <div className="flex-1">
                       <SearchableSelect 
                         label="اسم المريض"
                         placeholder="ابحث عن مريض..."
                         /* Fix: Use dateOfBirth instead of date_of_birth on line 295 to match the Patient interface */
                         options={patients.map(p => ({ id: p.id, label: `${p.name} ${calculateAgeStr(p.dateOfBirth)}`, subLabel: p.nationalId }))}
                         value={selectedPatientId}
                         onChange={setSelectedPatientId}
                         onAddNew={() => setShowPatientModal(true)}
                         addNewText="إضافة مريض جديد"
                       />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowPatientModal(true)}
                      title="مريض جديد"
                      className="mb-2 p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                    >
                      <UserPlus size={22} />
                    </button>
                 </div>
              </div>

              <SearchableSelect 
                label="نوع التحليل المطلوب"
                placeholder="ابحث عن تحليل من القاموس..."
                options={definitions.map(d => ({ id: d.id, label: d.name, subLabel: d.category }))}
                value={selectedTestDefId}
                onChange={setSelectedTestDefId}
                onAddNew={() => setShowDefModal(true)}
                addNewText="إضافة تعريف تحليل جديد"
              />

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700">تأكيد الحجز</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
             <div className="p-6 bg-indigo-600 text-white flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2"><UserPlus size={22} /> إضافة مريض سريع</h3>
                <button onClick={() => setShowPatientModal(false)}><X size={24} /></button>
             </div>
             <form onSubmit={handleAddPatient} className="p-8 space-y-4">
                <input name="name" required placeholder="اسم المريض بالكامل" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input name="nationalId" required placeholder="الرقم القومي" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <input name="phone" required placeholder="رقم الهاتف" className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 mr-2">تاريخ الميلاد</label>
                   <input name="dateOfBirth" type="date" required className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <select name="bloodType" className="w-full border rounded-xl p-3 bg-gray-50">
                   {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700">حفظ المريض والمتابعة</button>
             </form>
          </div>
        </div>
      )}

      {/* Modal: Define New Test Type */}
      {showDefModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><BookOpen size={22} /> تعريف تحليل في القاموس</h3>
              <button onClick={() => setShowDefModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddDefinition} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">اسم التحليل</label>
                  <input name="name" required className="w-full border rounded-lg p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
                  <input name="category" placeholder="مثلاً: كيمياء، دم" className="w-full border rounded-lg p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">نوع العينة</label>
                  <input name="sampleType" placeholder="دم، بول، مسحة" className="w-full border rounded-lg p-2 bg-gray-50" />
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 border-t pt-4">
                <h4 className="font-bold text-sm text-indigo-700">المعدلات الطبيعية (Normal Ranges)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">للذكور</label>
                    <input name="rangeMale" className="w-full border rounded-lg p-2 bg-gray-50 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">للإناث</label>
                    <input name="rangeFemale" className="w-full border rounded-lg p-2 bg-gray-50 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">للأطفال</label>
                    <input name="rangeChild" className="w-full border rounded-lg p-2 bg-gray-50 text-xs" />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 flex gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowDefModal(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">حفظ التعريف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enter Result */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-green-600 text-white flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle size={22} /> تسجيل نتيجة</h3>
              <button onClick={() => setShowResultModal(null)}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateResult} className="p-8 space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl text-center">
                <div className="text-xs text-gray-400">التحليل</div>
                <div className="font-bold text-lg">{showResultModal.lab_test_definitions?.name}</div>
                <div className="text-xs text-primary-600 mt-2">المريض: {showResultModal.patients?.name}</div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">القيمة المقاسة (النتيجة)</label>
                <input name="result" required autoFocus className="w-full border-2 border-primary-100 rounded-xl p-4 text-2xl font-bold text-center outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResultModal(null)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                <button type="submit" className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg">حفظ وإغلاق</button>
              </div>
              <p className="text-[10px] text-red-500 text-center font-bold">تنبيه: لا يمكن تعديل النتيجة بعد الحفظ لضمان أمان البيانات الطبية.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabModule;