import { Patient, SuggestedFollowup, LinkedModuleType } from '../types.ts';

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
