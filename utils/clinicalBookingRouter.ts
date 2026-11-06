import { Clinic, Patient, LinkedModuleType } from '../types.ts';
import { evaluateClinicalModuleEligibility } from '../services/followupSuggestions.ts';

export type ExamFormMode =
  | 'child_under5'        // ف5أ + ف5ب/ج: متابعة الطفل تحت 5 سنوات
  | 'child_over5'         // ف5د: متابعة الطفل فوق 5 سنوات (السن المدرسي)
  | 'maternal_anc'        // ف6أ: متابعة الحمل
  | 'maternal_postpartum' // ف6ب: متابعة ما بعد الولادة والنفاس
  | 'family_planning'     // ف7: منتفعة بخدمات تنظيم الأسرة
  | 'chronic_followup'    // ف4أ / ف4ب / ف4ج: متابعة ضغط / سكر / أمراض مزمنة
  | 'dental'              // ف3: فحص وعلاج الأسنان
  | 'premarital'          // ف8أ / ف8ب: فحص المقبلين على الزواج
  | 'geriatric'           // ف9: تقييم المسنين الشامل
  | 'general';            // ف1: الفحص الشامل والزيارة الدورية

export interface ResolvedBookingClinicalRoute {
  examFormMode: ExamFormMode;
  formCodeBadge: string;
  formTitle: string;
  formSubtitle: string;
  visitCode: number; // 1..6 per Form 2B (نموذج التردد)
  visitTypeLabel: string; // ١ - متابعة الحمل, ٢ - تنظيم الأسرة, ٣ - متابعة طفل, ٤ - أمراض مزمنة, ٥ - زيارة دورية, ٦ - أسنان
  familyRecordModuleKey: string; // Tab key in FamilyComprehensiveHealthRecordModal
  chronicSubType?: 'hypertension' | 'diabetes' | 'other_chronic';
  autoSyncTargets: string[];
  bookingMetadataTag: string;
}

export const VISIT_CODE_LABELS: Record<number, string> = {
  1: 'متابعة الحمل',
  2: 'تنظيم الأسرة',
  3: 'متابعة طفل',
  4: 'أمراض مزمنة',
  5: 'زيارة دورية',
  6: 'أسنان'
};

export const EXAM_FORM_METADATA: Record<
  ExamFormMode,
  {
    codeBadge: string;
    title: string;
    subtitle: string;
    visitCode: number;
    familyTab: string;
    tableNameLabel: string;
  }
> = {
  child_under5: {
    codeBadge: 'نموذج ف5أ / ف5ب / ف5ج',
    title: 'متابعة نمو وتطور الطفل (تحت 5 سنوات)',
    subtitle: 'القياسات، الرضاعة، التطعيمات، فيتامين أ/د، وعلامات التطور',
    visitCode: 3,
    familyTab: 'child',
    tableNameLabel: 'سجل متابعة الطفل تحت 5 سنوات (child_under5_followups)'
  },
  child_over5: {
    codeBadge: 'نموذج ف5د',
    title: 'متابعة الطفل فوق 5 سنوات (السن المدرسي)',
    subtitle: 'المرحلة الدراسية، التطعيمات، الإبصار والسمع، الفحص النفسي والتحصيل',
    visitCode: 3,
    familyTab: 'child',
    tableNameLabel: 'سجل متابعة السن المدرسي (child_over5_followups)'
  },
  maternal_anc: {
    codeBadge: 'نموذج ف6أ',
    title: 'متابعة الحمل (Antenatal Care)',
    subtitle: 'بيانات الحمل، التيتانوس، فحص الجنين والسونار، والتحاليل الدورية',
    visitCode: 1,
    familyTab: 'maternal',
    tableNameLabel: 'سجل متابعة الحمل (maternal_antenatal_followups)'
  },
  maternal_postpartum: {
    codeBadge: 'نموذج ف6ب',
    title: 'متابعة ما بعد الولادة والنفاس (Postpartum)',
    subtitle: 'ناتج الحمل، زيارات النفاس، الرضاعة الطبيعية، والمسح النفسي',
    visitCode: 1,
    familyTab: 'maternal',
    tableNameLabel: 'سجل متابعة النفاس (maternal_postpartum_followups)'
  },
  family_planning: {
    codeBadge: 'نموذج ف7',
    title: 'منتفعة بخدمات تنظيم الأسرة',
    subtitle: 'التاريخ الإنجابي، الوسيلة الحالية/المنصرفة، الدورة الشهرية، والفحص الحوضي',
    visitCode: 2,
    familyTab: 'family_planning',
    tableNameLabel: 'سجل تنظيم الأسرة (family_planning_followups)'
  },
  chronic_followup: {
    codeBadge: 'نموذج ف4أ / ف4ب / ف4ج',
    title: 'متابعة الأمراض المزمنة (ضغط / سكر / أمراض مزمنة)',
    subtitle: 'قياسات الضغط والسكر، عوامل الخطورة، المضاعفات، والفحوصات الدورية',
    visitCode: 4,
    familyTab: 'significant',
    tableNameLabel: 'سجل متابعة الأمراض المزمنة (chronic_disease_followups)'
  },
  dental: {
    codeBadge: 'نموذج ف3',
    title: 'فحص وعلاج الأسنان (Dental Assessment)',
    subtitle: 'فحص الفم ومفصل الفك TMJ، الغشاء المخاطي، مؤشر اللثة CPI، ومؤشر DMFT',
    visitCode: 6,
    familyTab: 'dental',
    tableNameLabel: 'سجل فحص الأسنان (dental_assessments)'
  },
  premarital: {
    codeBadge: 'نموذج ف8أ / ف8ب',
    title: 'تقييم الحالة الصحية للمقبلين على الزواج',
    subtitle: 'فحص الزوج (ف8أ) / الزوجة (ف8ب)، الفحوص الإجبارية والتكميلية، والإقرار',
    visitCode: 5,
    familyTab: 'premarital',
    tableNameLabel: 'سجل فحص ما قبل الزواج (premarital_assessments)'
  },
  geriatric: {
    codeBadge: 'نموذج ف9',
    title: 'التقييم الشامل للمسنين (Geriatric Assessment)',
    subtitle: 'الوهن Frailty، الوظائف اليومية ADLs، المزاج، التنقل، المسح الوقائي، وMini-Cog',
    visitCode: 5,
    familyTab: 'geriatric',
    tableNameLabel: 'سجل تقييم المسنين (geriatric_assessments)'
  },
  general: {
    codeBadge: 'نموذج ف1',
    title: 'الفحص الشامل والزيارة الدورية (History & Physical Exam)',
    subtitle: 'العلامات الحيوية، التاريخ المرضي والعائلي، التحاليل، والفحص الإكلينيكي للأجهزة',
    visitCode: 5,
    familyTab: 'history',
    tableNameLabel: 'سجل الفحص الشامل (history_physical_exams)'
  }
};

export interface ExamModeEligibilityInfo {
  mode: ExamFormMode;
  shortLabel: string;
  badge: string;
  eligible: boolean;
  shortLockReason: string;
  detailedReason: string;
  isBookedClinicForm: boolean;
}

export const ALL_EXAM_MODE_DEFINITIONS: { mode: ExamFormMode; shortLabel: string; badge: string }[] = [
  { mode: 'child_under5', shortLabel: 'طفل < 5 سنوات', badge: 'ف5أ/ب/ج' },
  { mode: 'child_over5', shortLabel: 'السن المدرسي 5-18', badge: 'ف5د' },
  { mode: 'maternal_anc', shortLabel: 'متابعة الحمل', badge: 'ف6أ' },
  { mode: 'maternal_postpartum', shortLabel: 'ما بعد الولادة', badge: 'ف6ب' },
  { mode: 'family_planning', shortLabel: 'تنظيم الأسرة', badge: 'ف7' },
  { mode: 'chronic_followup', shortLabel: 'أمراض مزمنة (ضغط/سكر)', badge: 'ف4أ/ب/ج' },
  { mode: 'dental', shortLabel: 'فحص الأسنان', badge: 'ف3' },
  { mode: 'premarital', shortLabel: 'فحص راغبي الزواج', badge: 'ف8أ/ب' },
  { mode: 'geriatric', shortLabel: 'تقييم المسنين', badge: 'ف9' },
  { mode: 'general', shortLabel: 'الفحص الشامل العام', badge: 'ف1' }
];

/**
 * يقيّم مدى ملاءمة النموذج الطبي (ف1 إلى ف9) لعمر ونوع المريض الحالي،
 * ويعيد سبب الإغلاق السريري المختصر والمفصل عند عدم التوافق.
 */
export function evaluateExamFormModeEligibility(
  patient?: Partial<Patient> | null,
  mode?: ExamFormMode
): {
  eligible: boolean;
  shortLockReason: string;
  detailedReason: string;
  badgeText: string;
} {
  const targetMode = mode || 'general';
  const pat = (patient as Patient) || null;

  if (targetMode === 'general' || targetMode === 'dental') {
    return {
      eligible: true,
      shortLockReason: '',
      detailedReason: '',
      badgeText: 'متاح لجميع الأعمار'
    };
  }

  if (targetMode === 'child_under5') {
    const res = evaluateClinicalModuleEligibility(pat, 'child', 'under5');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    const ageLabel = res.ageYears !== null ? ` (العمر الحالي: ${res.ageYears} سنة)` : '';
    return {
      eligible: false,
      shortLockReason: 'خاص بالأطفال < 5 سنوات',
      detailedReason: res.reason || `غير متاح: هذا النموذج مخصص للأطفال دون 5 سنوات فقط${ageLabel}.`,
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'child_over5') {
    const res = evaluateClinicalModuleEligibility(pat, 'child', 'over5');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    const ageLabel =
      res.ageYears !== null
        ? res.ageYears < 5
          ? ` (العمر الحالي: ${res.ageMonths ?? res.ageYears} شهر — دون 5 سنوات)`
          : ` (العمر الحالي: ${res.ageYears} سنة — بالغ)`
        : '';
    return {
      eligible: false,
      shortLockReason: 'خاص بالسن المدرسي (5–17 سنة)',
      detailedReason: res.reason || `غير متاح: هذا النموذج مخصص لسن المدرسة والمراهقين (5 إلى 17 سنة)${ageLabel}.`,
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'maternal_anc' || targetMode === 'maternal_postpartum') {
    const res = evaluateClinicalModuleEligibility(pat, 'maternal');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    const shortReason =
      res.normalizedGender === 'male'
        ? 'خاص بالإناث (15–49 سنة) — المريض ذكر'
        : res.ageYears !== null && res.ageYears < 15
        ? `خاص بسن الإنجاب (15–49 سنة) — طفلة (${res.ageYears} سنة)`
        : 'خاص بالإناث في سن الإنجاب (15–49 سنة)';
    return {
      eligible: false,
      shortLockReason: shortReason,
      detailedReason: res.reason || 'غير متاح: نماذج متابعة الحمل والنفاس مخصصة للإناث في سن الإنجاب (15 - 49 سنة) فقط.',
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'family_planning') {
    const res = evaluateClinicalModuleEligibility(pat, 'family_planning');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    const shortReason =
      res.normalizedGender === 'male'
        ? 'خاص بالإناث (15–49 سنة) — المريض ذكر'
        : res.ageYears !== null && res.ageYears < 15
        ? `خاص بسن الإنجاب (15–49 سنة) — طفلة (${res.ageYears} سنة)`
        : 'خاص بالإناث في سن الإنجاب (15–49 سنة)';
    return {
      eligible: false,
      shortLockReason: shortReason,
      detailedReason: res.reason || 'غير متاح: نموذج تنظيم الأسرة مخصص للإناث في سن الإنجاب (15 - 49 سنة) فقط.',
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'chronic_followup') {
    const res = evaluateClinicalModuleEligibility(pat, 'chronic_followup');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    return {
      eligible: false,
      shortLockReason: 'خاص بالبالغين (≥ 15 سنة) أو أصحاب المزمن',
      detailedReason: res.reason || 'غير متاح: نموذج متابعة الأمراض المزمنة مخصص للبالغين (15 سنة فأكثر) أو المسجل لديهم أمراض مزمنة.',
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'premarital') {
    const res = evaluateClinicalModuleEligibility(pat, 'premarital');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    return {
      eligible: false,
      shortLockReason: 'خاص بسن الزواج (≥ 15 سنة)',
      detailedReason: res.reason || 'غير متاح: فحص راغبي الزواج مخصص للفئة العمرية (15 سنة فأكثر).',
      badgeText: res.badgeText
    };
  }

  if (targetMode === 'geriatric') {
    const res = evaluateClinicalModuleEligibility(pat, 'geriatric');
    if (res.eligible) {
      return { eligible: true, shortLockReason: '', detailedReason: '', badgeText: res.badgeText };
    }
    return {
      eligible: false,
      shortLockReason: 'خاص بكبار السن (≥ 60 سنة)',
      detailedReason: res.reason || 'غير متاح: تقييم المسنين الشامل مخصص لكبار السن (60 سنة فأكثر) فقط.',
      badgeText: res.badgeText
    };
  }

  return {
    eligible: true,
    shortLockReason: '',
    detailedReason: '',
    badgeText: ''
  };
}

/**
 * يعيد قائمة النماذج الطبية مرتبة بذكاء للمريض:
 * 1) النماذج المتوافقة مع عمر ونوع المريض (مع وضع نموذج العيادة المحجوزة في الصدارة).
 * 2) النماذج غير المتوافقة مع عمر أو نوع المريض (مغلقة وباهتة مع سبب الإغلاق السريري).
 */
export function getSmartOrderedExamModes(
  patient?: Partial<Patient> | null,
  bookedClinicMode?: ExamFormMode
): {
  eligibleModes: ExamModeEligibilityInfo[];
  ineligibleModes: ExamModeEligibilityInfo[];
  allModes: ExamModeEligibilityInfo[];
} {
  const evaluated: ExamModeEligibilityInfo[] = ALL_EXAM_MODE_DEFINITIONS.map((def) => {
    const elig = evaluateExamFormModeEligibility(patient, def.mode);
    return {
      mode: def.mode,
      shortLabel: def.shortLabel,
      badge: def.badge,
      eligible: elig.eligible,
      shortLockReason: elig.shortLockReason,
      detailedReason: elig.detailedReason,
      isBookedClinicForm: Boolean(bookedClinicMode && def.mode === bookedClinicMode && elig.eligible)
    };
  });

  const eligibleModes = evaluated
    .filter((m) => m.eligible)
    .sort((a, b) => {
      if (a.isBookedClinicForm && !b.isBookedClinicForm) return -1;
      if (!a.isBookedClinicForm && b.isBookedClinicForm) return 1;
      return 0;
    });

  const ineligibleModes = evaluated.filter((m) => !m.eligible);

  return {
    eligibleModes,
    ineligibleModes,
    allModes: [...eligibleModes, ...ineligibleModes]
  };
}

/**
 * يستنتج تلقائياً نوع الحجز والنموذج الطبي المعتمد (ف1 إلى ف10) وكود التردد (ف2ب)
 * بناءً على تخصص العيادة المختارة وخصائص المريض (العمر/النوع) وملاحظات الحجز.
 */
export function resolveBookingVisitAndForm(
  clinic?: Partial<Clinic> | null,
  patient?: Partial<Patient> | null,
  notesOrHint?: string,
  overrideMode?: ExamFormMode
): ResolvedBookingClinicalRoute {
  const childElig = evaluateClinicalModuleEligibility((patient as Patient) || null, 'child');
  const ageYears = childElig.ageYears;
  const ageMonths = childElig.ageMonths;
  const gender = childElig.normalizedGender;

  const clinicLinked = String(clinic?.linked_module || '').toLowerCase().trim();
  const clinicText = `${clinic?.name || ''} ${clinic?.specialty || ''}`.toLowerCase();
  const hintText = String(notesOrHint || '').toLowerCase();

  // Check if explicit mode tag is embedded in notes (e.g. [FORM:maternal_anc])
  const tagMatch = String(notesOrHint || '').match(/\[FORM:([a-z0-9_]+)\]/i);
  const taggedMode = tagMatch?.[1] as ExamFormMode | undefined;

  let mode: ExamFormMode = 'general';
  let chronicSubType: 'hypertension' | 'diabetes' | 'other_chronic' = 'hypertension';

  if (overrideMode && overrideMode in EXAM_FORM_METADATA) {
    mode = overrideMode;
  } else if (taggedMode && taggedMode in EXAM_FORM_METADATA) {
    mode = taggedMode;
  } else {
    // 1. Dental Clinic -> Form 3 (ف3)
    if (
      clinicLinked === 'dental' ||
      clinicText.includes('أسنان') ||
      clinicText.includes('اسنان') ||
      clinicText.includes('فم')
    ) {
      mode = 'dental';
    }
    // 2. Family Planning Clinic -> Form 7 (ف7)
    else if (
      clinicLinked === 'family_planning' ||
      clinicText.includes('تنظيم الأسرة') ||
      clinicText.includes('تنظيم الاسرة') ||
      clinicText.includes('تنظيم أسرة') ||
      clinicText.includes('وسائل منع الحمل')
    ) {
      mode = 'family_planning';
    }
    // 3. Maternal / Antenatal / Postpartum / OB-GYN Clinic -> Form 6A or 6B (ف6أ / ف6ب)
    else if (
      clinicLinked === 'maternal' ||
      clinicLinked === 'maternal_care' ||
      clinicText.includes('حوامل') ||
      clinicText.includes('أمومة') ||
      clinicText.includes('امومة') ||
      clinicText.includes('متابعة الحمل') ||
      clinicText.includes('نساء') ||
      clinicText.includes('توليد') ||
      clinicText.includes('نفاس')
    ) {
      if (
        hintText.includes('نفاس') ||
        hintText.includes('بعد الولادة') ||
        hintText.includes('ف6ب') ||
        clinicText.includes('نفاس')
      ) {
        mode = 'maternal_postpartum';
      } else {
        mode = 'maternal_anc';
      }
    }
    // 4. Premarital Clinic -> Form 8A / 8B (ف8أ / ف8ب)
    else if (
      clinicLinked === 'premarital' ||
      clinicText.includes('زواج') ||
      clinicText.includes('مقبلين') ||
      clinicText.includes('راغبي الزواج')
    ) {
      mode = 'premarital';
    }
    // 5. Geriatric Clinic -> Form 9 (ف9)
    else if (
      clinicLinked === 'geriatric' ||
      clinicLinked === 'geriatric_care' ||
      clinicText.includes('مسن') ||
      clinicText.includes('كبار السن') ||
      clinicText.includes('شيخوخة')
    ) {
      mode = 'geriatric';
    }
    // 6. Pediatric / Child Clinic -> Form 5A/B/C (<5 yrs) or Form 5D (5-18 yrs)
    else if (
      clinicLinked === 'child' ||
      clinicLinked === 'child_followup' ||
      clinicText.includes('أطفال') ||
      clinicText.includes('اطفال') ||
      clinicText.includes('طفل') ||
      clinicText.includes('نمو') ||
      clinicText.includes('تطعيم') ||
      clinicText.includes('مدرسي')
    ) {
      if (ageYears !== null && ageYears >= 5) {
        mode = 'child_over5';
      } else {
        mode = 'child_under5';
      }
    }
    // 7. Internal Medicine / Chronic Diseases Clinic -> Form 4A / 4B / 4C (ف4أ / ف4ب / ف4ج)
    else if (
      clinicText.includes('مزمن') ||
      clinicText.includes('ضغط') ||
      clinicText.includes('سكر') ||
      clinicText.includes('باطنة') ||
      clinicText.includes('باطنه') ||
      clinicText.includes('قلب') ||
      hintText.includes('ضغط') ||
      hintText.includes('سكر') ||
      hintText.includes('مزمن')
    ) {
      mode = 'chronic_followup';
      if (clinicText.includes('سكر') || hintText.includes('سكر')) {
        chronicSubType = 'diabetes';
      } else if (clinicText.includes('ضغط') || hintText.includes('ضغط')) {
        chronicSubType = 'hypertension';
      } else {
        chronicSubType = 'hypertension';
      }
    }
    // 8. Family Medicine / General Practice -> Smart age/hint routing within Family Medicine
    else {
      if ((ageYears !== null && ageYears < 5) || (ageMonths !== null && ageMonths < 60)) {
        mode = 'child_under5';
      } else if (
        hintText.includes('دون 5') ||
        hintText.includes('أقل من 5') ||
        hintText.includes('اقل من 5') ||
        hintText.includes('نمو الطفل')
      ) {
        mode = 'child_under5';
      } else if (
        ageYears !== null &&
        ageYears >= 5 &&
        ageYears < 18 &&
        (hintText.includes('طفل') || hintText.includes('مدرسي') || hintText.includes('ف5د'))
      ) {
        mode = 'child_over5';
      } else if (ageYears !== null && ageYears >= 60 && hintText.includes('مسن')) {
        mode = 'geriatric';
      } else {
        mode = 'general';
      }
    }
  }

  // الحارس السريري الذكي: منع اختيار نموذج غير متوافق مع عمر أو نوع المريض (مثل فتح نموذج حمل لطفل ذكر)
  if (patient && (patient.date_of_birth || (patient as any).birth_date || patient.gender)) {
    const modeCheck = evaluateExamFormModeEligibility(patient, mode);
    if (!modeCheck.eligible) {
      if ((ageYears !== null && ageYears < 5) || (ageMonths !== null && ageMonths < 60)) {
        mode = 'child_under5';
      } else if (ageYears !== null && ageYears >= 5 && ageYears < 18) {
        mode = 'child_over5';
      } else if (ageYears !== null && ageYears >= 60) {
        mode = 'geriatric';
      } else {
        mode = 'general';
      }
    }
  }

  const meta = EXAM_FORM_METADATA[mode];
  let customBadge = meta.codeBadge;
  let customTitle = meta.title;

  if (mode === 'premarital') {
    if (gender === 'male') {
      customBadge = 'نموذج ف8أ (الفحص الطبي للزوج)';
      customTitle = 'تقييم الحالة الصحية للمقبلين على الزواج — فحص الزوج (ف8أ)';
    } else if (gender === 'female') {
      customBadge = 'نموذج ف8ب (الفحص الطبي للزوجة)';
      customTitle = 'تقييم الحالة الصحية للمقبلين على الزواج — فحص الزوجة (ف8ب)';
    }
  } else if (mode === 'child_under5') {
    if (gender === 'male') {
      customBadge = 'نموذج ف5أ + ف5ب (ذكور)';
    } else if (gender === 'female') {
      customBadge = 'نموذج ف5أ + ف5ج (إناث)';
    }
  }

  const visitTypeLabel = VISIT_CODE_LABELS[meta.visitCode] || 'زيارة دورية';

  const autoSyncTargets = [
    meta.tableNameLabel,
    `نموذج التردد (ف2ب) — كود (${meta.visitCode}: ${visitTypeLabel})`,
    'ملخص الأحداث الطبية الهامة (ف2أ) والتاريخ المرضي للأسرة'
  ];

  const bookingMetadataTag = `[FORM:${mode}|VCODE:${meta.visitCode}]`;

  return {
    examFormMode: mode,
    formCodeBadge: customBadge,
    formTitle: customTitle,
    formSubtitle: meta.subtitle,
    visitCode: meta.visitCode,
    visitTypeLabel,
    familyRecordModuleKey: meta.familyTab,
    chronicSubType,
    autoSyncTargets,
    bookingMetadataTag
  };
}

/**
 * يزيل وسم التوجيه الداخلي [FORM:...|VCODE:...] من ملاحظات الحجز عند عرضه للمستخدم.
 */
export function stripBookingMetadataTag(notes?: string | null): string {
  if (!notes) return '';
  return String(notes)
    .replace(/\[FORM:[a-z0-9_]+(\|VCODE:\d+)?\]/gi, '')
    .trim();
}

