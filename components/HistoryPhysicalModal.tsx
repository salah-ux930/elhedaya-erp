import React, { useState } from 'react';
import { X, FileText, Check, Printer, Shield, Activity, User, Calendar, HeartPulse, ArrowRight, Plus, Trash2, ListPlus, AlertCircle } from 'lucide-react';
import { DB } from '../store.ts';

export interface SignificantEventItem {
  id: string;
  date: string;
  description: string;
  doctor: string;
}

interface HistoryPhysicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onSaved: () => void;
  viewExamData?: any; // If provided, opens in view/print mode
  initialTab?: 'history' | 'significant' | 'clinical' | 'full';
}

const HistoryPhysicalModal: React.FC<HistoryPhysicalModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSaved,
  viewExamData,
  initialTab
}) => {
  const isViewMode = !!viewExamData;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<'history' | 'significant' | 'clinical' | 'full'>(
    initialTab || (viewExamData ? 'full' : 'history')
  );

  // Form State
  const [examDate, setExamDate] = useState(viewExamData?.exam_date || new Date().toISOString().split('T')[0]);
  const [hospitalization, setHospitalization] = useState(viewExamData?.hospitalization || '');
  const [previousOperations, setPreviousOperations] = useState(viewExamData?.previous_operations || '');
  const [currentMedications, setCurrentMedications] = useState(viewExamData?.current_medications || '');
  const [traumaInjuries, setTraumaInjuries] = useState(viewExamData?.trauma_injuries || '');
  const [allergy, setAllergy] = useState(viewExamData?.allergy || '');
  const [adverseDrugReactions, setAdverseDrugReactions] = useState(viewExamData?.adverse_drug_reactions || '');
  const [abuseNegligence, setAbuseNegligence] = useState(viewExamData?.abuse_negligence || '');
  
  // Psychiatric History
  const [psychiatricHistory, setPsychiatricHistory] = useState<string>(viewExamData?.psychiatric_history || 'irrelevant');
  const [psychiatricDetails, setPsychiatricDetails] = useState(viewExamData?.psychiatric_details || '');
  
  // Other History
  const [otherHistory, setOtherHistory] = useState(viewExamData?.other_history || '');
  
  // Special Habits
  const [habits, setHabits] = useState<string[]>(() => {
    if (viewExamData?.special_habits) {
      return viewExamData.special_habits.split(',').filter(Boolean);
    }
    return [];
  });
  const [specialHabitsOther, setSpecialHabitsOther] = useState(viewExamData?.special_habits_other || '');

  // Family History
  const [familyHistory, setFamilyHistory] = useState<string[]>(() => {
    if (viewExamData?.family_history) {
      return viewExamData.family_history.split(',').filter(Boolean);
    }
    return [];
  });
  const [familyHistoryOther, setFamilyHistoryOther] = useState(viewExamData?.family_history_other || '');

  // Lab Results
  const [labHemoglobin, setLabHemoglobin] = useState(viewExamData?.lab_hemoglobin || '');
  const [labBloodGroup, setLabBloodGroup] = useState(viewExamData?.lab_blood_group || '');
  const [labRh, setLabRh] = useState(viewExamData?.lab_rh || '');
  const [labUrine, setLabUrine] = useState(viewExamData?.lab_urine || '');
  const [labStool, setLabStool] = useState(viewExamData?.lab_stool || '');
  const [maternalHistoryNotes, setMaternalHistoryNotes] = useState(viewExamData?.maternal_history_notes || '');

  // Clinical Findings / General Examination State (الصفحة الثانية / الفحص الإكلينيكي الشامل)
  const initialFindings = (() => {
    if (viewExamData?.clinical_findings) {
      try {
        return typeof viewExamData.clinical_findings === 'string' 
          ? JSON.parse(viewExamData.clinical_findings) 
          : viewExamData.clinical_findings;
      } catch (e) {
        return {};
      }
    }
    return {};
  })();

  const [generalAppearance, setGeneralAppearance] = useState(initialFindings.general_appearance || '');
  const [painAssessment, setPainAssessment] = useState(initialFindings.pain_assessment || '');
  const [vitalBp, setVitalBp] = useState(initialFindings.vital_bp || '');
  const [vitalPulse, setVitalPulse] = useState(initialFindings.vital_pulse || '');
  const [vitalWeight, setVitalWeight] = useState(initialFindings.vital_weight || '');
  const [vitalTemp, setVitalTemp] = useState(initialFindings.vital_temp || '');
  const [vitalRespRate, setVitalRespRate] = useState(initialFindings.vital_resp_rate || '');
  const [vitalHeight, setVitalHeight] = useState(initialFindings.vital_height || '');
  const [vitalBmi, setVitalBmi] = useState(initialFindings.vital_bmi || '');

  // Skin & Complexion
  const [skinChecks, setSkinChecks] = useState<string[]>(initialFindings.skin_checks || []);

  // Head & Neck
  const [headChecks, setHeadChecks] = useState<string[]>(initialFindings.head_checks || []);
  const [headOther, setHeadOther] = useState(initialFindings.head_other || '');
  const [headSutures, setHeadSutures] = useState(initialFindings.head_sutures || '');
  const [headFontanels, setHeadFontanels] = useState(initialFindings.head_fontanels || '');

  // Chest
  const [chestExpansion, setChestExpansion] = useState<boolean>(!!initialFindings.chest_expansion);
  const [chestBreathingSounds, setChestBreathingSounds] = useState<boolean>(!!initialFindings.chest_breathing_sounds);
  const [chestAdvSounds, setChestAdvSounds] = useState<string>(initialFindings.chest_adv_sounds || '');
  const [chestBreastMass, setChestBreastMass] = useState<boolean>(!!initialFindings.chest_breast_mass);
  const [chestBreastDischarge, setChestBreastDischarge] = useState<boolean>(!!initialFindings.chest_breast_discharge);
  const [chestComments, setChestComments] = useState(initialFindings.chest_comments || '');

  // Heart
  const [heartSounds, setHeartSounds] = useState(initialFindings.heart_sounds || '');
  const [heartMurmurs, setHeartMurmurs] = useState(initialFindings.heart_murmurs || '');
  const [heartOther, setHeartOther] = useState(initialFindings.heart_other || '');

  // Abdomen
  const [abdomenLiver, setAbdomenLiver] = useState(initialFindings.abdomen_liver || '');
  const [abdomenSpleen, setAbdomenSpleen] = useState(initialFindings.abdomen_spleen || '');
  const [abdomenKidneys, setAbdomenKidneys] = useState(initialFindings.abdomen_kidneys || '');
  const [abdomenAscites, setAbdomenAscites] = useState<string>(initialFindings.abdomen_ascites || '');
  const [abdomenMasses, setAbdomenMasses] = useState<string>(initialFindings.abdomen_masses || '');
  const [abdomenExtGenitalia, setAbdomenExtGenitalia] = useState(initialFindings.abdomen_ext_genitalia || '');
  const [abdomenOther, setAbdomenOther] = useState(initialFindings.abdomen_other || '');

  // Nutritional Assessment
  const [nutritionalAssessment, setNutritionalAssessment] = useState(initialFindings.nutritional_assessment || '');

  // Upper Limb
  const [upperTremors, setUpperTremors] = useState<boolean>(!!initialFindings.upper_tremors);
  const [upperClubbing, setUpperClubbing] = useState<boolean>(!!initialFindings.upper_clubbing);
  const [upperJoints, setUpperJoints] = useState(initialFindings.upper_joints || '');
  const [upperOther, setUpperOther] = useState(initialFindings.upper_other || '');

  // Lower Limb
  const [lowerOdema, setLowerOdema] = useState<boolean>(!!initialFindings.lower_odema);
  const [lowerClubbing, setLowerClubbing] = useState<boolean>(!!initialFindings.lower_clubbing);
  const [lowerJoints, setLowerJoints] = useState(initialFindings.lower_joints || '');
  const [lowerOther, setLowerOther] = useState(initialFindings.lower_other || '');

  // Disabilities & Deformities
  const [disabilitiesChecks, setDisabilitiesChecks] = useState<string[]>(initialFindings.disabilities_checks || []);
  const [disabilitiesCause, setDisabilitiesCause] = useState(initialFindings.disabilities_cause || '');
  const [deformities, setDeformities] = useState(initialFindings.deformities || '');

  // Neurological
  const [neuroMotor, setNeuroMotor] = useState(initialFindings.neuro_motor || '');
  const [neuroSensory, setNeuroSensory] = useState(initialFindings.neuro_sensory || '');
  const [neuroOther, setNeuroOther] = useState(initialFindings.neuro_other || '');

  // Eyes, Hearing & ENT Table
  const [eyesEnt, setEyesEnt] = useState<Record<string, { r?: string; l?: string; comment?: string }>>(
    initialFindings.eyes_ent || {
      visual_acuity: { r: '', l: '', comment: '' },
      cornea: { r: '', l: '', comment: '' },
      movement: { r: '', l: '', comment: '' },
      pupil: { r: '', l: '', comment: '' },
      hearing: { r: '', l: '', comment: '' },
      nose: { r: '', l: '', comment: '' },
      ear_discharge: { r: '', l: '', comment: '' },
      throat: { r: '', l: '', comment: '' },
    }
  );

  // Risk Factors
  const [riskFactors, setRiskFactors] = useState<string[]>(initialFindings.risk_factors || []);
  const [riskFactorsOther, setRiskFactorsOther] = useState(initialFindings.risk_factors_other || '');

  // Conclusion & Nurse Name
  const [conclusionNotes, setConclusionNotes] = useState(initialFindings.conclusion || '');
  const [nurseName, setNurseName] = useState(initialFindings.nurse_name || '');

  const [doctorName, setDoctorName] = useState(viewExamData?.doctor_name || '');

  // Significant Data Sheet (ملخص الأحداث الطبية الهامة)
  const [significantEvents, setSignificantEvents] = useState<SignificantEventItem[]>(() => {
    if (viewExamData?.significant_events) {
      try {
        const parsed = typeof viewExamData.significant_events === 'string' 
          ? JSON.parse(viewExamData.significant_events) 
          : viewExamData.significant_events;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn("Failed to parse significant_events", e);
      }
    }
    return [
      { id: '1', date: new Date().toISOString().split('T')[0], description: '', doctor: viewExamData?.doctor_name || '' }
    ];
  });

  const addSignificantEventRow = () => {
    setSignificantEvents(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        date: new Date().toISOString().split('T')[0],
        description: '',
        doctor: doctorName || ''
      }
    ]);
  };

  const updateSignificantEventRow = (index: number, field: keyof SignificantEventItem, value: string) => {
    setSignificantEvents(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeSignificantEventRow = (index: number) => {
    setSignificantEvents(prev => {
      if (prev.length <= 1) {
        return [{ id: '1', date: new Date().toISOString().split('T')[0], description: '', doctor: doctorName || '' }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };
  
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleHabitChange = (habitValue: string) => {
    if (habits.includes(habitValue)) {
      setHabits(habits.filter(h => h !== habitValue));
    } else {
      setHabits([...habits, habitValue]);
    }
  };

  const handleFamilyHistoryChange = (item: string) => {
    if (familyHistory.includes(item)) {
      setFamilyHistory(familyHistory.filter(i => i !== item));
    } else {
      setFamilyHistory([...familyHistory, item]);
    }
  };

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const updateEyeEntField = (rowKey: string, field: 'r' | 'l' | 'comment', value: string) => {
    setEyesEnt(prev => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || {}),
        [field]: value
      }
    }));
  };

  // Auto calculate BMI
  const handleWeightOrHeightChange = (w: string, h: string) => {
    const weightKg = parseFloat(w);
    const heightCm = parseFloat(h);
    if (weightKg > 0 && heightCm > 0) {
      const heightM = heightCm / 100;
      const bmi = (weightKg / (heightM * heightM)).toFixed(1);
      setVitalBmi(bmi);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const clinicalFindingsObj = {
        general_appearance: generalAppearance,
        pain_assessment: painAssessment,
        vital_bp: vitalBp,
        vital_pulse: vitalPulse,
        vital_weight: vitalWeight,
        vital_temp: vitalTemp,
        vital_resp_rate: vitalRespRate,
        vital_height: vitalHeight,
        vital_bmi: vitalBmi,
        skin_checks: skinChecks,
        head_checks: headChecks,
        head_other: headOther,
        head_sutures: headSutures,
        head_fontanels: headFontanels,
        chest_expansion: chestExpansion,
        chest_breathing_sounds: chestBreathingSounds,
        chest_adv_sounds: chestAdvSounds,
        chest_breast_mass: chestBreastMass,
        chest_breast_discharge: chestBreastDischarge,
        chest_comments: chestComments,
        heart_sounds: heartSounds,
        heart_murmurs: heartMurmurs,
        heart_other: heartOther,
        abdomen_liver: abdomenLiver,
        abdomen_spleen: abdomenSpleen,
        abdomen_kidneys: abdomenKidneys,
        abdomen_ascites: abdomenAscites,
        abdomen_masses: abdomenMasses,
        abdomen_ext_genitalia: abdomenExtGenitalia,
        abdomen_other: abdomenOther,
        nutritional_assessment: nutritionalAssessment,
        upper_tremors: upperTremors,
        upper_clubbing: upperClubbing,
        upper_joints: upperJoints,
        upper_other: upperOther,
        lower_odema: lowerOdema,
        lower_clubbing: lowerClubbing,
        lower_joints: lowerJoints,
        lower_other: lowerOther,
        disabilities_checks: disabilitiesChecks,
        disabilities_cause: disabilitiesCause,
        deformities: deformities,
        neuro_motor: neuroMotor,
        neuro_sensory: neuroSensory,
        neuro_other: neuroOther,
        eyes_ent: eyesEnt,
        risk_factors: riskFactors,
        risk_factors_other: riskFactorsOther,
        conclusion: conclusionNotes,
        nurse_name: nurseName
      };

      const examRecord = {
        patient_id: patient.id,
        exam_date: examDate,
        hospitalization,
        previous_operations: previousOperations,
        current_medications: currentMedications,
        trauma_injuries: traumaInjuries,
        allergy,
        adverse_drug_reactions: adverseDrugReactions,
        abuse_negligence: abuseNegligence,
        psychiatric_history: psychiatricHistory,
        psychiatric_details: psychiatricDetails,
        other_history: otherHistory,
        special_habits: habits.join(','),
        special_habits_other: specialHabitsOther,
        family_history: familyHistory.join(','),
        family_history_other: familyHistoryOther,
        lab_hemoglobin: labHemoglobin,
        lab_blood_group: labBloodGroup,
        lab_rh: labRh,
        lab_urine: labUrine,
        lab_stool: labStool,
        maternal_history_notes: maternalHistoryNotes,
        significant_events: JSON.stringify(significantEvents),
        clinical_findings: JSON.stringify(clinicalFindingsObj),
        doctor_name: doctorName
      };

      await DB.addPhysicalExam(examRecord);
      alert("تم حفظ نموذج الفحص والتاريخ الطبي بنجاح.");
      onSaved();
      onClose();
    } catch (err: any) {
      alert("خطأ أثناء حفظ البيانات: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      {/* Printable Area Wrapper */}
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-2 border-gray-100 print:max-h-none print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 print:absolute print:inset-0">
        
        {/* Modal Controls / Header - Hidden in Print */}
        <div className="p-6 bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex justify-between items-center shrink-0 print:hidden rounded-t-[2.5rem]">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black">
                {isViewMode ? 'عرض وطباعة ملف الفحص الشامل' : 'نموذج الفحص الطبي الشامل والتاريخ المرضي'}
              </h3>
              <p className="text-xs opacity-75 mt-0.5">
                History & Physical Examination Sheet — {patient.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isViewMode && (
              <button 
                onClick={triggerPrint}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
              >
                <Printer size={16} /> طباعة النموذج
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (Hidden in Print) */}
        <div className="bg-purple-950/90 text-white p-2.5 flex flex-wrap items-center justify-center gap-2 border-b border-purple-800/60 print:hidden shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-purple-900 shadow-md scale-105'
                : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800 hover:text-white'
            }`}
          >
            <Shield size={16} />
            <span>١. التاريخ المرضي والصحي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('significant')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'significant'
                ? 'bg-amber-400 text-amber-950 shadow-md scale-105'
                : 'bg-amber-900/50 text-amber-200 hover:bg-amber-800 hover:text-white'
            }`}
          >
            <ListPlus size={16} />
            <span>٢. ملخص الأحداث الهامة (Significant Data Sheet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clinical')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'clinical'
                ? 'bg-white text-purple-900 shadow-md scale-105'
                : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800 hover:text-white'
            }`}
          >
            <Activity size={16} />
            <span>٣. النتائج السريرية الإكلينيكية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('full')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'full'
                ? 'bg-white text-purple-900 shadow-md scale-105'
                : 'bg-purple-900/60 text-purple-200 hover:bg-purple-800 hover:text-white'
            }`}
          >
            <FileText size={16} />
            <span>٤. النموذج الكامل والطباعة</span>
          </button>
        </div>

        {/* Form or Print View */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar print:overflow-visible print:p-0">
          
          {/* PRINT-ONLY HEADER */}
          <div className="hidden print:block mb-8 border-b-4 border-double border-gray-800 pb-4 text-right" dir="rtl">
            <div className="flex justify-between items-center mb-4">
              <div className="text-left">
                <p className="font-black text-sm text-gray-700">مركز الشروق للرعاية الأولية والغسيل الكلوي</p>
                <p className="text-xs text-gray-400 font-bold">AL-SHOUROUK PRIMARY HEALTH CARE CENTER</p>
              </div>
              <div className="text-center font-bold px-4 py-2 border-2 border-gray-800 rounded-2xl">
                <span className="text-sm">ملف طبي معتمد للأعتماد الوطني</span>
              </div>
            </div>
            <div className="text-center space-y-1 mb-6">
              <h1 className="text-2xl font-black text-gray-900">نموذج الفحص الشامل والتاريخ المرضي للأسرة</h1>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">History & Physical Examination Sheet</h2>
            </div>
          </div>

          {/* Patient Info Card (Bilingual style in both modes) */}
          <div className="bg-gray-50 print:bg-white p-6 rounded-3xl border border-gray-100 print:border-2 print:border-gray-800 print:rounded-2xl mb-8" dir="rtl">
            <h4 className="text-xs font-black text-indigo-600 print:text-gray-900 mb-4 flex items-center gap-2 print:hidden">
              <User size={14} /> بيانات المريض الأساسية / Patient Particulars
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-right">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block print:text-gray-600">الاسم الكامل / Patient Name</span>
                <span className="font-black text-gray-800 text-sm print:text-gray-900">{patient.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block print:text-gray-600">الرقم القومي / National ID</span>
                <span className="font-mono font-bold text-gray-800 text-sm print:text-gray-900">{patient.national_id || 'غير متوفر'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block print:text-gray-600">تاريخ الميلاد / Date of Birth</span>
                <span className="font-bold text-gray-800 text-sm print:text-gray-900">{patient.date_of_birth}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block print:text-gray-600">تاريخ الفحص / Exam Date</span>
                {isViewMode ? (
                  <span className="font-bold text-gray-800 text-sm print:text-gray-900">{examDate}</span>
                ) : (
                  <input 
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-2 py-1 text-xs font-bold outline-none focus:border-indigo-500 bg-white"
                  />
                )}
              </div>
            </div>
          </div>

          {/* MAIN FORM / DOCUMENT CONTENT */}
          <form onSubmit={handleSave} className="space-y-6 print:space-y-4 text-right" dir="rtl">
            
            {/* SECTION 1: MEDICAL HISTORY */}
            <div className={activeTab === 'history' || activeTab === 'full' ? 'block space-y-6' : 'hidden print:block print:space-y-4'}>
              <div className="border-2 border-indigo-50 print:border-gray-800 rounded-3xl overflow-hidden print:rounded-2xl">
                <div className="bg-indigo-50 print:bg-gray-100 p-4 border-b-2 border-indigo-100 print:border-gray-800 flex justify-between items-center">
                  <span className="font-black text-indigo-900 print:text-gray-900">1. التاريخ الطبي المرضي والصحي / Medical & Health History</span>
                  <span className="text-xs text-indigo-500 font-bold bg-indigo-100/80 px-3 py-1 rounded-lg">القسم الأول</span>
                </div>
              
              <div className="p-6 md:p-8 space-y-6 print:p-4 print:space-y-3 bg-white">
                
                {/* Hospitalization (Specify) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">التنويم بالمستشفى (توضيح):</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Hospitalization (Specify)</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {hospitalization || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={hospitalization}
                        onChange={(e) => setHospitalization(e.target.value)}
                        placeholder="أدخل تفاصيل فترات التنويم بالمستشفى مع الأسباب والتاريخ..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Previous Operation (Specify) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">العمليات الجراحية السابقة (توضيح):</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Previous Operation (Specify)</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {previousOperations || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={previousOperations}
                        onChange={(e) => setPreviousOperations(e.target.value)}
                        placeholder="أدخل تفاصيل العمليات الجراحية السابقة التي خضع لها المريض..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Current medications */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">الأدوية الحالية:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Current medications</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {currentMedications || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={currentMedications}
                        onChange={(e) => setCurrentMedications(e.target.value)}
                        placeholder="أدخل قائمة بكافة الأدوية والجرعات الحالية التي يستخدمها المريض..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Trauma / Injuries (Specify) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">الإصابات والرضوض (توضيح):</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Trauma / Injuries (Specify)</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {traumaInjuries || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={traumaInjuries}
                        onChange={(e) => setTraumaInjuries(e.target.value)}
                        placeholder="أدخل تفاصيل أي إصابات جسدية بليغة أو كسور أو حوادث سابقة..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Allergy */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">الحساسية:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Allergy</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-rose-700 font-black min-h-[1.5rem] bg-rose-50/30 p-2 rounded-xl border border-rose-100 print:border-none print:p-0 print:bg-transparent">
                        {allergy || 'لا توجد حساسية معروفة / NKDA'}
                      </p>
                    ) : (
                      <textarea
                        value={allergy}
                        onChange={(e) => setAllergy(e.target.value)}
                        placeholder="أدخل أنواع الحساسية (أطعمة، أدوية، مواد بيئية)..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Adverse Drug Reaction */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">الأعراض الجانبية للأدوية:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Adverse Drug Reaction</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {adverseDrugReactions || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={adverseDrugReactions}
                        onChange={(e) => setAdverseDrugReactions(e.target.value)}
                        placeholder="أدخل أي ردود فعل عكسية أو أعراض شديدة حدثت جراء دواء معين..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Abuse & Negligence */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">الإيذاء والإهمال:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Abuse & Negligence</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {abuseNegligence || 'لا توجد علامات / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={abuseNegligence}
                        onChange={(e) => setAbuseNegligence(e.target.value)}
                        placeholder="أدخل أي ملاحظات تتعلق بسلامة المريض النفسية/الجسدية وعلامات الإهمال..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Psychiatric History */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">التاريخ المرضي النفسي:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Psychiatric History</span>
                  </div>
                  <div className="md:col-span-8 space-y-3">
                    {isViewMode ? (
                      <div className="space-y-1">
                        <span className="inline-block px-3 py-1 text-xs font-black bg-indigo-50 text-indigo-700 rounded-lg print:border print:border-gray-800 print:bg-white">
                          {psychiatricHistory === 'medical_treatment' ? 'يخضع لعلاج طبي نفسي / Medical treatment' :
                           psychiatricHistory === 'followup_with_psychiatrist' ? 'متابعة مستمرة مع طبيب نفسي / Follow-up With Psychiatrist' :
                           'غير مرتبط / Irrelevant'}
                        </span>
                        {psychiatricDetails && (
                          <p className="text-sm text-gray-700 bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium mt-2">
                            {psychiatricDetails}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="radio" 
                              name="psychiatricHistory"
                              value="medical_treatment" 
                              checked={psychiatricHistory === 'medical_treatment'}
                              onChange={() => setPsychiatricHistory('medical_treatment')}
                              className="accent-indigo-600"
                            />
                            علاج طبي / Medical treatment
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="radio" 
                              name="psychiatricHistory"
                              value="followup_with_psychiatrist" 
                              checked={psychiatricHistory === 'followup_with_psychiatrist'}
                              onChange={() => setPsychiatricHistory('followup_with_psychiatrist')}
                              className="accent-indigo-600"
                            />
                            متابعة مع طبيب نفسي / Follow-up With Psychiatrist
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="radio" 
                              name="psychiatricHistory"
                              value="irrelevant" 
                              checked={psychiatricHistory === 'irrelevant'}
                              onChange={() => setPsychiatricHistory('irrelevant')}
                              className="accent-indigo-600"
                            />
                            غير مرتبط / Irrelevant
                          </label>
                        </div>
                        <input 
                          type="text"
                          value={psychiatricDetails}
                          onChange={(e) => setPsychiatricDetails(e.target.value)}
                          placeholder="تفاصيل التقييم النفسي والتشخيص أو العلاج..."
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Other (Specify) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border-b border-gray-100 pb-4 print:pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">أخرى (توضيح):</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Other (Specify)</span>
                  </div>
                  <div className="md:col-span-8">
                    {isViewMode ? (
                      <p className="text-sm text-gray-700 min-h-[1.5rem] bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                        {otherHistory || 'لا يوجد / Nil'}
                      </p>
                    ) : (
                      <textarea
                        value={otherHistory}
                        onChange={(e) => setOtherHistory(e.target.value)}
                        placeholder="أدخل أي ملاحظات سريرية أو تاريخ مرضي إضافي لم يذكر أعلاه..."
                        className="w-full border-2 border-gray-100 rounded-2xl p-4 bg-gray-50/50 font-bold text-sm outline-none focus:border-purple-500"
                        rows={2}
                      />
                    )}
                  </div>
                </div>

                {/* Special Habits */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start pb-2">
                  <div className="md:col-span-4">
                    <label className="font-black text-gray-800 text-sm block">العادات الخاصة:</label>
                    <span className="text-[10px] text-gray-400 font-bold block uppercase">Special Habits</span>
                  </div>
                  <div className="md:col-span-8 space-y-3">
                    {isViewMode ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {habits.includes('smoking') && (
                            <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                              التدخين / Smoking
                            </span>
                          )}
                          {habits.includes('alcohol') && (
                            <span className="px-3 py-1 text-xs font-bold bg-red-50 text-red-800 rounded-lg border border-red-200">
                              الكحول / Alcohol
                            </span>
                          )}
                          {habits.includes('other') && (
                            <span className="px-3 py-1 text-xs font-bold bg-gray-50 text-gray-800 rounded-lg border border-gray-200">
                              أخرى / Other
                            </span>
                          )}
                          {habits.length === 0 && (
                            <span className="px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                              عادات صحية وخلو من التدخين والكحوليات
                            </span>
                          )}
                        </div>
                        {specialHabitsOther && (
                          <p className="text-sm text-gray-700 bg-gray-50/50 p-2 rounded-xl border print:border-none print:p-0 print:bg-transparent font-medium">
                            {specialHabitsOther}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={habits.includes('smoking')}
                              onChange={() => handleHabitChange('smoking')}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            التدخين / Smoking
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={habits.includes('alcohol')}
                              onChange={() => handleHabitChange('alcohol')}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            الكحول / Alcohol
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border-2 border-transparent hover:border-indigo-100 transition-all font-bold text-xs">
                            <input 
                              type="checkbox" 
                              checked={habits.includes('other')}
                              onChange={() => handleHabitChange('other')}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            أخرى / Other (Specify)
                          </label>
                        </div>
                        <input 
                          type="text"
                          value={specialHabitsOther}
                          onChange={(e) => setSpecialHabitsOther(e.target.value)}
                          placeholder="توضيح العادات الخاصة الأخرى في حال تحديد (أخرى)..."
                          className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 bg-gray-50/50 font-bold text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Family History / التاريخ المرضي للعائلة */}
            <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 print:border-2 print:border-gray-800 print:rounded-2xl mb-8 space-y-4" dir="rtl">
              <div className="border-b pb-3 print:border-b-2 print:border-gray-800">
                <h3 className="text-base font-black text-gray-900 flex items-center justify-between">
                  <span>التاريخ المرضي للعائلة</span>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">Family History¹</span>
                </h3>
              </div>

              {isViewMode ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {familyHistory.length > 0 ? (
                      familyHistory.map((item) => (
                        <span key={item} className="px-3 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs rounded-xl print:border-gray-800 print:bg-gray-100">
                          ✓ {item === 'TB' ? 'السل (TB)' :
                             item === 'Asthma' ? 'الربو (Asthma)' :
                             item === 'Cardiac' ? 'أمراض القلب (Cardiac)' :
                             item === 'Consanguinity' ? 'قرابة العصب (Consanguinity)' :
                             item === 'Diabetes' ? 'السكري (Diabetes)' :
                             item === 'Hypertension' ? 'ارتفاع ضغط الدم (Hypertension)' :
                             item === 'Blood Dis.' ? 'أمراض الدم (Blood Dis.)' :
                             item === 'Renal' ? 'أمراض الكلى (Renal)' :
                             item === 'Twins' ? 'التوأم (Twins)' :
                             item === 'Congenital anomalies' ? 'العيوب الخلقية (Congenital anomalies)' :
                             item === 'Cancer' ? 'السرطان (Cancer)' :
                             item === 'Epilepsy' ? 'الصرع (Epilepsy)' :
                             item === 'Psychiatric' ? 'أمراض نفسية (Psychiatric)' :
                             item}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 font-bold bg-gray-50 p-2 rounded-xl border">خلو التاريخ العائلي من الأسباب الوراثية والمزمنة الرئيسية</span>
                    )}
                  </div>
                  {familyHistoryOther && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-700">
                      <span className="text-purple-600 block mb-0.5">تفاصيل أخرى (Specify):</span>
                      {familyHistoryOther}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {[
                      { id: 'TB', ar: 'السل', en: 'TB' },
                      { id: 'Asthma', ar: 'الربو', en: 'Asthma' },
                      { id: 'Cardiac', ar: 'أمراض القلب', en: 'Cardiac' },
                      { id: 'Consanguinity', ar: 'قرابة العصب', en: 'Consanguinity' },
                      { id: 'Diabetes', ar: 'السكري', en: 'Diabetes' },
                      { id: 'Hypertension', ar: 'ضغط الدم', en: 'Hypertension' },
                      { id: 'Blood Dis.', ar: 'أمراض الدم', en: 'Blood Dis.' },
                      { id: 'Renal', ar: 'أمراض الكلى', en: 'Renal' },
                      { id: 'Twins', ar: 'التوأم', en: 'Twins' },
                      { id: 'Congenital anomalies', ar: 'العيوب الخلقية', en: 'Congenital anomalies' },
                      { id: 'Cancer', ar: 'السرطان', en: 'Cancer' },
                      { id: 'Epilepsy', ar: 'الصرع', en: 'Epilepsy' },
                      { id: 'Psychiatric', ar: 'أمراض نفسية', en: 'Psychiatric' },
                      { id: 'Other', ar: 'أخرى', en: 'Other' },
                    ].map((item) => (
                      <label 
                        key={item.id} 
                        className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all cursor-pointer font-bold text-xs ${
                          familyHistory.includes(item.id) 
                            ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm' 
                            : 'bg-gray-50/70 border-gray-100 text-gray-700 hover:border-purple-200'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={familyHistory.includes(item.id)}
                          onChange={() => handleFamilyHistoryChange(item.id)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                        />
                        <span className="truncate">{item.ar} / <span className="font-mono text-[10px] text-gray-400">{item.en}</span></span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-700 block mb-1">أخرى (Specify):</label>
                    <input 
                      type="text"
                      value={familyHistoryOther}
                      onChange={(e) => setFamilyHistoryOther(e.target.value)}
                      placeholder="تحديد الأمراض العائلية الأخرى ان وجدت..."
                      className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 bg-gray-50/50 font-bold text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Lab Tests & Results Table / نتائج الفحوصات المعملية */}
            <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 print:border-2 print:border-gray-800 print:rounded-2xl mb-8 space-y-4" dir="rtl">
              <div className="border-b pb-3 print:border-b-2 print:border-gray-800 flex items-center justify-between">
                <h3 className="text-base font-black text-gray-900">نتائج الفحوصات المعملية²</h3>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider font-mono">Lab. Results</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse border-2 border-gray-800 text-xs">
                  <thead>
                    <tr className="bg-gray-100 print:bg-gray-200 text-gray-900 border-b-2 border-gray-800">
                      <th className="p-3 border-r-2 border-gray-800 font-black w-1/3">
                        فحوصات معملية <span className="font-mono text-[10px] text-gray-500 block">Lab. Tests</span>
                      </th>
                      <th className="p-3 font-black w-2/3">
                        نتائج الفحوصات المعملية² <span className="font-mono text-[10px] text-gray-500 block">Lab. Results</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-gray-800 font-bold">
                    <tr className="border-b border-gray-800">
                      <td className="p-3 border-r-2 border-gray-800 bg-gray-50 print:bg-white font-black text-gray-800">
                        Hemoglobin (الهيموجلوبين)
                      </td>
                      <td className="p-2">
                        {isViewMode ? (
                          <span className="px-2 font-mono text-sm text-gray-900">{labHemoglobin || '---'}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={labHemoglobin} 
                            onChange={(e) => setLabHemoglobin(e.target.value)}
                            placeholder="مثال: 12.5 g/dL"
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                          />
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-3 border-r-2 border-gray-800 bg-gray-50 print:bg-white font-black text-gray-800">
                        Blood Group (فصيلة الدم)
                      </td>
                      <td className="p-2">
                        {isViewMode ? (
                          <span className="px-2 font-mono text-sm text-gray-900">{labBloodGroup || '---'}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={labBloodGroup} 
                            onChange={(e) => setLabBloodGroup(e.target.value)}
                            placeholder="مثال: A, B, AB, O"
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                          />
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-3 border-r-2 border-gray-800 bg-gray-50 print:bg-white font-black text-gray-800">
                        RH (عامل ريسوس)
                      </td>
                      <td className="p-2">
                        {isViewMode ? (
                          <span className="px-2 font-mono text-sm text-gray-900">{labRh || '---'}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={labRh} 
                            onChange={(e) => setLabRh(e.target.value)}
                            placeholder="مثال: Positive (+) / Negative (-)"
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                          />
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-3 border-r-2 border-gray-800 bg-gray-50 print:bg-white font-black text-gray-800">
                        Urine (تحليل البول)
                      </td>
                      <td className="p-2">
                        {isViewMode ? (
                          <span className="px-2 font-mono text-sm text-gray-900">{labUrine || '---'}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={labUrine} 
                            onChange={(e) => setLabUrine(e.target.value)}
                            placeholder="نتائج الفحص أو النسبة الإيجابية..."
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                          />
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 border-r-2 border-gray-800 bg-gray-50 print:bg-white font-black text-gray-800">
                        Stool (تحليل البراز)
                      </td>
                      <td className="p-2">
                        {isViewMode ? (
                          <span className="px-2 font-mono text-sm text-gray-900">{labStool || '---'}</span>
                        ) : (
                          <input 
                            type="text" 
                            value={labStool} 
                            onChange={(e) => setLabStool(e.target.value)}
                            placeholder="نتائج الفحص أو النسبة الإيجابية..."
                            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Document Footnotes / الهوامش والملاحظات التنظيمية */}
              <div className="pt-3 border-t border-gray-200 text-[11px] font-bold text-gray-600 space-y-1.5">
                <div className="flex items-start gap-1">
                  <span className="p-0.5 px-1.5 bg-gray-100 rounded text-gray-800 font-mono font-black">١</span>
                  <p>الأطفال أقل من سنة يؤخذ التاريخ المرضي للأم <span className="font-mono text-[10px] text-gray-500">(Antenatal - Natal - Postnatal)</span>:</p>
                </div>
                {isViewMode ? (
                  maternalHistoryNotes ? (
                    <p className="p-2.5 bg-gray-50 rounded-xl font-medium text-gray-800 border text-xs mr-5">{maternalHistoryNotes}</p>
                  ) : null
                ) : (
                  <div className="mr-5">
                    <input 
                      type="text"
                      value={maternalHistoryNotes}
                      onChange={(e) => setMaternalHistoryNotes(e.target.value)}
                      placeholder="تدوين ملاحظات الحمل والولادة والأم للأطفال أقل من سنة..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 font-bold text-xs outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                <div className="flex items-center gap-1 text-gray-500 text-[10px] pt-1">
                  <span className="p-0.5 px-1.5 bg-gray-100 rounded text-gray-800 font-mono font-black">٢</span>
                  <p>توضح النتائج الإيجابية للفحوصات المعملية المرفقة بملف المريض المعتمد.</p>
                </div>
              </div>
            </div>

            {/* Next Step Action inside Section 1 */}
            {activeTab === 'history' && (
              <div className="flex justify-end pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setActiveTab('significant')}
                  className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl flex items-center gap-3 shadow-lg shadow-amber-100 transition-all text-xs"
                >
                  <span>الانتقال إلى ٢. ملخص الأحداث الطبية الهامة (Significant Data Sheet)</span>
                  <ArrowRight size={16} className="rotate-180" />
                </button>
              </div>
            )}
            </div>

            {/* SECTION 2: SIGNIFICANT DATA SHEET / ملخص الأحداث الطبية الهامة */}
            <div className={activeTab === 'significant' || activeTab === 'full' ? 'block space-y-6' : 'hidden print:block print:space-y-4'}>
              <div className="border-2 border-amber-300 print:border-gray-800 rounded-3xl overflow-hidden print:rounded-2xl bg-white shadow-sm">
                <div className="bg-gradient-to-r from-amber-600 to-amber-800 print:bg-gray-100 p-4 border-b-2 border-amber-700 print:border-gray-800 flex justify-between items-center text-white print:text-gray-900">
                  <div className="flex items-center gap-3">
                    <ListPlus size={22} className="print:hidden text-amber-200" />
                    <div>
                      <h3 className="font-black text-sm md:text-base print:text-gray-900">
                        2. ملخص الأحداث الطبية الهامة / Significant Data Sheet
                      </h3>
                      <p className="text-[10px] text-amber-100 print:text-gray-600 font-bold">
                        Medical History Summary & Major Diagnoses Log
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white/20 print:bg-gray-200 text-white print:text-gray-800 px-3 py-1 rounded-lg">
                    القسم الثاني
                  </span>
                </div>

                <div className="p-6 md:p-8 space-y-5 print:p-4 bg-white">
                  {/* Notice Banner */}
                  {!isViewMode && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs print:hidden">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-600 shrink-0" />
                        <span className="font-bold">يمكنك إضافة خانات جديدة وتسجيل التاريخ ووصف الحالة اسم الطبيب المعالج للحدث الطبي.</span>
                      </div>
                      <button
                        type="button"
                        onClick={addSignificantEventRow}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Plus size={14} /> إضافة خانة حدث طبي
                      </button>
                    </div>
                  )}

                  {/* Dynamic Table */}
                  <div className="overflow-x-auto rounded-2xl border border-amber-200/70 print:border-gray-800">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-amber-100/70 print:bg-gray-100 text-amber-950 print:text-gray-900 border-b-2 border-amber-300 print:border-gray-800">
                          <th className="p-3 font-black w-10 text-center border-l border-amber-200 print:border-gray-800">#</th>
                          <th className="p-3 font-black w-36 border-l border-amber-200 print:border-gray-800">
                            التاريخ <span className="block text-[10px] font-normal text-amber-800 print:text-gray-600">Date</span>
                          </th>
                          <th className="p-3 font-black border-l border-amber-200 print:border-gray-800">
                            وصف الحالة / التشخيص <span className="block text-[10px] font-normal text-amber-800 print:text-gray-600">Case Description / Diagnosis</span>
                          </th>
                          <th className="p-3 font-black w-48 border-l border-amber-200 print:border-gray-800">
                            اسم الطبيب <span className="block text-[10px] font-normal text-amber-800 print:text-gray-600">Doctor's Name</span>
                          </th>
                          {!isViewMode && (
                            <th className="p-3 font-black w-16 text-center print:hidden">حذف</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 print:divide-gray-800">
                        {significantEvents.map((evt, idx) => (
                          <tr key={evt.id || idx} className="hover:bg-amber-50/40 transition-colors">
                            <td className="p-3 font-bold text-center bg-amber-50/40 print:bg-transparent border-l border-amber-200 print:border-gray-800 text-amber-900 print:text-gray-900">
                              {idx + 1}
                            </td>

                            {/* Date Field */}
                            <td className="p-2 border-l border-amber-200 print:border-gray-800">
                              {isViewMode ? (
                                <span className="font-bold text-gray-900 block p-1">{evt.date || '—'}</span>
                              ) : (
                                <input
                                  type="date"
                                  value={evt.date}
                                  onChange={(e) => updateSignificantEventRow(idx, 'date', e.target.value)}
                                  className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-amber-600 bg-gray-50/60"
                                />
                              )}
                            </td>

                            {/* Case Description Field */}
                            <td className="p-2 border-l border-amber-200 print:border-gray-800">
                              {isViewMode ? (
                                <p className="font-bold text-gray-900 whitespace-pre-wrap p-1">{evt.description || '—'}</p>
                              ) : (
                                <textarea
                                  value={evt.description}
                                  onChange={(e) => updateSignificantEventRow(idx, 'description', e.target.value)}
                                  placeholder="أدخل وصف الحالة الطبية الهامة أو التشخيص..."
                                  rows={2}
                                  className="w-full border border-gray-200 rounded-xl px-3 py-1.5 font-bold outline-none focus:border-amber-600 bg-gray-50/60 text-xs resize-y"
                                />
                              )}
                            </td>

                            {/* Doctor Name Field */}
                            <td className="p-2 border-l border-amber-200 print:border-gray-800">
                              {isViewMode ? (
                                <span className="font-bold text-gray-900 block p-1">{evt.doctor || '—'}</span>
                              ) : (
                                <input
                                  type="text"
                                  value={evt.doctor}
                                  onChange={(e) => updateSignificantEventRow(idx, 'doctor', e.target.value)}
                                  placeholder="اسم الطبيب المعالج..."
                                  className="w-full border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold outline-none focus:border-amber-600 bg-gray-50/60"
                                />
                              )}
                            </td>

                            {/* Delete Action */}
                            {!isViewMode && (
                              <td className="p-2 text-center print:hidden">
                                <button
                                  type="button"
                                  onClick={() => removeSignificantEventRow(idx)}
                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                                  title="حذف هذه الخانة"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Row Button under Table */}
                  {!isViewMode && (
                    <div className="flex justify-between items-center pt-2 print:hidden">
                      <button
                        type="button"
                        onClick={addSignificantEventRow}
                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl flex items-center gap-2 shadow-md shadow-amber-100 transition-all text-xs"
                      >
                        <Plus size={16} />
                        <span>إضافة خانة حدث طبي جديد (Add Event Row)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Navigation inside Significant Tab */}
              {activeTab === 'significant' && (
                <div className="flex justify-between items-center pt-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center gap-2 transition-all text-xs"
                  >
                    <ArrowRight size={16} />
                    <span>العودة إلى ١. التاريخ المرضي والصحي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clinical')}
                    className="px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl flex items-center gap-3 shadow-lg shadow-purple-100 transition-all text-xs"
                  >
                    <span>الانتقال إلى ٣. النتائج السريرية الإكلينيكية (Clinical Findings)</span>
                    <ArrowRight size={16} className="rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 3: CLINICAL FINDINGS */}
            <div className={activeTab === 'clinical' || activeTab === 'full' ? 'block space-y-6' : 'hidden print:block print:space-y-4'}>
            <div className="bg-white p-6 rounded-3xl border-2 border-gray-100 print:border-2 print:border-gray-800 print:rounded-2xl mb-8 space-y-6" dir="ltr">
              
              {/* Section Header */}
              <div className="border-b-2 border-purple-800 pb-3 flex justify-between items-center text-right" dir="rtl">
                <div>
                  <h3 className="text-lg font-black text-purple-900">3. نتائج الفحص السريري الإكلينيكي / Clinical Findings</h3>
                  <p className="text-xs text-gray-500 font-bold">General Examination & Systems Review</p>
                </div>
                <span className="px-3 py-1 bg-purple-100 text-purple-900 font-mono text-xs font-black rounded-lg">القسم الثاني</span>
              </div>

              {/* General Appearance & Vitals Row */}
              <div className="bg-purple-50/40 p-4 rounded-2xl border border-purple-100 print:bg-gray-50 print:border-gray-800 text-left space-y-4 font-sans text-xs">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-extrabold text-gray-800 block mb-1">General Appearance:</label>
                    {isViewMode ? (
                      <div className="p-2 border-b border-gray-300 font-bold text-indigo-950">{generalAppearance || '---'}</div>
                    ) : (
                      <input 
                        type="text" 
                        value={generalAppearance} 
                        onChange={(e) => setGeneralAppearance(e.target.value)}
                        placeholder="Normal, toxic, pale, distress..."
                        className="w-full border border-gray-200 rounded-xl p-2 font-bold bg-white outline-none focus:border-purple-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="font-extrabold text-gray-800 block mb-1">Pain Assessment:</label>
                    {isViewMode ? (
                      <div className="p-2 border-b border-gray-300 font-bold text-indigo-950">{painAssessment || '---'}</div>
                    ) : (
                      <input 
                        type="text" 
                        value={painAssessment} 
                        onChange={(e) => setPainAssessment(e.target.value)}
                        placeholder="0-10 VAS scale, location, severity..."
                        className="w-full border border-gray-200 rounded-xl p-2 font-bold bg-white outline-none focus:border-purple-500"
                      />
                    )}
                  </div>
                </div>

                {/* Vitals Grid */}
                <div className="border-t border-purple-100 pt-3 print:border-gray-800">
                  <span className="font-black text-purple-900 text-xs block mb-2" dir="rtl">العلامات الحيوية / Vital Signs:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">الضغط / BP</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalBp || '-'}</div> : (
                        <input type="text" value={vitalBp} onChange={(e) => setVitalBp(e.target.value)} placeholder="120/80" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">النبض / Pulse</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalPulse || '-'}</div> : (
                        <input type="text" value={vitalPulse} onChange={(e) => setVitalPulse(e.target.value)} placeholder="72" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">الوزن / Wt (kg)</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalWeight || '-'}</div> : (
                        <input type="text" value={vitalWeight} onChange={(e) => { setVitalWeight(e.target.value); handleWeightOrHeightChange(e.target.value, vitalHeight); }} placeholder="70" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">الحرارة / Temp (°C)</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalTemp || '-'}</div> : (
                        <input type="text" value={vitalTemp} onChange={(e) => setVitalTemp(e.target.value)} placeholder="37" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">التنفس / Resp Rate</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalRespRate || '-'}</div> : (
                        <input type="text" value={vitalRespRate} onChange={(e) => setVitalRespRate(e.target.value)} placeholder="16" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">الطول / Ht (cm)</span>
                      {isViewMode ? <div className="font-mono font-bold">{vitalHeight || '-'}</div> : (
                        <input type="text" value={vitalHeight} onChange={(e) => { setVitalHeight(e.target.value); handleWeightOrHeightChange(vitalWeight, e.target.value); }} placeholder="170" className="w-full border rounded p-1 text-center font-mono font-bold text-xs" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">BMI</span>
                      {isViewMode ? <div className="font-mono font-bold text-purple-900">{vitalBmi || '-'}</div> : (
                        <input type="text" value={vitalBmi} onChange={(e) => setVitalBmi(e.target.value)} placeholder="24.2" className="w-full border rounded p-1 text-center font-mono font-bold text-xs bg-purple-50" />
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Systems Review Layout: Two Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-left">
                
                {/* Left Column */}
                <div className="space-y-4">

                  {/* Skin & Complexion */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Skin & Complexion :</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Pallor', 'Cyanosis', 'Jaundice', 'Hair distribution', 'Unexplained burn', 'Unexplained bruise'].map((item) => (
                        <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox" 
                            disabled={isViewMode}
                            checked={skinChecks.includes(item)}
                            onChange={() => toggleArrayItem(skinChecks, item, setSkinChecks)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Head & Neck */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Head & Neck :</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Scars', 'Veins', 'Stiffness', 'Thyroid', 'L.nodes'].map((item) => (
                        <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox" 
                            disabled={isViewMode}
                            checked={headChecks.includes(item)}
                            onChange={() => toggleArrayItem(headChecks, item, setHeadChecks)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={headOther} onChange={e => setHeadOther(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Sutures (<= 18m)..." disabled={isViewMode} value={headSutures} onChange={e => setHeadSutures(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Fontanels (<= 18m)..." disabled={isViewMode} value={headFontanels} onChange={e => setHeadFontanels(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Chest */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Chest :</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={chestExpansion} onChange={e => setChestExpansion(e.target.checked)} />
                        <span>Expansion</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={chestBreathingSounds} onChange={e => setChestBreathingSounds(e.target.checked)} />
                        <span>Breathing sounds</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="font-bold text-gray-700">Adv. Sounds:</span>
                      {['Yes', 'No'].map(v => (
                        <label key={v} className="flex items-center gap-1 font-semibold">
                          <input type="radio" name="chestAdv" disabled={isViewMode} checked={chestAdvSounds === v} onChange={() => setChestAdvSounds(v)} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <span className="font-bold text-gray-700">Breast:</span>
                      <label className="flex items-center gap-1 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={chestBreastMass} onChange={e => setChestBreastMass(e.target.checked)} />
                        <span>Mass</span>
                      </label>
                      <label className="flex items-center gap-1 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={chestBreastDischarge} onChange={e => setChestBreastDischarge(e.target.checked)} />
                        <span>Nipple discharge</span>
                      </label>
                    </div>
                    <input type="text" placeholder="Chest Comments..." disabled={isViewMode} value={chestComments} onChange={e => setChestComments(e.target.value)} className="w-full border rounded p-1 text-xs mt-1" />
                  </div>

                  {/* Heart */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Heart :</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input type="text" placeholder="Heart sounds..." disabled={isViewMode} value={heartSounds} onChange={e => setHeartSounds(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Murmurs..." disabled={isViewMode} value={heartMurmurs} onChange={e => setHeartMurmurs(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={heartOther} onChange={e => setHeartOther(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Abdomen */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Abdomen :</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Liver..." disabled={isViewMode} value={abdomenLiver} onChange={e => setAbdomenLiver(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Spleen..." disabled={isViewMode} value={abdomenSpleen} onChange={e => setAbdomenSpleen(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Kidneys..." disabled={isViewMode} value={abdomenKidneys} onChange={e => setAbdomenKidneys(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                    <div className="flex items-center gap-6 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Ascites:</span>
                        {['Yes', 'No'].map(v => (
                          <label key={v} className="flex items-center gap-1">
                            <input type="radio" name="ascites" disabled={isViewMode} checked={abdomenAscites === v} onChange={() => setAbdomenAscites(v)} />
                            <span>{v}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Masses:</span>
                        {['Yes', 'No'].map(v => (
                          <label key={v} className="flex items-center gap-1">
                            <input type="radio" name="masses" disabled={isViewMode} checked={abdomenMasses === v} onChange={() => setAbdomenMasses(v)} />
                            <span>{v}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input type="text" placeholder="Ext. Genitalia..." disabled={isViewMode} value={abdomenExtGenitalia} onChange={e => setAbdomenExtGenitalia(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={abdomenOther} onChange={e => setAbdomenOther(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Nutritional Assessment */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-1">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Nutritional Assessment :</h4>
                    <input type="text" placeholder="Adequate, malnourished, obese..." disabled={isViewMode} value={nutritionalAssessment} onChange={e => setNutritionalAssessment(e.target.value)} className="w-full border rounded p-1.5 text-xs" />
                  </div>

                </div>

                {/* Right Column */}
                <div className="space-y-4">

                  {/* Upper Limb */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Upper Limb :</h4>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={upperTremors} onChange={e => setUpperTremors(e.target.checked)} />
                        <span>Tremors</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={upperClubbing} onChange={e => setUpperClubbing(e.target.checked)} />
                        <span>Clubbing</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input type="text" placeholder="Joints..." disabled={isViewMode} value={upperJoints} onChange={e => setUpperJoints(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={upperOther} onChange={e => setUpperOther(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Lower Limb */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Lower Limb :</h4>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={lowerOdema} onChange={e => setLowerOdema(e.target.checked)} />
                        <span>Odema</span>
                      </label>
                      <label className="flex items-center gap-1.5 font-semibold">
                        <input type="checkbox" disabled={isViewMode} checked={lowerClubbing} onChange={e => setLowerClubbing(e.target.checked)} />
                        <span>Clubbing</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input type="text" placeholder="Joints..." disabled={isViewMode} value={lowerJoints} onChange={e => setLowerJoints(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={lowerOther} onChange={e => setLowerOther(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Disabilities & Deformities */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Disabilities :</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Motor', 'Hearing', 'Visual', 'Mental', 'Psychic', 'Autism', 'Learning disabilities'].map((item) => (
                        <label key={item} className="flex items-center gap-1.5 cursor-pointer font-semibold">
                          <input 
                            type="checkbox" 
                            disabled={isViewMode}
                            checked={disabilitiesChecks.includes(item)}
                            onChange={() => toggleArrayItem(disabilitiesChecks, item, setDisabilitiesChecks)}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{item}</span>
                        </label>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <input type="text" placeholder="Possible cause..." disabled={isViewMode} value={disabilitiesCause} onChange={e => setDisabilitiesCause(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Deformities..." disabled={isViewMode} value={deformities} onChange={e => setDeformities(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Neurological */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Neurological :</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Motor..." disabled={isViewMode} value={neuroMotor} onChange={e => setNeuroMotor(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Sensory..." disabled={isViewMode} value={neuroSensory} onChange={e => setNeuroSensory(e.target.value)} className="border rounded p-1 text-xs" />
                      <input type="text" placeholder="Other..." disabled={isViewMode} value={neuroOther} onChange={e => setNeuroOther(e.target.value)} className="border rounded p-1 text-xs" />
                    </div>
                  </div>

                  {/* Eyes, Hearing & ENT Table */}
                  <div className="p-3.5 border rounded-2xl bg-gray-50/50 space-y-2">
                    <h4 className="font-extrabold text-gray-900 border-b pb-1">Eyes, Hearing & ENT :</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse border border-gray-300 text-[11px]">
                        <thead>
                          <tr className="bg-gray-100 font-extrabold">
                            <th className="border border-gray-300 p-1 text-left">Exam</th>
                            <th className="border border-gray-300 p-1 w-12">R</th>
                            <th className="border border-gray-300 p-1 w-12">L</th>
                            <th className="border border-gray-300 p-1">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { key: 'visual_acuity', label: 'Visual Acuity' },
                            { key: 'cornea', label: 'Cornea' },
                            { key: 'movement', label: 'Movement' },
                            { key: 'pupil', label: 'Pupil' },
                            { key: 'hearing', label: 'Hearing' },
                            { key: 'nose', label: 'Nose' },
                            { key: 'ear_discharge', label: 'Ear discharge' },
                            { key: 'throat', label: 'Throat' }
                          ].map((row) => (
                            <tr key={row.key} className="border-b border-gray-200">
                              <td className="border border-gray-300 p-1 text-left font-bold bg-gray-50/80">{row.label}</td>
                              <td className="border border-gray-300 p-1">
                                <input type="text" disabled={isViewMode} value={eyesEnt[row.key]?.r || ''} onChange={e => updateEyeEntField(row.key, 'r', e.target.value)} className="w-full text-center outline-none bg-transparent" />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <input type="text" disabled={isViewMode} value={eyesEnt[row.key]?.l || ''} onChange={e => updateEyeEntField(row.key, 'l', e.target.value)} className="w-full text-center outline-none bg-transparent" />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <input type="text" disabled={isViewMode} value={eyesEnt[row.key]?.comment || ''} onChange={e => updateEyeEntField(row.key, 'comment', e.target.value)} className="w-full text-left px-1 outline-none bg-transparent" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>

              {/* Risk Factors */}
              <div className="p-4 border rounded-2xl bg-red-50/30 border-red-100 text-left space-y-2">
                <h4 className="font-extrabold text-red-900 border-b border-red-100 pb-1">Risk Factors :</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Hypertension', 'DM', 'Obesity', 'Smoking'].map((rf) => (
                    <label key={rf} className="flex items-center gap-1.5 cursor-pointer font-bold text-red-900">
                      <input 
                        type="checkbox" 
                        disabled={isViewMode}
                        checked={riskFactors.includes(rf)}
                        onChange={() => toggleArrayItem(riskFactors, rf, setRiskFactors)}
                        className="rounded text-red-600 focus:ring-red-500 accent-red-600"
                      />
                      <span>{rf}</span>
                    </label>
                  ))}
                </div>
                <div className="pt-1">
                  <input type="text" placeholder="Other Risk Factors (Specify)..." disabled={isViewMode} value={riskFactorsOther} onChange={e => setRiskFactorsOther(e.target.value)} className="w-full border border-red-200 rounded-xl p-2 text-xs bg-white" />
                </div>
              </div>

              {/* Conclusion */}
              <div className="p-4 border rounded-2xl bg-purple-50/30 border-purple-100 text-left space-y-2">
                <h4 className="font-extrabold text-purple-950 border-b border-purple-100 pb-1">Conclusion / الخلاصة والتوصيات السريرية :</h4>
                <textarea 
                  rows={2} 
                  disabled={isViewMode} 
                  value={conclusionNotes} 
                  onChange={e => setConclusionNotes(e.target.value)} 
                  placeholder="Clinical conclusion, medical recommendations, referrals..." 
                  className="w-full border border-purple-200 rounded-xl p-2.5 text-xs bg-white font-medium outline-none focus:border-purple-600" 
                />
              </div>

              {/* Nurse Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2 font-bold" dir="rtl">
                <div>
                  <label className="text-xs text-gray-700 block mb-1">اسم الممرضة الفاحصة / Nurse Name:</label>
                  <input 
                    type="text" 
                    disabled={isViewMode}
                    value={nurseName}
                    onChange={e => setNurseName(e.target.value)}
                    placeholder="اسم تمريض العيادة..."
                    className="w-full border rounded-xl p-2.5 text-xs font-bold bg-gray-50/50 outline-none focus:border-purple-600"
                  />
                </div>
              </div>

            </div>

            {/* Navigation inside Section 2 */}
            {activeTab === 'clinical' && (
              <div className="flex justify-between items-center pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl flex items-center gap-2 transition-all text-xs"
                >
                  <ArrowRight size={16} />
                  <span>العودة إلى ١. التاريخ المرضي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('full')}
                  className="px-6 py-3.5 bg-purple-900 hover:bg-purple-950 text-white font-black rounded-2xl flex items-center gap-2 shadow-lg transition-all text-xs"
                >
                  <span>معاينة النموذج الكامل والطباعة</span>
                  <FileText size={16} />
                </button>
              </div>
            )}
            </div>

            {/* Doctor Signature / Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t print:border-t-2 print:border-gray-800">
              <div></div>
              <div className="space-y-1">
                <label className="font-black text-gray-800 text-xs block print:text-gray-900">اسم الطبيب الفاحص / Physician's Name & Signature:</label>
                {isViewMode ? (
                  <div className="border-b-2 border-dashed border-gray-300 print:border-gray-800 py-2 font-black text-sm text-indigo-900 print:text-gray-900">
                    د / {doctorName || 'طبيب الوحدة المعتمد'}
                  </div>
                ) : (
                  <input 
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="اسم وتوقيع الطبيب المعتمد..."
                    className="w-full border-2 border-gray-100 rounded-xl p-3 bg-gray-50/50 font-bold text-sm outline-none focus:border-indigo-500"
                  />
                )}
              </div>
            </div>

            {/* Print Signature Line (Only visible on physical printing) */}
            <div className="hidden print:flex justify-between items-center mt-12 pt-8 text-right font-bold" dir="rtl">
              <div>
                <p className="text-xs">تاريخ الفحص والتحقق:</p>
                <p className="font-mono text-sm border-b border-gray-800 w-32 py-1">{examDate}</p>
              </div>
              <div>
                <p className="text-xs">توقيع وختم عيادة الرعاية الأولية:</p>
                <p className="font-mono text-sm border-b border-gray-800 w-48 py-4"></p>
              </div>
            </div>

            {/* Form Action Controls - Hidden in View Mode and Hidden in Print */}
            {!isViewMode && (
              <div className="flex gap-4 pt-6 shrink-0 print:hidden">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-100 disabled:bg-purple-300 transition-all"
                >
                  <Check size={18} /> {saving ? 'جاري الحفظ والتدوين السريري...' : 'حفظ وتدوين نموذج الفحص الشامل'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl font-black text-sm transition-all"
                >
                  إلغاء
                </button>
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
};

export default HistoryPhysicalModal;
