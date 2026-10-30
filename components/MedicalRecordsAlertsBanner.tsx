import React, { useState, useEffect } from 'react';
import { 
  realtimeNotificationService, 
  ClinicalAlert, 
  RealtimeConnectionStatus 
} from '../services/realtimeNotificationService.ts';
import { 
  AlertTriangle, FlaskConical, HeartPulse, Bell, 
  Volume2, VolumeX, CheckCircle, ChevronDown, ChevronUp, 
  ExternalLink, Sparkles, Activity, ShieldAlert, Clock, 
  X, RefreshCw, Stethoscope, Eye
} from 'lucide-react';

interface MedicalRecordsAlertsBannerProps {
  onOpenComprehensivePatient?: (patient: any) => void;
  onOpenTimelinePatient?: (patient: any) => void;
  allPatients?: any[];
}

export const MedicalRecordsAlertsBanner: React.FC<MedicalRecordsAlertsBannerProps> = ({
  onOpenComprehensivePatient,
  onOpenTimelinePatient,
  allPatients = []
}) => {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('connecting');
  const [lastPing, setLastPing] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [filter, setFilter] = useState<'ALL' | 'LAB' | 'VITALS' | 'UNREAD'>('ALL');
  const [isMuted, setIsMuted] = useState<boolean>(realtimeNotificationService.getIsSoundMuted());
  const [floatingToast, setFloatingToast] = useState<ClinicalAlert | null>(null);

  useEffect(() => {
    // Start real-time engine
    realtimeNotificationService.start();

    // Subscribe to alert updates
    const unsubscribeAlerts = realtimeNotificationService.subscribe((updatedAlerts, newAlert) => {
      setAlerts(updatedAlerts);
      if (newAlert && !newAlert.is_read) {
        setFloatingToast(newAlert);
        // Auto dismiss floating toast after 8 seconds
        setTimeout(() => {
          setFloatingToast(curr => (curr?.id === newAlert.id ? null : curr));
        }, 8000);
      }
    });

    // Subscribe to connection status
    const unsubscribeStatus = realtimeNotificationService.subscribeStatus((status, ping) => {
      setConnectionStatus(status);
      setLastPing(ping);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeStatus();
    };
  }, []);

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.is_read).length;

  const handleToggleSound = () => {
    const isNowMuted = !realtimeNotificationService.toggleSound();
    setIsMuted(isNowMuted);
  };

  const handleAcknowledge = (alertId: string) => {
    const savedUser = localStorage.getItem('dialysis_user');
    let staffName = 'طبيب / تمريض الوحدة';
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.name) staffName = u.name;
      } catch (e) {}
    }
    realtimeNotificationService.acknowledgeAlert(alertId, staffName);
  };

  const handleDismiss = (alertId: string) => {
    realtimeNotificationService.dismissAlert(alertId);
    if (floatingToast?.id === alertId) {
      setFloatingToast(null);
    }
  };

  const handleSimulateAlert = (type: 'urgent_lab' | 'critical_vitals') => {
    realtimeNotificationService.simulateTestAlert(type);
  };

  const findPatientObject = (patientId?: string, patientName?: string) => {
    if (!allPatients || allPatients.length === 0) {
      return patientId ? { id: patientId, name: patientName } : null;
    }
    if (patientId) {
      const found = allPatients.find(p => p.id === patientId);
      if (found) return found;
    }
    if (patientName) {
      const found = allPatients.find(p => p.name?.trim() === patientName?.trim());
      if (found) return found;
    }
    return { id: patientId || 'temp_id', name: patientName || 'المريض' };
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'UNREAD') return !a.is_read;
    if (filter === 'LAB') return a.category === 'URGENT_LAB';
    if (filter === 'VITALS') return a.category === 'CRITICAL_VITALS';
    return true;
  });

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'الآن';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      const diffHours = Math.floor(diffMin / 60);
      return `منذ ${diffHours} ساعة`;
    } catch {
      return 'حديثاً';
    }
  };

  return (
    <div className="w-full space-y-3 no-print" dir="rtl">
      {/* 1. Main Live Banner */}
      <div className={`relative overflow-hidden rounded-3xl border transition-all shadow-sm ${
        criticalCount > 0 
          ? 'bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-red-500/40 text-white' 
          : unreadCount > 0 
          ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 border-amber-500/40 text-white'
          : 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-slate-100'
      }`}>
        <div className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left / Status Section */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border relative ${
              criticalCount > 0 
                ? 'bg-red-500/20 border-red-400 text-red-300 animate-pulse' 
                : unreadCount > 0 
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
            }`}>
              {criticalCount > 0 ? (
                <ShieldAlert size={26} className="animate-bounce" />
              ) : unreadCount > 0 ? (
                <AlertTriangle size={24} />
              ) : (
                <CheckCircle size={24} />
              )}

              {/* Ping Dot for Realtime Connection */}
              <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                connectionStatus === 'websocket_connected'
                  ? 'bg-emerald-400 animate-ping'
                  : connectionStatus === 'polling_active'
                  ? 'bg-cyan-400'
                  : 'bg-amber-400'
              }`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base md:text-lg font-black tracking-tight">
                  نظام الإنذار الإكلينيكي اللحظي (Real-time Clinical Alerts)
                </h3>

                {/* Connection Status Pill */}
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 border border-white/15">
                  <span className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'websocket_connected' 
                      ? 'bg-emerald-400' 
                      : connectionStatus === 'polling_active'
                      ? 'bg-cyan-400'
                      : 'bg-amber-400'
                  }`} />
                  <span>
                    {connectionStatus === 'websocket_connected' 
                      ? 'بث مباشر (WebSocket)' 
                      : connectionStatus === 'polling_active'
                      ? 'استقصاء حي (Polling)'
                      : 'جاري الاتصال...'}
                  </span>
                </div>

                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shadow-sm animate-pulse">
                    {unreadCount} تنبيه عاجل
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <span>
                  {criticalCount > 0 
                    ? `تنبيه: تم رصد ${criticalCount} مؤشرات حرجة أو نتائج تحاليل طارئة تتطلب تدخلاً عاجلاً فورياً.`
                    : unreadCount > 0
                    ? `يوجد ${unreadCount} تنبيهات معملية وحيوية بانتظار المراجعة الطبية.`
                    : 'كافة المؤشرات الحيوية ونتائج التحاليل المستلمة حتى الآن ضمن النطاقات الآمنة.'}
                </span>
                <span className="text-slate-400 text-[10px]">
                  (آخر فحص: {lastPing.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                </span>
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            {/* Audio Toggle */}
            <button
              onClick={handleToggleSound}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                isMuted 
                  ? 'bg-white/5 border-white/15 text-slate-400 hover:text-white' 
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isMuted ? 'تفعيل صوت التنبيه' : 'كتم صوت التنبيه'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="animate-pulse" />}
              <span>{isMuted ? 'صوت مكتوم' : 'الصوت نشط'}</span>
            </button>

            {/* Test Simulation Controls */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-300 px-1 font-bold">تجربة تنبيه:</span>
              <button
                onClick={() => handleSimulateAlert('urgent_lab')}
                className="px-2 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 rounded-lg text-[11px] font-black transition-all flex items-center gap-1"
                title="محاكاة نتيجة معملية حرجة (مثل بوتاسيوم 6.9)"
              >
                <FlaskConical size={12} /> تحليل حرج
              </button>
              <button
                onClick={() => handleSimulateAlert('critical_vitals')}
                className="px-2 py-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 rounded-lg text-[11px] font-black transition-all flex items-center gap-1"
                title="محاكاة مؤشر حيوي حرج (هبوط ضغط حاد)"
              >
                <HeartPulse size={12} /> علامات حيوية
              </button>
            </div>

            {/* Manual Poll/Refresh */}
            <button
              onClick={() => realtimeNotificationService.pollLatestAlerts()}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/15 transition-all"
              title="تحديث واستقصاء لحظي"
            >
              <RefreshCw size={16} />
            </button>

            {/* Expand / Collapse Drawer */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>{isExpanded ? 'إخفاء اللوحة' : `عرض التنبيهات (${alerts.length})`}</span>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Floating Pop-in Toast for newly arrived alert */}
      {floatingToast && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md w-full animate-in slide-in-from-bottom duration-300">
          <div className={`p-4 rounded-2xl shadow-2xl border-2 backdrop-blur-md flex items-start justify-between gap-3 text-white ${
            floatingToast.severity === 'CRITICAL' 
              ? 'bg-red-950/95 border-red-500 shadow-red-950/50' 
              : 'bg-amber-950/95 border-amber-500 shadow-amber-950/50'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-white">
              {floatingToast.category === 'URGENT_LAB' ? <FlaskConical size={20} /> : <HeartPulse size={20} />}
            </div>

            <div className="flex-1 text-right">
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-white/20">
                  {floatingToast.severity === 'CRITICAL' ? 'إنذار فوري حرج' : 'تنبيه عاجل'}
                </span>
                <span className="text-[10px] text-white/70">{formatTimeAgo(floatingToast.timestamp)}</span>
              </div>
              <h4 className="font-bold text-sm text-white mt-1 leading-tight">{floatingToast.title}</h4>
              <p className="text-xs text-white/80 mt-1 line-clamp-2">{floatingToast.message}</p>

              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    const p = findPatientObject(floatingToast.patient_id, floatingToast.patient_name);
                    if (p && onOpenComprehensivePatient) {
                      onOpenComprehensivePatient(p);
                    }
                    setFloatingToast(null);
                  }}
                  className="px-2.5 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm"
                >
                  <Stethoscope size={13} /> فتح الملف
                </button>
                <button
                  onClick={() => {
                    handleAcknowledge(floatingToast.id);
                    setFloatingToast(null);
                  }}
                  className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
                >
                  إقرار الاطلاع
                </button>
              </div>
            </div>

            <button
              onClick={() => setFloatingToast(null)}
              className="text-white/60 hover:text-white p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Expandable Alerts Panel / Drawer */}
      {isExpanded && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-in slide-in-from-top duration-300">
          {/* Header of Drawer */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/70 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-primary-600" />
              <h4 className="font-black text-gray-800 text-sm">
                سجل الإنذارات والمؤشرات الحرجة النشطة
              </h4>
              <span className="text-xs text-gray-400 font-bold">({alerts.length} تنبيه مسجل)</span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-200/60 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'ALL' ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                الكل ({alerts.length})
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filter === 'UNREAD' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                غير المقروءة ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('LAB')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filter === 'LAB' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FlaskConical size={13} /> تحاليل حرجة ({alerts.filter(a => a.category === 'URGENT_LAB').length})
              </button>
              <button
                onClick={() => setFilter('VITALS')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  filter === 'VITALS' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <HeartPulse size={13} /> علامات حيوية ({alerts.filter(a => a.category === 'CRITICAL_VITALS').length})
              </button>
            </div>
          </div>

          {/* Alerts List */}
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <CheckCircle size={40} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-bold text-sm text-gray-600">لا توجد تنبيهات نشطة مطابقة للفلتر المحدد</p>
                <p className="text-xs text-gray-400 mt-1">كافة النتائج والمؤشرات الحيوية تم التعامل معها أو طبيعية.</p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const patientObj = findPatientObject(alert.patient_id, alert.patient_name);

                return (
                  <div 
                    key={alert.id}
                    className={`p-4 md:p-5 transition-all flex flex-col md:flex-row items-start justify-between gap-4 ${
                      !alert.is_read 
                        ? alert.severity === 'CRITICAL' ? 'bg-red-50/50 hover:bg-red-50' : 'bg-amber-50/50 hover:bg-amber-50'
                        : 'bg-white hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Left Icon & Information */}
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${
                        alert.severity === 'CRITICAL' 
                          ? 'bg-red-100 border-red-200 text-red-700' 
                          : 'bg-amber-100 border-amber-200 text-amber-700'
                      }`}>
                        {alert.category === 'URGENT_LAB' ? (
                          <FlaskConical size={22} />
                        ) : (
                          <HeartPulse size={22} />
                        )}
                      </div>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-red-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}>
                            {alert.severity === 'CRITICAL' ? 'حرج جداً' : 'تنبيه عاجل'}
                          </span>

                          <span className="font-mono text-[11px] text-gray-400 flex items-center gap-1">
                            <Clock size={12} /> {formatTimeAgo(alert.timestamp)}
                          </span>

                          {alert.is_read ? (
                            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle size={12} /> مقروء ومُعتمد: {alert.acknowledged_by || 'الطبيب'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-red-600 font-black bg-red-100/70 px-2 py-0.5 rounded border border-red-200 animate-pulse">
                              بانتظار الإقرار السريري
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-black text-gray-900 leading-snug">
                          {alert.title}
                        </h4>

                        <p className="text-xs text-gray-600 font-medium leading-relaxed">
                          {alert.message}
                        </p>

                        {/* Parameter Box */}
                        <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
                          <div className="bg-gray-100 px-3 py-1 rounded-xl border border-gray-200">
                            <span className="text-gray-400 font-bold">المؤشر: </span>
                            <span className="font-black text-gray-800">{alert.parameter_name}</span>
                          </div>

                          <div className={`px-3 py-1 rounded-xl border font-mono font-black ${
                            alert.severity === 'CRITICAL' 
                              ? 'bg-red-100 text-red-800 border-red-300' 
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            <span className="font-sans font-bold text-gray-600">القيمة المسجلة: </span>
                            {alert.recorded_value}
                          </div>

                          {alert.reference_range && (
                            <div className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 text-slate-500">
                              <span className="font-bold">المعدل الطبيعي: </span>
                              <span className="font-mono">{alert.reference_range}</span>
                            </div>
                          )}
                        </div>

                        {/* Clinical Action Recommendation */}
                        {alert.clinical_action && (
                          <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-slate-100 text-xs border border-slate-800 flex items-start gap-2">
                            <Stethoscope size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-amber-300">التوجيه السريري الموصى به: </span>
                              <span className="text-slate-200 font-medium">{alert.clinical_action}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right / Actions Buttons */}
                    <div className="flex md:flex-col items-center gap-2 self-stretch justify-end shrink-0 pt-2 md:pt-0">
                      {/* Open Comprehensive File */}
                      {onOpenComprehensivePatient && patientObj && (
                        <button
                          onClick={() => onOpenComprehensivePatient(patientObj)}
                          className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all"
                          title="فتح الملف الصحي الشامل للمريض مباشرة"
                        >
                          <Stethoscope size={14} />
                          <span>الملف الشامل</span>
                        </button>
                      )}

                      {/* Open Timeline / Sessions */}
                      {onOpenTimelinePatient && patientObj && (
                        <button
                          onClick={() => onOpenTimelinePatient(patientObj)}
                          className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center justify-center gap-1.5 transition-all"
                          title="عرض سجل الجلسات والمؤشرات الحيوية"
                        >
                          <Activity size={14} className="text-primary-600" />
                          <span>سجل الجلسات</span>
                        </button>
                      )}

                      {/* Acknowledge Button */}
                      {!alert.is_read ? (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all"
                          title="تأكيد الاطلاع السريري واستلام الحالة"
                        >
                          <CheckCircle size={14} />
                          <span>إقرار واستلام</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="w-full px-3 py-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                          title="مسح من القائمة"
                        >
                          <X size={14} />
                          <span>إخفاء</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsAlertsBanner;
