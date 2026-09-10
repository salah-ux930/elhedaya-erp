import { LinkedModuleType } from '../types.ts';

export interface ClinicRequirementDetail {
  id: string;
  moduleKey: string;
  title: string;
  subtitle: string;
  badge: string;
  requirements: string[];
  mandatoryDocs: string[];
  preparationNotes: string[];
  remindersForStaff: string[];
}

export const CLINIC_REQUIREMENTS_MAP: Record<string, ClinicRequirementDetail> = {
  maternal_care: {
    id: 'maternal_care',
    moduleKey: 'maternal_care',
    title: 'متابعة الحمل وصحة الأم (رعاية الحوامل والنفاس)',
    subtitle: 'Maternal ANC & Postpartum Care',
    badge: 'بروتوكول رعاية الأمومة',
    requirements: [
      'إحضار كارت المتابعة الورقي وبطاقة صحة الأم',
      'تحليل صورة دم كاملة حديثة (CBC) للتحقق من نسبة الهيموجلوبين',
      'تحليل بول كامل حديث للكشف عن الزلال أو التهابات المسالك',
      'تقرير فحص السونار والموجات فوق الصوتية الأخير (إن وُجد)',
      'قياس الوزن وضغط الدم ومستوى السكر العشوائي فور الحضور'
    ],
    mandatoryDocs: [
      'كارت متابعة الحوامل',
      'بطاقة الرقم القومي للأم'
    ],
    preparationNotes: [
      'يُفضل الحضور صباحاً في حال الحاجة لسحب تحاليل صائم أو منحنى سكر (OGTT)',
      'شرب كمية كافية من الماء قبل الفحص التلفزيوني والسونار'
    ],
    remindersForStaff: [
      'التأكد من قياس ضغط الدم بدقة واستبعاد علامات تسمم الحمل',
      'مراجعة تطعيم التيتانوس وتدوين حركة الجنين ونبضه'
    ]
  },

  child_followup: {
    id: 'child_followup',
    moduleKey: 'child_followup',
    title: 'متابعة نمو الطفل والتطعيمات (صحة ورعاية الطفل)',
    subtitle: 'Child Growth & Routine Immunizations',
    badge: 'بروتوكول صحة الطفل',
    requirements: [
      'دفتر التطعيمات الورقي الإجباري (بطاقة التطعيم)',
      'كارت متابعة نمو وتطور الطفل',
      'قياس الوزن والطول ومحيط الرأس وتسجيلها على منحنيات النمو (Z-score)',
      'إبلاغ التمريض بأي ارتفاع في درجة الحرارة أو نزلات معوية حالية قبل التطعيم'
    ],
    mandatoryDocs: [
      'شهادة ميلاد الطفل أو بطاقة التطعيم الورقية',
      'بطاقة الرقم القومي لولي الأمر'
    ],
    preparationNotes: [
      'إحضار الطفل بملابس خفيفة يسهل نزعها لقياس الوزن بدقة',
      'تجنب إعطاء خافض حرارة وقائي قبل التطعيم مباشرة إلا بإرشاد الطبيب'
    ],
    remindersForStaff: [
      'التأكد من خلو الطفل من الحمى قبل إعطاء الطعوم الحية',
      'توعية الأم بالآثار الجانبية المتوقعة للطعوم ومواعيد الجرعات القادمة'
    ]
  },

  family_planning: {
    id: 'family_planning',
    moduleKey: 'family_planning',
    title: 'تنظيم الأسرة (الصحة الإنجابية والمباعدة بين الولادات)',
    subtitle: 'Family Planning & Reproductive Health',
    badge: 'بروتوكول تنظيم الأسرة',
    requirements: [
      'بطاقة متابعة تنظيم الأسرة السابقة (إن وُجدت)',
      'قياس ضغط الدم والوزن بالاستقبال',
      'معرفة وتحديد تاريخ أول يوم لآخر دورة شهرية (LMP) بدقة',
      'إبلاغ الطبيب بالوسائل السابقة والآثار الجانبية الملحوظة'
    ],
    mandatoryDocs: [
      'بطاقة الرقم القومي للزوجة',
      'بطاقة تنظيم الأسرة'
    ],
    preparationNotes: [
      'يُفضل الحضور في الأيام الأخيرة للدورة الشهرية في حال الرغبة بتركيب اللولب IUD',
      'إجراء اختبار حمل معملي مسبق في حال تأخر الدورة الشهرية'
    ],
    remindersForStaff: [
      'قياس ضغط الدم إلزامي قبل صرف أو تجديد وسائل الهرمونات المركبة (COC)',
      'تقديم المشورة المتكاملة حول الوسائل المناسبة والاختيار الطوعي المستنير'
    ]
  },

  geriatric_care: {
    id: 'geriatric_care',
    moduleKey: 'geriatric_care',
    title: 'تقييم كبار السن (الرعاية الصحية الشاملة للمسنين)',
    subtitle: 'Comprehensive Geriatric Assessment',
    badge: 'بروتوكول رعاية المسنين',
    requirements: [
      'إحضار كافة علب الأدوية الحالية للمراجعة الشاملة ومنع التداخلات الدوائية (Polymedication check)',
      'كارت متابعة الأمراض المزمنة (سكر / ضغط / قلب)',
      'تقارير الفحوصات والتحاليل السابقة (وظائف كلى، كبد، دهون، قاع عين)',
      'قياس الضغط والسكر العشوائي بالاستقبال فور الحضور'
    ],
    mandatoryDocs: [
      'بطاقة الرقم القومي للمريض',
      'كارت متابعة الأمراض المزمنة'
    ],
    preparationNotes: [
      'يُفضل حضور مرافق من أفراد الأسرة للمساعدة في سرد التاريخ الدوائي واليومي',
      'إحضار النظارة الطبية والسماعة إن كان المريض يستخدمهما لتقييم الحواس'
    ],
    remindersForStaff: [
      'تقييم مخاطر السقوط (Fall Risk) وتقييم الحالة الإدراكية والنفسية',
      'مراجعة الجرعات الدوائية وملاءمتها لوظائف الكلى'
    ]
  },

  dental: {
    id: 'dental',
    moduleKey: 'dental',
    title: 'فحص الأسنان (طب وجراحة الفم والأسنان)',
    subtitle: 'Oral & Dental Health',
    badge: 'بروتوكول صحة الأسنان',
    requirements: [
      'بطاقة الفحص الدوري للأسنان',
      'إبلاغ طبيب الأسنان عن أي نزيف لثوي أو ألم حاد ومستمر',
      'تنبيه الطبيب فورياً في حال وجود حساسية للبنج الموضعي أو المضادات الحيوية',
      'إبلاغ الطبيب بالأمراض المزمنة وأدوية سيولة الدم (الأسبرين والوارفارين وغيرها)'
    ],
    mandatoryDocs: [
      'بطاقة الرقم القومي أو إثبات الشخصية'
    ],
    preparationNotes: [
      'تنظيف الأسنان بالفرشاة والمعجون جيداً قبل الدخول لعيادة الأسنان',
      'تناول وجبة خفيفة قبل الزيارة لتفادي الدوار أو هبوط السكر مع التخدير'
    ],
    remindersForStaff: [
      'التأكد التام من التاريخ التحسسي للمخدر الموضعي وتاريخ أدوية السيولة',
      'تسجيل مؤشر تسوس الأسنان المعتمد (DMFT Index) للمريض'
    ]
  },

  premarital: {
    id: 'premarital',
    moduleKey: 'premarital',
    title: 'فحص ما قبل الزواج (المشورة والفحص الطبي الشامل)',
    subtitle: 'Premarital Screening & Genetic Counseling',
    badge: 'بروتوكول المقبلين على الزواج',
    requirements: [
      'أصل وصورة بطاقة الرقم القومي السارية للطرفين (العروسين)',
      'عدد (٢) صورة شخصية حديثة مقاس 4x6 لكل طرف',
      'حضور الطرفين معاً لسحب عينات الدم وتقديم جلسة المشورة الوراثية والنفسية',
      'إحضار التاريخ المرضي العائلي للأمراض الوراثية وفقر دم البحر المتوسط (الثلاسيميا)'
    ],
    mandatoryDocs: [
      'بطاقة الرقم القومي سارية المفعول للطرفين',
      'الصور الشخصية'
    ],
    preparationNotes: [
      'الفحص يستغرق حوالي ساعة لسحب العينات والفحوصات والاستبيان الطبي',
      'إجراء الفحص قبل موعد الزواج بشهرين على الأقل لاستلام الشهادة المميكنة'
    ],
    remindersForStaff: [
      'التأكد من إجراء فحوصات الفيروسات الكبدية (B, C) والإيدز (HIV) والثلاسيميا',
      'تقديم المشورة الطبية والوراثية في سرية وخصوصية تامة'
    ]
  },

  general: {
    id: 'general',
    moduleKey: 'general',
    title: 'الممارسة العامة ومتابعة الأمراض المزمنة (طب الأسرة)',
    subtitle: 'General Practice & Chronic Care',
    badge: 'بروتوكول طب الأسرة',
    requirements: [
      'كارت متابعة الأمراض المزمنة إن وُجد',
      'قائمة أو علب الأدوية الحالية المستمرة',
      'تقارير الفحوصات والتحاليل الدورية الأخيرة (سكر تراكمي HbA1c، وظائف كلى، دهون)',
      'قياس العلامات الحيوية (الضغط، النبض، الحرارة، الوزن) في الاستقبال'
    ],
    mandatoryDocs: [
      'بطاقة الرقم القومي أو إثبات الشخصية',
      'كارت التأمين الصحي أو الدعم إن وُجد'
    ],
    preparationNotes: [
      'تدوين أي أعراض جديدة أو شكاوى صحية ظهرت مؤخراً لعرضها على الطبيب',
      'الحضور بملابس مريحة لتسهيل قياس الضغط والفحص السريري'
    ],
    remindersForStaff: [
      'تسجيل العلامات الحيوية الأساسية كاملة قبل دخول المريض للطبيب',
      'مراجعة انتظام المريض في خطة العلاج الموصوفة'
    ]
  }
};

/**
 * دالة مساعدة لاستخراج متطلبات العيادة بناءً على الموديول المرتبط أو اسم العيادة
 */
export function getClinicRequirements(linkedModule?: LinkedModuleType | string, clinicName?: string): ClinicRequirementDetail {
  if (linkedModule) {
    const raw = String(linkedModule).toLowerCase();
    if (raw === 'maternal_care' || raw === 'maternal' || raw.includes('أمومة') || raw.includes('حوامل')) {
      return CLINIC_REQUIREMENTS_MAP.maternal_care;
    }
    if (raw === 'child_followup' || raw === 'child' || raw.includes('طفل') || raw.includes('أطفال')) {
      return CLINIC_REQUIREMENTS_MAP.child_followup;
    }
    if (raw === 'family_planning' || raw.includes('تنظيم')) {
      return CLINIC_REQUIREMENTS_MAP.family_planning;
    }
    if (raw === 'geriatric_care' || raw === 'geriatric' || raw.includes('مسن') || raw.includes('كبار')) {
      return CLINIC_REQUIREMENTS_MAP.geriatric_care;
    }
    if (raw === 'dental' || raw.includes('أسنان')) {
      return CLINIC_REQUIREMENTS_MAP.dental;
    }
    if (raw === 'premarital' || raw.includes('زواج')) {
      return CLINIC_REQUIREMENTS_MAP.premarital;
    }
  }

  if (clinicName) {
    const name = clinicName.toLowerCase();
    if (name.includes('أمومة') || name.includes('حوامل') || name.includes('نساء') || name.includes('ولادة')) {
      return CLINIC_REQUIREMENTS_MAP.maternal_care;
    }
    if (name.includes('طفل') || name.includes('أطفال') || name.includes('تطعيم')) {
      return CLINIC_REQUIREMENTS_MAP.child_followup;
    }
    if (name.includes('تنظيم') || name.includes('صحة إنجابية')) {
      return CLINIC_REQUIREMENTS_MAP.family_planning;
    }
    if (name.includes('مسن') || name.includes('كبار السن') || name.includes('شيخوخة')) {
      return CLINIC_REQUIREMENTS_MAP.geriatric_care;
    }
    if (name.includes('أسنان') || name.includes('فم')) {
      return CLINIC_REQUIREMENTS_MAP.dental;
    }
    if (name.includes('زواج') || name.includes('مقبلين')) {
      return CLINIC_REQUIREMENTS_MAP.premarital;
    }
  }

  return CLINIC_REQUIREMENTS_MAP.general;
}

/**
 * دالة لتنسيق نص رسالة المتطلبات للمريض (للطباعة أو النسخ للمريض عبر واتساب/رسائل نصية)
 */
export function formatBookingRequirementsText(params: {
  patientName: string;
  clinicName: string;
  doctorName?: string;
  date: string;
  time?: string;
  room?: string;
  requirements: string[];
  preparationNotes?: string[];
}): string {
  const { patientName, clinicName, doctorName, date, time, room, requirements, preparationNotes } = params;

  let text = `🏥 *تأكيد حجز موعد عيادة - وحدة الرعاية الصحية الأولية*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 *اسم المريض:* ${patientName}\n`;
  text += `🩺 *العيادة:* ${clinicName}${room ? ` (غرفة: ${room})` : ''}\n`;
  if (doctorName) text += `👨‍⚕️ *الطبيب:* د/ ${doctorName}\n`;
  text += `📅 *تاريخ الموعد:* ${date}${time ? ` الساعة ${time}` : ''}\n\n`;

  text += `📋 *المستندات والمتطلبات المطلوب إحضارها:*\n`;
  requirements.forEach((req, idx) => {
    text += `  ${idx + 1}. ${req}\n`;
  });

  if (preparationNotes && preparationNotes.length > 0) {
    text += `\n💡 *إرشادات وتعليمات الحضور:*\n`;
    preparationNotes.forEach((note) => {
      text += `  • ${note}\n`;
    });
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `نتمنى لكم دوام الصحة والعافية ✨`;

  return text;
}
