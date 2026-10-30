import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { DialysisSession, DialysisFallRiskReview } from '../types.ts';
import { 
  ShieldAlert, CheckCircle2, AlertTriangle, Clock, 
  User, Check, X, Loader2, BedDouble, BellRing, 
  Footprints, HelpCircle, Eye, AlertOctagon, Sparkles,
  History, Info
} from 'lucide-react';

interface DialysisFallRiskReviewModalProps {
  session: any;
  initialStage?: '2_HOURS' | '4_HOURS' | 'EXTRA';
  onClose: () => void;
  onSuccess?: () => void;
}

const DialysisFallRiskReviewModal: React.FC<DialysisFallRiskReviewModalProps> = ({
  session,
  initialStage = '2_HOURS',
  onClose,
  onSuccess
}) => {
  const [stage, setStage] = useState<'2_HOURS' | '4_HOURS' | 'EXTRA'>(initialStage);
  const [loading, setLoading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(true);
  const [existingReviews, setExistingReviews] = useState<DialysisFallRiskReview[]>([]);
  const [reviewerName, setReviewerName] = useState('تمريض الصالة');
  const [riskLevel, setRiskLevel] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // 8 Accredited Fall Prevention Precautions
  const [cardPlaced, setCardPlaced] = useState(true);
  const [bedLowBrakesLocked, setBedLowBrakesLocked] = useState(true);
  const [sideRailsRaised, setSideRailsRaised] = useState(true);
  const [callBellWithinReach, setCallBellWithinReach] = useState(true);
  const [safeEnvironmentClear, setSafeEnvironmentClear] = useState(true);
  const [assistedAmbulationOnly, setAssistedAmbulationOnly] = useState(true);
  const [frequentToiletCheck, setFrequentToiletCheck] = useState(true);
  const [patientRelativeEducated, setPatientRelativeEducated] = useState(true);
  const [nonSlipFootwear, setNonSlipFootwear] = useState(true);

  // Calculate elapsed session duration
  const elapsedMinutes = (() => {
    if (!session) return 0;
    const now = new Date();
    let startDateTime: Date | null = null;
    if (session.start_time) {
      const parts = session.start_time.split(':');
      if (parts.length >= 2) {
        const dateStr = session.date || now.toISOString().split('T')[0];
        const parsed = new Date(`${dateStr}T${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`);
        if (!isNaN(parsed.getTime())) startDateTime = parsed;
      }
    }
    if (!startDateTime && session.created_at) {
      const parsed = new Date(session.created_at);
      if (!isNaN(parsed.getTime())) startDateTime = parsed;
    }
    if (startDateTime) {
      const mins = Math.floor((now.getTime() - startDateTime.getTime()) / 60000);
      return mins > 0 ? mins : 0;
    }
    return 0;
  })();

  const hoursElapsed = (elapsedMinutes / 60).toFixed(1);

  useEffect(() => {
    // Auto-select stage based on duration if not explicitly passed
    if (!initialStage) {
      if (elapsedMinutes >= 240) {
        setStage('4_HOURS');
      } else {
        setStage('2_HOURS');
      }
    }
    loadExistingReviews();
  }, [session.id]);

  const loadExistingReviews = async () => {
    setFetchingHistory(true);
    try {
      const list = await DB.getDialysisFallRiskReviews(session.id);
      setExistingReviews(list);
    } catch (e) {
      console.warn("Could not fetch history of reviews:", e);
    } finally {
      setFetchingHistory(false);
    }
  };

  const handleSelectAll = (value: boolean) => {
    setCardPlaced(value);
    setBedLowBrakesLocked(value);
    setSideRailsRaised(value);
    setCallBellWithinReach(value);
    setSafeEnvironmentClear(value);
    setAssistedAmbulationOnly(value);
    setFrequentToiletCheck(value);
    setPatientRelativeEducated(value);
    setNonSlipFootwear(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) {
      alert('يرجى كتابة اسم الممرض / القائم بالمراجعة');
      return;
    }

    setLoading(true);
    try {
      const newReview: any = {
        session_id: session.id,
        patient_id: session.patient_id,
        review_stage: stage,
        review_time: new Date().toISOString(),
        reviewer_name: reviewerName.trim(),
        risk_level: riskLevel,
        risk_score: riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 2 : 1,
        card_placed: cardPlaced,
        bed_low_brakes_locked: bedLowBrakesLocked,
        side_rails_raised: sideRailsRaised,
        call_bell_within_reach: callBellWithinReach,
        safe_environment_clear: safeEnvironmentClear,
        assisted_ambulation_only: assistedAmbulationOnly,
        frequent_toilet_check: frequentToiletCheck,
        patient_relative_educated: patientRelativeEducated,
        non_slip_footwear: nonSlipFootwear,
        clinical_notes: clinicalNotes.trim() || undefined
      };

      await DB.saveDialysisFallRiskReview(newReview);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      alert('فشل حفظ مراجعة مخاطر السقوط: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const patientName = session.patients?.name || 'مريض الغسيل';
  const roomName = session.room || 'الصالة العامة';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-6 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <ShieldAlert size={26} className="text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/40 text-amber-100 border border-amber-400/30">
                    معايير الأمان والسلامة (كل ساعتين)
                  </span>
                  <span className="text-[11px] font-bold text-amber-200">
                    وحدة الغسيل الكلوي
                  </span>
                </div>
                <h3 className="text-xl font-black mt-1 leading-snug">
                  مراجعة إجراءات الوقاية من مخاطر السقوط
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Patient Quick Context Card */}
          <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-black/15 p-2.5 rounded-xl backdrop-blur-xs">
              <p className="text-[10px] text-amber-200 font-bold">اسم المريض</p>
              <p className="font-black truncate text-white mt-0.5">{patientName}</p>
            </div>
            <div className="bg-black/15 p-2.5 rounded-xl backdrop-blur-xs">
              <p className="text-[10px] text-amber-200 font-bold">الغرفة / القاعة</p>
              <p className="font-black text-white mt-0.5">{roomName}</p>
            </div>
            <div className="bg-black/15 p-2.5 rounded-xl backdrop-blur-xs">
              <p className="text-[10px] text-amber-200 font-bold">وقت البدء</p>
              <p className="font-black text-white mt-0.5">{session.start_time || '---'}</p>
            </div>
            <div className="bg-black/15 p-2.5 rounded-xl backdrop-blur-xs">
              <p className="text-[10px] text-amber-200 font-bold">المدة المنقضية</p>
              <p className="font-black text-amber-300 mt-0.5 flex items-center gap-1">
                <Clock size={12} /> {hoursElapsed} ساعة ({elapsedMinutes} د)
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          
          {/* Review Stage Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">
              تحديد مرحلة المراجعة (مرتان خلال الجلسة بمعدل كل ساعتين):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setStage('2_HOURS')}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                  stage === '2_HOURS'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">المراجعة الأولى (ساعتان)</span>
                  {stage === '2_HOURS' && <CheckCircle2 size={16} className="text-amber-600" />}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  منتصف الجلسة (~120 دقيقة)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStage('4_HOURS')}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                  stage === '4_HOURS'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">المراجعة الثانية (4 ساعات)</span>
                  {stage === '4_HOURS' && <CheckCircle2 size={16} className="text-amber-600" />}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  نهاية الجلسة وقبل الفصل والحركة
                </p>
              </button>

              <button
                type="button"
                onClick={() => setStage('EXTRA')}
                className={`p-3 rounded-2xl border-2 text-right transition-all flex flex-col justify-between ${
                  stage === 'EXTRA'
                    ? 'border-amber-600 bg-amber-50/80 text-amber-950 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black">مراجعة إضافية / طارئة</span>
                  {stage === 'EXTRA' && <CheckCircle2 size={16} className="text-amber-600" />}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  عند الدوار أو هبوط الضغط الفجائي
                </p>
              </button>
            </div>
          </div>

          {/* Checklist of Fall Prevention Precautions */}
          <div className="bg-slate-50/90 rounded-3xl p-5 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <BedDouble className="text-amber-600" size={20} />
                <h4 className="text-sm font-black text-slate-800">
                  قائمة إجراءات الوقاية المعتمدة من السقوط
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-200 transition-colors shadow-2xs"
                >
                  تأكيد الكل (آمن)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-500 font-medium rounded-xl border border-slate-200 transition-colors"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Item 1 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                bedLowBrakesLocked ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={bedLowBrakesLocked}
                  onChange={(e) => setBedLowBrakesLocked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">خفض السرير وقفل الفرامل</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    خفض السرير/الكرسي لأدنى مستوى أرضي وتثبيت قفل الفرامل بإحكام.
                  </p>
                </div>
              </label>

              {/* Item 2 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                sideRailsRaised ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={sideRailsRaised}
                  onChange={(e) => setSideRailsRaised(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">رفع وتأمين الحواجز الجانبية</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    رفع جانبي السرير لمنع الانزلاق العفوي أو السقوط أثناء النعاس.
                  </p>
                </div>
              </label>

              {/* Item 3 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                callBellWithinReach ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={callBellWithinReach}
                  onChange={(e) => setCallBellWithinReach(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">جرس الاستدعاء في متناول اليد</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    تثبيت زر النداء بجوار يد المريض والتأكد من عمله وسهولة ضغطه.
                  </p>
                </div>
              </label>

              {/* Item 4 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                safeEnvironmentClear ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={safeEnvironmentClear}
                  onChange={(e) => setSafeEnvironmentClear(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">بيئة آمنة وخالية من العوائق</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    إخلاء مسار الحركة من أسلاك الجهاز، الأنابيب، وأي سوائل مسكوبة.
                  </p>
                </div>
              </label>

              {/* Item 5 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                assistedAmbulationOnly ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={assistedAmbulationOnly}
                  onChange={(e) => setAssistedAmbulationOnly(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">منع القيام منفرداً تماماً</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    إلزام المريض بعدم النهوض إلا بمساعدة ومرافقة التمريض بالصالة.
                  </p>
                </div>
              </label>

              {/* Item 6 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                patientRelativeEducated ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={patientRelativeEducated}
                  onChange={(e) => setPatientRelativeEducated(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">توعية المريض والمرافق بالهبوط</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    التثقيف ضد هبوط الضغط الانتصابي والدوار الناتج عن سحب السوائل.
                  </p>
                </div>
              </label>

              {/* Item 7 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                frequentToiletCheck ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={frequentToiletCheck}
                  onChange={(e) => setFrequentToiletCheck(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">المتابعة والمساعدة لقضاء الحاجة</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    السؤال الدوري عن الحاجة للحمام والمرافقة التمريضية المباشرة.
                  </p>
                </div>
              </label>

              {/* Item 8 */}
              <label className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                nonSlipFootwear ? 'bg-white border-emerald-200 shadow-2xs' : 'bg-slate-100/70 border-slate-200 text-slate-400'
              }`}>
                <input
                  type="checkbox"
                  checked={nonSlipFootwear}
                  onChange={(e) => setNonSlipFootwear(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-black text-slate-800 block">حذاء مانع للانزلاق وبطاقة الخطر</span>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                    ارتداء حذاء مانع للانزلاق وتثبيت بطاقة تعريف خطر السقوط الصفراء.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Risk Level & Reviewer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                تصنيف درجة خطر السقوط للمريض:
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRiskLevel('HIGH')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    riskLevel === 'HIGH'
                      ? 'bg-rose-50 border-rose-300 text-rose-800 font-black shadow-2xs ring-2 ring-rose-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  خطر عالي (High)
                </button>
                <button
                  type="button"
                  onClick={() => setRiskLevel('MEDIUM')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    riskLevel === 'MEDIUM'
                      ? 'bg-amber-50 border-amber-300 text-amber-800 font-black shadow-2xs ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  متوسط (Medium)
                </button>
                <button
                  type="button"
                  onClick={() => setRiskLevel('LOW')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    riskLevel === 'LOW'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black shadow-2xs ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  منخفض (Low)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                اسم الممرض / الممرضة القائم بالمراجعة: <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="مثال: سارة محمد - تمريض الصالة"
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">
              ملاحظات إكلينيكية إضافية (حالة الاتزان، الدوار، أو أي احتياطات إضافية):
            </label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="مثال: المريض متجاوب، تم التأكيد على المرافق بعدم محاولة النهوض، العلامات مستقرة والفرامل مؤمنة."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
            />
          </div>

          {/* History of Reviews for This Session */}
          {existingReviews.length > 0 && (
            <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-900">
                <History size={15} className="text-amber-700" />
                <span>المراجعات المسجلة مسبقاً خلال هذه الجلسة ({existingReviews.length}):</span>
              </div>
              <div className="space-y-1.5">
                {existingReviews.map((rev) => (
                  <div key={rev.id || rev.review_time} className="bg-white p-2.5 rounded-xl border border-amber-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-black text-slate-800">
                        {rev.review_stage === '2_HOURS' ? 'مراجعة الساعتين الأولى' : rev.review_stage === '4_HOURS' ? 'مراجعة 4 ساعات (نهاية الجلسة)' : 'مراجعة إضافية'}
                      </span>
                      <span className="text-slate-400">بواسطة:</span>
                      <span className="font-bold text-slate-700">{rev.reviewer_name}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(rev.review_time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> جاري حفظ وتأكيد المراجعة...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> حفظ وتوثيق المراجعة وإلغاء تنبيه الصالة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DialysisFallRiskReviewModal;
