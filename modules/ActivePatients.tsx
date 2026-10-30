import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../store.ts';
import { DialysisSession, Patient, Service, Store, DialysisFallRiskReview } from '../types.ts';
import { calculateAge, ROOMS } from '../constants.ts';
import { 
  Loader2, Activity, MapPin, Clock, HeartPulse, Scale, 
  User, FilePlus, X, CheckCircle, Package, ListChecks, 
  Stethoscope, Search, Filter, RefreshCw, Sparkles, 
  Building2, ShieldCheck, Phone, CheckCircle2, AlertCircle,
  ShieldAlert, BellRing, Scissors
} from 'lucide-react';
import DialysisNursingAssessmentModal from '../components/DialysisNursingAssessmentModal.tsx';
import DialysisFallRiskReviewModal from '../components/DialysisFallRiskReviewModal.tsx';
import { realtimeNotificationService } from '../services/realtimeNotificationService.ts';
import { classifyAndDeduplicateSessions, isRecordDateInPast } from '../utils/permissions.ts';

const parseTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const getLocalTodayDateStr = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const ActivePatients: React.FC = () => {
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [pendingRoomsBySession, setPendingRoomsBySession] = useState<Record<string, string>>({});
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WAITING' | 'ABANDONED'>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [fundingFilter, setFundingFilter] = useState<string>('ALL');

  // Fall Risk Reviews State
  const [fallReviewsBySession, setFallReviewsBySession] = useState<Record<string, DialysisFallRiskReview[]>>({});
  const [selectedSessionForFallRisk, setSelectedSessionForFallRisk] = useState<any | null>(null);
  const [initialFallStage, setInitialFallStage] = useState<'2_HOURS' | '4_HOURS' | 'EXTRA'>('2_HOURS');

  // Modals
  const [selectedSessionForReport, setSelectedSessionForReport] = useState<any | null>(null);
  const [selectedSessionForNursing, setSelectedSessionForNursing] = useState<any | null>(null);
  const [nursingAssessmentInitialTab, setNursingAssessmentInitialTab] = useState<'assessment' | 'fall_risk' | 'lines' | 'notes_plan' | 'ews' | 'pain_glucose_med' | 'medication' | 'education'>('assessment');
  const [nursingAssessmentInitialFallStage, setNursingAssessmentInitialFallStage] = useState<'2_HOURS' | '4_HOURS' | 'EXTRA'>('2_HOURS');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});

  // Vascular Access Disconnection States
  const [disconnectingSession, setDisconnectingSession] = useState<any | null>(null);
  const [quickDisconnectionTime, setQuickDisconnectionTime] = useState<string>('');
  const [reportDisconnectionTime, setReportDisconnectionTime] = useState<string>('');
  const [reportEndTime, setReportEndTime] = useState<string>('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sess, serv, stor] = await Promise.all([
        DB.getSessions(),
        DB.getServices(),
        DB.getStores()
      ]);
      const todayStr = getLocalTodayDateStr();
      const classified = classifyAndDeduplicateSessions(sess || [], todayStr);
      const current = classified.allNonCompletedSessions;

      setAllSessions(current);
      setServices(serv || []);
      setStores(stor || []);

      // Load Fall Risk Reviews for currently active sessions
      const activeIds = classified.currentActiveSessions.filter(s => s.id).map(s => s.id);
      if (activeIds.length > 0) {
        try {
          const fallReviews = await DB.getFallRiskReviewsForSessions(activeIds);
          const reviewsMap: Record<string, DialysisFallRiskReview[]> = {};
          (fallReviews || []).forEach((r: DialysisFallRiskReview) => {
            if (!reviewsMap[r.session_id]) reviewsMap[r.session_id] = [];
            reviewsMap[r.session_id].push(r);
          });
          setFallReviewsBySession(reviewsMap);
        } catch (err) {
          console.warn("Could not fetch fall reviews:", err);
        }
      } else {
        setFallReviewsBySession({});
      }
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || 'تعذر تحميل بيانات الجلسات الحالية. يرجى المحاولة مرة أخرى.');
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

  // Helper to compute session fall risk status & countdown with strict local timezone & data quality validation
  const getSessionFallRiskStatus = (session: any) => {
    if (session.status !== 'ACTIVE') {
      return {
        elapsedMinutes: null as number | null,
        isValidDuration: false,
        hasDataQualityIssue: false,
        dataQualityWarning: '',
        has2H: false,
        has4H: false,
        is2HDue: false,
        is4HDue: false,
        isOverdue: false,
        reviewsCount: 0
      };
    }

    const reviews = fallReviewsBySession[session.id] || [];
    const has2H = reviews.some(r => r.review_stage === '2_HOURS');
    const has4H = reviews.some(r => r.review_stage === '4_HOURS');

    const now = new Date();
    const todayStr = getLocalTodayDateStr();
    const sessionDateStr = typeof session.date === 'string' ? session.date.trim().slice(0, 10) : '';

    let startDateTime: Date | null = null;
    let hasDataQualityIssue = false;
    let dataQualityWarning = '';

    // Parse start_time and date in local timezone
    if (session.start_time && typeof session.start_time === 'string') {
      const timeMatch = session.start_time.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      const dateMatch = (sessionDateStr || todayStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (timeMatch && dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const day = parseInt(dateMatch[3], 10);
        const hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        if (hours >= 0 && hours <= 23 && mins >= 0 && mins <= 59) {
          const parsedLocal = new Date(year, month - 1, day, hours, mins, secs);
          if (!isNaN(parsedLocal.getTime())) {
            startDateTime = parsedLocal;
          }
        }
      }
    }

    if (!startDateTime) {
      hasDataQualityIssue = true;
      dataQualityWarning = 'تحذير جودة بيانات: وقت بدء الجلسة غير مسجل أو بتنسيق غير صالح';
    } else {
      const rawDiffMinutes = Math.floor((now.getTime() - startDateTime.getTime()) / 60000);
      // A valid active dialysis session must not be from a stale historical date (> 12 hours / 720 mins) or in the future
      if (sessionDateStr && sessionDateStr < todayStr && rawDiffMinutes > 720) {
        hasDataQualityIssue = true;
        dataQualityWarning = `تحذير جودة بيانات: جلسة مسجلة بتاريخ سابق (${sessionDateStr}) — لا يتم إصدار تنبيه حرج من بيانات تاريخية/تجريبية قديمة`;
      } else if (rawDiffMinutes > 720) {
        hasDataQualityIssue = true;
        dataQualityWarning = 'تحذير جودة بيانات: وقت بدء الجلسة يتجاوز الحد الزمني المنطقي للجلسة النشطة';
      } else if (rawDiffMinutes < -5) {
        hasDataQualityIssue = true;
        dataQualityWarning = 'تحذير جودة بيانات: وقت بدء الجلسة مسجل في المستقبل';
      } else {
        const elapsedMinutes = Math.max(0, rawDiffMinutes);
        const is2HDue = elapsedMinutes >= 120 && !has2H;
        const is4HDue = elapsedMinutes >= 240 && !has4H;
        const isOverdue = is2HDue || is4HDue;

        return {
          elapsedMinutes,
          isValidDuration: true,
          hasDataQualityIssue: false,
          dataQualityWarning: '',
          has2H,
          has4H,
          is2HDue,
          is4HDue,
          isOverdue,
          reviewsCount: reviews.length
        };
      }
    }

    return {
      elapsedMinutes: null as number | null,
      isValidDuration: false,
      hasDataQualityIssue,
      dataQualityWarning,
      has2H,
      has4H,
      is2HDue: false,
      is4HDue: false,
      isOverdue: false,
      reviewsCount: reviews.length
    };
  };

  // Summary counts (aligned with the exact deduplicated allSessions list and separating old abandoned records)
  const stats = useMemo(() => {
    const todayStr = getLocalTodayDateStr();
    const classified = classifyAndDeduplicateSessions(allSessions, todayStr);
    const total = classified.allNonCompletedSessions.length;
    const active = classified.currentActiveSessions.length;
    const waiting = classified.currentWaitingSessions.length;
    const abandoned = classified.abandonedOldSessions.length;
    
    let fallRiskOverdue = 0;
    let dataQualityIssuesCount = abandoned;
    classified.currentActiveSessions.forEach(s => {
      const st = getSessionFallRiskStatus(s);
      if (st.isOverdue) fallRiskOverdue++;
      if (st.hasDataQualityIssue) dataQualityIssuesCount++;
    });

    return { total, active, waiting, abandoned, fallRiskOverdue, dataQualityIssuesCount };
  }, [allSessions, fallReviewsBySession]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const todayStr = getLocalTodayDateStr();
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

      // 2. Status filter (aligned with stats.active, stats.waiting, stats.abandoned)
      const isOldAbandoned = isRecordDateInPast(session.date, todayStr);
      if (statusFilter === 'ACTIVE') {
        if (isOldAbandoned || session.status !== 'ACTIVE') return false;
      } else if (statusFilter === 'WAITING') {
        if (isOldAbandoned || session.status !== 'WAITING') return false;
      } else if (statusFilter === 'ABANDONED') {
        if (!isOldAbandoned) return false;
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
    const selectedRoom = (session.room || pendingRoomsBySession[session.id] || '').trim();
    if (!selectedRoom) {
      alert("لا يمكن بدء الجلسة بدون تحديد الغرفة / القاعة أولاً. يرجى اختيار الغرفة ثم الضغط على بدء الجلسة.");
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const localHHMMSS = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      await DB.updateSession(session.id, { 
        status: 'ACTIVE',
        room: selectedRoom,
        date: session.date || getLocalTodayDateStr(),
        start_time: localHHMMSS
      });
      await load();
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

    const effectiveRoom = (selectedSessionForReport.room || target.room?.value || '').trim();
    if (!effectiveRoom) {
      alert("يرجى تحديد الغرفة / القاعة قبل إنهاء الجلسة وحفظ التقرير.");
      return;
    }

    const startTimeStr = selectedSessionForReport.start_time;
    const disconnectionTimeStr = reportDisconnectionTime || target.disconnectionTime?.value || '';
    const endTimeStr = reportEndTime || target.endTime?.value || '';

    const startMins = parseTimeToMinutes(startTimeStr);
    const discMins = parseTimeToMinutes(disconnectionTimeStr);
    const endMins = parseTimeToMinutes(endTimeStr);

    if (endMins === null) {
      alert("يرجى إدخال وقت انتهاء الجلسة بصيغة صحيحة.");
      return;
    }

    if (startMins !== null && endMins <= startMins) {
      alert(`خطأ في التحقق من الوقت: وقت انتهاء الجلسة (${endTimeStr}) يجب أن يكون بعد وقت بدء الجلسة (${startTimeStr.slice(0, 5)}).`);
      return;
    }

    if (discMins !== null) {
      if (startMins !== null && discMins < startMins) {
        alert(`خطأ في التحقق من الوقت: وقت فك الوصلة (${disconnectionTimeStr}) لا يمكن أن يكون قبل وقت بدء الجلسة (${startTimeStr.slice(0, 5)}).`);
        return;
      }
      if (endMins < discMins) {
        alert(`خطأ في التحقق من الوقت: وقت انتهاء الجلسة (${endTimeStr}) يجب أن يكون في أو بعد وقت فك الوصلة (${disconnectionTimeStr}).`);
        return;
      }
    }

    try {
      await DB.finishSession(selectedSessionForReport.id, {
        service_id: selectedService?.id,
        room: effectiveRoom,
        blood_pressure: target.bp.value,
        weight_after: target.weightAfter?.value ? parseFloat(target.weightAfter.value) : null,
        disconnection_time: disconnectionTimeStr || new Date().toTimeString().slice(0, 5),
        end_time: endTimeStr,
        notes: target.notes.value,
        custom_data: customFieldsData
      }, target.storeId.value);

      alert("تم إنهاء الجلسة، تسجيل التقرير الطبي وتوثيق وقت فك الوصلة وخصم المستهلكات بنجاح.");
      setSelectedSessionForReport(null);
      setSelectedService(null);
      setCustomFieldsData({});
      await load();
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

          {stats.fallRiskOverdue > 0 && (
            <div className="bg-rose-50 px-4 py-2.5 rounded-2xl border border-rose-200 flex items-center gap-2.5 animate-pulse">
              <ShieldAlert size={18} className="text-rose-600" />
              <div>
                <p className="text-[10px] text-rose-600 font-bold uppercase">مراجعات سقوط مستحقة</p>
                <p className="text-base font-black text-rose-800 leading-tight">{stats.fallRiskOverdue} مريض</p>
              </div>
            </div>
          )}

          <button
            onClick={() => realtimeNotificationService.simulateTestAlert('fall_risk_check')}
            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-2xs"
            title="إرسال تجربة تنبيه لتمريض الصالة لمراجعة إجراءات الوقاية من السقوط"
          >
            <BellRing size={15} className="text-amber-600" />
            <span>تجربة تنبيه الصالة</span>
          </button>

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

      {/* Load Error Banner with Retry */}
      {loadError && (
        <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-3xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-900">
            <AlertCircle size={22} className="text-rose-600 shrink-0" />
            <div>
              <h4 className="font-black text-sm">حدث خطأ أثناء تحميل بيانات الجلسات</h4>
              <p className="text-xs font-bold text-rose-700 mt-0.5">{loadError}</p>
            </div>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <RefreshCw size={14} /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* Fall Risk Overdue Warning Banner */}
      {stats.fallRiskOverdue > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-300 p-4 rounded-3xl shadow-sm flex items-center justify-between gap-4 flex-wrap animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md animate-bounce">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="font-black text-sm text-amber-950">
                تنبيه تمريض الصالة: حان موعد مراجعة إجراءات الوقاية من السقوط ({stats.fallRiskOverdue} مريض)
              </h4>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                تقتضي معايير السلامة مراجعة وتوثيق إجراءات أمان السرير، الفرامل، وتثبيت التنبيه مرتين بالجلسة (كل ساعتين).
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-amber-900 bg-white/80 px-3.5 py-1.5 rounded-xl border border-amber-200/80">
            انقر على زر "مراجعة إجراءات السقوط" ببطاقة المريض المعني أدناه للتوثيق الفوري وإلغاء التنبيه.
          </div>
        </div>
      )}

      {/* Data Quality Warning Banner for Stale/Test Sessions */}
      {stats.dataQualityIssuesCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-black">تحذير جودة بيانات ({stats.dataQualityIssuesCount} جلسة): </span>
              <span className="font-bold">توجد جلسات مسجلة كنشطة بتاريخ سابق أو وقت بدء غير صالح؛ تم إيقاف إصدار التنبيهات الحرجة التلقائية عنها لحين مراجعة السجل.</span>
            </div>
          </div>
        </div>
      )}

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
          <div className="md:col-span-4 flex items-center gap-1.5 p-1 bg-gray-100/80 rounded-2xl flex-wrap">
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
              في الجلسة الآن ({stats.active})
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
            {stats.abandoned > 0 && (
              <button
                onClick={() => setStatusFilter('ABANDONED')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  statusFilter === 'ABANDONED'
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-amber-800 hover:text-slate-900'
                }`}
              >
                متروكة ({stats.abandoned})
              </button>
            )}
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
        {filteredSessions.map(session => {
          const fallStatus = getSessionFallRiskStatus(session);
          const isOldAbandonedSession = isRecordDateInPast(session.date, getLocalTodayDateStr());

          return (
            <div 
              key={session.id} 
              className={`bg-white p-7 rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group ${
                isOldAbandonedSession
                  ? 'border-amber-300 bg-amber-50/10'
                  : fallStatus.isOverdue
                  ? 'border-rose-300 ring-2 ring-rose-500/20'
                  : session.status === 'ACTIVE' 
                  ? 'border-emerald-200' 
                  : 'border-amber-200'
              }`}
            >
              <div 
                className={`absolute top-0 right-0 w-36 h-36 rounded-full -mr-16 -mt-16 transition-colors ${
                  isOldAbandonedSession
                    ? 'bg-amber-50'
                    : fallStatus.isOverdue
                    ? 'bg-rose-50'
                    : session.status === 'ACTIVE' 
                    ? 'bg-emerald-50 group-hover:bg-emerald-100' 
                    : 'bg-amber-50 group-hover:bg-amber-100'
                }`}
              />
              
              <div className="relative z-10 flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3.5">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-md border-2 ${
                      isOldAbandonedSession
                        ? 'bg-amber-700 border-amber-200 text-white'
                        : fallStatus.isOverdue
                        ? 'bg-rose-600 border-rose-200 text-white'
                        : session.status === 'ACTIVE' 
                        ? 'bg-emerald-600 border-emerald-100 text-white' 
                        : 'bg-amber-600 border-amber-100 text-white'
                    } shrink-0`}
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

                <div className="flex flex-col items-end gap-1">
                  <div 
                    className={`text-[11px] font-black px-3 py-1 rounded-full shrink-0 flex items-center gap-1.5 shadow-sm ${
                      isOldAbandonedSession
                        ? 'text-amber-900 bg-amber-100 border border-amber-300'
                        : session.status === 'ACTIVE' 
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                        : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isOldAbandonedSession ? 'bg-amber-600' : session.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                    {isOldAbandonedSession
                      ? `جلسة قديمة متروكة (${session.date})`
                      : session.status === 'ACTIVE'
                      ? 'في الجلسة الآن'
                      : 'في قائمة الانتظار'}
                  </div>

                  {!isOldAbandonedSession && fallStatus.isOverdue && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1 animate-pulse">
                      <AlertCircle size={11} /> مراجعة سقوط مستحقة!
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10 text-xs">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1">
                    <MapPin size={11} className="text-primary-500" /> الغرفة / القاعة
                  </div>
                  {session.room ? (
                    <div className="font-black text-gray-800 text-sm">{session.room}</div>
                  ) : session.status === 'WAITING' ? (
                    <select
                      value={pendingRoomsBySession[session.id] || ''}
                      onChange={(e) => setPendingRoomsBySession(prev => ({ ...prev, [session.id]: e.target.value }))}
                      className="w-full mt-0.5 p-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-gray-800 outline-none focus:border-primary-600"
                    >
                      <option value="">-- اختر الغرفة --</option>
                      {ROOMS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="font-black text-amber-700 text-xs">غير محدد</div>
                  )}
                </div>
                
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="text-[10px] text-gray-400 font-black mb-1 flex items-center gap-1">
                    <Clock size={11} className="text-primary-500" /> {session.status === 'ACTIVE' ? 'وقت البدء' : 'وقت الوصول'}
                  </div>
                  <div className="font-black text-gray-800 text-sm">{session.start_time || '---'}</div>
                  {session.date && (
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">{session.date}</div>
                  )}
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

                {/* Vascular Access Disconnection Status & Action */}
                {session.status === 'ACTIVE' && (
                  <div className={`p-3 rounded-2xl border col-span-2 flex items-center justify-between transition-all ${
                    session.disconnection_time 
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        session.disconnection_time ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                      }`}>
                        <Scissors size={15} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-400">وقت فك الوصلة</div>
                        <div className="font-mono font-black text-xs">
                          {session.disconnection_time ? (
                            <span className="text-blue-700">{session.disconnection_time} (تم فك الوصلة)</span>
                          ) : (
                            <span className="text-slate-500 font-sans text-[11px]">لم تُفك بعد (المريض متصل)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDisconnectingSession(session);
                        setQuickDisconnectionTime(session.disconnection_time || new Date().toTimeString().slice(0, 5));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                        session.disconnection_time
                          ? 'bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                      title="تسجيل أو تعديل وقت فك الوصلة"
                    >
                      <Clock size={13} />
                      <span>{session.disconnection_time ? 'تعديل الوقت' : 'فك الوصلة الآن'}</span>
                    </button>
                  </div>
                )}

                {/* Periodic Fall Risk Status Box (Twice per session / Every 2 hours) */}
                {session.status === 'ACTIVE' && (
                  <div className={`p-3.5 rounded-2xl border col-span-2 space-y-2 ${
                    fallStatus.hasDataQualityIssue
                      ? 'bg-slate-50 border-amber-300'
                      : fallStatus.isOverdue 
                      ? 'bg-rose-50/70 border-rose-300' 
                      : 'bg-amber-50/60 border-amber-200/80'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black flex items-center gap-1.5 text-slate-800">
                        <ShieldAlert size={14} className={fallStatus.isOverdue ? 'text-rose-600' : 'text-amber-600'} />
                        مراجعة السقوط (كل ساعتين):
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={11} />{' '}
                        {fallStatus.isValidDuration && fallStatus.elapsedMinutes !== null
                          ? `${fallStatus.elapsedMinutes} دقيقة`
                          : 'تاريخ/وقت غير صالح للحساب'}
                      </span>
                    </div>

                    {fallStatus.hasDataQualityIssue ? (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-start gap-2">
                        <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span>{fallStatus.dataQualityWarning}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        {/* 2-Hour Stage */}
                        <div className={`p-2 rounded-xl border flex items-center justify-between ${
                          fallStatus.has2H
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : fallStatus.is2HDue
                            ? 'bg-rose-100 border-rose-300 text-rose-800 font-black animate-pulse'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <span className="font-bold">ساعتان (T+2h)</span>
                          {fallStatus.has2H ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-700">
                              <CheckCircle2 size={12} /> مكتملة
                            </span>
                          ) : fallStatus.is2HDue ? (
                            <span className="text-[10px] font-black text-rose-700 flex items-center gap-0.5">
                              <AlertCircle size={12} /> مطلوبة!
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              بعد {Math.max(0, 120 - (fallStatus.elapsedMinutes || 0))} د
                            </span>
                          )}
                        </div>

                        {/* 4-Hour Stage */}
                        <div className={`p-2 rounded-xl border flex items-center justify-between ${
                          fallStatus.has4H
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : fallStatus.is4HDue
                            ? 'bg-rose-100 border-rose-300 text-rose-800 font-black animate-pulse'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          <span className="font-bold">4 ساعات (T+4h)</span>
                          {fallStatus.has4H ? (
                            <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-700">
                              <CheckCircle2 size={12} /> مكتملة
                            </span>
                          ) : fallStatus.is4HDue ? (
                            <span className="text-[10px] font-black text-rose-700 flex items-center gap-0.5">
                              <AlertCircle size={12} /> مطلوبة!
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              قبل الإنهاء
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mt-5">
                {/* Fall Risk Review Quick Action Button - Opens Integrated Assessment on Fall Risk Tab */}
                {session.status === 'ACTIVE' && (
                  <button 
                    onClick={() => {
                      setNursingAssessmentInitialTab('fall_risk');
                      setNursingAssessmentInitialFallStage((fallStatus.elapsedMinutes || 0) >= 240 ? '4_HOURS' : '2_HOURS');
                      setSelectedSessionForNursing(session);
                    }}
                    className={`w-full py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all border shadow-xs ${
                      fallStatus.isOverdue
                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-md shadow-rose-600/30 animate-pulse'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200/90'
                    }`}
                  >
                    <ShieldAlert size={15} className={fallStatus.isOverdue ? 'text-white' : 'text-amber-600'} />
                    <span>
                      {fallStatus.isOverdue 
                        ? '⚠️ مطلوب مراجعة وتوثيق إجراءات السقوط الآن!' 
                        : 'مراجعة وتوثيق إجراءات الوقاية من السقوط'}
                    </span>
                  </button>
                )}

                <button 
                  onClick={() => {
                    setNursingAssessmentInitialTab('assessment');
                    setSelectedSessionForNursing(session);
                  }}
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
                    onClick={() => {
                      setSelectedSessionForReport(session);
                      setReportDisconnectionTime(session.disconnection_time || new Date().toTimeString().slice(0, 5));
                      setReportEndTime(new Date().toTimeString().slice(0, 5));
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <FilePlus size={16} /> إنهاء الجلسة وإضافة تقرير
                  </button>
                )}
              </div>
            </div>
          );
        })}

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

      {/* Comprehensive Dialysis Nursing Assessment Modal (Integrated Fall Risk & Disconnection) */}
      {selectedSessionForNursing && (
        <DialysisNursingAssessmentModal 
          session={selectedSessionForNursing}
          initialTab={nursingAssessmentInitialTab}
          initialFallStage={nursingAssessmentInitialFallStage}
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

                 {/* Disconnection Time & Session End Time */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                   <div className="space-y-1.5">
                     <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                         <Scissors size={14} className="text-blue-600" />
                         وقت فك الوصلة
                       </label>
                       <button
                         type="button"
                         onClick={() => setReportDisconnectionTime(new Date().toTimeString().slice(0, 5))}
                         className="text-[10px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                       >
                         الآن
                       </button>
                     </div>
                     <input 
                       type="time" 
                       name="disconnectionTime" 
                       required 
                       value={reportDisconnectionTime}
                       onChange={(e) => setReportDisconnectionTime(e.target.value)}
                       className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white font-bold outline-none focus:border-blue-500 font-mono text-sm text-blue-900" 
                     />
                     <p className="text-[10px] text-slate-400 font-bold">وقت فصل خطوط الدم وبدء الضغط لوقف النزيف.</p>
                   </div>

                   <div className="space-y-1.5">
                     <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                         <Clock size={14} className="text-emerald-600" />
                         وقت انتهاء الجلسة
                       </label>
                       <button
                         type="button"
                         onClick={() => setReportEndTime(new Date().toTimeString().slice(0, 5))}
                         className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                       >
                         الآن
                       </button>
                     </div>
                     <input 
                       type="time" 
                       name="endTime" 
                       required 
                       value={reportEndTime}
                       onChange={(e) => setReportEndTime(e.target.value)}
                       className="w-full border-2 border-slate-200 rounded-xl p-3 bg-white font-bold outline-none focus:border-emerald-500 font-mono text-sm text-emerald-900" 
                     />
                     <p className="text-[10px] text-slate-400 font-bold">وقت مغادرة المريض لصالة الغسيل.</p>
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

      {/* Periodic Fall Risk Review Modal */}
      {selectedSessionForFallRisk && (
        <DialysisFallRiskReviewModal
          session={selectedSessionForFallRisk}
          initialStage={initialFallStage}
          onClose={() => setSelectedSessionForFallRisk(null)}
          onSuccess={load}
        />
      )}

      {/* Quick Disconnection Recording Modal */}
      {disconnectingSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border">
            <div className="p-6 bg-blue-600 text-white flex justify-between items-center rounded-t-[2.5rem]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Scissors size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">توثيق وقت فك الوصلة</h3>
                  <p className="text-xs opacity-80 mt-0.5">{disconnectingSession.patients?.name}</p>
                </div>
              </div>
              <button onClick={() => setDisconnectingSession(null)} className="text-white/80 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">الغرفة: {disconnectingSession.room || 'غير محدد'}</span>
                <span className="font-mono font-bold text-slate-600">بدء الجلسة: {disconnectingSession.start_time || '—'}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">وقت فك الوصلة (Disconnection Time)</label>
                  <button
                    type="button"
                    onClick={() => setQuickDisconnectionTime(new Date().toTimeString().slice(0, 5))}
                    className="text-[11px] font-black text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200"
                  >
                    الآن ({new Date().toTimeString().slice(0, 5)})
                  </button>
                </div>
                <input
                  type="time"
                  required
                  className="w-full border-2 border-slate-200 rounded-2xl p-3.5 bg-slate-50 font-bold font-mono text-center text-lg outline-none focus:border-blue-500 text-blue-900"
                  value={quickDisconnectionTime}
                  onChange={(e) => setQuickDisconnectionTime(e.target.value)}
                />
                <p className="text-[11px] text-slate-400 font-medium">
                  يُسجل هذا الوقت عند فصل خطوط الدم وإزالة الإبر أو فك القسطرة والبدء في إجراءات الضغط لوقف النزيف.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisconnectingSession(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const timeToSave = quickDisconnectionTime || new Date().toTimeString().slice(0, 5);
                      const startMins = parseTimeToMinutes(disconnectingSession.start_time);
                      const discMins = parseTimeToMinutes(timeToSave);
                      if (discMins === null) {
                        alert('يرجى إدخال وقت فك الوصلة بصيغة صحيحة.');
                        return;
                      }
                      if (startMins !== null && discMins < startMins) {
                        alert(`لا يمكن أن يكون وقت فك الوصلة (${timeToSave}) قبل وقت بدء الجلسة (${disconnectingSession.start_time.slice(0, 5)}).`);
                        return;
                      }
                      await DB.recordDisconnectionTime(disconnectingSession.id, timeToSave);
                      setDisconnectingSession(null);
                      await load();
                    } catch (err: any) {
                      alert('فشل حفظ وقت فك الوصلة: ' + (err.message || 'خطأ غير معروف'));
                    }
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={16} />
                  تأكيد وحفظ الوقت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivePatients;
