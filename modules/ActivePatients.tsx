import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import { DialysisSession, Patient, Service, Store } from '../types.ts';
import { calculateAge } from '../constants.ts';
import { 
  Loader2, Activity, MapPin, Clock, HeartPulse, Scale, 
  User, FilePlus, X, CheckCircle, Package, ListChecks, 
  Stethoscope, Search, Filter, RefreshCw, Sparkles, 
  Building2, ShieldCheck, Phone, CheckCircle2, AlertCircle
} from 'lucide-react';
import DialysisNursingAssessmentModal from '../components/DialysisNursingAssessmentModal.tsx';

const ActivePatients: React.FC = () => {
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING'>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [fundingFilter, setFundingFilter] = useState<string>('ALL');

  // Modals
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<any | null>(null);
  const [selectedSessionForNursing, setSelectedSessionForNursing] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [sess, serv, stor] = await Promise.all([
        DB.getSessions(),
        DB.getServices(),
        DB.getStores()
      ]);
      // Show both WAITING and ACTIVE sessions
      const current = sess?.filter(session => session.status === 'ACTIVE' || session.status === 'WAITING') || [];
      setAllSessions(current);
      setServices(serv || []);
      setStores(stor || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Distinct rooms for filter dropdown
  const availableRooms = useMemo(() => {
    const rooms = new Set<string>();
    allSessions.forEach(s => {
      if (s.room && s.room.trim()) rooms.add(s.room.trim());
    });
    return Array.from(rooms).sort();
  }, [allSessions]);

  // Distinct funding entities for filter dropdown
  const availableFundingEntities = useMemo(() => {
    const fundings = new Set<string>();
    allSessions.forEach(s => {
      const f = s.patients?.funding_entity;
      if (f && f.trim()) fundings.add(f.trim());
    });
    return Array.from(fundings).sort();
  }, [allSessions]);

  // Summary counts
  const stats = useMemo(() => {
    const total = allSessions.length;
    const active = allSessions.filter(s => s.status === 'ACTIVE').length;
    const waiting = allSessions.filter(s => s.status === 'WAITING').length;
    return { total, active, waiting };
  }, [allSessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return allSessions.filter(session => {
      // 1. Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const patientName = (session.patients?.name || '').toLowerCase();
        const patientPhone = (session.patients?.phone || '').toLowerCase();
        const patientNationalId = (session.patients?.national_id || '').toLowerCase();
        const patientCode = (session.patients?.code || '').toLowerCase();
        const room = (session.room || '').toLowerCase();
        const notes = (session.notes || '').toLowerCase();

        const matches = patientName.includes(query) ||
                        patientPhone.includes(query) ||
                        patientNationalId.includes(query) ||
                        patientCode.includes(query) ||
                        room.includes(query) ||
                        notes.includes(query);
        if (!matches) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && session.status !== statusFilter) {
        return false;
      }

      // 3. Room filter
      if (roomFilter !== 'ALL' && (session.room || '').trim() !== roomFilter) {
        return false;
      }

      // 4. Funding filter
      if (fundingFilter !== 'ALL' && (session.patients?.funding_entity || '').trim() !== fundingFilter) {
        return false;
      }

      return true;
    });
  }, [allSessions, searchTerm, statusFilter, roomFilter, fundingFilter]);

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'ALL' || roomFilter !== 'ALL' || fundingFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setRoomFilter('ALL');
    setFundingFilter('ALL');
  };

  const handleStartSession = async (session: any) => {
    try {
      setLoading(true);
      await DB.updateSession(session.id, { 
        status: 'ACTIVE',
        start_time: new Date().toTimeString().split(' ')[0] 
      });
      load();
    } catch (e) {
      alert("فشل بدء الجلسة: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForReport) return;
    const target = e.target as any;

    try {
      await DB.finishSession(selectedSessionForReport.id, {
        service_id: selectedService?.id,
        blood_pressure: target.bp.value,
        weight_after: target.weightAfter?.value ? parseFloat(target.weightAfter.value) : null,
        notes: target.notes.value,
        custom_data: customFieldsData
      }, target.storeId.value);

      alert("تم إنهاء الجلسة، تسجيل التقرير الطبي وخصم المستهلكات بنجاح.");
      setSelectedSessionForReport(null);
      setSelectedService(null);
      setCustomFieldsData({});
      load();
    } catch (e) {
      alert("فشل إنهاء الجلسة: " + (e as Error).message);
    }
  };

  if (loading && allSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4 text-gray-400">
        <Loader2 className="animate-spin text-primary-600" size={48} />
        <p className="font-black text-lg">جاري تحميل قائمة الجلسات الحالية...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Header & Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3">
            <Activity className="text-primary-600" size={28} />
            <span>الجلسات الحالية</span>
            <span className="text-xs bg-primary-50 text-primary-700 px-3 py-1 rounded-full font-black border border-primary-100">
              وحدة الغسيل الكلوي
            </span>
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            متابعة فورية للمرضى المتواجدين في الجلسات وقائمة الانتظار، والتقييم التمريضي الشامل.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80 flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">إجمالي الجلسات</p>
              <p className="text-base font-black text-slate-800 leading-tight">{stats.total}</p>
            </div>
          </div>

          <div className="bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <div>
              <p className="text-[10px] text-emerald-600 font-bold uppercase">في الجلسة الآن</p>
              <p className="text-base font-black text-emerald-800 leading-tight">{stats.active}</p>
            </div>
          </div>

          <div className="bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-200 flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <div>
              <p className="text-[10px] text-amber-600 font-bold uppercase">في الانتظار</p>
              <p className="text-base font-black text-amber-800 leading-tight">{stats.waiting}</p>
            </div>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-gray-600 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-primary-600' : ''} />
          </button>
        </div>
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم المريض، الرقم القومي، الهاتف، الغرفة..."
              className="w-full pl-10 pr-11 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Status Tabs / Pills */}
          <div className="md:col-span-4 flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              الكل ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
              في الجلسة ({stats.active})
            </button>
            <button
              onClick={() => setStatusFilter('WAITING')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'WAITING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-amber-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
              انتظار ({stats.waiting})
            </button>
          </div>

          {/* Room Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="w-full py-3 px-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">جميع الغرف والقاعات</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>غرفة: {r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row (Funding entity + Clear) */}
        {(availableFundingEntities.length > 0 || hasActiveFilters) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 font-bold flex items-center gap-1">
                <Filter size={14} /> تصفية حسب الجهة:
              </span>
              <button
                onClick={() => setFundingFilter('ALL')}
                className={`px-3 py-1 rounded-xl font-bold transition-all ${
                  fundingFilter === 'ALL'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                جميع الجهات
              </button>
              {availableFundingEntities.map(f => (
                <button
                  key={f}
                  onClick={() => setFundingFilter(f)}
                  className={`px-3 py-1 rounded-xl font-bold transition-all ${
                    fundingFilter === f
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">
                  نتائج البحث: {filteredSessions.length} من {allSessions.length}
                </span>
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold transition-all flex items-center gap-1"
                >
                  <X size={13} /> إلغاء الفلاتر
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map(session => (
          <div 
            key={session.id} 
            className={`bg-white p-7 rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group ${
              session.status === 'ACTIVE' ? 'border-emerald-200' : 'border-amber-200'
            }`}
          >
            <div 
              className={`absolute top-0 right-0 w-36 h-36 rounded-full -mr-16 -mt-16 transition-colors ${
                session.status === 'ACTIVE' ? 'bg-emerald-50 group-hover:bg-emerald-100' : 'bg-amber-50 group-hover:bg-amber-100'
              }`}
            />
            
            <div className="relative z-10 flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3.5">
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md border-2 ${
                    session.status === 'ACTIVE' 
                      ? 'bg-emerald-600 border-emerald-100' 
                      : 'bg-amber-600 border-amber-100'
                  } text-white shrink-0`}
                >
                  {session.patients?.name?.[0] || '?'}
                </div>
                <div>
                  <h4 className="font-black text-lg text-gray-800 leading-tight group-hover:text-primary-600 transition-colors">
                    {session.patients?.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mt-1">
                    {session.patients?.phone && (
                      <span className="flex items-center gap-1"><Phone size={11} /> {session.patients.phone}</span>
                    )}
                    {session.patients?.funding_entity && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black border border-blue-100">
                        {session.patients.funding_entity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className={`text-[11px] font-black px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5 shadow-sm ${
                  session.status === 'ACTIVE' 
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${session.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {session.status === 'ACTIVE' ? 'في الجلسة الآن' : 'في قائمة الانتظار'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1">
                  <MapPin size={11} className="text-primary-500" /> الغرفة / القاعة
                </div>
                <div className="font-black text-gray-800 text-sm">{session.room || 'غير محدد'}</div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1">
                  <Clock size={11} className="text-primary-500" /> {session.status === 'ACTIVE' ? 'وقت البدء' : 'وقت الوصول'}
                </div>
                <div className="font-black text-gray-800 text-sm">{session.start_time || '---'}</div>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 col-span-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-emerald-700 font-black mb-1 flex items-center gap-1">
                      <HeartPulse size={12} className="text-emerald-600" /> ضغط الدم
                    </div>
                    <div className="font-black text-emerald-800 text-sm">{session.blood_pressure || '--/--'}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-indigo-700 font-black mb-1 flex items-center gap-1 justify-end">
                      <Scale size={12} className="text-indigo-600" /> الوزن قبلي
                    </div>
                    <div className="font-black text-indigo-800 text-sm">{session.weight_before || '--'} كجم</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 mt-5">
              <button 
                onClick={() => setSelectedSessionForNursing(session)}
                className="w-full py-3 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border border-teal-200/80 shadow-sm"
              >
                <Stethoscope size={16} className="text-teal-600" /> التقييم التمريضي الشامل (EWS / فحص / علامات)
              </button>

              {session.status === 'WAITING' ? (
                <button 
                  onClick={() => handleStartSession(session)}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20"
                >
                  <Activity size={16} /> بدء الجلسة الآن
                </button>
              ) : (
                <button 
                  onClick={() => setSelectedSessionForReport(session)}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  <FilePlus size={16} /> إنهاء الجلسة وإضافة تقرير
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredSessions.length === 0 && (
          <div className="col-span-full py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Search size={28} />
            </div>
            <h4 className="font-black text-lg text-gray-700">لا توجد جلسات تطابق البحث أو الفلاتر</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {hasActiveFilters 
                ? 'جرب تغيير كلمة البحث أو إعادة تعيين الفلاتر لعرض الجلسات المتاحة.'
                : 'لا يوجد مرضى في جلسات غسيل كلوي أو قائمة الانتظار حالياً.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
              >
                إعادة تعيين جميع الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {/* Comprehensive Dialysis Nursing Assessment Modal */}
      {selectedSessionForNursing && (
        <DialysisNursingAssessmentModal 
          session={selectedSessionForNursing}
          onClose={() => setSelectedSessionForNursing(null)}
          onUpdate={load}
        />
      )}

      {/* Report Modal */}
      {selectedSessionForReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 bg-emerald-600 text-white flex justify-between items-center rounded-t-[3rem] shrink-0">
                 <div>
                    <h3 className="text-xl font-black">إضافة تقرير طبي للجلسة</h3>
                    <p className="text-xs opacity-80 mt-1">{selectedSessionForReport.patients?.name}</p>
                 </div>
                 <button onClick={() => setSelectedSessionForReport(null)}><X size={28} /></button>
              </div>
              <form onSubmit={handleSaveReport} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">نوع الخدمة الطبية</label>
                       <select 
                        required 
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500"
                        onChange={(e) => {
                          const s = services.find(serv => serv.id === e.target.value);
                          setSelectedService(s || null);
                          setCustomFieldsData({});
                        }}
                       >
                          <option value="">-- اختر من النماذج المعدة --</option>
                          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">المخزن المراد سحب المستلزمات منه</label>
                       <select name="storeId" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500">
                          {stores.map(s => <option key={s.id} value={s.id}>{s.name} {s.is_main ? '(رئيسي)' : ''}</option>)}
                       </select>
                    </div>
                 </div>

                 {selectedService && selectedService.config?.required_fields && selectedService.config.required_fields.length > 0 && (
                   <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-black text-emerald-700 text-sm flex items-center gap-2"><FilePlus size={16}/> بيانات النموذج الطبي</h4>
                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm">
                          <ListChecks size={12}/> {selectedService.config.required_fields.length} حقول مطلوبة
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedService.config.required_fields.map(field => (
                          <div key={field} className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-400 uppercase">{field}</label>
                            <input 
                              required 
                              className="w-full border-2 border-white rounded-xl p-3 bg-white outline-none font-bold"
                              placeholder={field}
                              onChange={(e) => setCustomFieldsData({...customFieldsData, [field]: e.target.value})}
                            />
                          </div>
                        ))}
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">ضغط الدم الحالي</label>
                       <input name="bp" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500" defaultValue={selectedSessionForReport.blood_pressure} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-gray-500">الوزن البعدي (كجم)</label>
                       <input name="weightAfter" type="number" step="0.1" required className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500" placeholder="00.0" />
                    </div>
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">ملاحظات التمريض</label>
                    <textarea name="notes" className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50 font-bold outline-none focus:border-emerald-500 h-24" placeholder="مثلاً: المريض مستقر.." defaultValue={selectedSessionForReport.notes}></textarea>
                 </div>
                 
                 <button type="submit" className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                    <CheckCircle size={20} /> إنهاء الجلسة وحفظ التقرير الطبي
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default ActivePatients;
