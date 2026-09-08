import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import { calculateAge } from '../constants.ts';
import { 
  History, User, Download, 
  Loader2, Stethoscope, Beaker, Receipt, X,
  ClipboardList, Eye, Shield, Activity, FileText, Filter,
  Table as TableIcon, Search, Printer, ArrowUpDown, Calendar,
  Clock, CheckCircle2, ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import HistoryPhysicalModal from './HistoryPhysicalModal.tsx';
import VisitsFormModal from './VisitsFormModal.tsx';

interface PatientTimelineProps {
  patient: any;
  onClose: () => void;
}

const PatientTimeline: React.FC<PatientTimelineProps> = ({ patient, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showVisitsModal, setShowVisitsModal] = useState(false);
  const [selectedExamForView, setSelectedExamForView] = useState<any | null>(null);
  const [selectedExamInitialTab, setSelectedExamInitialTab] = useState<'history' | 'significant' | 'clinical' | 'full'>('full');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  
  // الوضع الافتراضي للعرض هو "جدول عادي" استجابة لطلب المستخدم
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState<any | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await DB.getPatientHistory(patient.id);
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const openExamModalWithTab = (examItem: any, tab: 'history' | 'significant' | 'clinical' | 'full') => {
    setSelectedExamForView(examItem);
    setSelectedExamInitialTab(tab);
  };

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // 1. فلتر النوع
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'PHYSICAL_EXAM' && item.type !== 'PHYSICAL_EXAM') return false;
        if (activeFilter === 'VISIT' && item.type !== 'VISIT') return false;
        if (activeFilter === 'SESSION' && item.type !== 'SESSION') return false;
        if (activeFilter === 'LAB' && item.type !== 'LAB') return false;
        if (activeFilter === 'APPOINTMENT' && item.type !== 'APPOINTMENT') return false;
        if (activeFilter === 'INVOICE' && item.type !== 'INVOICE') return false;
      }

      // 2. فلتر البحث النصي
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const dateMatch = item.date?.toLowerCase().includes(term);
      const docMatch = (item.doctor_name || item.doctors?.name || item.doctor_signature || '').toLowerCase().includes(term);
      const complaintMatch = (item.patient_complaint || item.chief_complaint || item.reason || '').toLowerCase().includes(term);
      const diagnosisMatch = (item.diagnosis || '').toLowerCase().includes(term);
      const planMatch = (item.management_plan || item.prescription || item.notes || '').toLowerCase().includes(term);
      const labMatch = (item.lab_test_definitions?.name || '').toLowerCase().includes(term);
      const roomMatch = (item.room || item.clinics?.name || '').toLowerCase().includes(term);

      return dateMatch || docMatch || complaintMatch || diagnosisMatch || planMatch || labMatch || roomMatch;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [history, activeFilter, searchTerm, sortOrder]);

  // دالة مساعدة لتحليل الفحوصات الإكلينيكية والأحداث
  const parseExamData = (item: any) => {
    let findings: any = null;
    let events: any[] = [];
    if (item.type === 'PHYSICAL_EXAM') {
      if (item.clinical_findings) {
        try {
          findings = typeof item.clinical_findings === 'string' 
            ? JSON.parse(item.clinical_findings) 
            : item.clinical_findings;
        } catch {
          findings = null;
        }
      }
      if (item.significant_events) {
        try {
          events = typeof item.significant_events === 'string'
            ? JSON.parse(item.significant_events)
            : item.significant_events;
        } catch {
          events = [];
        }
      }
    }
    return { findings, events };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50/50" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center bg-white p-5 md:p-6 border-b shrink-0 gap-4 no-print">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-3xl bg-primary-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-primary-100 shrink-0">
               {patient.name?.[0] || 'م'}
            </div>
            <div>
               <div className="flex items-center gap-2">
                 <h2 className="text-xl md:text-2xl font-black text-gray-800">{patient.name}</h2>
                 <span className="text-[11px] font-black bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full border border-primary-100">
                   السجل المرضي الشامل
                 </span>
               </div>
               <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-gray-400 font-bold mt-1">
                  <span className="flex items-center gap-1"><User size={14} className="text-primary-600"/> {calculateAge(patient.date_of_birth)}</span>
                  <span className="flex items-center gap-1 font-mono tracking-tight"><History size={14} className="text-indigo-600"/> الرقم القومي: {patient.national_id || '—'}</span>
                  {patient.phone && (
                    <span className="font-mono text-gray-500">الهاتف: {patient.phone}</span>
                  )}
               </div>
            </div>
         </div>
         
         <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-primary-700 shadow-sm border border-gray-100'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="عرض السجل الطبي في شكل جدول عادي منظم"
              >
                <TableIcon size={16} />
                <span>جدول عادي</span>
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-primary-700 shadow-sm border border-gray-100'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="عرض السجل الطبي في شكل مخطط زمني (تايم لاين)"
              >
                <Activity size={16} />
                <span>مخطط زمني</span>
              </button>
            </div>

            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            {/* Quick Action Buttons */}
            <button 
               onClick={() => {
                 setSelectedExamForView(null);
                 setSelectedExamInitialTab('history');
                 setShowAddExamModal(true);
               }}
               className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black transition-all flex items-center gap-1.5 shadow-sm text-xs"
            >
               <Shield size={14}/> ١. التاريخ المرضي
            </button>

            <button 
               onClick={() => {
                 setSelectedExamForView(null);
                 setSelectedExamInitialTab('significant');
                 setShowAddExamModal(true);
               }}
               className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black transition-all flex items-center gap-1.5 shadow-sm text-xs"
            >
               <ClipboardList size={14}/> ٢. الأحداث الهامة
            </button>

            <button 
               onClick={() => {
                 setSelectedExamForView(null);
                 setSelectedExamInitialTab('clinical');
                 setShowAddExamModal(true);
               }}
               className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all flex items-center gap-1.5 shadow-sm text-xs"
            >
               <Activity size={14}/> ٣. الفحص السريري
            </button>

            <button 
               onClick={() => {
                 setSelectedExamForView(null);
                 setSelectedExamInitialTab('full');
                 setShowAddExamModal(true);
               }}
               className="px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-black transition-all flex items-center gap-1.5 shadow-sm text-xs"
            >
               <FileText size={14}/> ٤. النموذج الكامل
            </button>

            <button 
               onClick={() => setShowVisitsModal(true)}
               className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black transition-all flex items-center gap-1.5 shadow-sm text-xs"
            >
               <FileText size={14}/> ٥. نموذج التردد
            </button>

            <button 
              onClick={() => window.print()}
              className="p-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-black hover:bg-gray-50 transition-all flex items-center gap-1 text-xs shadow-sm"
              title="طباعة السجل الطبي"
            >
               <Printer size={16}/>
            </button>

            <button 
              onClick={onClose} 
              className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
              title="إغلاق"
            >
               <X size={18}/>
            </button>
         </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
          <span className="text-xs font-black text-gray-400 flex items-center gap-1 ml-1 shrink-0">
            <Filter size={14}/> تصفية:
          </span>
          
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              activeFilter === 'ALL'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            عرض الكل ({history.length})
          </button>

          <button
            onClick={() => setActiveFilter('PHYSICAL_EXAM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'PHYSICAL_EXAM'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            <ClipboardList size={13}/> الفحص الشامل ({history.filter(i => i.type === 'PHYSICAL_EXAM').length})
          </button>

          <button
            onClick={() => setActiveFilter('VISIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'VISIT'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
            }`}
          >
            <FileText size={13}/> نموذج التردد ({history.filter(i => i.type === 'VISIT').length})
          </button>

          <button
            onClick={() => setActiveFilter('SESSION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'SESSION'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
            }`}
          >
            <Activity size={13}/> جلسات الغسيل ({history.filter(i => i.type === 'SESSION').length})
          </button>

          <button
            onClick={() => setActiveFilter('LAB')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'LAB'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Beaker size={13}/> التحاليل ({history.filter(i => i.type === 'LAB').length})
          </button>

          <button
            onClick={() => setActiveFilter('APPOINTMENT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 ${
              activeFilter === 'APPOINTMENT'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <Stethoscope size={13}/> كشوفات العيادة ({history.filter(i => i.type === 'APPOINTMENT').length})
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="بحث في السجل المرضي..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1 transition-all shrink-0"
            title="تبديل ترتيب التاريخ"
          >
            <ArrowUpDown size={13} />
            <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </button>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block p-6 bg-white border-b border-gray-300">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">مركز الهدايه الطبى</h1>
            <p className="text-sm font-bold text-gray-600">السجل الطبي الشامل للمريض (Medical Records Ledger)</p>
          </div>
          <div className="text-left font-mono text-xs text-gray-500">
            <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
            <div>وحدة الكلى والرعاية الأساسية</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold">
          <div><span className="text-gray-500">اسم المريض:</span> {patient.name}</div>
          <div><span className="text-gray-500">السن:</span> {calculateAge(patient.date_of_birth)}</div>
          <div><span className="text-gray-500">الرقم القومي:</span> {patient.national_id || '—'}</div>
          <div><span className="text-gray-500">فصيلة الدم:</span> {patient.blood_type || '—'}</div>
        </div>
      </div>

      {/* Main Content Area: Table View OR Timeline View */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
             <Loader2 className="animate-spin text-primary-600" size={42}/>
             <p className="font-black text-gray-400 text-sm">جاري تحميل السجل الطبي للمريض...</p>
          </div>
        ) : viewMode === 'table' ? (
          /* ========================================================================= */
          /*                           1. عرض الجدول العادي                              */
          /* ========================================================================= */
          <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header info bar of the table */}
            <div className="p-4 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-800 text-sm flex items-center gap-1.5">
                  <TableIcon size={16} className="text-primary-600" />
                  جدول السجل المرضي العام
                </span>
                <span className="bg-primary-50 text-primary-800 border border-primary-100 px-2.5 py-0.5 rounded-full font-extrabold text-[11px]">
                  {filteredHistory.length} سجل طبي
                </span>
              </div>
              <div className="text-gray-400 font-bold text-[11px]">
                انقر على أي صف أو زر المعاينة لعرض كافة تفاصيل السجل الطبي
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-100/75 text-gray-700 font-black text-xs border-b border-gray-200">
                    <th className="p-3.5 text-center w-12">#</th>
                    <th className="p-3.5 w-36">التاريخ والوقت</th>
                    <th className="p-3.5 w-44">نوع السجل الطبي</th>
                    <th className="p-3.5 min-w-[200px]">الشكوى والبيان الأساسي</th>
                    <th className="p-3.5 min-w-[220px]">التشخيص والفحص السريري والمؤشرات</th>
                    <th className="p-3.5 min-w-[220px]">العلاج والخطة والإجراءات</th>
                    <th className="p-3.5 w-36">الطبيب / المسؤول</th>
                    <th className="p-3.5 text-center w-28">الحالة</th>
                    <th className="p-3.5 text-center w-36 no-print">إجراءات ومعاينة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-16 text-center text-gray-400 font-bold italic">
                        <History size={40} className="mx-auto mb-3 opacity-30 text-gray-400" />
                        لا توجد سجلات تطابق معايير البحث أو التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, index) => {
                      const { findings, events } = parseExamData(item);

                      return (
                        <tr 
                          key={item.id || index}
                          onClick={() => setSelectedRecordForDetails(item)}
                          className="hover:bg-primary-50/20 transition-colors cursor-pointer group"
                        >
                          {/* 1. الرقم التسلسلي */}
                          <td className="p-3.5 text-center font-mono font-bold text-gray-400 group-hover:text-primary-600">
                            {index + 1}
                          </td>

                          {/* 2. التاريخ والوقت */}
                          <td className="p-3.5">
                            <div className="font-mono font-black text-gray-900 text-xs flex items-center gap-1">
                              <Calendar size={13} className="text-gray-400" />
                              {item.date || '—'}
                            </div>
                            {(item.start_time || item.time) && (
                              <div className="font-mono text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                <Clock size={11} />
                                {item.start_time ? `${item.start_time} - ${item.end_time || '...'}` : item.time}
                              </div>
                            )}
                          </td>

                          {/* 3. نوع السجل الطبي */}
                          <td className="p-3.5">
                            {item.type === 'PHYSICAL_EXAM' && (
                              <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <ClipboardList size={13} className="text-purple-600 shrink-0" />
                                <span>فحص شامل وتاريخ مرضي</span>
                              </span>
                            )}
                            {item.type === 'VISIT' && (
                              <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <FileText size={13} className="text-teal-600 shrink-0" />
                                <span>نموذج التردد (زيارة)</span>
                              </span>
                            )}
                            {item.type === 'SESSION' && (
                              <span className="px-2.5 py-1 bg-primary-50 text-primary-800 border border-primary-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <Activity size={13} className="text-primary-600 shrink-0" />
                                <span>جلسة غسيل كلوي</span>
                              </span>
                            )}
                            {item.type === 'LAB' && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <Beaker size={13} className="text-emerald-600 shrink-0" />
                                <span>تحليل مخبري</span>
                              </span>
                            )}
                            {item.type === 'APPOINTMENT' && (
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <Stethoscope size={13} className="text-indigo-600 shrink-0" />
                                <span>كشف عيادة</span>
                              </span>
                            )}
                            {item.type === 'INVOICE' && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-black inline-flex items-center gap-1.5 shadow-2xs">
                                <Receipt size={13} className="text-amber-600 shrink-0" />
                                <span>فاتورة خدمات</span>
                              </span>
                            )}
                          </td>

                          {/* 4. الشكوى والبيان الأساسي */}
                          <td className="p-3.5">
                            {item.type === 'PHYSICAL_EXAM' && (
                              <div className="space-y-0.5">
                                <div className="text-gray-900 font-extrabold">
                                  {item.chief_complaint || 'فحص شامل وتاريخ مرضي أولي'}
                                </div>
                                {item.allergy && (
                                  <div className="text-rose-600 text-[11px] font-bold">
                                    حساسية: {item.allergy}
                                  </div>
                                )}
                                {item.previous_operations && (
                                  <div className="text-gray-500 text-[11px]">
                                    عمليات: {item.previous_operations}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'VISIT' && (
                              <div className="space-y-0.5">
                                <div className="text-teal-950 font-black">
                                  {item.visit_type_code ? `[${item.visit_type_code}] ` : ''}
                                  {item.visit_type_name || 'زيارة واستشارة'}
                                </div>
                                <div className="text-gray-700 text-xs">
                                  <span className="text-gray-400">الشكوى:</span> {item.patient_complaint || '—'}
                                </div>
                              </div>
                            )}
                            {item.type === 'SESSION' && (
                              <div className="space-y-0.5">
                                <div className="text-gray-900 font-extrabold">
                                  الغرفة: {item.room || '—'} | الماكينة: {item.machine || '—'}
                                </div>
                                <div className="text-gray-500 text-[11px]">
                                  {item.notes || 'جلسة غسيل كلوي اعتيادية'}
                                </div>
                              </div>
                            )}
                            {item.type === 'LAB' && (
                              <div className="font-extrabold text-emerald-950 text-xs">
                                {item.lab_test_definitions?.name || 'تحليل معملي'}
                              </div>
                            )}
                            {item.type === 'APPOINTMENT' && (
                              <div className="space-y-0.5">
                                <div className="text-indigo-950 font-extrabold">
                                  عيادة {item.clinics?.name || 'التخصصية'}
                                </div>
                                <div className="text-gray-500 text-[11px]">
                                  سبب الزيارة: {item.reason || 'كشف ومتابعة'}
                                </div>
                              </div>
                            )}
                            {item.type === 'INVOICE' && (
                              <div className="text-gray-800 font-bold">
                                فاتورة رسوم وخدمات #{item.id?.slice?.(0, 6) || '—'}
                              </div>
                            )}
                          </td>

                          {/* 5. التشخيص والفحص السريري والمؤشرات */}
                          <td className="p-3.5">
                            {item.type === 'PHYSICAL_EXAM' && (
                              <div className="space-y-1">
                                {findings ? (
                                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                                    {findings.vital_bp && (
                                      <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 font-mono">
                                        الضغط: {findings.vital_bp}
                                      </span>
                                    )}
                                    {findings.vital_pulse && (
                                      <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 font-mono">
                                        النبض: {findings.vital_pulse}
                                      </span>
                                    )}
                                    {findings.vital_weight && (
                                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                                        {findings.vital_weight} كجم
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">تم تسجيل الفحص</span>
                                )}
                                {events.length > 0 && (
                                  <div className="text-[11px] text-amber-800 font-bold">
                                    {events.length} أحداث طبية هامة مسجلة
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'VISIT' && (
                              <div className="space-y-0.5">
                                <div className="text-teal-900 font-extrabold">
                                  <span className="text-gray-400">التشخيص:</span> {item.diagnosis || '—'}
                                </div>
                                {item.clinical_examination && (
                                  <div className="text-gray-600 text-[11px] truncate max-w-xs">
                                    <span className="text-gray-400">الفحص:</span> {item.clinical_examination}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'SESSION' && (
                              <div className="space-y-0.5">
                                <div className="text-rose-600 font-mono font-black text-xs">
                                  ضغط الدم: {item.blood_pressure || '—'}
                                </div>
                                <div className="text-indigo-600 text-[11px] font-bold">
                                  ق: {item.weight_before || '--'} | ب: {item.weight_after || '--'} كجم
                                </div>
                              </div>
                            )}
                            {item.type === 'LAB' && (
                              <div className="space-y-0.5">
                                <div className="text-emerald-700 font-mono font-black text-sm">
                                  النتيجة: {item.result}
                                </div>
                                {(item.lab_test_definitions?.normal_range || item.normal_range) && (
                                  <div className="text-gray-400 text-[10px] font-mono">
                                    المعدل الطبيعي: {item.lab_test_definitions?.normal_range || item.normal_range}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'APPOINTMENT' && (
                              <div className="text-gray-800 font-bold">
                                {item.diagnosis || 'قيد الفحص والتشخيص'}
                              </div>
                            )}
                            {item.type === 'INVOICE' && (
                              <div className="font-mono font-black text-amber-700">
                                {item.total_amount} ج.م
                              </div>
                            )}
                          </td>

                          {/* 6. العلاج والخطة والإجراءات */}
                          <td className="p-3.5">
                            {item.type === 'PHYSICAL_EXAM' && (
                              <div className="space-y-0.5">
                                {item.current_medications ? (
                                  <div className="text-purple-900 font-bold text-xs truncate max-w-xs">
                                    <span className="text-purple-400 text-[10px]">الأدوية:</span> {item.current_medications}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">لا توجد أدوية مزمنة مسجلة</span>
                                )}
                                {item.family_history && (
                                  <div className="text-gray-500 text-[10px] truncate max-w-xs">
                                    تاريخ العائلة: {item.family_history}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'VISIT' && (
                              <div className="space-y-0.5">
                                <div className="text-blue-900 font-bold text-xs">
                                  <span className="text-gray-400">العلاج:</span> {item.management_plan || '—'}
                                </div>
                                {item.investigations_requested && (
                                  <div className="text-amber-800 text-[11px] truncate max-w-xs">
                                    <span className="text-gray-400">الفحوصات:</span> {item.investigations_requested}
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === 'SESSION' && (
                              <div className="text-gray-600 text-xs">
                                {item.notes || 'إجراء جلسة الغسيل المعتادة'}
                              </div>
                            )}
                            {item.type === 'LAB' && (
                              <div className="text-gray-500 text-xs">
                                {item.notes || 'تم اعتماد النتيجة من المعمل'}
                              </div>
                            )}
                            {item.type === 'APPOINTMENT' && (
                              <div className="text-indigo-900 font-bold text-xs truncate max-w-xs">
                                {item.prescription || '—'}
                              </div>
                            )}
                            {item.type === 'INVOICE' && (
                              <div className="text-gray-500 text-[11px]">
                                طريقة الدفع: {item.payment_method || 'نقدي (كاش)'}
                              </div>
                            )}
                          </td>

                          {/* 7. الطبيب / المسؤول */}
                          <td className="p-3.5 font-bold text-gray-800">
                            {item.type === 'PHYSICAL_EXAM' && (
                              <div className="text-purple-900 font-black">
                                {item.doctor_name ? `د/ ${item.doctor_name}` : 'طبيب الوحدة'}
                              </div>
                            )}
                            {item.type === 'VISIT' && (
                              <div className="text-teal-900 font-black">
                                {item.doctor_signature ? `د/ ${item.doctor_signature}` : 'طبيب الزيارة'}
                              </div>
                            )}
                            {item.type === 'SESSION' && (
                              <div className="text-gray-600">فريق الكلى</div>
                            )}
                            {item.type === 'LAB' && (
                              <div className="text-emerald-900">أخصائي المعمل</div>
                            )}
                            {item.type === 'APPOINTMENT' && (
                              <div className="text-indigo-900 font-black">
                                {item.doctors?.name ? `د/ ${item.doctors.name}` : 'طبيب العيادة'}
                              </div>
                            )}
                            {item.type === 'INVOICE' && (
                              <div className="text-gray-500">الاستقبال والمالية</div>
                            )}
                          </td>

                          {/* 8. الحالة */}
                          <td className="p-3.5 text-center">
                            {item.type === 'SESSION' ? (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black inline-block ${
                                item.status === 'FINISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : item.status === 'ACTIVE'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {item.status === 'FINISHED' ? 'مكتملة' : item.status === 'ACTIVE' ? 'قيد المعالجة' : 'انتظار'}
                              </span>
                            ) : item.type === 'LAB' ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black inline-block">
                                معتمد
                              </span>
                            ) : item.type === 'VISIT' ? (
                              <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-black inline-block">
                                مسجلة
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-black inline-block">
                                مكتمل
                              </span>
                            )}
                          </td>

                          {/* 9. الإجراءات والمعاينة */}
                          <td className="p-3.5 text-center no-print" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedRecordForDetails(item)}
                                className="p-1.5 bg-gray-50 hover:bg-primary-50 text-gray-600 hover:text-primary-700 rounded-lg border border-gray-200 transition-all"
                                title="معاينة تفاصيل هذا السجل"
                              >
                                <Eye size={14} />
                              </button>

                              {item.type === 'PHYSICAL_EXAM' && (
                                <button
                                  onClick={() => openExamModalWithTab(item, 'full')}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs"
                                  title="فتح النموذج الكامل للفحص الشامل"
                                >
                                  النموذج
                                </button>
                              )}

                              {item.type === 'VISIT' && (
                                <button
                                  onClick={() => setShowVisitsModal(true)}
                                  className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 shadow-xs"
                                  title="فتح وتعديل نموذج التردد"
                                >
                                  التردد
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /*                       2. عرض المخطط الزمني (Timeline)                      */
          /* ========================================================================= */
          <div className="relative max-w-5xl mx-auto py-6">
             {/* Timeline Center Line */}
             <div className="absolute right-8 md:right-1/2 top-4 bottom-4 w-1 bg-gradient-to-b from-primary-200 via-primary-500 to-primary-200 rounded-full opacity-25 hidden md:block"></div>

             <div className="space-y-12">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item, idx) => {
                    const { findings: parsedFindings, events: parsedSignificantEvents } = parseExamData(item);

                    return (
                    <div key={item.id || idx} className={`flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-6 duration-500`}>
                      {/* Content Card */}
                      <div className="flex-1 w-full">
                         <div className={`bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-lg transition-all relative group ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                            {/* Floating Type Badge */}
                            <div className={`absolute -top-3.5 ${idx % 2 === 0 ? 'left-8' : 'right-8'} px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider text-white shadow-md flex items-center gap-1.5 ${
                              item.type === 'SESSION' ? 'bg-primary-600' :
                              item.type === 'LAB' ? 'bg-emerald-600' :
                              item.type === 'APPOINTMENT' ? 'bg-indigo-600' :
                              item.type === 'PHYSICAL_EXAM' ? 'bg-purple-600' :
                              item.type === 'VISIT' ? 'bg-teal-600' :
                              'bg-amber-600'
                            }`}>
                              {item.type === 'SESSION' ? <Activity size={12}/> :
                               item.type === 'LAB' ? <Beaker size={12}/> :
                               item.type === 'APPOINTMENT' ? <Stethoscope size={12}/> :
                               item.type === 'PHYSICAL_EXAM' ? <ClipboardList size={12}/> :
                               item.type === 'VISIT' ? <FileText size={12}/> :
                               <Receipt size={12}/>}
                              <span>
                                {item.type === 'SESSION' ? 'جلسة غسيل كلوي' :
                                 item.type === 'LAB' ? 'نتائج مخبرية' :
                                 item.type === 'APPOINTMENT' ? 'كشف عيادة' :
                                 item.type === 'PHYSICAL_EXAM' ? 'نموذج الفحص الشامل' :
                                 item.type === 'VISIT' ? 'نموذج التردد (زيارة)' :
                                 'فاتورة خدمات'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-4">
                               <div className="flex items-center justify-between">
                                  <div className="text-xl font-black text-primary-600 font-mono italic flex items-center gap-1.5">
                                    <Calendar size={15} />
                                    {item.date}
                                  </div>
                                  {item.type === 'SESSION' && (
                                    <div className="text-xs font-bold text-gray-400 font-mono">
                                      {item.start_time} - {item.end_time || '--:--'}
                                    </div>
                                  )}
                               </div>

                               {/* VISIT Card */}
                               {item.type === 'VISIT' && (
                                 <div className="space-y-3 text-right" dir="rtl">
                                    <div className="flex items-center justify-between border-b pb-2">
                                       <div className="flex items-center gap-2">
                                          <div className="p-2 bg-teal-100 text-teal-800 rounded-xl"><FileText size={18}/></div>
                                          <div>
                                             <h4 className="font-black text-gray-800 text-sm">
                                               {item.visit_type_code ? `[${item.visit_type_code}] ` : ''}
                                               {item.visit_type_name || 'نموذج التردد والاستشارة'}
                                             </h4>
                                             <p className="text-[11px] text-teal-700 font-bold">{item.doctor_signature ? `د/ ${item.doctor_signature}` : 'طبيب الزيارة'}</p>
                                          </div>
                                       </div>
                                       <button
                                         onClick={() => setShowVisitsModal(true)}
                                         className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                                       >
                                         <Eye size={12}/> عرض وتعديل النموذج
                                       </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                       <div className="p-2.5 bg-teal-50/60 rounded-xl border border-teal-100">
                                          <span className="text-[10px] text-teal-700 font-black block">الشكوى:</span>
                                          <span className="font-bold text-gray-900">{item.patient_complaint || '—'}</span>
                                       </div>
                                       <div className="p-2.5 bg-white rounded-xl border border-gray-100">
                                          <span className="text-[10px] text-gray-500 font-black block">التشخيص:</span>
                                          <span className="font-bold text-teal-900">{item.diagnosis || '—'}</span>
                                       </div>
                                       <div className="p-2.5 bg-white rounded-xl border border-gray-100 col-span-full">
                                          <span className="text-[10px] text-blue-600 font-black block">العلاج والخطة والإجراءات:</span>
                                          <span className="font-bold text-gray-800">{item.management_plan || '—'}</span>
                                       </div>
                                    </div>
                                 </div>
                               )}

                               {/* SESSION Card */}
                               {item.type === 'SESSION' && (
                                 <div className="space-y-4 text-right" dir="rtl">
                                    <div className="p-4 bg-primary-50 rounded-2xl flex justify-around items-center">
                                       <div className="text-center">
                                          <div className="text-[10px] text-gray-400 font-black mb-1">الوزن</div>
                                          <div className="text-lg font-black text-primary-600">{item.weight_before || '--'} <span className="text-[10px]">كجم</span></div>
                                       </div>
                                       <div className="w-px h-8 bg-primary-200"></div>
                                       <div className="text-center">
                                          <div className="text-[10px] text-gray-400 font-black mb-1">الضغط</div>
                                          <div className="text-lg font-black text-rose-600 font-mono">{item.blood_pressure || '—'}</div>
                                       </div>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed font-medium">{item.notes || 'لا توجد ملاحظات سريرية مسجلة.'}</p>
                                 </div>
                               )}

                               {/* LAB Card */}
                               {item.type === 'LAB' && (
                                 <div className="space-y-3 text-right" dir="rtl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Beaker size={20}/></div>
                                       <h4 className="font-black text-gray-800">{item.lab_test_definitions?.name || 'تحليل مخبري'}</h4>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-2xl flex justify-between items-center">
                                       <span className="text-xs font-black text-emerald-800">النتيجة:</span>
                                       <span className="text-lg font-black text-emerald-600 font-mono">{item.result}</span>
                                    </div>
                                 </div>
                               )}

                               {/* APPOINTMENT Card */}
                               {item.type === 'APPOINTMENT' && (
                                 <div className="space-y-4 text-right" dir="rtl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Stethoscope size={20}/></div>
                                       <div>
                                          <h4 className="font-black text-gray-800">عيادة {item.clinics?.name}</h4>
                                          <p className="text-xs text-indigo-500 font-bold">بإشراف د/ {item.doctors?.name || 'طبيب العيادة'}</p>
                                       </div>
                                    </div>
                                    <div className="space-y-2">
                                       <div className="p-3 bg-gray-50 rounded-2xl">
                                          <div className="text-[10px] font-black text-gray-400 mb-1">التشخيص:</div>
                                          <p className="text-xs text-gray-700 font-bold">{item.diagnosis || 'قيد الانتظار...'}</p>
                                       </div>
                                       {item.prescription && (
                                         <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                            <div className="text-[10px] font-black text-indigo-400 mb-1">الروشتة والعلاج:</div>
                                            <p className="text-xs text-indigo-800 leading-relaxed font-bold">{item.prescription}</p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                               )}

                               {/* INVOICE Card */}
                               {item.type === 'INVOICE' && (
                                 <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100 text-right" dir="rtl">
                                    <div className="flex items-center gap-3">
                                       <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl"><Receipt size={20}/></div>
                                       <div className="text-xs font-black text-gray-700">فاتورة خدمات #{item.id?.slice(0, 6)}</div>
                                    </div>
                                    <div className="text-base font-black text-amber-600 font-mono">{item.total_amount} <span className="text-[10px]">ج.م</span></div>
                                 </div>
                               )}

                               {/* PHYSICAL_EXAM Card */}
                               {item.type === 'PHYSICAL_EXAM' && (
                                 <div className="space-y-4 text-right" dir="rtl">
                                    <div className="flex items-center justify-between border-b pb-3">
                                       <div className="flex items-center gap-3">
                                          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl"><ClipboardList size={20}/></div>
                                          <div>
                                             <h4 className="font-black text-gray-800 text-sm">نموذج الفحص الطبي الشامل</h4>
                                             <p className="text-[11px] text-purple-600 font-bold">د/ {item.doctor_name || 'طبيب الوحدة المعتمد'}</p>
                                          </div>
                                       </div>
                                    </div>

                                    <div className="space-y-3">
                                       {/* Section 1: History Overview */}
                                       <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-2">
                                          <div className="flex items-center justify-between">
                                             <span className="text-xs font-black text-indigo-900 flex items-center gap-1">
                                                <Shield size={13} className="text-indigo-600" />
                                                ١. ملخص التاريخ المرضي
                                             </span>
                                             <button 
                                               onClick={() => openExamModalWithTab(item, 'history')}
                                               className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                                             >
                                                <Eye size={11}/> عرض التاريخ
                                             </button>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                             {item.allergy && (
                                                <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                                                   <span className="text-[9px] text-rose-500 font-black block">الحساسية:</span>
                                                   <span className="font-bold text-rose-900">{item.allergy}</span>
                                                </div>
                                             )}
                                             {item.previous_operations && (
                                                <div className="p-2 bg-white rounded-xl border border-gray-100">
                                                   <span className="text-[9px] text-gray-400 font-black block">العمليات:</span>
                                                   <span className="font-bold text-gray-800">{item.previous_operations}</span>
                                                </div>
                                             )}
                                             {item.current_medications && (
                                                <div className="p-2 bg-purple-50/50 rounded-xl border border-purple-100 col-span-full">
                                                   <span className="text-[9px] text-purple-500 font-black block">الأدوية الحالية:</span>
                                                   <span className="font-bold text-purple-900">{item.current_medications}</span>
                                                </div>
                                             )}
                                          </div>
                                       </div>

                                       {/* Section 2: Significant Events */}
                                       <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-2">
                                          <div className="flex items-center justify-between">
                                             <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                                                <FileText size={13} className="text-amber-600" />
                                                ٢. ملخص الأحداث الطبية الهامة
                                             </span>
                                             <button 
                                               onClick={() => openExamModalWithTab(item, 'significant')}
                                               className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                                             >
                                                <Eye size={11}/> عرض الأحداث
                                             </button>
                                          </div>

                                          {Array.isArray(parsedSignificantEvents) && parsedSignificantEvents.length > 0 ? (
                                             <div className="space-y-1.5 text-xs">
                                                {parsedSignificantEvents.slice(0, 2).map((evt: any, eIdx: number) => (
                                                   <div key={eIdx} className="p-2 bg-white rounded-xl border border-amber-100 flex items-center justify-between gap-2">
                                                      <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded shrink-0">{evt.date || '—'}</span>
                                                      <span className="font-bold text-gray-900 truncate">{evt.description || '—'}</span>
                                                   </div>
                                                ))}
                                             </div>
                                          ) : (
                                             <p className="text-[11px] text-gray-400 italic">انقر لإضافة وتدوين الأحداث الطبية الهامة</p>
                                          )}
                                       </div>

                                       {/* Section 3: Clinical Findings */}
                                       <div className="p-3 bg-purple-50/40 rounded-2xl border border-purple-100 space-y-2">
                                          <div className="flex items-center justify-between">
                                             <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                                                <Activity size={13} className="text-purple-600" />
                                                ٣. نتائج الفحص الإكلينيكي
                                             </span>
                                             <button 
                                               onClick={() => openExamModalWithTab(item, 'clinical')}
                                               className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                                             >
                                                <Eye size={11}/> عرض الفحص
                                             </button>
                                          </div>

                                          {parsedFindings ? (
                                             <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                {parsedFindings.vital_bp && (
                                                   <div className="p-2 bg-white rounded-xl border border-purple-100">
                                                      <span className="text-[9px] text-gray-400 font-black block">ضغط الدم</span>
                                                      <span className="font-black text-rose-600 font-mono">{parsedFindings.vital_bp}</span>
                                                   </div>
                                                )}
                                                {parsedFindings.vital_pulse && (
                                                   <div className="p-2 bg-white rounded-xl border border-purple-100">
                                                      <span className="text-[9px] text-gray-400 font-black block">النبض</span>
                                                      <span className="font-black text-purple-700 font-mono">{parsedFindings.vital_pulse}</span>
                                                   </div>
                                                )}
                                                {parsedFindings.vital_weight && (
                                                   <div className="p-2 bg-white rounded-xl border border-purple-100">
                                                      <span className="text-[9px] text-gray-400 font-black block">الوزن</span>
                                                      <span className="font-black text-primary-700">{parsedFindings.vital_weight} كجم</span>
                                                   </div>
                                                )}
                                             </div>
                                          ) : (
                                             <p className="text-[11px] text-gray-400 italic">انقر لعرض الفحص الإكلينيكي الكامل</p>
                                          )}
                                       </div>

                                       <button 
                                         onClick={() => openExamModalWithTab(item, 'full')}
                                         className="w-full py-2.5 bg-gradient-to-r from-purple-800 to-indigo-900 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-sm"
                                       >
                                         <FileText size={15} /> فتح وعرض نموذج الفحص الشامل المكتمل والطباعة
                                       </button>
                                    </div>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>

                      {/* Center Node / Dot */}
                      <div className="w-12 h-12 rounded-full bg-white border-4 border-primary-500 flex items-center justify-center z-10 shadow-lg hidden md:flex shrink-0">
                         <div className="w-3 h-3 rounded-full bg-primary-600 animate-pulse"></div>
                      </div>

                      <div className="flex-1 hidden md:block"></div>
                    </div>
                  );
                })
                ) : (
                  <div className="py-32 text-center text-gray-400 italic font-bold">
                     <History size={48} className="mx-auto mb-3 opacity-20"/>
                     لا توجد سجلات مطابقة في السجل الطبي لهذا المريض
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/*              نافذة معاينة تفاصيل السجل المحدد (Detail Modal)             */}
      {/* ========================================================================= */}
      {selectedRecordForDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-gray-900 via-primary-950 to-gray-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-primary-300">
                  {selectedRecordForDetails.type === 'PHYSICAL_EXAM' ? <ClipboardList size={20}/> :
                   selectedRecordForDetails.type === 'VISIT' ? <FileText size={20}/> :
                   selectedRecordForDetails.type === 'SESSION' ? <Activity size={20}/> :
                   selectedRecordForDetails.type === 'LAB' ? <Beaker size={20}/> :
                   selectedRecordForDetails.type === 'APPOINTMENT' ? <Stethoscope size={20}/> :
                   <Receipt size={20}/>}
                </div>
                <div>
                  <h3 className="text-base font-black">
                    تفاصيل السجل الطبي - {
                      selectedRecordForDetails.type === 'PHYSICAL_EXAM' ? 'الفحص الطبي الشامل والتاريخ المرضي' :
                      selectedRecordForDetails.type === 'VISIT' ? 'نموذج التردد والزيارات' :
                      selectedRecordForDetails.type === 'SESSION' ? 'جلسة غسيل كلوي' :
                      selectedRecordForDetails.type === 'LAB' ? 'تحليل مخبري' :
                      selectedRecordForDetails.type === 'APPOINTMENT' ? 'كشف عيادة' :
                      'فاتورة خدمات'
                    }
                  </h3>
                  <p className="text-xs text-gray-300 font-mono mt-0.5">
                    التاريخ: {selectedRecordForDetails.date} {selectedRecordForDetails.time || selectedRecordForDetails.start_time ? `• الوقت: ${selectedRecordForDetails.start_time || selectedRecordForDetails.time}` : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRecordForDetails(null)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all"
              >
                <X size={18}/>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar text-xs font-bold text-gray-700">
              {/* Patient Basic Info Strip */}
              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center">
                <div>
                  <span className="text-gray-400 block text-[10px]">المريض</span>
                  <span className="font-black text-gray-900 text-sm">{patient.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">الرقم القومي</span>
                  <span className="font-mono text-gray-700">{patient.national_id || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">السن</span>
                  <span className="text-gray-700">{calculateAge(patient.date_of_birth)}</span>
                </div>
              </div>

              {/* Specific Details Rendering */}
              {selectedRecordForDetails.type === 'PHYSICAL_EXAM' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-100">
                      <span className="text-rose-600 block text-[10px] font-black">الحساسية المعروفة (Allergies)</span>
                      <span className="text-gray-900 font-bold">{selectedRecordForDetails.allergy || 'لا توجد حساسية مسجلة'}</span>
                    </div>
                    <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                      <span className="text-purple-600 block text-[10px] font-black">العمليات الجراحية السابقة</span>
                      <span className="text-gray-900 font-bold">{selectedRecordForDetails.previous_operations || 'لا توجد'}</span>
                    </div>
                    <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 col-span-full">
                      <span className="text-indigo-600 block text-[10px] font-black">الأدوية الحالية المستمرة</span>
                      <span className="text-gray-900 font-bold">{selectedRecordForDetails.current_medications || 'لا توجد أدوية مسجلة'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 col-span-full">
                      <span className="text-gray-500 block text-[10px] font-black">تاريخ العائلة الصحي (Family History)</span>
                      <span className="text-gray-900 font-bold">{selectedRecordForDetails.family_history || 'لا يوجد'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => {
                        const item = selectedRecordForDetails;
                        setSelectedRecordForDetails(null);
                        openExamModalWithTab(item, 'full');
                      }}
                      className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs transition-all shadow-sm"
                    >
                      فتح النموذج الكامل وطباعة الفحص الشامل
                    </button>
                  </div>
                </div>
              )}

              {selectedRecordForDetails.type === 'VISIT' && (
                <div className="space-y-3">
                  <div className="p-3 bg-teal-50/60 rounded-2xl border border-teal-100">
                    <span className="text-teal-700 block text-[10px] font-black">نوع الزيارة والاستشارة</span>
                    <span className="text-teal-950 font-black text-sm">
                      {selectedRecordForDetails.visit_type_code ? `[${selectedRecordForDetails.visit_type_code}] ` : ''}
                      {selectedRecordForDetails.visit_type_name || 'زيارة واستشارة'}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-gray-200">
                    <span className="text-gray-400 block text-[10px]">شكوى المريض (Patient Complaint)</span>
                    <p className="text-gray-900 text-xs font-bold leading-relaxed mt-1">
                      {selectedRecordForDetails.patient_complaint || '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-2xl border border-gray-200">
                    <span className="text-gray-400 block text-[10px]">الفحص السريري الإكلينيكي (Clinical Examination)</span>
                    <p className="text-gray-900 text-xs font-bold leading-relaxed mt-1">
                      {selectedRecordForDetails.clinical_examination || '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-teal-50/40 rounded-2xl border border-teal-100">
                    <span className="text-teal-800 block text-[10px] font-black">التشخيص الطبي المعتمد (Diagnosis)</span>
                    <p className="text-teal-950 text-xs font-black leading-relaxed mt-1">
                      {selectedRecordForDetails.diagnosis || '—'}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/40 rounded-2xl border border-blue-100">
                    <span className="text-blue-800 block text-[10px] font-black">العلاج والخطة والإجراءات (Management Plan)</span>
                    <p className="text-blue-950 text-xs font-bold leading-relaxed mt-1">
                      {selectedRecordForDetails.management_plan || '—'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">الفحوصات المطلوبة</span>
                      <span className="text-gray-900">{selectedRecordForDetails.investigations_requested || 'لا توجد'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">جهة الإحالة (إن وجدت)</span>
                      <span className="text-gray-900">{selectedRecordForDetails.referral_destination || 'لا توجد'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center">
                    <span className="text-gray-500 font-bold">توقيع واسم الطبيب:</span>
                    <span className="font-black text-gray-900">
                      {selectedRecordForDetails.doctor_signature ? `د/ ${selectedRecordForDetails.doctor_signature}` : '—'}
                    </span>
                  </div>

                  <div className="pt-2 border-t">
                    <button
                      onClick={() => {
                        setSelectedRecordForDetails(null);
                        setShowVisitsModal(true);
                      }}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FileText size={15} /> فتح وتعديل جدول نموذج التردد بالكامل
                    </button>
                  </div>
                </div>
              )}

              {selectedRecordForDetails.type === 'SESSION' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100">
                      <span className="text-gray-400 block text-[10px]">الغرفة والماكينة</span>
                      <span className="font-black text-primary-900 text-sm">{selectedRecordForDetails.room || '—'}</span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                      <span className="text-rose-500 block text-[10px] font-black">ضغط الدم</span>
                      <span className="font-black text-rose-700 text-sm font-mono">{selectedRecordForDetails.blood_pressure || '—'}</span>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <span className="text-indigo-500 block text-[10px] font-black">الوزن قبل / بعد</span>
                      <span className="font-black text-indigo-900 text-sm">{selectedRecordForDetails.weight_before || '--'} / {selectedRecordForDetails.weight_after || '--'}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <span className="text-emerald-600 block text-[10px] font-black">الحالة</span>
                      <span className="font-black text-emerald-900 text-sm">{selectedRecordForDetails.status || 'مكتملة'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                    <span className="text-gray-400 block text-[10px]">ملاحظات الجلسة</span>
                    <p className="text-gray-900 font-bold text-xs mt-1">{selectedRecordForDetails.notes || 'لا توجد ملاحظات خاصة.'}</p>
                  </div>
                </div>
              )}

              {selectedRecordForDetails.type === 'LAB' && (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center">
                    <div>
                      <span className="text-emerald-700 block text-[10px] font-black">اسم التحليل</span>
                      <span className="font-black text-emerald-950 text-base">{selectedRecordForDetails.lab_test_definitions?.name || 'تحليل مخبري'}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-emerald-700 block text-[10px] font-black">النتيجة المسجلة</span>
                      <span className="font-black text-emerald-600 text-xl font-mono">{selectedRecordForDetails.result}</span>
                    </div>
                  </div>

                  {(selectedRecordForDetails.lab_test_definitions?.normal_range || selectedRecordForDetails.normal_range) && (
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center">
                      <span className="text-gray-500 font-bold">المعدل الطبيعي (Reference Range):</span>
                      <span className="font-mono text-gray-800">{selectedRecordForDetails.lab_test_definitions?.normal_range || selectedRecordForDetails.normal_range}</span>
                    </div>
                  )}

                  {selectedRecordForDetails.notes && (
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                      <span className="text-gray-400 block text-[10px]">ملاحظات أخصائي المعمل</span>
                      <p className="text-gray-900 font-bold text-xs mt-1">{selectedRecordForDetails.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedRecordForDetails.type === 'APPOINTMENT' && (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                    <div>
                      <span className="text-indigo-600 block text-[10px]">العيادة والتخصص</span>
                      <span className="font-black text-indigo-950 text-sm">عيادة {selectedRecordForDetails.clinics?.name || 'التخصصية'}</span>
                    </div>
                    <div>
                      <span className="text-indigo-600 block text-[10px]">الطبيب المشرف</span>
                      <span className="font-black text-indigo-900">{selectedRecordForDetails.doctors?.name ? `د/ ${selectedRecordForDetails.doctors.name}` : 'طبيب العيادة'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200">
                    <span className="text-gray-400 block text-[10px]">التشخيص الطبي</span>
                    <p className="text-gray-900 font-bold text-xs mt-1">{selectedRecordForDetails.diagnosis || '—'}</p>
                  </div>

                  {selectedRecordForDetails.prescription && (
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                      <span className="text-indigo-600 block text-[10px] font-black">الروشتة والعلاج</span>
                      <p className="text-indigo-950 font-bold text-xs mt-1 leading-relaxed">{selectedRecordForDetails.prescription}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecordForDetails(null)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-black text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Physical Exam Modal */}
      <HistoryPhysicalModal 
        isOpen={showAddExamModal}
        onClose={() => setShowAddExamModal(false)}
        patient={patient}
        onSaved={fetchHistory}
        initialTab={selectedExamInitialTab}
      />

      {/* View Physical Exam Modal */}
      {selectedExamForView && (
        <HistoryPhysicalModal 
          isOpen={!!selectedExamForView}
          onClose={() => setSelectedExamForView(null)}
          patient={patient}
          onSaved={fetchHistory}
          viewExamData={selectedExamForView}
          initialTab={selectedExamInitialTab}
        />
      )}

      {/* Visits Form Modal */}
      <VisitsFormModal
        isOpen={showVisitsModal}
        onClose={() => setShowVisitsModal(false)}
        patient={patient}
        onVisitsUpdated={fetchHistory}
      />
    </div>
  );
};

export default PatientTimeline;
