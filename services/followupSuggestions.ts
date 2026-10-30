import { Patient, SuggestedFollowup, LinkedModuleType } from '../types.ts';

export interface ClinicalEligibilityResult {
  eligible: boolean;
  reason: string;
  badgeText: string;
  requiresAdminSetup?: boolean;
  ageYears: number | null;
  ageMonths: number | null;
  normalizedGender: 'male' | 'female' | null;
}

export function parsePatientAgeAndGender(patient?: Patient | null): {
  ageYears: number | null;
  ageMonths: number | null;
  normalizedGender: 'male' | 'female' | null;
} {
  if (!patient) {
    return { ageYears: null, ageMonths: null, normalizedGender: null };
  }

  const rawGender = String(patient.gender || '').trim().toLowerCase();
  let normalizedGender: 'male' | 'female' | null = null;
  if (rawGender === 'أنثى' || rawGender === 'انثى' || rawGender === 'female' || rawGender === 'f') {
    normalizedGender = 'female';
  } else if (rawGender === 'ذكر' || rawGender === 'male' || rawGender === 'm') {
    normalizedGender = 'male';
  }

  const dobString = patient.date_of_birth || (patient as any).birth_date;
  if (!dobString) {
    return { ageYears: null, ageMonths: null, normalizedGender };
  }

  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) {
    return { ageYears: null, ageMonths: null, normalizedGender };
  }

  const today = new Date();
  if (birthDate.getTime() > today.getTime()) {
    return { ageYears: null, ageMonths: null, normalizedGender };
  }

  let ageYears = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    ageYears--;
  }

  let ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
  if (today.getDate() < birthDate.getDate()) {
    ageMonths--;
  }

  return {
    ageYears: ageYears >= 0 ? ageYears : null,
    ageMonths: ageMonths >= 0 ? ageMonths : null,
    normalizedGender,
  };
}

/**
 * التحقق الموحد من الأهلية السريرية لوحدات الملف العائلي والعيادات المرتبطة
 * يعتمد حصراً على القواعد الموجودة في الكود ولا يخترع حدوداً طبية جديدة.
 * إذا لم توجد قاعدة موثقة أو بيانات كافية، يوقف التوثيق/الحجز مؤقتاً ويظهر أن معيار الأهلية يحتاج إعداداً من الإدارة الطبية.
 */
export function evaluateClinicalModuleEligibility(
  patient?: Patient | null,
  moduleId?: string | null,
  subCategory?: 'under5' | 'over5' | string
): ClinicalEligibilityResult {
  const { ageYears, ageMonths, normalizedGender } = parsePatientAgeAndGender(patient);

  if (!patient || !patient.id) {
    return {
      eligible: false,
      reason: 'لا يمكن بدء التوثيق أو الحجز: لم يتم تحديد عضو الأسرة بشكل صحيح — معيار الأهلية يحتاج إعداداً من الإدارة الطبية.',
      badgeText: 'غير محدد',
      requiresAdminSetup: true,
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  const mod = String(moduleId || 'general').trim().toLowerCase();

  // الوحدات العامة المتاحة لجميع الأعمار
  if (mod === 'history' || mod === 'significant' || mod === 'clinical' || mod === 'visits' || mod === 'dental' || mod === 'general') {
    return {
      eligible: true,
      reason: '',
      badgeText: 'متاح لجميع الأعمار',
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // 1) وحدة صحة ورعاية الطفل (Child Health: العمر < 18 سنة، مع فصل < 5 سنوات و 5-17 سنة)
  if (mod === 'child' || mod === 'child_followup') {
    if (ageYears === null) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة صحة الطفل: تاريخ ميلاد العضو غير مسجل أو غير صالح — معيار الأهلية يحتاج إعداداً من الإدارة الطبية أو استكمال تاريخ الميلاد.',
        badgeText: 'تاريخ الميلاد غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears >= 18) {
      return {
        eligible: false,
        reason: `غير مؤهل لوحدة صحة الطفل: عمر الفرد الحالي (${ageYears} سنة) خارج نطاق أهلية الوحدة المعتمد في النظام (أقل من 18 سنة). يُسمح بعرض السجلات التاريخية فقط.`,
        badgeText: 'غير مؤهل (فرد بالغ ≥ 18 سنة)',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (subCategory === 'under5' && ageYears >= 5) {
      return {
        eligible: false,
        reason: `غير مؤهل لنموذج الأطفال دون 5 سنوات: عمر الطفل الحالي (${ageYears} سنة) يتبع فئة الأطفال (5 إلى أقل من 18 سنة).`,
        badgeText: 'خارج فئة دون 5 سنوات',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (subCategory === 'over5' && ageYears < 5) {
      return {
        eligible: false,
        reason: `غير مؤهل لنموذج الأطفال (5 - 18 سنة): عمر الطفل الحالي (${ageYears} سنة) يتبع فئة الأطفال دون 5 سنوات.`,
        badgeText: 'خارج فئة 5 - 18 سنة',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    return {
      eligible: true,
      reason: '',
      badgeText: ageYears < 5 ? 'مؤهل (طفل دون 5 سنوات)' : 'مؤهل (طفل 5 - 17 سنة)',
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // 2) وحدة رعاية الأمومة والحوامل (Maternal Care: إناث في سن الإنجاب 15 - 49 سنة حسب قواعد النظام)
  if (mod === 'maternal' || mod === 'maternal_care') {
    if (!normalizedGender) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة رعاية الأمومة: نوع الفرد غير مسجل — معيار الأهلية يحتاج إعداداً من الإدارة الطبية أو استكمال بيانات النوع.',
        badgeText: 'النوع غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (normalizedGender !== 'female') {
      return {
        eligible: false,
        reason: 'غير مؤهل لوحدة رعاية الأمومة: هذه الوحدة مخصصة للإناث في سن الإنجاب (15 - 49 سنة) فقط ولا تنطبق على الذكور. يُسمح بعرض السجلات التاريخية فقط.',
        badgeText: 'غير مؤهل (خاص بالإناث)',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears === null) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة رعاية الأمومة: تاريخ الميلاد غير مسجل للتحقق من سن الإنجاب (15 - 49 سنة) — معيار الأهلية يحتاج إعداداً من الإدارة الطبية.',
        badgeText: 'تاريخ الميلاد غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears < 15 || ageYears > 49) {
      return {
        eligible: false,
        reason: `غير مؤهلة لوحدة رعاية الأمومة: العمر الحالي (${ageYears} سنة) خارج نطاق سن الإنجاب المعتمد في النظام (15 - 49 سنة). يُسمح بعرض السجلات التاريخية فقط.`,
        badgeText: `غير مؤهلة (العمر ${ageYears} سنة خارج 15-49)`,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    return {
      eligible: true,
      reason: '',
      badgeText: 'مؤهلة (سيدة في سن الإنجاب 15-49)',
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // 3) وحدة تنظيم الأسرة والصحة الإنجابية (Family Planning: إناث في سن الإنجاب 15 - 49 سنة حسب قواعد النظام)
  if (mod === 'family_planning') {
    if (!normalizedGender) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة تنظيم الأسرة: نوع الفرد غير مسجل — معيار الأهلية يحتاج إعداداً من الإدارة الطبية أو استكمال بيانات النوع.',
        badgeText: 'النوع غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (normalizedGender !== 'female') {
      return {
        eligible: false,
        reason: 'غير مؤهل لوحدة تنظيم الأسرة: هذه الوحدة مخصصة للإناث في سن الإنجاب (15 - 49 سنة) فقط ولا تنطبق على الذكور. يُسمح بعرض السجلات التاريخية فقط.',
        badgeText: 'غير مؤهل (خاص بالإناث)',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears === null) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة تنظيم الأسرة: تاريخ الميلاد غير مسجل للتحقق من سن الإنجاب (15 - 49 سنة) — معيار الأهلية يحتاج إعداداً من الإدارة الطبية.',
        badgeText: 'تاريخ الميلاد غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears < 15 || ageYears > 49) {
      return {
        eligible: false,
        reason: `غير مؤهلة لوحدة تنظيم الأسرة: العمر الحالي (${ageYears} سنة) خارج النطاق العمري المعتمد في النظام (15 - 49 سنة). يُسمح بعرض السجلات التاريخية فقط.`,
        badgeText: `غير مؤهلة (العمر ${ageYears} سنة خارج 15-49)`,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    return {
      eligible: true,
      reason: '',
      badgeText: 'مؤهلة (سيدة في سن الإنجاب 15-49)',
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // 4) وحدة رعاية كبار السن (Geriatric Care: العمر >= 60 سنة حسب قواعد النظام)
  if (mod === 'geriatric' || mod === 'geriatric_care') {
    if (ageYears === null) {
      return {
        eligible: false,
        reason: 'لا يمكن التوثيق أو الحجز في وحدة رعاية كبار السن: تاريخ الميلاد غير مسجل للتحقق من شرط العمر (60 سنة فأكثر) — معيار الأهلية يحتاج إعداداً من الإدارة الطبية.',
        badgeText: 'تاريخ الميلاد غير مسجل',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears < 60) {
      return {
        eligible: false,
        reason: `غير مؤهل لوحدة رعاية كبار السن: العمر الحالي (${ageYears} سنة) أقل من الحد العمري المعتمد في النظام (60 سنة فأكثر). يُسمح بعرض السجلات التاريخية فقط.`,
        badgeText: `غير مؤهل (أقل من 60 سنة)`,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    return {
      eligible: true,
      reason: '',
      badgeText: 'مؤهل (كبار السن ≥ 60 سنة)',
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // 5) فحص المقبلين على الزواج أو أي وحدة تخصصية أخرى بدون قاعدة طبية موحدة موثقة
  if (mod === 'premarital') {
    if (ageYears === null) {
      return {
        eligible: false,
        reason: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية (تاريخ الميلاد غير مسجل للتحقق من أهلية فحص المقبلين على الزواج). يُسمح بعرض السجلات التاريخية فقط.',
        badgeText: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية',
        requiresAdminSetup: true,
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    if (ageYears < 18) {
      return {
        eligible: false,
        reason: `غير مؤهل لفحص المقبلين على الزواج: العمر الحالي (${ageYears} سنة) أقل من سن البلوغ القانوني المعتمد في الجدول (18 سنة). يُسمح بعرض السجلات التاريخية فقط.`,
        badgeText: 'غير مؤهل (أقل من 18 سنة)',
        ageYears,
        ageMonths,
        normalizedGender,
      };
    }
    return {
      eligible: false,
      reason: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية قبل فتح توثيق جديد في هذه الوحدة. يُسمح بعرض السجلات التاريخية فقط.',
      badgeText: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية',
      requiresAdminSetup: true,
      ageYears,
      ageMonths,
      normalizedGender,
    };
  }

  // أي وحدة غير معروفة القاعدة
  return {
    eligible: false,
    reason: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية.',
    badgeText: 'معيار الأهلية يحتاج إعداداً من الإدارة الطبية',
    requiresAdminSetup: true,
    ageYears,
    ageMonths,
    normalizedGender,
  };
}

function getAgeInYears(dobString?: string): number {
  if (!dobString) return 0;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}


/**
 * محرك استخراج اقتراحات المتابعات والزيارات المستحقة
 * يفحص السجلات الطبية السابقة للمريض والعمر والنوع لتحديد الزيارات المستحقة تلقائياً
 */
export function calculatePatientSuggestedFollowups(
  patient: Patient,
  data: {
    childUnder5?: any[];
    childOver5?: any[];
    maternalAnc?: any[];
    maternalPostpartum?: any[];
    geriatric?: any[];
    dental?: any[];
    appointments?: any[];
  }
): SuggestedFollowup[] {
  const suggestions: SuggestedFollowup[] = [];
  const dob = patient.date_of_birth || (patient as any).birth_date;
  if (!patient || !dob) return suggestions;

  const age = getAgeInYears(dob);
  const isFemale = patient.gender === 'female' || patient.gender === 'انثى' || patient.gender === 'أنثى';
  const now = new Date();

  // حساب العمر بالأشهر للأطفال
  const birthDate = new Date(dob);
  const diffMonths = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());

  // 1) فحص الأطفال دون 5 سنوات (< 60 شهر)
  if (age < 5 || diffMonths < 60) {
    // محطات المتابعة الرسمية بالأشهر
    const milestoneBrackets = [2, 4, 6, 9, 12, 18, 24, 36, 48, 60];
    
    // إيجاد أقرب محطة مستحقة لعمر الطفل الحالي
    const currentBracket = milestoneBrackets.find(b => diffMonths <= b) || 60;
    
    // هل يوجد سجل متابعة لهذه المحطة أو حديث خلال آخر شهرين؟
    const hasRecordForBracket = data.childUnder5?.some((r: any) => {
      const recAge = Number(r.age_months);
      return Math.abs(recAge - currentBracket) <= 1;
    });

    const hasRecentAppointment = data.appointments?.some((a: any) => {
      return a.patient_id === patient.id && 
        (a.status === 'WAITING' || a.status === 'IN_PROGRESS') &&
        (a.clinics?.linked_module === 'child_followup' || a.clinics?.name?.includes('طفل'));
    });

    if (!hasRecordForBracket && !hasRecentAppointment) {
      suggestions.push({
        id: `sug-child-${patient.id}-${currentBracket}m`,
        patient_id: patient.id,
        module_type: 'child_followup',
        title: `متابعة نمو الطفل (محطة ${currentBracket} شهر)`,
        reason: `الطفل في عمر (${diffMonths} شهر) ويستحق فحص النمو والتطعيمات الدورية لمحطة ${currentBracket} شهر.`,
        urgency: diffMonths >= currentBracket ? 'high' : 'medium',
        suggested_clinic_name: 'عيادة متابعة الأطفال والنمو'
      });
    }
  }

  // 2) فحص رعاية الأمومة والحوامل (للإناث في سن الإنجاب 15 - 49)
  if (isFemale && age >= 15 && age <= 49) {
    const latestAnc = data.maternalAnc?.[0]; // مرتبة بالأحدث
    const latestPostpartum = data.maternalPostpartum?.[0];

    // إذا كانت هناك متابعة حمل لم ينتهِ بوضع مولود أو متابعة نفاس حديثة
    if (latestAnc && (!latestPostpartum || new Date(latestAnc.created_at || latestAnc.lmp_date || '2000-01-01') > new Date(latestPostpartum.delivery_date || '2000-01-01'))) {
      const ancDate = new Date(latestAnc.created_at || latestAnc.next_visit_date || now);
      const weeksSinceLastVisit = Math.floor((now.getTime() - ancDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

      const hasUpcomingAncAppt = data.appointments?.some((a: any) => 
        a.patient_id === patient.id && 
        (a.status === 'WAITING' || a.status === 'IN_PROGRESS') &&
        (a.clinics?.linked_module === 'maternal_care' || a.clinics?.name?.includes('حوامل') || a.clinics?.name?.includes('نساء'))
      );

      if (weeksSinceLastVisit >= 4 && !hasUpcomingAncAppt) {
        suggestions.push({
          id: `sug-anc-${patient.id}`,
          patient_id: patient.id,
          module_type: 'maternal_care',
          title: 'موعد متابعة حمل مستحق',
          reason: `مرت ${weeksSinceLastVisit} أسابيع منذ آخر فحص متابعة حمل، والمريضة بحاجة لفحص الحمل الدوري والمؤشرات الحيوية.`,
          urgency: weeksSinceLastVisit >= 6 ? 'high' : 'medium',
          suggested_clinic_name: 'عيادة رعاية الأمومة والحوامل'
        });
      }
    }
  }

  // 3) فحص كبار السن (عمر ≥ 60 سنة)
  if (age >= 60) {
    const latestGeriatric = data.geriatric?.[0];
    let monthsSinceLast = 999;
    if (latestGeriatric && latestGeriatric.created_at) {
      const gDate = new Date(latestGeriatric.created_at);
      monthsSinceLast = (now.getFullYear() - gDate.getFullYear()) * 12 + (now.getMonth() - gDate.getMonth());
    }

    const hasUpcomingGeriatricAppt = data.appointments?.some((a: any) => 
      a.patient_id === patient.id && 
      (a.status === 'WAITING' || a.status === 'IN_PROGRESS') &&
      (a.clinics?.linked_module === 'geriatric_care' || a.clinics?.name?.includes('مسن') || a.clinics?.name?.includes('كبار'))
    );

    if ((!latestGeriatric || monthsSinceLast >= 12) && !hasUpcomingGeriatricAppt) {
      suggestions.push({
        id: `sug-geriatric-${patient.id}`,
        patient_id: patient.id,
        module_type: 'geriatric_care',
        title: 'تقييم كبار السن الدوري المستحق',
        reason: latestGeriatric 
          ? `مرت أكثر من سنة (${monthsSinceLast} شهر) على آخر تقييم شامل لصحة كبار السن.`
          : 'المريض بعمر 60 سنة فأكثر ولم يتم إجراء تقييم صحة كبار السن الشامل ومخاطر السقوط والوظائف الإدراكية.',
        urgency: monthsSinceLast >= 18 ? 'high' : 'medium',
        suggested_clinic_name: 'عيادة طب ورعاية كبار السن'
      });
    }
  }

  return suggestions;
}
