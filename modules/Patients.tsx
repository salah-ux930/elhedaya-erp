
import React, { useState, useEffect } from 'react';
import { AR, BLOOD_TYPES, calculateAge, ROOMS } from '../constants.ts';
import { DB } from '../store.ts';
import PatientTimeline from '../components/PatientTimeline.tsx';
import FamilyComprehensiveHealthRecordModal from '../components/FamilyComprehensiveHealthRecordModal.tsx';
import QuickClinicBookingModal from '../components/QuickClinicBookingModal.tsx';
import { calculatePatientSuggestedFollowups } from '../services/followupSuggestions.ts';
import { Patient, FundingEntity, DialysisSession, Service, Store, SuggestedFollowup } from '../types.ts';
import { 
  Plus, Search, UserPlus, History, Phone, FileText, Loader2, 
  Calendar as CalendarIcon, X, User, Activity, MapPin, 
  Droplets, CreditCard, ShieldCheck, HeartPulse, Clock, FilePlus, Scale, CheckCircle, Package, ListChecks,
  Users, Info, Stethoscope, AlertCircle, CalendarCheck, Sparkles, ChevronRight
} from 'lucide-react';

const PatientModule: React.FC<{ setTab?: (tab: string) => void }> = ({ setTab }) => {
  const [view, setView] = useState<'list' | 'add' | 'details'>('list');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<FundingEntity[]>([]);
  const [familyFiles, setFamilyFiles] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Comprehensive Health Record Modal States
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [comprehensivePatient, setComprehensivePatient] = useState<Patient | null>(null);
  const [comprehensiveFamilyFile, setComprehensiveFamilyFile] = useState<any | null>(null);
  const [comprehensiveInitialModule, setComprehensiveInitialModule] = useState<string>('history');

  // Quick Booking State
  const [quickBookingPatient, setQuickBookingPatient] = useState<Patient | null>(null);
  const [quickBookingModule, setQuickBookingModule] = useState<any>(undefined);
  const [quickBookingReason, setQuickBookingReason] = useState<string>('');

  // Family Files linking states
  const [addToFamilyFile, setAddToFamilyFile] = useState(false);
  const [selectedFamilyFileId, setSelectedFamilyFileId] = useState('');
  const [relationshipToHead, setRelationshipToHead] = useState('ابن');
  const [familyRole, setFamilyRole] = useState('');
  const [familyNotes, setFamilyNotes] = useState('');
  const [isFamilyHead, setIsFamilyHead] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, fe, ff, appts] = await Promise.all([
        DB.getPatients(),
        DB.getFundingEntities(),
        DB.getFamilyFiles(),
        DB.getClinicAppointments ? DB.getClinicAppointments() : Promise.resolve([])
      ]);
      setPatients(p || []);
      setFundingEntities(fe || []);
      setFamilyFiles(ff || []);
      setAppointments(appts || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleOpenComprehensiveRecord = (p: Patient, initialModule: string = 'history') => {
    const linkedFile = familyFiles.find(ff => 
      ff.members?.some((m: any) => m.patient_id === p.id || m.patients?.id === p.id)
    );
    setComprehensivePatient(p);
    setComprehensiveFamilyFile(linkedFile || null);
    setComprehensiveInitialModule(initialModule);
    setShowComprehensiveModal(true);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = e.target as any;
    
    // التحقق المسبق من رقم الهاتف
    const phone = target.phone.value;
    if (!/^01\d{9}$/.test(phone)) {
      alert("رقم الهاتف غير صحيح! يجب أن يبدأ بـ 01 ويتكون من 11 رقم.");
      return;
    }

    try {
      setLoading(true);
      const newPatient = await DB.addPatient({
        name: target.name.value,
        national_id: target.national_id.value,
        phone: phone,
        gender: target.gender.value || null,
        blood_type: target.blood_type.value,
        date_of_birth: target.dob.value,
        funding_entity_id: target.funding.value || null,
        address: target.address.value,
        emergency_contact: {
          name: target.emergency_name.value,
          phone: target.emergency_phone.value,
          relation: target.emergency_relation.value
        }
      });

      // ربط بالملف العائلي إذا تم تفعيل هذا الخيار
      if (addToFamilyFile && selectedFamilyFileId && newPatient) {
        const roleStr = familyRole.trim();
        const notesStr = familyNotes.trim();
        const combinedRole = notesStr ? `${roleStr} | ${notesStr}` : roleStr;
        await DB.addFamilyMember({
          family_file_id: selectedFamilyFileId,
          patient_id: newPatient.id,
          relationship_to_head: relationshipToHead,
          family_role: combinedRole || null,
          is_head: isFamilyHead
        });
      }

      alert("تمت إضافة المريض بنجاح");
      
      // إعادة تعيين الحقول
      setAddToFamilyFile(false);
      setSelectedFamilyFileId('');
      setRelationshipToHead('ابن');
      setFamilyRole('');
      setFamilyNotes('');
      setIsFamilyHead(false);

      setView('list');
      loadData();
    } catch (err: any) {
      alert(err.message || "خطأ في إضافة المريض");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'list' ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" placeholder="بحث..." 
                className="w-full pr-10 pl-4 py-3 border rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-primary-500"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={() => setView('add')} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-black shadow-lg flex items-center gap-2">
              <UserPlus size={20} /> إضافة مريض
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden min-h-[400px]">
            {loading ? (
               <div className="flex justify-center py-40"><Loader2 className="animate-spin text-primary-600" size={40} /></div>
            ) : (
              <table className="w-full text-right">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-black text-xs text-gray-400">الاسم والبيانات</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-400">الهاتف</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-400">جهة التعاقد</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-400">الملف العائلي</th>
                    <th className="px-6 py-4 font-black text-xs text-gray-400 text-center">السجلات والملفات الطبية</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {patients.filter(p => p.name.includes(searchTerm) || (p.national_id && p.national_id.includes(searchTerm))).map(p => {
                    const linkedFile = familyFiles.find(ff => 
                      ff.members?.some((m: any) => m.patient_id === p.id || m.patients?.id === p.id)
                    );

                    const suggestions = calculatePatientSuggestedFollowups(p, { appointments });
                    const hasHighUrgency = suggestions.some(s => s.urgency === 'high');

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <button 
                              onClick={() => handleOpenComprehensiveRecord(p)}
                              className="font-black text-slate-900 text-sm hover:text-indigo-600 transition-colors text-right flex flex-col items-start"
                              title="فتح الملف الصحي الشامل"
                            >
                              <span>{p.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5">{p.national_id || '—'}</span>
                            </button>

                            {/* شارة التنبيه بالاقتراحات المستحقة */}
                            {suggestions.length > 0 && (
                              <div className="flex flex-col gap-1 items-start mt-0.5">
                                {suggestions.map(s => {
                                  // خريطة أسماء الموديولات للمودال
                                  const tabMap: Record<string, string> = {
                                    child_followup: 'child',
                                    maternal_care: 'maternal',
                                    family_planning: 'family_planning',
                                    geriatric_care: 'geriatric',
                                    dental: 'dental',
                                    premarital: 'premarital'
                                  };
                                  const targetTab = tabMap[s.module_type] || 'history';

                                  return (
                                    <button
                                      key={s.id}
                                      onClick={() => {
                                        setQuickBookingPatient(p);
                                        setQuickBookingModule(targetTab);
                                        setQuickBookingReason(s.reason);
                                      }}
                                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer shadow-xs ${
                                        s.urgency === 'high'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
                                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      }`}
                                      title={`${s.reason} - اضغط لحجز العيادة المقترحة فوراً`}
                                    >
                                      <AlertCircle size={10} className={s.urgency === 'high' ? 'text-rose-600' : 'text-amber-600'} />
                                      <span>{s.title}</span>
                                      <CalendarCheck size={10} className="mr-0.5 opacity-80" />
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{p.phone}</td>
                        <td className="px-6 py-4 text-xs font-bold text-primary-600">
                          {fundingEntities.find(fe => fe.id === p.funding_entity_id)?.name || 'نقدي'}
                        </td>
                        <td className="px-6 py-4">
                          {linkedFile ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Users size={12} /> {linkedFile.family_code}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-bold">غير مرتبط</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            {/* المسار الأساسي: الملف الصحي الشامل */}
                            <button
                              onClick={() => handleOpenComprehensiveRecord(p)}
                              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                              title="فتح الملف الصحي الشامل (الملف الصحي الشامل)"
                            >
                              <Stethoscope size={14} />
                              <span>الملف الصحي الشامل</span>
                            </button>

                            {/* المسار المخصص: جلسات الغسيل الكلوي */}
                            <button
                              onClick={() => { setSelectedPatient(p); setView('details'); }}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200"
                              title="عرض سجل وتاريخ جلسات الغسيل الكلوي"
                            >
                              <Activity size={14} className="text-primary-600" />
                              <span>سجل جلسات الغسيل</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : view === 'add' ? (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black">تسجيل مريض جديد</h3>
            <button onClick={() => setView('list')}><X size={24}/></button>
          </div>
          <form onSubmit={handleAddPatient} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input name="name" required placeholder="الاسم رباعياً بالكامل" className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500" />
              <input name="phone" required placeholder="رقم الهاتف (01xxxxxxxxx)" className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500" />
              <input name="national_id" required placeholder="الرقم القومي" className="p-4 border-2 rounded-2xl outline-none font-mono text-sm focus:ring-2 focus:ring-primary-500" />
              <input name="dob" type="date" required className="p-4 border-2 rounded-2xl outline-none text-sm focus:ring-2 focus:ring-primary-500" />
              <select name="gender" required className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500">
                <option value="">-- اختر النوع --</option>
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </select>
              <input name="address" required placeholder="العنوان بالتفصيل" className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500" />
              <select name="blood_type" className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500">
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
              <select name="funding" className="p-4 border-2 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-primary-500">
                <option value="">نقدي (كاش)</option>
                {fundingEntities.map(fe => <option key={fe.id} value={fe.id}>{fe.name}</option>)}
              </select>
            </div>
            
            <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/60 space-y-4">
              <h4 className="font-black text-indigo-700 flex items-center gap-2">
                <HeartPulse size={18} /> جهة اتصال الطوارئ
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input name="emergency_name" placeholder="الاسم" className="p-3 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
                <input name="emergency_phone" placeholder="الهاتف" className="p-3 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
                <input name="emergency_relation" placeholder="الصلة برب الأسرة / المريض" className="p-3 rounded-xl border border-gray-200 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
              </div>
            </div>

            {/* ربط المريض بملف عائلي (اختياري) */}
            <div className="bg-emerald-50/40 p-6 rounded-3xl border border-emerald-100/60 space-y-4" dir="rtl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="text-emerald-700" size={22} />
                  <h4 className="font-black text-emerald-800 font-sans">ربط المريض بملف عائلي (اختياري)</h4>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={addToFamilyFile}
                    onChange={(e) => setAddToFamilyFile(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="mr-3 text-xs font-bold text-gray-700">تفعيل الربط</span>
                </label>
              </div>

              {addToFamilyFile && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">اختر الملف العائلي *</label>
                      <select 
                        required={addToFamilyFile}
                        value={selectedFamilyFileId}
                        onChange={(e) => setSelectedFamilyFileId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 bg-white outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- اختر ملفاً عائلياً --</option>
                        {familyFiles.map(file => (
                          <option key={file.id} value={file.id}>
                            كود الملف: {file.family_code} - رب الأسرة: {file.head_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">صلة القرابة برب العائلة *</label>
                      <select 
                        value={relationshipToHead}
                        onChange={(e) => setRelationshipToHead(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 bg-white outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="رب العائلة">رب العائلة (نفسه)</option>
                        <option value="زوج">زوج</option>
                        <option value="زوجة">زوجة</option>
                        <option value="ابن">ابن</option>
                        <option value="ابنة">ابنة</option>
                        <option value="أب">أب</option>
                        <option value="أم">أم</option>
                        <option value="أخ">أخ</option>
                        <option value="أخت">أخت</option>
                        <option value="حفيد / حفيدة">حفيد / حفيدة</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">الوظيفة والدور *</label>
                      <input 
                        required={addToFamilyFile}
                        value={familyRole}
                        onChange={(e) => setFamilyRole(e.target.value)}
                        placeholder="مثال: طالب، موظف، ربة منزل" 
                        className="w-full border border-gray-200 rounded-xl p-3 bg-white outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" 
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">ملاحظات العضو</label>
                      <input 
                        value={familyNotes}
                        onChange={(e) => setFamilyNotes(e.target.value)}
                        placeholder="أي ملاحظات خاصة بالفرد..." 
                        className="w-full border border-gray-200 rounded-xl p-3 bg-white outline-none font-bold text-sm focus:ring-2 focus:ring-emerald-500" 
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 py-1">
                    <input 
                      type="checkbox" 
                      id="is_family_head" 
                      checked={isFamilyHead}
                      onChange={(e) => setIsFamilyHead(e.target.checked)}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="is_family_head" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                      هل هذا الفرد هو رب الأسرة (Head of Family)؟
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="w-full py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-lg transition-colors">حفظ البيانات والربط</button>
          </form>
        </div>
      ) : (
        <div className="animate-in fade-in h-full">
           <PatientTimeline patient={selectedPatient} onClose={() => { setSelectedPatient(null); setView('list'); }} />
        </div>
      )}

      {/* مودال الملف الصحي الشامل */}
      {showComprehensiveModal && comprehensivePatient && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showComprehensiveModal}
          onClose={() => {
            setShowComprehensiveModal(false);
            setComprehensivePatient(null);
            setComprehensiveFamilyFile(null);
          }}
          patient={comprehensivePatient}
          familyFile={comprehensiveFamilyFile || undefined}
          initialModule={comprehensiveInitialModule}
        />
      )}

      {/* مودال حجز العيادة السريع المقترح */}
      {quickBookingPatient && (
        <QuickClinicBookingModal
          isOpen={!!quickBookingPatient}
          onClose={() => {
            setQuickBookingPatient(null);
            setQuickBookingModule(undefined);
            setQuickBookingReason('');
          }}
          patient={quickBookingPatient}
          initialModule={quickBookingModule}
          prefilledReason={quickBookingReason}
          onBookingSuccess={(appointment) => {
            alert(`تم حجز العيادة بنجاح للمريض ${quickBookingPatient.name} برقم حجز #${appointment.id.slice(0, 8)}`);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default PatientModule;
