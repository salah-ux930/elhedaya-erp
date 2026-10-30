import React, { useState, useEffect, useMemo } from 'react';
import { AR, ROOMS, calculateAge, BLOOD_TYPES } from '../constants.ts';
import { DB } from '../store.ts';
import { Patient, Service } from '../types.ts';
import { FileDown, Filter, Printer, MoreVertical, CheckCircle, Clock, Plus, Search, X, UserPlus, ShieldCheck, Activity, FolderOpen, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect.tsx';
import { printInvoiceDocument } from '../utils/printUtils.ts';
import { HospitalOperationalEngine } from '../services/hospitalOperationalEngine.ts';
import PatientClinical360Modal from '../components/PatientClinical360Modal.tsx';

const BillingModule: React.FC = () => {
  const [filterRoom, setFilterRoom] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [fundingEntities, setFundingEntities] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [invoicePaymentStatus, setInvoicePaymentStatus] = useState<'PAID' | 'DEFERRED' | 'FREE'>('PAID');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientFor360, setPatientFor360] = useState<Patient | null>(null);
  const [customInvoices, setCustomInvoices] = useState<any[]>([
    { id: '1', patientName: 'أحمد محمد علي', date: '2024-05-15', amount: 500, status: 'PAID', room: 'عيادة 1', dob: '1985-05-05', eligibilityNote: 'سداد نقدي' },
    { id: '2', patientName: 'سارة محمود خليل', date: '2024-05-14', amount: 1200, status: 'DEFERRED', room: 'عيادة 2', dob: '1992-10-10', eligibilityNote: 'تعاقد / آجل' },
    { id: '3', patientName: 'إبراهيم حسن', date: '2024-05-14', amount: 0, status: 'FREE', room: 'عيادة 1', dob: '1970-01-01', eligibilityNote: 'إعفاء بحث اجتماعي (ملف عائلي)' },
  ]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, s, ff, fe] = await Promise.all([
        DB.getPatients(),
        DB.getServices(),
        DB.getFamilyFiles(),
        DB.getFundingEntities()
      ]);
      setPatients(p || []);
      setServices(s || []);
      setFamilyFiles(ff || []);
      setFundingEntities(fe || []);
      if (s && s.length > 0 && !selectedServiceId) {
        setSelectedServiceId(s[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'تعذر تحميل بيانات الفواتير والخدمات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  // حساب الاستحقاق الاجتماعي والمالي تلقائياً عند اختيار المريض في الفاتورة
  const selectedPatientProfile = useMemo(() => {
    if (!selectedPatientId) return null;
    const pObj = patients.find(p => p.id === selectedPatientId);
    if (!pObj) return null;
    return HospitalOperationalEngine.buildPatientOperationalProfile(pObj, {
      familyFiles,
      fundingEntities
    });
  }, [selectedPatientId, patients, familyFiles, fundingEntities]);

  useEffect(() => {
    if (selectedPatientProfile) {
      if (selectedPatientProfile.billingEligibility.status === 'FREE_SOCIAL') {
        setInvoicePaymentStatus('FREE');
      } else if (selectedPatientProfile.billingEligibility.status === 'FUNDED') {
        setInvoicePaymentStatus('DEFERRED');
      } else {
        setInvoicePaymentStatus('PAID');
      }
    }
  }, [selectedPatientProfile]);

  const computedInvoiceAmount = useMemo(() => {
    if (invoicePaymentStatus === 'FREE') return 0;
    const srv = services.find(s => s.id === selectedServiceId);
    const basePrice = srv ? Number(srv.price || 500) : 500;
    return basePrice * Math.max(1, selectedQuantity);
  }, [invoicePaymentStatus, services, selectedServiceId, selectedQuantity]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    try {
      const newP = await DB.addPatient({
        name: target.name.value,
        // Use national_id to match Patient interface
        national_id: target.national_id.value,
        phone: target.phone.value,
        // Use blood_type to match Patient interface
        blood_type: target.blood_type.value,
        // Use date_of_birth to match Patient interface
        date_of_birth: target.date_of_birth.value
      });
      setPatients([...patients, newP]);
      setSelectedPatientId(newP.id);
      setShowPatientModal(false);
    } catch (err) {
      alert("خطأ في إضافة المريض");
    }
  };

  const filteredInvoices = customInvoices.filter(inv => 
    (filterRoom === '' || inv.room === filterRoom) &&
    (filterStatus === '' || inv.status === filterStatus) &&
    (searchTerm === '' || inv.patientName.includes(searchTerm))
  );

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pObj = patients.find(p => p.id === selectedPatientId);
    if (!pObj) {
      alert('يرجى اختيار المريض أولاً');
      return;
    }
    const newInv = {
      id: String(customInvoices.length + 1),
      patientId: pObj.id,
      patientName: pObj.name,
      date: new Date().toISOString().split('T')[0],
      amount: computedInvoiceAmount,
      status: invoicePaymentStatus,
      room: ROOMS[0] || 'عيادة 1',
      dob: pObj.date_of_birth,
      eligibilityNote: selectedPatientProfile?.billingEligibility.badgeText || 'سداد نقدي'
    };
    setCustomInvoices([newInv, ...customInvoices]);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800 text-sm font-bold">
            <AlertCircle size={20} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="بحث عن فاتورة مريض..."
            className="w-full pr-10 pl-4 py-3 border rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            className="flex-1 md:w-44 py-3 px-4 border rounded-xl bg-white shadow-sm outline-none"
            onChange={(e) => setFilterRoom(e.target.value)}
          >
            <option value="">كل العيادات والأقسام</option>
            {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select 
            className="flex-1 md:w-40 py-3 px-4 border rounded-xl bg-white shadow-sm outline-none"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="PAID">{AR.paid}</option>
            <option value="DEFERRED">{AR.deferred}</option>
            <option value="FREE">{AR.free}</option>
          </select>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full md:w-auto bg-primary-600 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-700 transition-all font-bold shadow-md"
        >
          <Plus size={20} /> إنشاء فاتورة
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 flex justify-between items-center border-b no-print">
          <span className="text-sm font-bold text-gray-500">تم العثور على {filteredInvoices.length} فاتورة</span>
          <button className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline">
            <FileDown size={16} /> {AR.export} Excel
          </button>
        </div>
        <table className="w-full text-right">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-600">رقم الفاتورة</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.name}</th>
              <th className="px-6 py-4 font-bold text-gray-600">العمر</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.date}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.room}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.totalAmount}</th>
              <th className="px-6 py-4 font-bold text-gray-600">{AR.status}</th>
              <th className="px-6 py-4 font-bold text-gray-600 no-print">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-primary-600 font-bold">#INV-24-{inv.id.padStart(4, '0')}</td>
                <td className="px-6 py-4 font-bold text-gray-800">{inv.patientName}</td>
                <td className="px-6 py-4 text-primary-700 font-bold">{calculateAge(inv.dob)}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">{inv.date}</td>
                <td className="px-6 py-4"><span className="text-gray-600 font-bold">{inv.room}</span></td>
                <td className="px-6 py-4 font-bold">{inv.amount === 0 ? AR.free : `${inv.amount.toLocaleString()} ج.م`}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {inv.status === 'PAID' ? (
                      <span className="flex items-center gap-1 w-fit px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
                        <CheckCircle size={12} /> {AR.paid}
                      </span>
                    ) : inv.status === 'DEFERRED' ? (
                      <span className="flex items-center gap-1 w-fit px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200">
                        <Clock size={12} /> {AR.deferred}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 w-fit px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                        <ShieldCheck size={12} /> {AR.free} (بحث اجتماعي)
                      </span>
                    )}
                    {inv.eligibilityNote && (
                      <span className="text-[10px] text-slate-500 font-medium">{inv.eligibilityNote}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 no-print">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const matched = patients.find(p => p.id === inv.patientId || p.name === inv.patientName);
                        if (matched) setPatientFor360(matched);
                      }}
                      className="px-2.5 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors cursor-pointer"
                      title="بطاقة المريض والاستحقاق"
                    >
                      بطاقة المريض
                    </button>
                    <button 
                      onClick={() => printInvoiceDocument(inv, patients.find(p => p.name === inv.patientName))}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all cursor-pointer" 
                      title={AR.print}
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="p-16 text-center text-gray-400 font-bold">
                  {loading ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="animate-spin text-primary-600" size={20} /> جاري التحميل...</span>
                  ) : (
                    'لا توجد فواتير مطابقة لمعايير البحث الحالية'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-primary-600 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">إنشاء فاتورة جديدة</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <form id="createInvoiceForm" onSubmit={handleCreateInvoiceSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SearchableSelect 
                    label="اختيار المريض"
                    placeholder="ابحث عن مريض..."
                    options={patients.map(p => ({ id: p.id, label: `${p.name} (${calculateAge(p.date_of_birth)})`, subLabel: p.national_id }))}
                    value={selectedPatientId}
                    onChange={setSelectedPatientId}
                    onAddNew={() => setShowPatientModal(true)}
                    addNewText="إضافة مريض جديد"
                  />
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2 pt-1">الغرفة</label>
                    <select className="w-full border rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none">
                      {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                {/* شريط الربط التلقائي بالبحث الاجتماعي للملف العائلي */}
                {selectedPatientProfile && (
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    selectedPatientProfile.billingEligibility.status === 'FREE_SOCIAL'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : selectedPatientProfile.billingEligibility.status === 'FUNDED'
                        ? 'bg-blue-50 border-blue-200 text-blue-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-xs">
                        <FolderOpen size={16} />
                        <span>قرار الاستحقاق التلقائي من الملف العائلي والبحث الاجتماعي:</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-white rounded-lg text-xs font-black border shadow-2xs">
                        {selectedPatientProfile.billingEligibility.badgeText}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">
                      {selectedPatientProfile.billingEligibility.reason}
                      {selectedPatientProfile.familyFile ? ` (كود الملف العائلي: ${selectedPatientProfile.familyFile.file_code})` : ''}
                    </p>
                  </div>
                )}

                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-gray-50 p-4 font-bold border-b text-sm">بنود الفاتورة ونوع المعاملة المالية</div>
                  <div className="p-4 space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 mb-1">الخدمة</label>
                        <select
                          value={selectedServiceId}
                          onChange={e => setSelectedServiceId(e.target.value)}
                          className="w-full border rounded-lg p-2 bg-white outline-none"
                        >
                          {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price} ج.م)</option>)}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="block text-xs font-bold text-gray-400 mb-1">الكمية</label>
                        <input
                          type="number"
                          min={1}
                          value={selectedQuantity}
                          onChange={e => setSelectedQuantity(Number(e.target.value) || 1)}
                          className="w-full border rounded-lg p-2 bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1.5">حالة السداد / الإعفاء (تُضبط تلقائياً من الملف العائلي ويمكن تعديلها)</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setInvoicePaymentStatus('PAID')}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            invoicePaymentStatus === 'PAID'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          خالص / نقدي
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePaymentStatus('DEFERRED')}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            invoicePaymentStatus === 'DEFERRED'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          آجل / جهة تعاقد
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoicePaymentStatus('FREE')}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            invoicePaymentStatus === 'FREE'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          مجاني (إعفاء اجتماعي)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-primary-50 rounded-xl">
                  <div className="text-primary-900 font-bold">الإجمالي المستحق بعد تطبيق الاستحقاق</div>
                  <div className="text-2xl font-bold text-primary-600 font-mono">
                    {computedInvoiceAmount.toLocaleString()} ج.م
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3 shrink-0">
              <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">إلغاء</button>
              <button form="createInvoiceForm" type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg hover:bg-primary-700 transition-colors">حفظ الفاتورة واعتماد الاستحقاق</button>
            </div>
          </div>
        </div>
      )}

      {showPatientModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl animate-in zoom-in-95">
             <div className="p-6 bg-indigo-600 text-white flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xl font-bold flex items-center gap-2"><UserPlus size={22} /> إضافة مريض سريع</h3>
                <button onClick={() => setShowPatientModal(false)}><X size={24} /></button>
             </div>
             <form onSubmit={handleAddPatient} className="p-8 space-y-4">
                <input name="name" required placeholder="اسم المريض بالكامل" className="w-full border rounded-xl p-3 bg-gray-50" />
                {/* Use national_id to match Patient interface */}
                <input name="national_id" required placeholder="الرقم القومي" className="w-full border rounded-xl p-3 bg-gray-50" />
                <input name="phone" required placeholder="رقم الهاتف" className="w-full border rounded-xl p-3 bg-gray-50" />
                <div className="space-y-1">
                   <label className="text-xs font-bold text-gray-500 mr-2">تاريخ الميلاد</label>
                   {/* Use date_of_birth to match Patient interface */}
                   <input name="date_of_birth" type="date" required className="w-full border rounded-xl p-3 bg-gray-50" />
                </div>
                {/* Use blood_type to match Patient interface */}
                <select name="blood_type" className="w-full border rounded-xl p-3 bg-gray-50">
                   {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">حفظ المريض والمتابعة</button>
             </form>
          </div>
        </div>
      )}
      
      <PatientClinical360Modal
        isOpen={!!patientFor360}
        onClose={() => setPatientFor360(null)}
        patient={patientFor360}
        onDataUpdated={loadData}
      />
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #0ea5e9; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default BillingModule;
