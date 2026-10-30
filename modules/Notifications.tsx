import React, { useState, useEffect } from 'react';
import { AR } from '../constants.ts';
import { DB } from '../store.ts';
import { 
  realtimeNotificationService, 
  ClinicalAlert 
} from '../services/realtimeNotificationService.ts';
import { 
  Bell, AlertTriangle, Info, CheckCircle2, Clock, 
  ArrowRight, Loader2, FlaskConical, HeartPulse, 
  Volume2, VolumeX, ShieldAlert, Stethoscope, RefreshCw, X
} from 'lucide-react';

const NotificationsModule: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<ClinicalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LAB' | 'VITALS' | 'FALL_RISK' | 'SYSTEM'>('ALL');
  const [isMuted, setIsMuted] = useState(realtimeNotificationService.getIsSoundMuted());

  useEffect(() => {
    loadNotifications();

    const unsubscribe = realtimeNotificationService.subscribe((alerts) => {
      setLiveAlerts(alerts);
    });

    return () => unsubscribe();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await DB.getNotifications();
      setNotifications(data || []);
    } catch (e: any) {
      console.warn(e);
      setLoadError(e?.message || 'تعذر تحميل الإشعارات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSound = () => {
    const isNowMuted = !realtimeNotificationService.toggleSound();
    setIsMuted(isNowMuted);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
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

  // Combine and deduplicate
  const allMergedAlerts: any[] = [...liveAlerts];
  
  // Add DB notifications that aren't already represented in liveAlerts
  notifications.forEach(n => {
    if (!allMergedAlerts.some(a => a.id === n.id || (a.source_id && a.source_id === n.id))) {
      const meta = n.metadata || {};
      allMergedAlerts.push({
        id: n.id,
        category: n.category || 'SYSTEM',
        severity: n.severity || (n.type === 'error' ? 'CRITICAL' : 'INFO'),
        title: n.title,
        message: n.message,
        patient_name: meta.patient_name || '',
        parameter_name: meta.parameter_name || '',
        recorded_value: meta.recorded_value || '',
        clinical_action: meta.clinical_action || '',
        timestamp: n.created_at || new Date().toISOString(),
        is_read: n.is_read || false,
        acknowledged_by: n.acknowledged_by
      });
    }
  });

  const filteredItems = allMergedAlerts.filter(item => {
    if (activeTab === 'LAB') return item.category === 'URGENT_LAB';
    if (activeTab === 'VITALS') return item.category === 'CRITICAL_VITALS';
    if (activeTab === 'FALL_RISK') return item.category === 'FALL_RISK_CHECK';
    if (activeTab === 'SYSTEM') return item.category !== 'URGENT_LAB' && item.category !== 'CRITICAL_VITALS' && item.category !== 'FALL_RISK_CHECK';
    return true;
  });

  const criticalCount = allMergedAlerts.filter(a => a.severity === 'CRITICAL' && !a.is_read).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16" dir="rtl">
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800 text-sm font-bold">
            <AlertTriangle size={20} className="text-rose-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={loadNotifications}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            criticalCount > 0 ? 'bg-red-50 text-red-600 animate-pulse border border-red-200' : 'bg-primary-50 text-primary-600'
          }`}>
            <Bell size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-black text-gray-800">
                مركز الإشعارات والتنبيهات الإكلينيكية الحية
              </h3>
              {criticalCount > 0 && (
                <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black animate-pulse">
                  {criticalCount} تنبيه حرج
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-bold mt-1">
              متابعة لحظية ومباشرة للنتائج المعملية العاجلة، المؤشرات الحيوية، وتنبيهات مراجعة مخاطر السقوط لتمريض الصالة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={handleToggleSound}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isMuted 
                ? 'bg-gray-100 text-gray-500 border-gray-200' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
            title={isMuted ? 'تفعيل صوت التنبيه' : 'كتم صوت التنبيه'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span>{isMuted ? 'الصوت مكتوم' : 'الصوت نشط'}</span>
          </button>

          <button
            onClick={() => realtimeNotificationService.simulateTestAlert('urgent_lab')}
            className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <FlaskConical size={14} /> تجربة تحليل حرج
          </button>

          <button
            onClick={() => realtimeNotificationService.simulateTestAlert('critical_vitals')}
            className="px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
          >
            <HeartPulse size={14} /> تجربة علامات حيوية
          </button>

          <button
            onClick={() => realtimeNotificationService.simulateTestAlert('fall_risk_check')}
            className="px-3 py-2 bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200 rounded-xl text-xs font-black flex items-center gap-1 transition-all"
          >
            <ShieldAlert size={14} className="text-orange-600" /> تجربة تنبيه سقوط تمريض الصالة
          </button>

          <button 
            onClick={loadNotifications} 
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl border border-gray-200 transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-200/60 rounded-2xl w-fit text-sm font-bold flex-wrap">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'ALL' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          كافة التنبيهات ({allMergedAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab('LAB')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'LAB' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FlaskConical size={16} /> نتائج معملية حرجة ({allMergedAlerts.filter(a => a.category === 'URGENT_LAB').length})
        </button>
        <button
          onClick={() => setActiveTab('VITALS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'VITALS' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <HeartPulse size={16} /> علامات حيوية وإنذار مبكر ({allMergedAlerts.filter(a => a.category === 'CRITICAL_VITALS').length})
        </button>
        <button
          onClick={() => setActiveTab('FALL_RISK')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeTab === 'FALL_RISK' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldAlert size={16} className="text-orange-600" /> مخاطر السقوط / تمريض الصالة ({allMergedAlerts.filter(a => a.category === 'FALL_RISK_CHECK').length})
        </button>
        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`px-4 py-2 rounded-xl transition-all ${
            activeTab === 'SYSTEM' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          إشعارات النظام ({allMergedAlerts.filter(a => a.category !== 'URGENT_LAB' && a.category !== 'CRITICAL_VITALS' && a.category !== 'FALL_RISK_CHECK').length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-gray-100">
          <Loader2 className="animate-spin text-primary-600" size={36} />
          <span className="text-gray-400 font-bold text-sm">جاري تحديث سجل التنبيهات...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center text-gray-400">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-3 opacity-80" />
          <h4 className="text-base font-bold text-gray-700">لا توجد تنبيهات حالياً</h4>
          <p className="text-xs text-gray-400 mt-1">كافة الفحوصات والعمليات تجري بسلاسة وضمن الحدود المعيارية.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isCritical = item.severity === 'CRITICAL';

            return (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col md:flex-row items-start justify-between gap-4 shadow-sm ${
                  !item.is_read 
                    ? isCritical 
                      ? 'bg-red-50/50 border-red-200 hover:border-red-300' 
                      : 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3.5 rounded-2xl shrink-0 mt-0.5 ${
                    isCritical 
                      ? 'bg-red-100 text-red-600 border border-red-200' 
                      : item.category === 'URGENT_LAB' 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                      : item.category === 'CRITICAL_VITALS' 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : item.category === 'FALL_RISK_CHECK'
                      ? 'bg-orange-100 text-orange-700 border border-orange-200'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {item.category === 'URGENT_LAB' ? (
                      <FlaskConical size={24} />
                    ) : item.category === 'CRITICAL_VITALS' ? (
                      <HeartPulse size={24} />
                    ) : item.category === 'FALL_RISK_CHECK' ? (
                      <ShieldAlert size={24} className="text-orange-600" />
                    ) : isCritical ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <Info size={24} />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                        isCritical 
                          ? 'bg-red-600 text-white' 
                          : item.category === 'FALL_RISK_CHECK'
                          ? 'bg-orange-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {isCritical ? 'حرج جداً' : item.category === 'FALL_RISK_CHECK' ? 'إجراء وقائي دوري' : 'تنبيه عاجل'}
                      </span>

                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {item.category === 'URGENT_LAB' 
                          ? 'تحليل معملي حرج' 
                          : item.category === 'CRITICAL_VITALS' 
                          ? 'مؤشر حيوي حرج' 
                          : item.category === 'FALL_RISK_CHECK'
                          ? 'مخاطر السقوط / تمريض الصالة'
                          : item.category}
                      </span>

                      <span className="text-[10px] text-gray-400 flex items-center gap-1 font-bold">
                        <Clock size={11} /> {new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {item.is_read && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> معتمد: {item.acknowledged_by || 'الطبيب'}
                        </span>
                      )}
                    </div>

                    <h4 className="font-black text-gray-800 text-base leading-snug">
                      {item.title}
                    </h4>

                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      {item.message}
                    </p>

                    {(item.patient_name || item.recorded_value) && (
                      <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
                        {item.patient_name && (
                          <div className="bg-white/80 px-2.5 py-1 rounded-lg border border-gray-200 font-bold text-gray-700">
                            المريض: <span className="font-black text-primary-700">{item.patient_name}</span>
                          </div>
                        )}
                        {item.recorded_value && (
                          <div className="bg-red-50 text-red-800 px-2.5 py-1 rounded-lg border border-red-200 font-mono font-bold">
                            القيمة: {item.recorded_value}
                          </div>
                        )}
                      </div>
                    )}

                    {item.clinical_action && (
                      <div className="p-2 bg-slate-900 text-slate-200 text-xs rounded-xl flex items-center gap-2 mt-1">
                        <Stethoscope size={14} className="text-amber-400 shrink-0" />
                        <span><strong className="text-amber-300">التوجيه الإكلينيكي:</strong> {item.clinical_action}</span>
                      </div>
                    )}
                  </div>
                </div>

                {!item.is_read && (
                  <button
                    onClick={() => handleAcknowledgeAlert(item.id)}
                    className="self-end md:self-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <CheckCircle2 size={14} />
                    <span>إقرار واستلام التنبيه</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsModule;
