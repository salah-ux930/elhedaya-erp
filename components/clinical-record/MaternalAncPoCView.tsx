import React, { useState, useMemo } from 'react';
import { 
  HeartHandshake, CalendarCheck, Plus, Trash2, AlertCircle, 
  CheckCircle2, Sparkles, ChevronDown, ChevronUp, Calendar, 
  Clock, ShieldAlert, FileText, ArrowRight, Check, Info, 
  Activity, Stethoscope, Droplets
} from 'lucide-react';
import { ClinicalSectionCard, ClinicalFormField } from './ClinicalFormComponents.tsx';

interface MaternalAncPoCViewProps {
  patient: any;
  activeAppointment?: any;
  ancRecords: any[];
  tableError?: string | null;
  onSaveRecord: (payload: any) => Promise<void>;
  onDeleteRecord: (id: string, label: string) => Promise<void>;
  onBookClinic: () => void;
  isFormDirty: boolean;
  setIsFormDirty: (dirty: boolean) => void;
}

export const MaternalAncPoCView: React.FC<MaternalAncPoCViewProps> = ({
  patient,
  activeAppointment,
  ancRecords,
  tableError,
  onSaveRecord,
  onDeleteRecord,
  onBookClinic,
  isFormDirty,
  setIsFormDirty
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLaboratoriesAccordion, setShowLaboratoriesAccordion] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    gravida: '1',
    para: '0',
    abortions: '0',
    lmp_date: '',
    edd_date: '',
    fundal_height_cm: '',
    fetal_heart_sound: 'إيجابي وطبيعي (120 - 160 نبضة/دقيقة)',
    fetal_movement: 'حركة نشطة وطبيعية (≥ 10 حركات)',
    blood_glucose: '',
    hb_result: '',
    urine_albumin: false,
    supplements: true,
    health_education: '',
    next_visit_date: '',
    doctor_signature: activeAppointment?.doctors?.name ? `د/ ${activeAppointment.doctors.name}` : ''
  });

  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper: Mark dirty on change
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (!isFormDirty) {
      setIsFormDirty(true);
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Auto-calculate Gestational Age from LMP
  const gestationalAge = useMemo(() => {
    if (!formData.lmp_date) return null;
    const lmp = new Date(formData.lmp_date);
    if (isNaN(lmp.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - lmp.getTime();
    if (diffMs < 0) return null;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return { weeks, days, totalDays: diffDays };
  }, [formData.lmp_date]);

  // Naegele's Rule Helper: LMP + 280 days
  const handleAutoCalculateEdd = () => {
    if (!formData.lmp_date) {
      setErrors((prev) => ({ ...prev, lmp_date: 'يرجى تحديد تاريخ أول يوم بآخر دورة (LMP) أولاً' }));
      return;
    }
    const lmp = new Date(formData.lmp_date);
    if (isNaN(lmp.getTime())) return;
    const edd = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000);
    const eddString = edd.toISOString().split('T')[0];
    handleChange('edd_date', eddString);
  };

  // Quick Next Visit Shortcut
  const handleQuickNextVisit = (weeks: number) => {
    const d = new Date();
    d.setDate(d.getDate() + weeks * 7);
    handleChange('next_visit_date', d.toISOString().split('T')[0]);
  };

  // Add Health Education Topic Chip
  const handleAddTopic = (topic: string) => {
    const current = formData.health_education.trim();
    if (current.includes(topic)) return;
    const updated = current ? `${current} • ${topic}` : topic;
    handleChange('health_education', updated);
  };

  // Validate Form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const g = Number(formData.gravida) || 0;
    const p = Number(formData.para) || 0;
    const a = Number(formData.abortions) || 0;

    if (g < 1) {
      newErrors.gravida = 'عدد مرات الحمل يجب أن يكون 1 على الأقل للحامل الحالية';
    }
    if (g < p + a) {
      newErrors.gravida = `عدد مرات الحمل (${g}) لا يمكن أن يقل عن مجموع الولادات (${p}) والإجهاضات (${a})`;
    }

    if (formData.lmp_date) {
      const lmp = new Date(formData.lmp_date);
      const today = new Date();
      if (lmp > today) {
        newErrors.lmp_date = 'تاريخ آخر دورة لا يمكن أن يكون في المستقبل';
      }
    }

    if (formData.lmp_date && formData.edd_date) {
      const lmp = new Date(formData.lmp_date);
      const edd = new Date(formData.edd_date);
      if (edd <= lmp) {
        newErrors.edd_date = 'تاريخ الولادة المتوقع يجب أن يكون بعد تاريخ آخر دورة';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSaveRecord({
        patient_id: patient.id,
        appointment_id: activeAppointment?.id || null,
        gravida: Number(formData.gravida) || 0,
        para: Number(formData.para) || 0,
        abortions: Number(formData.abortions) || 0,
        lmp_date: formData.lmp_date || null,
        edd_date: formData.edd_date || null,
        fundal_height_cm: formData.fundal_height_cm ? Number(formData.fundal_height_cm) : null,
        fetal_heart_sound: formData.fetal_heart_sound || null,
        fetal_movement: formData.fetal_movement || null,
        blood_glucose: formData.blood_glucose ? Number(formData.blood_glucose) : null,
        hb_result: formData.hb_result ? Number(formData.hb_result) : null,
        urine_albumin: Boolean(formData.urine_albumin),
        supplements_prescribed: Boolean(formData.supplements),
        health_education_given: formData.health_education || null,
        next_visit_date: formData.next_visit_date || null,
        doctor_signature: formData.doctor_signature || null
      });

      // Reset form and dirty state
      setIsFormDirty(false);
      setShowAddForm(false);
      setFormData({
        gravida: '1',
        para: '0',
        abortions: '0',
        lmp_date: '',
        edd_date: '',
        fundal_height_cm: '',
        fetal_heart_sound: 'إيجابي وطبيعي (120 - 160 نبضة/دقيقة)',
        fetal_movement: 'حركة نشطة وطبيعية (≥ 10 حركات)',
        blood_glucose: '',
        hb_result: '',
        urine_albumin: false,
        supplements: true,
        health_education: '',
        next_visit_date: '',
        doctor_signature: activeAppointment?.doctors?.name ? `د/ ${activeAppointment.doctors.name}` : ''
      });
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  // Count active fields in Laboratories accordion for badge
  const labFilledCount = useMemo(() => {
    let count = 0;
    if (formData.hb_result) count++;
    if (formData.blood_glucose) count++;
    if (formData.urine_albumin) count++;
    if (formData.supplements) count++;
    if (formData.health_education) count++;
    return count;
  }, [formData]);

  return (
    <div className="space-y-6">
      {/* Tab Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-l from-rose-100/70 via-rose-50/90 to-white border-2 border-rose-200/90 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/20 shrink-0">
            <HeartHandshake size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-rose-950 text-lg">
                متابعة الحمل وصحة الأم (Antenatal Care - Form 6A)
              </h4>
              <span className="text-xs bg-rose-200/70 text-rose-900 px-2.5 py-0.5 rounded-full font-bold">
                نموذج الاعتماد المصري الموحد
              </span>
            </div>
            <p className="text-xs text-rose-800 font-bold mt-1">
              بروتوكول متابعة الحمل الدوري، التاريخ التوليدي (G/P/A)، العلامات الحيوية للجنين، التحاليل الدورية ورعاية ما بعد الولادة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={onBookClinic}
            className="px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <CalendarCheck size={16} />
            <span>حجز عيادة الحوامل</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (showAddForm && isFormDirty) {
                if (!window.confirm('هل تريد إلغاء تسجيل الزيارة؟ ستفقد البيانات غير المحفوظة.')) {
                  return;
                }
                setIsFormDirty(false);
              }
              setShowAddForm(!showAddForm);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
              showAddForm
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                : 'bg-white hover:bg-rose-50 text-rose-800 border border-rose-300'
            }`}
          >
            <Plus size={16} className={showAddForm ? 'rotate-45 transition-transform' : ''} />
            <span>{showAddForm ? 'إلغاء التسجيل' : 'تسجيل متابعة حمل جديدة'}</span>
          </button>
        </div>
      </div>

      {/* ANC Add Form (Progressive Disclosure & Keyboard First) */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
          
          {/* Card 1: التاريخ التوليدي والتواريخ المحورية */}
          <ClinicalSectionCard
            title="1. التاريخ التوليدي ومواعيد الحمل (Obstetric & Gestational Profile)"
            subtitle="الحسابات الزمنية وتواريخ الدورة والولادة المتوقعة"
            icon={Calendar}
            color="rose"
            badge="بيانات أساسية"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ClinicalFormField
                label="عدد مرات الحمل (Gravida)"
                required
                error={errors.gravida}
                helperText="يشمل الحمل الحالي"
              >
                <input
                  name="gravida"
                  type="number"
                  min="1"
                  dir="ltr"
                  value={formData.gravida}
                  onChange={(e) => handleChange('gravida', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={1}
                />
              </ClinicalFormField>

              <ClinicalFormField
                label="عدد مرات الولادة السابقة (Para)"
                required
                helperText="أجنة حية أو ميتة بعد 28 أسبوعاً"
              >
                <input
                  name="para"
                  type="number"
                  min="0"
                  dir="ltr"
                  value={formData.para}
                  onChange={(e) => handleChange('para', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={2}
                />
              </ClinicalFormField>

              <ClinicalFormField
                label="عدد مرات الإجهاض (Abortions)"
                required
                helperText="فقدان الحمل قبل 28 أسبوعاً"
              >
                <input
                  name="abortions"
                  type="number"
                  min="0"
                  dir="ltr"
                  value={formData.abortions}
                  onChange={(e) => handleChange('abortions', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={3}
                />
              </ClinicalFormField>
            </div>

            {/* Dates Grid with Smart Assistant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <ClinicalFormField
                label="تاريخ أول يوم بآخر دورة شهرية (LMP)"
                required
                error={errors.lmp_date}
                helperText="Last Menstrual Period"
              >
                <input
                  name="lmp_date"
                  type="date"
                  dir="ltr"
                  value={formData.lmp_date}
                  onChange={(e) => handleChange('lmp_date', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={4}
                />
              </ClinicalFormField>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-1.5">
                  <label className="font-black text-slate-700 flex items-center gap-1">
                    <span>التاريخ المتوقع للولادة (EDD)</span>
                    <span className="text-rose-600 font-bold">*</span>
                  </label>
                  {formData.lmp_date && (
                    <button
                      type="button"
                      onClick={handleAutoCalculateEdd}
                      className="text-[11px] font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      title="حساب تاريخ الولادة المتوقع وفق قاعدة نيجيل (LMP + 280 يوماً)"
                    >
                      <Sparkles size={12} />
                      <span>حساب تلقائي (قاعدة نيجيل)</span>
                    </button>
                  )}
                </div>

                <input
                  name="edd_date"
                  type="date"
                  dir="ltr"
                  value={formData.edd_date}
                  onChange={(e) => handleChange('edd_date', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={5}
                />

                {errors.edd_date ? (
                  <p className="text-[11px] font-bold text-rose-600">{errors.edd_date}</p>
                ) : (
                  <p className="text-[11px] font-bold text-slate-500">Expected Date of Delivery</p>
                )}
              </div>
            </div>

            {/* Gestational Age calculation pill if LMP provided */}
            {gestationalAge && (
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-rose-950">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-rose-600 shrink-0" />
                  <span>
                    العمر الحملي التقديري اليوم: <strong className="font-mono text-sm text-rose-900 font-black">{gestationalAge.weeks}</strong> أسبوعاً و <strong className="font-mono text-sm text-rose-900 font-black">{gestationalAge.days}</strong> يوماً ({gestationalAge.totalDays} يوم).
                  </span>
                </div>
                <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-black">
                  حساب آلي
                </span>
              </div>
            )}
          </ClinicalSectionCard>

          {/* Card 2: الفحص الإكلينيكي والعلامات الحيوية للجنين */}
          <ClinicalSectionCard
            title="2. الفحص الإكلينيكي والعلامات الحيوية للجنين (Clinical & Fetal Findings)"
            subtitle="قياس نمو الجنين، نبض القلب، وموعد الاستشارة القادمة"
            icon={Stethoscope}
            color="rose"
            badge="متابعة الزيارة"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ClinicalFormField
                label="ارتفاع قاع الرحم (Fundal Height)"
                helperText="يقاس بالسنتيمتر (سم) أعلى عظمة العانة"
              >
                <div className="relative">
                  <input
                    name="fundal_height_cm"
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    dir="ltr"
                    placeholder="مثال: 28"
                    value={formData.fundal_height_cm}
                    onChange={(e) => handleChange('fundal_height_cm', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                    tabIndex={6}
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                    سم
                  </span>
                </div>
              </ClinicalFormField>

              <ClinicalFormField
                label="نبض قلب الجنين (Fetal Heart Sound)"
                required
                helperText="المعدل الطبيعي: 120 إلى 160 نبضة/د"
              >
                <select
                  name="fetal_heart_sound"
                  value={formData.fetal_heart_sound}
                  onChange={(e) => handleChange('fetal_heart_sound', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-xs font-bold transition-all"
                  tabIndex={7}
                >
                  <option value="إيجابي وطبيعي (120 - 160 نبضة/دقيقة)">إيجابي وطبيعي (120 - 160 نبضة/دقيقة)</option>
                  <option value="مسموع ومنتظم">مسموع ومنتظم</option>
                  <option value="تسارع نبضات الجنين (> 160 نبضة/د)">تسارع نبضات الجنين (&gt; 160 نبضة/د)</option>
                  <option value="تباطؤ نبضات الجنين (< 110 نبضة/د)">تباطؤ نبضات الجنين (&lt; 110 نبضة/د)</option>
                  <option value="غير مسموع حالياً (عمر حملي مبكر)">غير مسموع حالياً (عمر حملي مبكر)</option>
                  <option value="غير مسموع (يستلزم سونار عاجل)">غير مسموع (يستلزم سونار عاجل)</option>
                </select>
              </ClinicalFormField>

              <ClinicalFormField
                label="حركة الجنين (Fetal Movement)"
                required
                helperText="تقييم الأم لحركة الجنين خلال اليوم"
              >
                <select
                  name="fetal_movement"
                  value={formData.fetal_movement}
                  onChange={(e) => handleChange('fetal_movement', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-xs font-bold transition-all"
                  tabIndex={8}
                >
                  <option value="حركة نشطة وطبيعية (≥ 10 حركات)">حركة نشطة وطبيعية (≥ 10 حركات)</option>
                  <option value="حركة محسوسة ومعتادة">حركة محسوسة ومعتادة</option>
                  <option value="حركة متناقصة أو ضعيفة (تحتاج مراقبة)">حركة متناقصة أو ضعيفة (تحتاج مراقبة)</option>
                  <option value="لم تبدأ بعد (عمر حملي مبكر)">لم تبدأ بعد (عمر حملي مبكر)</option>
                </select>
              </ClinicalFormField>
            </div>

            {/* Next Visit & Signature */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-1.5">
                  <label className="font-black text-slate-700">موعد الزيارة القادمة</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickNextVisit(2)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      + أسبوعين
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickNextVisit(4)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      + 4 أسابيع
                    </button>
                  </div>
                </div>

                <input
                  name="next_visit_date"
                  type="date"
                  dir="ltr"
                  value={formData.next_visit_date}
                  onChange={(e) => handleChange('next_visit_date', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                  tabIndex={9}
                />
              </div>

              <ClinicalFormField
                label="توقيع/اسم الطبيب الفاحص"
                helperText="يعتمد في سجلات الرقابة الصحية"
              >
                <input
                  name="doctor_signature"
                  placeholder="د/ الطبيب الفاحص"
                  value={formData.doctor_signature}
                  onChange={(e) => handleChange('doctor_signature', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-xs font-bold transition-all"
                  tabIndex={10}
                />
              </ClinicalFormField>
            </div>
          </ClinicalSectionCard>

          {/* Card 3: الفحوصات المعملية والمكملات (Progressive Disclosure Accordion) */}
          <ClinicalSectionCard
            title="3. الفحوصات المعملية، المكملات والتوعية الصحية"
            subtitle="تحاليل الأنيميا، سكر الحمل، الزلال، والمكملات الغذائية"
            icon={Droplets}
            color="rose"
            badge={labFilledCount > 0 ? `${labFilledCount} حقول مدونة` : 'عرض إضافي'}
            collapsible={true}
            isExpanded={showLaboratoriesAccordion}
            onToggle={() => setShowLaboratoriesAccordion(!showLaboratoriesAccordion)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ClinicalFormField
                label="الهيموجلوبين (Hb)"
                helperText="المعدل الطبيعي في الحمل ≥ 11.0 g/dL"
              >
                <div className="relative">
                  <input
                    name="hb_result"
                    type="number"
                    step="0.1"
                    min="3"
                    max="20"
                    dir="ltr"
                    placeholder="مثال: 11.5"
                    value={formData.hb_result}
                    onChange={(e) => handleChange('hb_result', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                    tabIndex={11}
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                    g/dL
                  </span>
                </div>
                {formData.hb_result && Number(formData.hb_result) < 11.0 && (
                  <p className="text-[10px] font-black text-rose-600 flex items-center gap-1 mt-1">
                    <ShieldAlert size={12} />
                    <span>تنبيه: قراءة الهيموجلوبين تشير لأنيميا حمل (يُوصى بوصف جرعة علاجية للحديد)</span>
                  </p>
                )}
              </ClinicalFormField>

              <ClinicalFormField
                label="سكر الدم العشوائي / الصائم"
                helperText="سكر عشوائي أو صائم (mg/dL)"
              >
                <div className="relative">
                  <input
                    name="blood_glucose"
                    type="number"
                    min="30"
                    max="500"
                    dir="ltr"
                    placeholder="مثال: 95"
                    value={formData.blood_glucose}
                    onChange={(e) => handleChange('blood_glucose', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-sm font-bold font-mono transition-all"
                    tabIndex={12}
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold pointer-events-none">
                    mg/dL
                  </span>
                </div>
                {formData.blood_glucose && Number(formData.blood_glucose) >= 140 && (
                  <p className="text-[10px] font-black text-amber-700 flex items-center gap-1 mt-1">
                    <ShieldAlert size={12} />
                    <span>تنبيه: القراءة مرتفعة (≥ 140 mg/dL) - يوصى بإجراء منحنى السكر (OGTT)</span>
                  </p>
                )}
              </ClinicalFormField>
            </div>

            {/* Checkboxes for Prophylaxis & Screening */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-800">
              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-all">
                <input
                  name="urine_albumin"
                  type="checkbox"
                  checked={formData.urine_albumin}
                  onChange={(e) => handleChange('urine_albumin', e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-400"
                  tabIndex={13}
                />
                <div>
                  <span className={formData.urine_albumin ? 'text-rose-700 font-black' : ''}>
                    وجود زلال بالبول (Albuminuria)
                  </span>
                  <p className="text-[10px] text-slate-500 font-normal">فحص شريطي للبول (Dipstick)</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white cursor-pointer transition-all">
                <input
                  name="supplements"
                  type="checkbox"
                  checked={formData.supplements}
                  onChange={(e) => handleChange('supplements', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-400"
                  tabIndex={14}
                />
                <div>
                  <span className="text-emerald-900 font-black">صرف مكملات الحمل الوقائية</span>
                  <p className="text-[10px] text-slate-500 font-normal">حديد + حمض فوليك + كالسيوم</p>
                </div>
              </label>
            </div>

            {/* Health Education with quick chips */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-black text-slate-700">التوعية الصحية والمشورة الطبية</label>
                <span className="text-[11px] text-slate-400">انقر لإضافة مواضيع التوعية</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  'علامات الخطر في الحمل',
                  'التغذية الصحية المتوازنة',
                  'أهمية الرضاعة الطبيعية المبكرة',
                  'علامات بدء الولادة',
                  'خطة الولادة الآمنة'
                ].map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleAddTopic(topic)}
                    className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  >
                    + {topic}
                  </button>
                ))}
              </div>

              <input
                name="health_education"
                placeholder="الملاحظات والتوصيات الصحية..."
                value={formData.health_education}
                onChange={(e) => handleChange('health_education', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 rounded-xl text-xs font-bold transition-all"
                tabIndex={15}
              />
            </div>
          </ClinicalSectionCard>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-between gap-3 p-4 bg-slate-100/80 rounded-2xl border border-slate-200">
            <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
              <Info size={14} className="text-indigo-600" />
              <span>الحفظ فوري ومباشر في قاعدة البيانات السحابية (Centralized Supabase).</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isFormDirty) {
                    if (!window.confirm('هل أنت متأكد من إلغاء النموذج وتجاهل التعديلات؟')) {
                      return;
                    }
                    setIsFormDirty(false);
                  }
                  setShowAddForm(false);
                }}
                className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري الحفظ في قاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>حفظ واعتماد زيارة متابعة الحمل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* History of Previous ANC Records */}
      {tableError ? (
        <div className="p-8 text-center bg-amber-50/70 rounded-3xl border border-amber-200 text-amber-800 font-bold space-y-2">
          <AlertCircle className="mx-auto text-amber-600" size={32} />
          <p className="text-sm font-black">تعذر استرجاع سجلات متابعة الحمل من قاعدة البيانات</p>
          <p className="text-xs text-amber-700 font-mono">{tableError}</p>
        </div>
      ) : ancRecords.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold space-y-3">
          <HeartHandshake size={36} className="mx-auto text-slate-300" />
          <p className="text-sm">لا توجد زيارات متابعة حمل مسجلة للمريضة حتى الآن.</p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} /> تسجيل أول زيارة متابعة حمل
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <h5 className="font-black text-slate-900 text-sm">
                سجل الزيارات السابقة لمتابعة الحمل ({ancRecords.length} زيارات)
              </h5>
            </div>
            <span className="text-[11px] text-slate-500 font-bold">مرتبة تنازلياً من الأحدث للأقدم</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-rose-50/70 border-b border-rose-100 text-rose-950 font-black">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">تاريخ الزيارة</th>
                  <th className="p-3.5 whitespace-nowrap">G / P / A</th>
                  <th className="p-3.5 whitespace-nowrap">LMP / EDD</th>
                  <th className="p-3.5 whitespace-nowrap">ارتفاع الرحم ونبض الجنين</th>
                  <th className="p-3.5 whitespace-nowrap">التحاليل (Hb / سكر / زلال)</th>
                  <th className="p-3.5 whitespace-nowrap">الزيارة القادمة والطبيب</th>
                  <th className="p-3.5 text-center whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {ancRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full font-black text-xs font-mono">
                        G{r.gravida} P{r.para} A{r.abortions}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 whitespace-nowrap">
                      <div className="font-mono text-[11px]">LMP: {r.lmp_date || '—'}</div>
                      <div className="font-mono text-[11px] text-rose-800 font-black">EDD: {r.edd_date || '—'}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div>قاع الرحم: {r.fundal_height_cm ? `${r.fundal_height_cm} سم` : '—'}</div>
                      <div className="text-slate-600 text-[11px]">النبض: {r.fetal_heart_sound || '—'}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={r.hb_result && Number(r.hb_result) < 11 ? 'text-rose-600 font-black' : 'text-slate-700'}>
                          Hb: {r.hb_result ? `${r.hb_result} g/dL` : '—'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-700">
                          سكر: {r.blood_glucose ? `${r.blood_glucose} mg` : '—'}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        {r.urine_albumin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-black">
                            زلال إيجابي ⚠️
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">زلال سلبي</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="text-rose-900 font-black">
                        {r.next_visit_date ? `القادمة: ${r.next_visit_date}` : '—'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {r.doctor_signature ? `${r.doctor_signature}` : ''}
                      </div>
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(r.id, 'متابعة الحمل')}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف هذا السجل"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
