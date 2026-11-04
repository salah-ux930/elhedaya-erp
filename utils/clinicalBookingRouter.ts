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

