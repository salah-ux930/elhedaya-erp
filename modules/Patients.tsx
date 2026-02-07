
import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES, calculateAge } from '../constants';
import { DB } from '../store';
import { Patient } from '../types';
import { Plus, Search, UserPlus, History, Phone, FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react';

const PatientModule: React.FC = () => {
  const [view, setView] = useState<'list' | 'add' | 'profile'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Patient>>({
    name: '',
    nationalId: '',
    phone: '',
    bloodType: '',
    dateOfBirth: '',
    emergencyContact: { name: '', phone: '', relation: '' }
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await DB.getPatients();
      setPatients(data || []);
    } catch (error) {
      console.error("Error loading patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const validatePhone = (phone: string) => /^01\d{9}$/.test(phone);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone(formData.phone || '')) {
      alert(AR.validationPhone);
      return;
    }
    
    try {
      await DB.addPatient(formData);
      await loadPatients();
      setView('list');
      setFormData({
        name: '',
        nationalId: '',
        phone: '',
        bloodType: '',
        dateOfBirth: '',
        emergencyContact: { name: '', phone: '', relation: '' }
      });
    } catch (error) {
      alert("حدث خطأ أثناء حفظ البيانات");
      console.error(error);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.includes(searchTerm) || p.nationalId.includes(searchTerm) || p.phone.includes(searchTerm)
  );

  if (view === 'add') {
    return (
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
        <h3 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4">{AR.newPatient}</h3>
        <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{AR.name}</label>
            <input required className="w-full border rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all" 
              onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{AR.nationalId}</label>
            <input required maxLength={14} className="w-full border rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              onChange={e => setFormData({...formData, nationalId: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{AR.phone}</label>
            <input required placeholder="01xxxxxxxxx" className="w-full border rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">تاريخ الميلاد</label>
            <input 
              type="date" 
              required 
              className="w-full border rounded-lg p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">{AR.bloodType}</label>
            <select className="w-full border rounded-lg p-3 bg-gray-50 focus:bg-white outline-none" 
              onChange={e => setFormData({...formData, bloodType: e.target.value})}>
              <option value="">اختر</option>
              {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 pt-4">
            <h4 className="font-bold text-lg mb-4 text-primary-700">{AR.emergency}</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-primary-50 rounded-lg">
              <input placeholder="اسم قريب" className="border rounded-lg p-2" 
                onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact!, name: e.target.value}})} />
              <input placeholder="رقم الهاتف" className="border rounded-lg p-2" 
                onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact!, phone: e.target.value}})} />
              <input placeholder="صلة القرابة" className="border rounded-lg p-2" 
                onChange={e => setFormData({...formData, emergencyContact: {...formData.emergencyContact!, relation: e.target.value}})} />
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-8">
            <button type="button" onClick={() => setView('list')} className="px-8 py-3 bg-gray-100 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors">
              {AR.cancel}
            </button>
            <button type="submit" className="px-12 py-3 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-md">
              {AR.save}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث بالاسم أو الرقم القومي..." 
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadPatients}
            className="p-3 text-gray-500 hover:text-primary-600 bg-white border rounded-xl"
            title="تحديث البيانات"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <History size={20} />}
          </button>
          <button 
            onClick={() => setView('add')}
            className="bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-sm"
          >
            <UserPlus size={20} />
            {AR.newPatient}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
            <Loader2 className="animate-spin text-primary-600" size={40} />
            <p className="font-bold">جاري تحميل سجلات المرضى...</p>
          </div>
        ) : (
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-600">{AR.name}</th>
                <th className="px-6 py-4 font-bold text-gray-600">العمر</th>
                <th className="px-6 py-4 font-bold text-gray-600">{AR.nationalId}</th>
                <th className="px-6 py-4 font-bold text-gray-600">{AR.phone}</th>
                <th className="px-6 py-4 font-bold text-gray-600">{AR.funding}</th>
                <th className="px-6 py-4 font-bold text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-400">فصيلة: {p.bloodType}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-primary-700 font-bold">
                       <CalendarIcon size={14} className="text-primary-400" />
                       {calculateAge(p.dateOfBirth)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono">{p.nationalId}</td>
                  <td className="px-6 py-4 text-gray-600">{p.phone}</td>
                  <td className="px-6 py-4">
                    <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold border border-primary-100">
                      {DB.funding.find(f => f.id === p.fundingEntityId)?.name || 'خاص'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="سجل الجلسات">
                        <History size={18} />
                      </button>
                      <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="بيانات المريض">
                        <FileText size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                    لا يوجد مرضى مطابقين للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PatientModule;
