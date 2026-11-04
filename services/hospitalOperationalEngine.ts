import { DB } from '../store.ts';
import { Patient, FamilyFile, SuggestedFollowup, LinkedModuleType } from '../types.ts';
import { calculatePatientSuggestedFollowups } from './followupSuggestions.ts';
import { deduplicateFollowupsById } from '../utils/permissions.ts';

export interface PatientClinicalAlert {
  id: string;
  type: 'ALLERGY' | 'CHRONIC' | 'HOUSING_RISK' | 'LAB_ABNORMAL' | 'VITAL_ALERT';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  details: string;
}

export interface BillingEligibilityInfo {
  status: 'FREE_SOCIAL' | 'FUNDED' | 'SUBSIDIZED_PENSION' | 'CASH';
  label: string;
  badgeText: string;
  reason: string;
  discountPercent: number;
  familyCode?: string;
  fundingEntityName?: string;
}

export interface PatientOperationalProfile {
  patient: Patient;
  ageYears: number | null;
  familyFile: (FamilyFile & { file_code?: string }) | null;
  memberRecord: any | null;
  memberRole?: string;
  billingEligibility: BillingEligibilityInfo;
  hasAllergyAlert: boolean;
  allergies: string[];
  drugReactions: string[];
  chronicProblems: { id: string; name: string; diagnosis_description: string; onsetDate?: string; notes?: string }[];
  familyHistoryFlags: string[];
  housingRisks: string[];
  clinicalAlerts: PatientClinicalAlert[];
  latestVitals: {
    bp?: string;
    weight?: string | number;
    pulse?: string;
    temp?: string;
    bmi?: string;
    date?: string;
    source?: string;
  } | null;
  latestLabs: {
    id: string;
    testName: string;
    result: string;
    date: string;
  }[];
  latestMedications: {
    id: string;
    summary: string;
    date: string;
    source: string;
  }[];
  dueFollowups: SuggestedFollowup[];
  familyOtherMembersDue: {
    patientId: string;
    patientName: string;
    relationship: string;
    followup: SuggestedFollowup;
  }[];
  familyDueFollowUps: {
    memberName: string;
    title: string;
    relationship: string;
  }[];
}

export interface OperationalWorkItem {
  id: string;
  category: 'CRITICAL_CLINICAL' | 'MATERNAL_CHILD' | 'CHRONIC_GERIATRIC' | 'SOCIAL_HOUSING';
  urgency: 'high' | 'medium' | 'low';
  patient: Patient | null;
  familyFile: FamilyFile | null;
  relationship?: string;
  title: string;
  reason: string;
  suggestedActionLabel: string;
  suggestedModule?: LinkedModuleType;
  badges: string[];
}

function calcAgeYears(dobString?: string): number | null {
  if (!dobString) return null;
  const birth = new Date(dobString);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export class HospitalOperationalEngine {
  /**
   * يبني ملف القرار السريري والتشغيلي الموحد (Patient 360) لأي مريض
   * من خلال دمج بيانات الملف العائلي، البحث الاجتماعي، الحساسية، الأمراض المزمنة، المعمل، والصيدلية
   */
  static buildPatientOperationalProfile(
    patient: Patient,
    contextData: {
      familyFiles: FamilyFile[];
      fundingEntities?: any[];
      patientProblems?: any[];
      problems?: any[];
      physicalExams?: any[];
      patientVisits?: any[];
      appointments?: any[];
      sessions?: any[];
      labTests?: any[];
      dispenseOrders?: any[];
    }
  ): PatientOperationalProfile {
    const ageYears = calcAgeYears(patient.date_of_birth);

    // 1. Find linked Family File & Member record
    let linkedFamily: (FamilyFile & { file_code?: string }) | null = null;
    let memberRecord: any | null = null;

    for (const ff of contextData.familyFiles || []) {
      const foundMember = (ff.members || []).find(
        (m: any) => m.patient_id === patient.id || m.patients?.id === patient.id
      );
      if (foundMember) {
        linkedFamily = { ...ff, file_code: (ff as any).file_code || ff.family_code };
        memberRecord = foundMember;
        break;
      }
      // Fallback match by national_id if head of family matches
      if (patient.national_id && ff.national_id === patient.national_id) {
        linkedFamily = { ...ff, file_code: (ff as any).file_code || ff.family_code };
        break;
      }
    }

    // 2. Compute Billing & Social Eligibility
    const fundingEntity = (contextData.fundingEntities || []).find(
      (fe: any) => fe.id === patient.funding_entity_id
    );

    let billingEligibility: BillingEligibilityInfo = {
      status: 'CASH',
      label: 'نقدي عادي',
      badgeText: 'سداد نقدي',
      reason: 'لا يوجد إعفاء اجتماعي أو جهة تعاقد مسجلة',
      discountPercent: 0,
      familyCode: linkedFamily?.family_code
    };

    if (linkedFamily?.eligible_for_free_service) {
      billingEligibility = {
        status: 'FREE_SOCIAL',
        label: 'إعفاء كامل (بحث اجتماعي معتمد)',
        badgeText: 'مستحق خدمة مجانية (بحث اجتماعي)',
        reason: `الأسرة (${linkedFamily.family_code}) مسجلة كمستحقة للخدمة المجانية في البحث الاجتماعي`,
        discountPercent: 100,
        familyCode: linkedFamily.family_code
      };
    } else if (fundingEntity) {
      billingEligibility = {
        status: 'FUNDED',
        label: `تعاقد / تأمين (${fundingEntity.name})`,
        badgeText: `تعاقد: ${fundingEntity.name}`,
        reason: `المريض مغطى عبر جهة التعاقد: ${fundingEntity.name}`,
        discountPercent: 100,
        familyCode: linkedFamily?.family_code,
        fundingEntityName: fundingEntity.name
      };
    } else if (linkedFamily?.receives_pension) {
      billingEligibility = {
        status: 'SUBSIDIZED_PENSION',
        label: 'دعم اجتماعي (مستفيد معاش)',
        badgeText: 'دعم اجتماعي / معاش',
        reason: `أسرة المريض (${linkedFamily.family_code}) مسجلة كمستفيدة من معاش تضامن/اجتماعي`,
        discountPercent: 50,
        familyCode: linkedFamily.family_code
      };
    }

    // 3. Extract Allergies, Chronic Problems, and Family History
    const patientExams = (contextData.physicalExams || []).filter(
      (e: any) => e.patient_id === patient.id
    );
    const rawProbs = contextData.patientProblems || contextData.problems || [];
    const probs = rawProbs.filter(
      (p: any) => p.patient_id === patient.id
    );

    const allergySet = new Set<string>();
    const drugReactionSet = new Set<string>();
    const familyHistorySet = new Set<string>();

    patientExams.forEach((ex: any) => {
      if (ex.allergy && ex.allergy.trim() && ex.allergy.trim() !== 'لا يوجد') {
        allergySet.add(ex.allergy.trim());
      }
      if (
        ex.adverse_drug_reactions &&
        ex.adverse_drug_reactions.trim() &&
        ex.adverse_drug_reactions.trim() !== 'لا يوجد'
      ) {
        drugReactionSet.add(ex.adverse_drug_reactions.trim());
      }
      if (ex.family_history) {
        ex.family_history
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
          .forEach((fh: string) => familyHistorySet.add(fh));
      }
    });

    const chronicProblems = probs.map((p: any) => ({
      id: p.id,
      name: p.problem_name || p.diagnosis_description || 'مرض مزمن',
      diagnosis_description: p.problem_name || p.diagnosis_description || 'مرض مزمن',
      onsetDate: p.onset_date,
      notes: p.notes
    }));

    // 4. Housing & Environmental Risks from Family File
    const housingRisks: string[] = [];
    if (linkedFamily) {
      if (linkedFamily.ventilation === 'poor') {
        housingRisks.push('تهوية المسكن غير جيدة (خطر أمراض تنفسية وعدوى)');
      }
      if (linkedFamily.sewage_system === 'trench') {
        housingRisks.push('صرف صحي غير آمن (طرنش) - خطر أمراض معوية/تلوث');
      }
      if (linkedFamily.has_animals_birds && linkedFamily.barn_location === 'inside') {
        housingRisks.push('تربية طيور/حيوانات داخل المسكن (خطر حساسية صدر وأمراض مشتركة)');
      }
      const membersCount = linkedFamily.members?.length || 0;
      const sleepRooms = Number(linkedFamily.sleeping_rooms || 0);
      if (sleepRooms > 0 && membersCount / sleepRooms >= 3.5) {
        housingRisks.push(`تكدس بالمسكن (${membersCount} أفراد في ${sleepRooms} غرف نوم)`);
      }
    }

    // 5. Latest Vitals (from Dialysis Sessions or Physical Exams)
    const patientSessions = (contextData.sessions || [])
      .filter((s: any) => s.patient_id === patient.id)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));

    let latestVitals: PatientOperationalProfile['latestVitals'] = null;

    if (patientExams.length > 0) {
      const latestEx = patientExams[0];
      let parsedFindings: any = {};
      if (latestEx.clinical_findings) {
        try {
          parsedFindings =
            typeof latestEx.clinical_findings === 'string'
              ? JSON.parse(latestEx.clinical_findings)
              : latestEx.clinical_findings;
        } catch {}
      }
      const bp = parsedFindings.vital_bp || latestEx.blood_pressure;
      const weight = parsedFindings.vital_weight || latestEx.weight;
      const pulse = parsedFindings.vital_pulse || latestEx.pulse_rate;
      const temp = parsedFindings.vital_temp || latestEx.temperature;
      const bmi = parsedFindings.vital_bmi || latestEx.bmi;

      if (bp || weight || pulse || temp) {
        latestVitals = {
          bp,
          weight,
          pulse,
          temp,
          bmi,
          date: latestEx.exam_date,
          source: 'عيادة / فحص سريري'
        };
      }
    }

    if (patientSessions.length > 0) {
      const latestSess = patientSessions[0];
      if (!latestVitals || (latestSess.date && latestSess.date >= (latestVitals.date || ''))) {
        if (latestSess.blood_pressure || latestSess.weight_before) {
          latestVitals = {
            bp: latestSess.blood_pressure,
            weight: latestSess.weight_after || latestSess.weight_before,
            date: latestSess.date,
            source: 'جلسة غسيل كلوي'
          };
        }
      }
    }

    // 6. Latest Labs
    const patientLabs = (contextData.labTests || [])
      .filter((l: any) => l.patient_id === patient.id && l.result)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5)
      .map((l: any) => ({
        id: l.id,
        testName: l.lab_test_definitions?.name || 'تحليل معملي',
        result: l.result,
        date: l.date
      }));

    // 7. Latest Medications (from Pharmacy Dispense Orders, Appointments, or Physical Exams)
    const latestMedications: PatientOperationalProfile['latestMedications'] = [];
    const patientDispenses = (contextData.dispenseOrders || [])
      .filter((o: any) => o.patient_id === patient.id)
      .slice(0, 3);

    patientDispenses.forEach((order: any) => {
      const drugsText = (order.pharmacy_dispense_items || [])
        .map(
          (di: any) =>
            `${di.pharmacy_items?.trade_name || 'دواء'} (${di.quantity} - باتش ${di.batch_number_snapshot})`
        )
        .join(' + ');
      if (drugsText) {
        latestMedications.push({
          id: order.id,
          summary: drugsText,
          date: (order.dispensed_at || '').slice(0, 10),
          source: 'صرف صيدلية المركز'
        });
      }
    });

    const patientApptsWithRx = (contextData.appointments || [])
      .filter((a: any) => a.patient_id === patient.id && a.prescription)
      .slice(0, 3);

    patientApptsWithRx.forEach((apt: any) => {
      latestMedications.push({
        id: apt.id,
        summary: apt.prescription,
        date: apt.date,
        source: `روشتة ${apt.clinics?.name || 'عيادة'}`
      });
    });

    // 8. Build Clinical Alerts
    const clinicalAlerts: PatientClinicalAlert[] = [];
    const combinedAllergies = [
      ...Array.from(allergySet).map(a => `حساسية: ${a}`),
      ...Array.from(drugReactionSet).map(d => `تفاعل دوائي: ${d}`)
    ];

    combinedAllergies.forEach((al, idx) => {
      clinicalAlerts.push({
        id: `alert-allergy-${idx}`,
        type: 'ALLERGY',
        severity: 'critical',
        title: 'تحذير حساسية / تفاعل دوائي مسجل',
        details: al
      });
    });

    chronicProblems.forEach((cp) => {
      clinicalAlerts.push({
        id: `alert-chronic-${cp.id}`,
        type: 'CHRONIC',
        severity: 'warning',
        title: `مرض مزمن مسجل: ${cp.name}`,
        details: cp.notes || (cp.onsetDate ? `منذ ${cp.onsetDate}` : 'مسجل بالملف العائلي')
      });
    });

    housingRisks.forEach((hr, idx) => {
      clinicalAlerts.push({
        id: `alert-housing-${idx}`,
        type: 'HOUSING_RISK',
        severity: 'info',
        title: 'عامل خطورة بيئي/سكني بالملف العائلي',
        details: hr
      });
    });

    // 9. Calculate Due Followups for Patient & Other Family Members
    const dueFollowups = calculatePatientSuggestedFollowups(patient, {
      appointments: contextData.appointments || []
    });

    // Add operational chronic followup check if patient has chronic problems and no visit in last 60 days
    const patientVisitsList = (contextData.patientVisits || []).filter(
      (v: any) => v.patient_id === patient.id
    );
    const lastVisitDateStr =
      patientVisitsList[0]?.visit_date ||
      patientExams[0]?.exam_date ||
      patientSessions[0]?.date ||
      null;

    if (chronicProblems.length > 0) {
      let daysSinceLastVisit = 999;
      if (lastVisitDateStr) {
        const diffMs = Date.now() - new Date(lastVisitDateStr).getTime();
        daysSinceLastVisit = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
      if (daysSinceLastVisit >= 45) {
        dueFollowups.push({
          id: `sug-chronic-${patient.id}`,
          patient_id: patient.id,
          module_type: 'general',
          title: 'متابعة دورية للأمراض المزمنة مستحقة',
          reason:
            daysSinceLastVisit === 999
              ? `المريض مسجل لديه (${chronicProblems.map((c) => c.name).join('، ')}) ولم يسجل زيارة متابعة حديثة.`
              : `مرت ${daysSinceLastVisit} يوماً منذ آخر كشف متابعة للأمراض المزمنة (${chronicProblems.map((c) => c.name).join('، ')}).`,
          urgency: daysSinceLastVisit >= 90 ? 'high' : 'medium',
          suggested_clinic_name: 'عيادة الباطنة وطب الأسرة'
        });
      }
    }

    const uniqueDueFollowups = deduplicateFollowupsById(dueFollowups);

    // Check other members of the same family file (deduplicated strictly by task id)
    const familyOtherMembersDue: PatientOperationalProfile['familyOtherMembersDue'] = [];
    const seenOtherFollowupIds = new Set<string>();
    if (linkedFamily && linkedFamily.members) {
      for (const m of linkedFamily.members) {
        const mPat: Patient | undefined = m.patients;
        if (!mPat || mPat.id === patient.id) continue;
        const mFollowups = calculatePatientSuggestedFollowups(mPat, {
          appointments: contextData.appointments || []
        });
        mFollowups.forEach((f) => {
          if (!f?.id || seenOtherFollowupIds.has(f.id)) return;
          seenOtherFollowupIds.add(f.id);
          familyOtherMembersDue.push({
            patientId: mPat.id,
            patientName: mPat.name,
            relationship: m.relationship_to_head || 'فرد بالأسرة',
            followup: f
          });
        });
      }
    }

    const familyDueFollowUps = familyOtherMembersDue.map(item => ({
      memberName: item.patientName,
      title: item.followup.title,
      relationship: item.relationship
    }));

    return {
      patient,
      ageYears,
      familyFile: linkedFamily,
      memberRecord,
      memberRole: memberRecord?.relationship_to_head || (memberRecord?.is_head ? 'رب الأسرة' : undefined),
      billingEligibility,
      hasAllergyAlert: allergySet.size > 0 || drugReactionSet.size > 0,
      allergies: Array.from(allergySet),
      drugReactions: Array.from(drugReactionSet),
      chronicProblems,
      familyHistoryFlags: Array.from(familyHistorySet),
      housingRisks,
      clinicalAlerts,
      latestVitals,
      latestLabs: patientLabs,
      latestMedications,
      dueFollowups: uniqueDueFollowups,
      familyOtherMembersDue,
      familyDueFollowUps
    };
  }

  /**
   * يولد لوحة المهام التشغيلية اليومية (Daily Operational Worklist) لموظفي الملف العائلي والعيادات
   */
  static buildFamilyOperationalWorklist(contextData: {
    familyFiles: FamilyFile[];
    patients: Patient[];
    fundingEntities?: any[];
    patientProblems?: any[];
    problems?: any[];
    physicalExams?: any[];
    patientVisits?: any[];
    appointments?: any[];
    sessions?: any[];
    labTests?: any[];
  }): OperationalWorkItem[] {
    const worklist: OperationalWorkItem[] = [];
    const seenIds = new Set<string>();

    // 1. Scan all Family Files and their members
    for (const ff of contextData.familyFiles || []) {
      const members = ff.members || [];

      // Check if Family File has zero members linked yet
      if (members.length === 0) {
        const itemId = `wf-empty-family-${ff.id}`;
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId);
          worklist.push({
            id: itemId,
            category: 'SOCIAL_HOUSING',
            urgency: 'medium',
            patient: null,
            familyFile: ff,
            title: `استكمال ربط أفراد الأسرة (${ff.family_code})`,
            reason: `الملف العائلي باسم (${ff.head_name}) مسجل بدون أفراد مربوطين حتى الآن. يلزم إضافة أفراد الأسرة لتفعيل المتابعات الطبية.`,
            suggestedActionLabel: 'إضافة أفراد الأسرة الآن',
            badges: [ff.family_code, ff.village_city || 'بدون قرية']
          });
        }
      }

      // Check if Family File has environmental/housing risks or social support flags needing review
      if (
        ff.ventilation === 'poor' ||
        ff.sewage_system === 'trench' ||
        (ff.has_animals_birds && ff.barn_location === 'inside')
      ) {
        const itemId = `wf-housing-risk-${ff.id}`;
        if (!seenIds.has(itemId)) {
          seenIds.add(itemId);
          const headMember = members.find((m: any) => m.is_head) || members[0];
          const headPatient =
            headMember?.patients ||
            contextData.patients.find((p) => p.id === headMember?.patient_id) ||
            null;
          worklist.push({
            id: itemId,
            category: 'SOCIAL_HOUSING',
            urgency: 'medium',
            patient: headPatient,
            familyFile: ff,
            title: `تنبيه بيئي وسكني للأسرة (${ff.family_code})`,
            reason: `تم رصد عوامل خطورة بيئية بمسكن أسرة (${ff.head_name}): ${[
              ff.ventilation === 'poor' ? 'تهوية غير جيدة' : '',
              ff.sewage_system === 'trench' ? 'صرف طرنش' : '',
              ff.has_animals_birds && ff.barn_location === 'inside' ? 'حظيرة داخل المنزل' : ''
            ]
              .filter(Boolean)
              .join(' + ')}. يوصى بالتثقيف الصحي وفحص أفراد الأسرة.`,
            suggestedActionLabel: 'مراجعة ملف الأسرة والتثقيف',
            badges: [
              ff.family_code,
              ff.eligible_for_free_service ? 'مستحق خدمة مجانية' : 'تقييم بيئي'
            ]
          });
        }
      }

      // Scan each member of the family file
      for (const m of members) {
        const pat =
          m.patients || contextData.patients.find((p) => p.id === m.patient_id);
        if (!pat) continue;

        const profile = this.buildPatientOperationalProfile(pat, contextData);

        // Add each due followup as an actionable worklist item
        for (const sug of profile.dueFollowups) {
          const itemId = `wf-sug-${sug.id}`;
          if (seenIds.has(itemId)) continue;
          seenIds.add(itemId);

          const isMaternalOrChild =
            sug.module_type === 'child_followup' || sug.module_type === 'maternal_care';

          worklist.push({
            id: itemId,
            category: isMaternalOrChild ? 'MATERNAL_CHILD' : 'CHRONIC_GERIATRIC',
            urgency: sug.urgency,
            patient: pat,
            familyFile: ff,
            relationship: m.relationship_to_head || 'فرد بالأسرة',
            title: sug.title,
            reason: sug.reason,
            suggestedActionLabel: `حجز ${sug.suggested_clinic_name || 'العيادة'}`,
            suggestedModule: sug.module_type,
            badges: [
              `ملف: ${ff.family_code}`,
              m.relationship_to_head || 'فرد بالأسرة',
              ...(ff.eligible_for_free_service ? ['مستحق مجاني'] : [])
            ]
          });
        }

        // Check if member has critical allergies or multiple chronic problems
        if (profile.hasAllergyAlert || profile.chronicProblems.length >= 2) {
          const itemId = `wf-critical-member-${pat.id}`;
          if (!seenIds.has(itemId)) {
            seenIds.add(itemId);
            worklist.push({
              id: itemId,
              category: 'CRITICAL_CLINICAL',
              urgency: profile.hasAllergyAlert ? 'high' : 'medium',
              patient: pat,
              familyFile: ff,
              relationship: m.relationship_to_head || 'فرد بالأسرة',
              title:
                profile.hasAllergyAlert
                  ? `حذر دوائي وسريري: ${pat.name}`
                  : `تعدد أمراض مزمنة بالملف العائلي: ${pat.name}`,
              reason: [
                ...profile.allergies,
                ...profile.drugReactions,
                ...(profile.chronicProblems.length > 0
                  ? [`أمراض مزمنة: ${profile.chronicProblems.map((c) => c.name).join('، ')}`]
                  : [])
              ].join(' · '),
              suggestedActionLabel: 'فتح بطاقة المريض',
              badges: [
                `ملف: ${ff.family_code}`,
                ...(profile.hasAllergyAlert ? ['حساسية دوائية'] : []),
                ...(ff.eligible_for_free_service ? ['مستحق مجاني'] : [])
              ]
            });
          }
        }
      }
    }

    // Sort by urgency (high -> medium -> low)
    const urgencyRank: Record<string, number> = { high: 1, medium: 2, low: 3 };
    return worklist.sort(
      (a, b) => (urgencyRank[a.urgency] || 9) - (urgencyRank[b.urgency] || 9)
    );
  }

  /**
   * التحديث العكسي التلقائي الشامل للملف العائلي (Triple Auto Write-Back: ف2ب + ف2أ + سجل المشكلات المزمنة)
   * يُستدعى تلقائياً فور انتهاء كشف عيادة، أو صرف دواء من الصيدلية، أو نتيجة تحليل
   */
  static async syncClinicalEventToFamilyFile(event: {
    patient_id: string;
    appointment_id?: string;
    event_type: 'CLINIC_EXAM' | 'DIALYSIS_SESSION' | 'PHARMACY_DISPENSE' | 'LAB_RESULT';
    date?: string;
    visit_code?: number;
    visit_type?: string;
    clinic_name?: string;
    doctor_or_staff?: string;
    complaint_or_reason?: string;
    clinical_exam_summary?: string;
    investigations_summary?: string;
    diagnosis_or_summary: string;
    treatment_or_medications?: string;
    significant_event_description?: string;
    chronic_disease_to_register?: string;
    new_chronic_condition?: string;
  }): Promise<void> {
    if (!event.patient_id) return;
    const visitDate = event.date || new Date().toISOString().split('T')[0];

    const typePrefixMap: Record<typeof event.event_type, string> = {
      CLINIC_EXAM: 'كشف عيادة خارجية',
      DIALYSIS_SESSION: 'جلسة غسيل كلوي مكتملة',
      PHARMACY_DISPENSE: 'صرف دوائي من الصيدلية',
      LAB_RESULT: 'نتيجة تحليل معملي'
    };

    const visitCodeLabels: Record<number, string> = {
      1: 'متابعة الحمل',
      2: 'تنظيم الأسرة',
      3: 'متابعة طفل',
      4: 'أمراض مزمنة',
      5: 'زيارة دورية',
      6: 'أسنان'
    };

    const resolvedVisitCode =
      event.visit_code && event.visit_code >= 1 && event.visit_code <= 6
        ? event.visit_code
        : 5;
    const resolvedVisitType =
      event.visit_type || visitCodeLabels[resolvedVisitCode] || typePrefixMap[event.event_type];

    try {
      // 1. Add automatic entry to patient_visits (نموذج التردد ف2ب بالملف العائلي)
      await DB.addPatientVisit({
        patient_id: event.patient_id,
        appointment_id: event.appointment_id || null,
        visit_date: visitDate,
        visit_code: resolvedVisitCode,
        visit_type: resolvedVisitType,
        clinic_name: event.clinic_name || null,
        complaint: event.complaint_or_reason || resolvedVisitType,
        chief_complaint: event.complaint_or_reason || resolvedVisitType,
        clinical_exam: event.clinical_exam_summary || null,
        investigations: event.investigations_summary || null,
        diagnosis: event.diagnosis_or_summary,
        management: event.treatment_or_medications || 'تم التوثيق تلقائياً بالملف العائلي',
        treatment_plan: event.treatment_or_medications || 'تم التوثيق تلقائياً بالملف العائلي',
        doctor_name: event.doctor_or_staff || 'النظام الآلي',
        doctor_signature: event.doctor_or_staff || 'النظام الآلي'
      });

      // 2. If a chronic condition is flagged and not yet in patient_problem_list, add it (التاريخ المرضي لأفراد الأسرة)
      const chronicToSave = event.chronic_disease_to_register || event.new_chronic_condition;
      if (chronicToSave && chronicToSave.trim()) {
        const existingProbs = await DB.getPatientProblems(event.patient_id);
        const normNew = chronicToSave.trim().toLowerCase();
        const alreadyExists = (existingProbs || []).some((p: any) =>
          (p.problem_name || '').toLowerCase().includes(normNew)
        );
        if (!alreadyExists) {
          await DB.addPatientProblem({
            patient_id: event.patient_id,
            problem_name: chronicToSave.trim(),
            onset_date: visitDate,
            problem_type: 'chronic',
            notes: `تم رصده وتحديثه تلقائياً من ${resolvedVisitType}`,
            status: 'active'
          });
        }
      }
    } catch (err) {
      console.warn('Auto-sync to Family File non-blocking warning:', err);
    }
  }
}
