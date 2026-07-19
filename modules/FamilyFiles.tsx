import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { supabase } from '../supabase.ts';
import { FamilyFile, Patient, FamilyFileMember } from '../types.ts';
import { 
  FolderOpen, Users, Plus, Search, Phone, MapPin, 
  FileText, UserPlus, Save, X, Loader2, Info, ChevronLeft,
  Calendar, CreditCard, ClipboardList, ShieldAlert, HeartPulse, Trash2,
  Home, Wind, Droplet, Zap, Sparkles, Pencil, Activity
} from 'lucide-react';

// تفتيت وحفظ الدور والملاحظات مدمجة لعدم كسر الهيكل الحالي لقاعدة البيانات
const parseFamilyRoleAndNotes = (combinedRole: string | null) => {
  if (!combinedRole) return { role: '', notes: '' };
  const parts = combinedRole.split(' | ');
  return {
    role: parts[0] || '',
    notes: parts[1] || ''
  };
};

// التحقق من صحة أرقام الهواتف (أرقام فقط وطول من 8 إلى 15 رقم)
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true;
  const clean = phone.replace(/\s+/g, ''); // إزالة الفراغات
  if (!/^\d+$/.test(clean)) return false;
  return clean.length >= 8 && clean.length <= 15;
};

const FamilyFilesModule: React.FC = () => {
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals / View States
  const [showAddFamilyFile, setShowAddFamilyFile] = useState(false);
  const [showAddFamilyMember, setShowAddFamilyMember] = useState(false);
  const [selectedFamilyFile, setSelectedFamilyFile] = useState<FamilyFile | null>(null);
  const [selectedFamilyFileForMember, setSelectedFamilyFileForMember] = useState<FamilyFile | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // States for adding/viewing medical history for family members
  const [patientProblems, setPatientProblems] = useState<any[]>([]);
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [selectedMemberForProblem, setSelectedMemberForProblem] = useState<any | null>(null);
  const [problemName, setProblemName] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [problemType, setProblemType] = useState('chronic');
  const [problemNotes, setProblemNotes] = useState('');

  // States for patient deaths (بيان الوفيات)
  const [patientDeaths, setPatientDeaths] = useState<any[]>([]);
  const [showAddDeathModal, setShowAddDeathModal] = useState(false);
  const [selectedMemberForDeath, setSelectedMemberForDeath] = useState<any | null>(null);
  const [deceasedName, setDeceasedName] = useState('');
  const [ageAtDeath, setAgeAtDeath] = useState<number>(0);
  const [deathDate, setDeathDate] = useState('');
  const [deathCode, setDeathCode] = useState('');
  const [deathNotes, setDeathNotes] = useState('');

  // States for housing conditions (بيان حالة المسكن)
  const [showEditHousingModal, setShowEditHousingModal] = useState(false);
  const [housingTotalRooms, setHousingTotalRooms] = useState<number>(0);
  const [housingSleepingRooms, setHousingSleepingRooms] = useState<number>(0);
  const [housingVentilation, setHousingVentilation] = useState<string>('good');
  const [housingWaterSource, setHousingWaterSource] = useState<string>('public');
  const [housingSewageSystem, setHousingSewageSystem] = useState<string>('sanitary');
  const [housingLightingType, setHousingLightingType] = useState<string>('electricity');
  const [housingHasAnimalsBirds, setHousingHasAnimalsBirds] = useState<boolean>(false);
  const [housingBarnLocation, setHousingBarnLocation] = useState<string>('none');

  // States for social search (البحث الاجتماعي)
  const [showEditSocialModal, setShowEditSocialModal] = useState(false);
  const [socialIncomeType, setSocialIncomeType] = useState<string>('fixed');
  const [socialMonthlyIncome, setSocialMonthlyIncome] = useState<number>(0);
  const [socialHasChronicDiseases, setSocialHasChronicDiseases] = useState<boolean>(false);
  const [socialHasDisabilities, setSocialHasDisabilities] = useState<boolean>(false);
  const [socialReceivesPension, setSocialReceivesPension] = useState<boolean>(false);
  const [socialBreadwinnerName, setSocialBreadwinnerName] = useState<string>('');
  const [socialEligibleForFreeService, setSocialEligibleForFreeService] = useState<boolean>(false);

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const calculateAgeAtDeath = (dobString?: string, deathDateString?: string) => {
    if (!dobString || !deathDateString) return 0;
    const birth = new Date(dobString);
    const death = new Date(deathDateString);
    let age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, p, fe, probs, deaths] = await Promise.all([
        DB.getFamilyFiles(),
        DB.getPatients(),
        DB.getFundingEntities(),
        DB.getPatientProblems(),
        DB.getPatientDeaths()
      ]);
      setFamilyFiles(f);
      setPatients(p);
      setFundingEntities(fe);
      setPatientProblems(probs);
      setPatientDeaths(deaths);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPatientProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberForProblem) return;
    
    try {
      await DB.addPatientProblem({
        patient_id: selectedMemberForProblem.patient_id,
        problem_name: problemName,
        onset_date: onsetDate || null,
        problem_type: problemType,
        notes: problemNotes || null,
        status: 'active'
      });
      
      const probs = await DB.getPatientProblems();
      setPatientProblems(probs);
      
      setProblemName('');
      setOnsetDate('');
      setProblemNotes('');
      
      // Update selectedFamilyFile members so UI is in sync if needed (since familyFiles is also updated or selection is live)
      const updatedFiles = await DB.getFamilyFiles();
      setFamilyFiles(updatedFiles);
      if (selectedFamilyFile) {
        const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ التاريخ المرضي");
    }
  };

  const handleDeletePatientProblem = async (problemId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل المرضي؟")) return;
    try {
      await DB.deletePatientProblem(problemId);
      const probs = await DB.getPatientProblems();
      setPatientProblems(probs);
      
      const updatedFiles = await DB.getFamilyFiles();
      setFamilyFiles(updatedFiles);
      if (selectedFamilyFile) {
        const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حذف السجل المرضي");
    }
  };

  const handleAddPatientDeath = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedMemberForDeath) return;

    try {
      const payload = {
        patient_id: selectedMemberForDeath.patient_id,
        deceased_name: deceasedName.trim(),
        age_at_death: Number(ageAtDeath),
        death_date: deathDate,
        death_code: deathCode.trim(),
        notes: deathNotes.trim() || null
      };

      await DB.addPatientDeath(payload);
      
      setShowAddDeathModal(false);
      setSelectedMemberForDeath(null);
      setDeceasedName('');
      setAgeAtDeath(0);
      setDeathDate('');
      setDeathCode('');
      setDeathNotes('');
      
      await loadData();
      if (selectedFamilyFile) {
        const updatedFiles = await DB.getFamilyFiles();
        const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
      alert("تم تسجيل حالة الوفاة بنجاح");
    } catch (err: any) {
      setFormError(err.message || "خطأ في تسجيل حالة الوفاة");
    }
  };

  const handleDeletePatientDeath = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف حالة الوفاة هذه؟ سيتم استعادة العضو كفرد نشط.")) return;
    try {
      await DB.deletePatientDeath(id);
      await loadData();
      if (selectedFamilyFile) {
        const updatedFiles = await DB.getFamilyFiles();
        const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
      alert("تم حذف حالة الوفاة واستعادة العضو بنجاح");
    } catch (err: any) {
      alert(err.message || "خطأ في حذف حالة الوفاة");
    }
  };

  const handleUpdateHousing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedFamilyFile) return;

    try {
      const payload = {
        total_rooms: Number(housingTotalRooms),
        sleeping_rooms: Number(housingSleepingRooms),
        ventilation: housingVentilation,
        water_source: housingWaterSource,
        sewage_system: housingSewageSystem,
        lighting_type: housingLightingType,
        has_animals_birds: housingHasAnimalsBirds,
        barn_location: housingBarnLocation
      };

      await DB.updateFamilyFile(selectedFamilyFile.id, payload);
      setShowEditHousingModal(false);
      
      await loadData();
      const updatedFiles = await DB.getFamilyFiles();
      const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
      if (updatedFile) setSelectedFamilyFile(updatedFile);
      
      alert("تم تحديث بيان حالة المسكن بنجاح");
    } catch (err: any) {
      setFormError(err.message || "خطأ في تحديث بيان حالة المسكن");
    }
  };

  const handleUpdateSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedFamilyFile) return;

    try {
      const payload = {
        income_type: socialIncomeType,
        monthly_income: Number(socialMonthlyIncome),
        has_chronic_diseases: socialHasChronicDiseases,
        has_disabilities: socialHasDisabilities,
        receives_pension: socialReceivesPension,
        breadwinner_name: socialBreadwinnerName.trim() || null,
        eligible_for_free_service: socialEligibleForFreeService
      };

      await DB.updateFamilyFile(selectedFamilyFile.id, payload);
      setShowEditSocialModal(false);
      
      await loadData();
      const updatedFiles = await DB.getFamilyFiles();
      const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
      if (updatedFile) setSelectedFamilyFile(updatedFile);
      
      alert("تم تحديث بيان البحث الاجتماعي بنجاح");
    } catch (err: any) {
      setFormError(err.message || "خطأ في تحديث بيان البحث الاجتماعي");
    }
  };

  const handleAddFamilyFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const target = e.target as any;
    
    const nationalId = target.national_id.value.trim();
    if (nationalId.length !== 14 || isNaN(Number(nationalId))) {
      setFormError("الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً.");
      return;
    }

    const phone = target.phone.value.trim();
    const workPhone = target.work_phone.value.trim();
    const nearestPhone = target.nearest_phone.value.trim();

    if (phone && !validatePhoneNumber(phone)) {
      setFormError("رقم الهاتف الأساسي غير صحيح. يجب أن يتكون من 8 إلى 15 رقماً.");
      return;
    }
    if (workPhone && !validatePhoneNumber(workPhone)) {
      setFormError("رقم تليفون العمل غير صحيح. يجب أن يتكون من 8 إلى 15 رقماً.");
      return;
    }
    if (nearestPhone && !validatePhoneNumber(nearestPhone)) {
      setFormError("رقم أقرب تليفون غير صحيح. يجب أن يتكون من 8 إلى 15 رقماً.");
      return;
    }

    try {
      await DB.addFamilyFile({
        family_code: target.family_code.value.trim(),
        national_id: nationalId,
        head_name: target.head_name.value.trim(),
        governorate: target.governorate.value.trim(),
        administration: target.administration.value.trim(),
        village_city: target.village_city.value.trim(),
        health_unit: target.health_unit.value.trim(),
        address: target.address.value.trim(),
        phone: phone || null,
        home_number: workPhone || null, // تليفون العمل
        nearest_landmark: nearestPhone || null, // أقرب تليفون
        notes: target.notes.value.trim() || null,
        
        // Housing conditions (بيان حالة المسكن)
        total_rooms: target.total_rooms?.value ? Number(target.total_rooms.value) : null,
        sleeping_rooms: target.sleeping_rooms?.value ? Number(target.sleeping_rooms.value) : null,
        ventilation: target.ventilation?.value || 'good',
        water_source: target.water_source?.value || 'public',
        sewage_system: target.sewage_system?.value || 'sanitary',
        lighting_type: target.lighting_type?.value || 'electricity',
        has_animals_birds: target.has_animals_birds?.checked || false,
        barn_location: target.barn_location?.value || 'none',

        // Social Search (البحث الاجتماعي)
        income_type: target.income_type?.value || 'fixed',
        monthly_income: target.monthly_income?.value ? Number(target.monthly_income.value) : null,
        has_chronic_diseases: target.has_chronic_diseases?.checked || false,
        has_disabilities: target.has_disabilities?.checked || false,
        receives_pension: target.receives_pension?.checked || false,
        breadwinner_name: target.breadwinner_name?.value ? target.breadwinner_name.value.trim() : null,
        eligible_for_free_service: target.eligible_for_free_service?.checked || false
      });
      setShowAddFamilyFile(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || "خطأ في إضافة الملف العائلي");
    }
  };

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const target = e.target as any;
    if (!selectedFamilyFileForMember) return;

    const patientId = target.patient_id.value;
    const relationshipToHead = target.relationship_to_head.value;
    const role = target.family_role.value.trim();
    const notes = target.member_notes.value.trim();
    const isHead = target.is_head.checked;

    // دمج الدور والملاحظات في حقل واحد لعدم كسر الهيكل الحالي لقاعدة البيانات
    const combinedRole = notes ? `${role} | ${notes}` : role;

    // جلب قيم حقول بيانات المريض الاختيارية لتحديثها
    const memberName = target.member_name.value.trim();
    const memberGender = target.member_gender.value;
    const memberDob = target.member_dob.value;
    const memberInsurance = target.member_insurance.value;

    try {
      // 1. تحديث بيانات المريض في قاعدة البيانات لضمان دقة الاسم رباعي، النوع، تاريخ الميلاد، ونوع التأمين
      const { error: patientErr } = await supabase.from('patients').update({
        name: memberName,
        gender: memberGender,
        date_of_birth: memberDob || null,
        funding_entity_id: (memberInsurance && memberInsurance !== 'cash') ? memberInsurance : null
      }).eq('id', patientId);

      if (patientErr) throw patientErr;

      // 2. ربط المريض بالملف العائلي
      await DB.addFamilyMember({
        family_file_id: selectedFamilyFileForMember.id,
        patient_id: patientId,
        relationship_to_head: relationshipToHead,
        family_role: combinedRole || null,
        is_head: isHead
      });

      setShowAddFamilyMember(false);
      setSelectedFamilyFileForMember(null);
      setSelectedPatientId('');
      
      // Refresh family files to show the updated members
      const updatedFiles = await DB.getFamilyFiles();
      setFamilyFiles(updatedFiles);
      if (selectedFamilyFile) {
        const updatedFile = updatedFiles.find((f: any) => f.id === selectedFamilyFile.id);
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
    } catch (err: any) {
      setFormError(err.message || "خطأ في إضافة فرد للأسرة");
    }
  };

  // Filtered family files based on search input
  const filteredFamilyFiles = familyFiles.filter(file => {
    const searchLower = searchTerm.toLowerCase();
    const familyCode = (file.family_code || '').toLowerCase();
    const headName = (file.head_name || '').toLowerCase();
    const nationalId = (file.national_id || '').toLowerCase();
    const governorate = (file.governorate || '').toLowerCase();
    const administration = (file.administration || '').toLowerCase();
    const villageCity = (file.village_city || '').toLowerCase();
    const healthUnit = (file.health_unit || '').toLowerCase();

    return familyCode.includes(searchLower) ||
           headName.includes(searchLower) ||
           nationalId.includes(searchLower) ||
           governorate.includes(searchLower) ||
           administration.includes(searchLower) ||
           villageCity.includes(searchLower) ||
           healthUnit.includes(searchLower);
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="البحث برقم الملف، اسم رب العائلة، الرقم القومي، المحافظة، أو الوحدة..."
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-bold placeholder-gray-400 transition-all text-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setSelectedFamilyFile(null);
            setFormError(null);
            setShowAddFamilyFile(true);
          }}
          className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 shadow-md transition-all whitespace-nowrap text-sm"
        >
          <Plus size={18} /> 
          إنشاء ملف عائلي جديد
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-primary-600" size={40} />
        </div>
      ) : selectedFamilyFile ? (
        /* Family File Details View */
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6 animate-in slide-in-from-left duration-300">
          <div className="flex justify-between items-center pb-4 border-b">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedFamilyFile(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-all"
                title="رجوع للقائمة"
              >
                <ChevronLeft size={24} className="rotate-180" />
              </button>
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                <FolderOpen size={24} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-800">تفاصيل الملف العائلي: {selectedFamilyFile.family_code}</h3>
                <p className="text-xs text-gray-400">تاريخ الإنشاء: {new Date(selectedFamilyFile.created_at || new Date()).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedFamilyFile(null)}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">اسم رب العائلة</span>
              <span className="font-bold text-gray-800 text-base">{selectedFamilyFile.head_name || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">الرقم القومي لرب العائلة</span>
              <span className="font-bold text-gray-800 text-base font-mono">{selectedFamilyFile.national_id || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">رقم الهاتف الأساسي</span>
              <span className="font-bold text-gray-800 flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {selectedFamilyFile.phone || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">تليفون العمل</span>
              <span className="font-bold text-gray-800 flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {selectedFamilyFile.home_number || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">أقرب تليفون</span>
              <span className="font-bold text-gray-800 flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {selectedFamilyFile.nearest_landmark || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">المحافظة</span>
              <span className="font-bold text-gray-800">{selectedFamilyFile.governorate || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">الإدارة الصحية</span>
              <span className="font-bold text-gray-800">{selectedFamilyFile.administration || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">القرية أو المدينة</span>
              <span className="font-bold text-gray-800">{selectedFamilyFile.village_city || '---'}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">الوحدة الصحية المسجل بها</span>
              <span className="font-bold text-primary-600 font-extrabold">{selectedFamilyFile.health_unit || '---'}</span>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <span className="text-xs text-gray-400 font-bold block">العنوان بالتفصيل</span>
              <span className="font-bold text-gray-800 flex items-center gap-1"><MapPin size={14} className="text-gray-400" /> {selectedFamilyFile.address || '---'}</span>
            </div>
            {selectedFamilyFile.notes && (
              <div className="col-span-full pt-4 border-t border-gray-100 space-y-1">
                <span className="text-xs text-gray-400 font-bold block">ملاحظات ديموغرافية واجتماعية</span>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border">{selectedFamilyFile.notes}</p>
              </div>
            )}
          </div>

          {/* بيان حالة المسكن والبيئة السكنية */}
          <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
              <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Home size={20} className="text-slate-600" />
                بيان حالة المسكن والبيئة السكنية
              </h4>
              <button 
                onClick={() => {
                  setHousingTotalRooms(selectedFamilyFile.total_rooms || 0);
                  setHousingSleepingRooms(selectedFamilyFile.sleeping_rooms || 0);
                  setHousingVentilation(selectedFamilyFile.ventilation || 'good');
                  setHousingWaterSource(selectedFamilyFile.water_source || 'public');
                  setHousingSewageSystem(selectedFamilyFile.sewage_system || 'sanitary');
                  setHousingLightingType(selectedFamilyFile.lighting_type || 'electricity');
                  setHousingHasAnimalsBirds(!!selectedFamilyFile.has_animals_birds);
                  setHousingBarnLocation(selectedFamilyFile.barn_location || 'none');
                  setFormError(null);
                  setShowEditHousingModal(true);
                }}
                className="px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Pencil size={14} />
                تعديل حالة المسكن
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Home size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">عدد الحجرات بالمنزل</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    الكلية: {selectedFamilyFile.total_rooms ?? '---'} | للنوم: {selectedFamilyFile.sleeping_rooms ?? '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Wind size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">حالة التهوية</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.ventilation === 'good' ? 'text-emerald-600' : selectedFamilyFile.ventilation === 'poor' ? 'text-red-500' : 'text-gray-500'}`}>
                    {selectedFamilyFile.ventilation === 'good' ? 'جيدة' : selectedFamilyFile.ventilation === 'poor' ? 'غير جيدة' : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Droplet size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">مصدر المياه</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.water_source === 'public' ? 'عام (شبكة عمومية)' : selectedFamilyFile.water_source === 'other' ? 'أخرى' : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Activity size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">الصرف الصحي</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.sewage_system === 'sanitary' ? 'text-emerald-600' : selectedFamilyFile.sewage_system === 'trench' ? 'text-amber-600' : 'text-gray-500'}`}>
                    {selectedFamilyFile.sewage_system === 'sanitary' ? 'صحي' : selectedFamilyFile.sewage_system === 'trench' ? 'طرنش (غير صحي)' : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Zap size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">نوع الإضاءة</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.lighting_type === 'electricity' ? 'كهرباء' : selectedFamilyFile.lighting_type === 'other' ? 'أخرى' : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">طيور أو حيوانات بالمنزل</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.has_animals_birds ? 'text-amber-600' : 'text-gray-500'}`}>
                    {selectedFamilyFile.has_animals_birds ? 'يوجد بالمنزل' : 'لا يوجد'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Home size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">مكان الحظيرة</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.barn_location === 'inside' ? 'بالمنزل' : selectedFamilyFile.barn_location === 'outside' ? 'بالخارج' : selectedFamilyFile.barn_location === 'none' ? 'لا يوجد حظيرة' : '---'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* بيان البحث الاجتماعي والتمكين */}
          <div className="bg-sky-50/50 border border-sky-100 p-6 rounded-3xl space-y-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-sky-100">
              <h4 className="font-bold text-lg text-sky-900 flex items-center gap-2">
                <Users size={20} className="text-sky-700" />
                بيان البحث الاجتماعي والتمكين الأسري
              </h4>
              <button 
                onClick={() => {
                  setSocialIncomeType(selectedFamilyFile.income_type || 'fixed');
                  setSocialMonthlyIncome(selectedFamilyFile.monthly_income || 0);
                  setSocialHasChronicDiseases(!!selectedFamilyFile.has_chronic_diseases);
                  setSocialHasDisabilities(!!selectedFamilyFile.has_disabilities);
                  setSocialReceivesPension(!!selectedFamilyFile.receives_pension);
                  setSocialBreadwinnerName(selectedFamilyFile.breadwinner_name || '');
                  setSocialEligibleForFreeService(!!selectedFamilyFile.eligible_for_free_service);
                  setFormError(null);
                  setShowEditSocialModal(true);
                }}
                className="px-3.5 py-1.5 bg-white text-sky-900 hover:bg-sky-900 hover:text-white rounded-xl text-xs font-bold transition-all border border-sky-200 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Pencil size={14} />
                تعديل البحث الاجتماعي
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <CreditCard size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">طبيعة دخل الأسرة</span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.income_type === 'fixed' ? 'ثابت' : selectedFamilyFile.income_type === 'variable' ? 'متغير' : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <span className="font-bold text-xs font-mono">EGP</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">متوسط الدخل الشهري</span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.monthly_income != null ? `${selectedFamilyFile.monthly_income.toLocaleString('ar-EG')} ج.م` : '---'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">وجود أمراض مزمنة</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.has_chronic_diseases ? 'text-amber-600' : 'text-gray-500'}`}>
                    {selectedFamilyFile.has_chronic_diseases ? 'يوجد أمراض مزمنة' : 'لا يوجد'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">وجود حالات إعاقة</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.has_disabilities ? 'text-red-500' : 'text-gray-500'}`}>
                    {selectedFamilyFile.has_disabilities ? 'يوجد حالات إعاقة' : 'لا يوجد'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">الحصول على معاش</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.receives_pension ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {selectedFamilyFile.receives_pension ? 'نعم (تحصل على معاش)' : 'لا (لا تحصل)'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">استحقاق الخدمة المجانية</span>
                  <span className={`font-extrabold text-sm ${selectedFamilyFile.eligible_for_free_service ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {selectedFamilyFile.eligible_for_free_service ? 'تستحق الخدمة المجانية' : 'غير مستحقة'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">العائل البديل (عند وفاة الأب)</span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.breadwinner_name || '---'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-primary-600" /> أفراد العائلة المسجلين بالملف ({selectedFamilyFile.members?.length || 0})
              </h4>
              <button 
                onClick={() => {
                  setSelectedFamilyFileForMember(selectedFamilyFile);
                  setFormError(null);
                  setShowAddFamilyMember(true);
                }}
                className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-primary-100"
              >
                <Plus size={16} /> إضافة فرد للملف
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-right border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs">
                    <th className="p-4">الاسم رباعي</th>
                    <th className="p-4">الرقم القومي</th>
                    <th className="p-4">النوع</th>
                    <th className="p-4">تاريخ الميلاد</th>
                    <th className="p-4">نوع التأمين</th>
                    <th className="p-4">صلة القرابة</th>
                    <th className="p-4">الوظيفة والدور</th>
                    <th className="p-4">الملاحظات</th>
                    <th className="p-4 text-center">رب العائلة؟</th>
                    <th className="p-4">التاريخ المرضي</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
                  {selectedFamilyFile.members && selectedFamilyFile.members.length > 0 ? (
                    selectedFamilyFile.members.map((member: any) => {
                      const parsed = parseFamilyRoleAndNotes(member.family_role);
                      const insuranceName = member.patients?.funding_entity_id 
                        ? (fundingEntities.find(fe => fe.id === member.patients.funding_entity_id)?.name || 'متعاقد')
                        : 'نقدي (بدون تأمين)';
                      const memberProblems = patientProblems.filter(p => p.patient_id === member.patient_id);
                      const isDeceased = patientDeaths.some(d => d.patient_id === member.patient_id);

                      return (
                        <tr key={member.id} className={`hover:bg-gray-50/50 ${isDeceased ? 'bg-gray-50/30' : ''}`}>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className={`font-bold ${isDeceased ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {member.patients?.name || '---'}
                              </span>
                              {isDeceased && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md w-fit">
                                  <span>متوفى</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-gray-600">{member.patients?.national_id || '---'}</td>
                          <td className="p-4">
                            {member.patients?.gender ? (
                              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                member.patients.gender === 'ذكر' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                  : 'bg-pink-50 text-pink-700 border border-pink-100'
                              }`}>
                                {member.patients.gender}
                              </span>
                            ) : (
                              <span className="text-gray-400">---</span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-gray-600">
                            {member.patients?.date_of_birth 
                              ? new Date(member.patients.date_of_birth).toLocaleDateString('ar-EG') 
                              : '---'}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">
                              {insuranceName}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold border border-gray-200">
                              {member.relationship_to_head || '---'}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">{parsed.role || '---'}</td>
                          <td className="p-4 text-gray-500 font-normal max-w-[200px] truncate" title={parsed.notes}>
                            {parsed.notes || '---'}
                          </td>
                          <td className="p-4 text-center">
                            {member.is_head ? (
                              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 inline-block">نعم (رب الأسرة)</span>
                            ) : (
                              <span className="text-gray-400 text-xs">لا</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {memberProblems.length > 0 ? (
                                memberProblems.map((prob: any) => (
                                  <span 
                                    key={prob.id} 
                                    title={`تاريخ الاكتشاف: ${prob.onset_date || 'غير محدد'} | ملاحظات: ${prob.notes || 'لا يوجد'}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-bold"
                                  >
                                    <HeartPulse size={12} className="shrink-0" />
                                    <span>{prob.problem_name}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs font-normal">سليم / لا يوجد</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {!isDeceased ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedMemberForProblem(member);
                                    setProblemName('');
                                    setOnsetDate('');
                                    setProblemNotes('');
                                    setShowAddProblem(true);
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-red-100 flex items-center gap-1 shrink-0"
                                >
                                  <ClipboardList size={14} />
                                  التاريخ المرضي
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedMemberForDeath(member);
                                    setDeceasedName(member.patients?.name || '');
                                    const birthDate = member.patients?.date_of_birth;
                                    const calculated = birthDate ? calculateAgeAtDeath(birthDate, new Date().toISOString().split('T')[0]) : 0;
                                    setAgeAtDeath(calculated);
                                    setDeathDate(new Date().toISOString().split('T')[0]);
                                    setDeathCode('');
                                    setDeathNotes('');
                                    setShowAddDeathModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 shrink-0"
                                >
                                  <ShieldAlert size={14} />
                                  تسجيل وفاة
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs font-normal">تم الوفاة</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-gray-400 font-bold">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        لا يوجد أفراد مسجلين في هذا الملف حالياً. اضغط على "إضافة فرد" لربط أفراد العائلة بالملف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* بيان الوفيات بالملف العائلي - يظهر فقط في حالة وجود حالات وفاة مضافة بالأسرة */}
          {(() => {
            const familyMemberIds = (selectedFamilyFile.members || []).map((m: any) => m.patient_id);
            const familyDeaths = patientDeaths.filter(d => familyMemberIds.includes(d.patient_id));
            if (familyDeaths.length === 0) return null;

            return (
              <div className="space-y-4 pt-6 border-t border-gray-100 animate-in fade-in duration-300">
                <h4 className="font-bold text-lg text-red-800 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-red-600 animate-pulse" />
                  بيان وفيات الأسرة ({familyDeaths.length})
                </h4>
                <div className="overflow-x-auto border border-red-100 rounded-2xl bg-red-50/10 shadow-sm">
                  <table className="w-full text-right border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-red-50/30 border-b border-red-100 text-red-900 font-bold text-xs">
                        <th className="p-4">اسم المتوفى</th>
                        <th className="p-4">السن عند الوفاة</th>
                        <th className="p-4">تاريخ الوفاة</th>
                        <th className="p-4">كود الوفاة</th>
                        <th className="p-4">ملاحظات</th>
                        <th className="p-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100/50 text-sm font-bold text-gray-700">
                      {familyDeaths.map((death: any) => (
                        <tr key={death.id} className="hover:bg-red-50/20">
                          <td className="p-4 text-red-900">{death.deceased_name}</td>
                          <td className="p-4 font-mono text-gray-800">{death.age_at_death} سنة</td>
                          <td className="p-4 font-mono text-gray-600">
                            {new Date(death.death_date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md text-xs font-mono font-bold border border-red-100">
                              {death.death_code}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 font-normal">{death.notes || '---'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleDeletePatientDeath(death.id)}
                              className="w-8 h-8 rounded-lg bg-white hover:bg-red-100 text-red-500 flex items-center justify-center transition-all border border-red-200 mx-auto"
                              title="حذف حالة الوفاة وإعادة العضو للحالة النشطة"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Family Files Table (شكل جدول) */
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-extrabold text-xs">
                  <th className="p-4 py-5 text-center">رقم الملف العائلي</th>
                  <th className="p-4 py-5">اسم رب العائلة</th>
                  <th className="p-4 py-5">الرقم القومي لرب العائلة</th>
                  <th className="p-4 py-5">المحافظة / الإدارة</th>
                  <th className="p-4 py-5">القرية أو المدينة</th>
                  <th className="p-4 py-5">الوحدة الصحية</th>
                  <th className="p-4 py-5">رقم الهاتف</th>
                  <th className="p-4 py-5 text-center">أفراد العائلة</th>
                  <th className="p-4 py-5 text-center">تاريخ الإنشاء</th>
                  <th className="p-4 py-5 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-bold text-gray-700">
                {filteredFamilyFiles.length > 0 ? (
                  filteredFamilyFiles.map((file: any) => (
                    <tr 
                      key={file.id} 
                      onClick={() => setSelectedFamilyFile(file)}
                      className="hover:bg-primary-50/20 transition-colors cursor-pointer"
                    >
                      <td className="p-4 text-center font-mono text-primary-600 font-extrabold text-sm">
                        <span className="bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-xl">
                          {file.family_code}
                        </span>
                      </td>
                      <td className="p-4 text-gray-900 text-base">{file.head_name || 'غير مسجل'}</td>
                      <td className="p-4 font-mono text-gray-500 text-sm">{file.national_id || '---'}</td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-gray-800">{file.governorate || '---'}</div>
                        <div className="text-gray-400 mt-0.5">{file.administration || '---'}</div>
                      </td>
                      <td className="p-4 text-gray-600">{file.village_city || '---'}</td>
                      <td className="p-4">
                        <span className="text-gray-800 font-extrabold bg-blue-50/50 border border-blue-100 px-2 py-1 rounded-lg text-xs">
                          {file.health_unit || '---'}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-normal">
                        <div className="flex flex-col gap-1 font-mono">
                          {file.phone && (
                            <span className="flex items-center gap-1 text-gray-800 font-bold">
                              <Phone size={10} className="text-primary-500 shrink-0" /> {file.phone}
                            </span>
                          )}
                          {file.home_number && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded shrink-0 font-sans font-bold">عمل</span> {file.home_number}
                            </span>
                          )}
                          {file.nearest_landmark && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded shrink-0 font-sans font-bold">أقرب</span> {file.nearest_landmark}
                            </span>
                          )}
                          {!file.phone && !file.home_number && !file.nearest_landmark && (
                            <span className="text-gray-400">---</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-black rounded-full border border-emerald-100">
                          {file.members?.length || 0} أفراد
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs text-gray-400 font-normal">
                        {new Date(file.created_at || new Date()).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setSelectedFamilyFile(file)}
                            className="p-2 bg-primary-50 hover:bg-primary-600 text-primary-600 hover:text-white rounded-xl transition-all border border-primary-100"
                            title="عرض تفاصيل الملف وأفراده"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedFamilyFileForMember(file);
                              setFormError(null);
                              setShowAddFamilyMember(true);
                            }}
                            className="p-2 bg-gray-50 hover:bg-emerald-600 text-gray-600 hover:text-white rounded-xl transition-all border border-gray-200 hover:border-emerald-600"
                            title="إضافة فرد للأسرة"
                          >
                            <UserPlus size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-16 text-center text-gray-400 font-bold">
                      <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                      {searchTerm ? 'لا توجد نتائج مطابقة لعملية البحث.' : 'لم يتم تسجيل أي ملفات عائلية بالسيستم بعد.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Family File Modal */}
      {showAddFamilyFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" dir="rtl">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                <div className="flex items-center gap-2">
                   <FolderOpen className="text-primary-600" size={24} />
                   <h3 className="font-bold text-xl text-gray-800">إنشاء ملف عائلي جديد</h3>
                </div>
                <button onClick={() => setShowAddFamilyFile(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleAddFamilyFile} className="p-6 md:p-8 space-y-5 overflow-y-auto">
                {formError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-700 font-bold text-sm">
                    <ShieldAlert size={18} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">رقم الملف العائلي *</label>
                      <input name="family_code" required placeholder="مثال: FF-5001" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">الرقم القومي لرب العائلة *</label>
                      <input name="national_id" required maxLength={14} minLength={14} placeholder="14 رقم قومي مصري" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">اسم رب العائلة *</label>
                      <input name="head_name" required placeholder="الاسم الرباعي كاملاً لرب الأسرة" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">رقم الهاتف الأساسي للأسرة *</label>
                      <input name="phone" required placeholder="مثال: 01xxxxxxxxx" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">تليفون العمل</label>
                      <input name="work_phone" placeholder="تليفون مكان العمل" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">أقرب تليفون (طوارئ أو قريب)</label>
                      <input name="nearest_phone" placeholder="تليفون قريب لحالات الطوارئ" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">المحافظة *</label>
                      <input name="governorate" required placeholder="مثال: الجيزة" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">الإدارة الصحية *</label>
                      <input name="administration" required placeholder="مثال: إدارة البدرشين" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">القرية أو المدينة *</label>
                      <input name="village_city" required placeholder="مثال: الشوبك" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">وحدة طب الأسرة / المركز الطبي *</label>
                      <input name="health_unit" required placeholder="مثال: وحدة الشوبك الصحية" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">العنوان بالتفصيل *</label>
                      <input name="address" required placeholder="الشارع، رقم المنزل، علامة مميزة" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                   </div>
                </div>

                 <div className="border-t border-gray-100 pt-4 space-y-4">
                   <h4 className="font-extrabold text-sm text-primary-600 flex items-center gap-1.5 pb-2 border-b">
                      <Home size={16} /> بيان حالة المسكن والبيئة السكنية (اختياري)
                   </h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">عدد الحجرات الكلي بالمنزل</label>
                         <input type="number" name="total_rooms" min={0} placeholder="عدد الحجرات الكلي" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">الحجرات المخصصة للنوم</label>
                         <input type="number" name="sleeping_rooms" min={0} placeholder="عدد حجرات النوم" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">التهوية</label>
                          <select name="ventilation" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                             <option value="good">جيدة</option>
                             <option value="poor">غير جيدة</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">مصدر المياه</label>
                          <select name="water_source" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                             <option value="public">عام (شبكة عمومية)</option>
                             <option value="other">أخرى</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">الصرف الصحي</label>
                          <select name="sewage_system" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                             <option value="sanitary">صحي</option>
                             <option value="trench">طرنش (غير صحي)</option>
                          </select>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">نوع الإضاءة</label>
                          <select name="lighting_type" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                             <option value="electricity">كهرباء</option>
                             <option value="other">أخرى</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">حظيرة طيور/حيوانات</label>
                          <select name="barn_location" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                             <option value="none">لا يوجد حظيرة</option>
                             <option value="inside">بالمنزل</option>
                             <option value="outside">بالخارج</option>
                          </select>
                       </div>
                       <div className="flex items-center gap-2.5 pt-6">
                          <input type="checkbox" id="has_animals_birds" name="has_animals_birds" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                          <label htmlFor="has_animals_birds" className="text-xs font-bold text-gray-700 cursor-pointer select-none">تربية حيوانات أو طيور بالمنزل</label>
                       </div>
                    </div>
                 </div>

                 <div className="border-t border-gray-100 pt-4 space-y-4">
                   <h4 className="font-extrabold text-sm text-primary-600 flex items-center gap-1.5 pb-2 border-b">
                      <Users size={16} /> بيان البحث الاجتماعي والتمكين الأسري (اختياري)
                   </h4>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">طبيعة دخل الأسرة</label>
                         <select name="income_type" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                            <option value="fixed">دخل ثابت</option>
                            <option value="variable">دخل متغير</option>
                         </select>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">متوسط الدخل الشهري (بالجنيه)</label>
                         <input type="number" name="monthly_income" min={0} placeholder="متوسط الدخل الشهري بالجنيه" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm" />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">العائل البديل (في حالة وفاة الأب)</label>
                         <input type="text" name="breadwinner_name" placeholder="اسم العائل البديل" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm" />
                      </div>
                      <div className="flex flex-col gap-3 pt-2">
                         <div className="flex items-center gap-2.5">
                            <input type="checkbox" id="has_chronic_diseases" name="has_chronic_diseases" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                            <label htmlFor="has_chronic_diseases" className="text-xs font-bold text-gray-700 cursor-pointer select-none">وجود أمراض مزمنة بالأسرة</label>
                         </div>
                         <div className="flex items-center gap-2.5">
                            <input type="checkbox" id="has_disabilities" name="has_disabilities" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                            <label htmlFor="has_disabilities" className="text-xs font-bold text-gray-700 cursor-pointer select-none">وجود حالات إعاقة بالأسرة</label>
                         </div>
                         <div className="flex items-center gap-2.5">
                            <input type="checkbox" id="receives_pension" name="receives_pension" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                            <label htmlFor="receives_pension" className="text-xs font-bold text-gray-700 cursor-pointer select-none">الأسرة تحصل على معاش</label>
                         </div>
                         <div className="flex items-center gap-2.5">
                            <input type="checkbox" id="eligible_for_free_service" name="eligible_for_free_service" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                            <label htmlFor="eligible_for_free_service" className="text-xs font-bold text-gray-700 cursor-pointer select-none">الأسرة تستحق الخدمة المجانية</label>
                         </div>
                      </div>
                   </div>
                </div>
                </div>

                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات ديموغرافية واجتماعية</label>
                    <textarea name="notes" rows={3} placeholder="تفاصيل ديموغرافية، الحالة الاجتماعية أو أي ملاحظات هامة للأسرة..." className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold" />
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                   <button type="button" onClick={() => setShowAddFamilyFile(false)} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors">إلغاء</button>
                   <button type="submit" className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors">
                      <Save size={18} /> حفظ ملف العائلة
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddFamilyMember && selectedFamilyFileForMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" dir="rtl">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
                <div className="flex items-center gap-2">
                   <UserPlus className="text-primary-600" size={24} />
                   <h3 className="font-bold text-lg text-gray-800">إضافة عضو للملف: {selectedFamilyFileForMember.family_code}</h3>
                </div>
                <button onClick={() => { setShowAddFamilyMember(false); setSelectedFamilyFileForMember(null); setSelectedPatientId(''); }} className="p-2 hover:bg-gray-200 rounded-xl transition-colors"><X size={20} /></button>
             </div>
             
             <form onSubmit={handleAddFamilyMember} className="p-6 space-y-4 overflow-y-auto flex-1">
                 {formError && (
                   <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 font-bold text-sm">
                     <ShieldAlert size={16} className="shrink-0" />
                     <span>{formError}</span>
                   </div>
                 )}

                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">اختر المريض من السجل الطبي بالمركز *</label>
                    <select 
                      name="patient_id" 
                      required 
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                    >
                       <option value="">-- اختر مريضاً --</option>
                       {patients.map(p => (
                         <option key={p.id} value={p.id}>{p.name} (الرقم القومي: {p.national_id || 'غير مسجل'})</option>
                       ))}
                    </select>
                 </div>

                 {selectedPatientId && (() => {
                    const selectedPatient = patients.find(p => p.id === selectedPatientId);
                    if (!selectedPatient) return null;
                    return (
                      <div key={selectedPatientId} className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200/60 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="text-xs font-bold text-primary-600 mb-2 border-b pb-1.5 flex items-center gap-1.5">
                          <Info size={14} /> بيانات العضو المستوردة (قابلة للتعديل والتحديث)
                        </div>
                        
                        <div>
                           <label className="text-xs font-bold text-gray-500 block mb-1">الاسم رباعي *</label>
                           <input 
                             name="member_name" 
                             required 
                             defaultValue={selectedPatient.name || ''} 
                             placeholder="الاسم رباعياً بالكامل" 
                             className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm" 
                           />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-xs font-bold text-gray-500 block mb-1">النوع *</label>
                              <select 
                                name="member_gender" 
                                required 
                                defaultValue={selectedPatient.gender || ''}
                                className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                              >
                                 <option value="">-- اختر النوع --</option>
                                 <option value="ذكر">ذكر</option>
                                 <option value="أنثى">أنثى</option>
                              </select>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-gray-500 block mb-1">تاريخ الميلاد *</label>
                              <input 
                                type="date" 
                                name="member_dob" 
                                required 
                                defaultValue={selectedPatient.date_of_birth || ''} 
                                className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm" 
                              />
                           </div>
                        </div>

                        <div>
                           <label className="text-xs font-bold text-gray-500 block mb-1">نوع التأمين (جهة التعاقد) *</label>
                           <select 
                             name="member_insurance" 
                             required 
                             defaultValue={selectedPatient.funding_entity_id || ''}
                             className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                           >
                              <option value="">-- اختر نوع التأمين --</option>
                              {fundingEntities.map(fe => (
                                <option key={fe.id} value={fe.id}>{fe.name}</option>
                              ))}
                              <option value="cash">نقدي (بدون تأمين)</option>
                           </select>
                        </div>
                      </div>
                    );
                 })()}

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-gray-500 block mb-1">صلة القرابة برب العائلة *</label>
                       <select name="relationship_to_head" required className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm">
                          <option value="رب العائلة">رب العائلة (نفسه)</option>
                          <option value="زوج">زوج</option>
                          <option value="زوجة">زوجة</option>
                          <option value="ابن">ابن</option>
                          <option value="ابنة">ابنة</option>
                          <option value="أب">أب</option>
                          <option value="أم">أم</option>
                          <option value="أخ">أخ</option>
                          <option value="أخت">أخت</option>
                          <option value="حفيد / حفيدة">حفيد / حفيدة</option>
                          <option value="أخرى">أخرى</option>
                       </select>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-gray-500 block mb-1">الوظيفة والدور *</label>
                       <input name="family_role" required placeholder="مثال: طالب، موظف، ربة منزل" className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm" />
                    </div>
                 </div>

                 

                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات العضو</label>
                    <textarea name="member_notes" rows={2} placeholder="أي ملاحظات خاصة بالفرد (حالة صحية، احتياجات، إلخ)..." className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm" />
                 </div>

                 <div className="flex items-center gap-2.5 py-1">
                    <input type="checkbox" id="is_head" name="is_head" className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer" />
                    <label htmlFor="is_head" className="text-xs font-bold text-gray-700 cursor-pointer select-none">هل هذا الفرد هو رب الأسرة (Head of Family)؟</label>
                 </div>

                 <div className="flex gap-4 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => { setShowAddFamilyMember(false); setSelectedFamilyFileForMember(null); setSelectedPatientId(''); }} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors">إلغاء</button>
                    <button type="submit" className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors">
                       <Save size={18} /> ربط العضو بالملف
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showAddProblem && selectedMemberForProblem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <HeartPulse size={22} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">التاريخ المرضي للعضو</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">المريض: {selectedMemberForProblem.patients?.name || '---'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddProblem(false); setSelectedMemberForProblem(null); }}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Form to Add New History */}
              <form onSubmit={handleAddPatientProblem} className="bg-red-50/20 border border-red-100/50 rounded-2xl p-4 space-y-4">
                <h4 className="font-extrabold text-red-800 text-sm flex items-center gap-1.5">
                  <Plus size={16} /> إضافة سجل مرضي جديد
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">اسم المرض / نوع المرض *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: سكري، ضغط دم مرتفع، ربو"
                      value={problemName}
                      onChange={(e) => setProblemName(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">تاريخ اكتشاف المرض *</label>
                    <input 
                      type="date" 
                      required
                      value={onsetDate}
                      onChange={(e) => setOnsetDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات إضافية</label>
                  <input 
                    type="text"
                    placeholder="أي ملاحظات حول الجرعات، الحالة، المستشفى المتابع..."
                    value={problemNotes}
                    onChange={(e) => setProblemNotes(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                  >
                    <Save size={16} /> حفظ في السجل
                  </button>
                </div>
              </form>

              {/* List of Existing History */}
              <div className="space-y-3">
                <h4 className="font-black text-gray-800 text-sm flex items-center gap-1.5">
                  <ClipboardList size={16} className="text-gray-500" /> السجل المرضي الحالي ({patientProblems.filter(p => p.patient_id === selectedMemberForProblem.patient_id).length})
                </h4>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {(() => {
                    const memberProblems = patientProblems.filter(p => p.patient_id === selectedMemberForProblem.patient_id);
                    if (memberProblems.length === 0) {
                      return (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-xs">
                          لا يوجد سجلات مرضية مسجلة لهذا العضو حالياً.
                        </div>
                      );
                    }
                    return memberProblems.map((prob: any) => (
                      <div key={prob.id} className="flex justify-between items-start p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">{prob.problem_name}</span>
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold border border-red-100">نشط</span>
                          </div>
                          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
                            <Calendar size={12} />
                            تاريخ الاكتشاف: {prob.onset_date ? new Date(prob.onset_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </div>
                          {prob.notes && (
                            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-1.5 font-normal">
                              {prob.notes}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeletePatientProblem(prob.id)}
                          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all border border-gray-100 hover:border-red-100"
                          title="حذف السجل"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddDeathModal && selectedMemberForDeath && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">تسجيل حالة وفاة جديدة</h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">العضو: {selectedMemberForDeath.patients?.name || '---'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAddDeathModal(false); setSelectedMemberForDeath(null); setFormError(null); }}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddPatientDeath} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">اسم المتوفى *</label>
                  <input 
                    type="text" 
                    required
                    value={deceasedName}
                    onChange={(e) => setDeceasedName(e.target.value)}
                    placeholder="الاسم رباعي بالكامل"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">تاريخ الوفاة *</label>
                    <input 
                      type="date" 
                      required
                      value={deathDate}
                      onChange={(e) => {
                        setDeathDate(e.target.value);
                        const birthDate = selectedMemberForDeath.patients?.date_of_birth;
                        if (birthDate) {
                          setAgeAtDeath(calculateAgeAtDeath(birthDate, e.target.value));
                        }
                      }}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">السن عند الوفاة *</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      value={ageAtDeath || ''}
                      onChange={(e) => setAgeAtDeath(Number(e.target.value))}
                      placeholder="السن بالسنوات"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">كود الوفاة *</label>
                  <input 
                    type="text" 
                    required
                    value={deathCode}
                    onChange={(e) => setDeathCode(e.target.value)}
                    placeholder="مثال: R99 (الوفاة الطبيعية) أو كود مخصص لسبب الوفاة"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">ملاحظات أو سبب الوفاة الإضافي</label>
                  <textarea 
                    rows={3}
                    value={deathNotes}
                    onChange={(e) => setDeathNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية حول الوفاة أو تفاصيل التشخيص..."
                    className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setShowAddDeathModal(false); setSelectedMemberForDeath(null); setFormError(null); }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Save size={16} /> حفظ حالة الوفاة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Housing Conditions Modal (تعديل حالة المسكن) */}
      {showEditHousingModal && selectedFamilyFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" dir="rtl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Home className="text-slate-600" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-slate-800">تعديل بيان حالة المسكن والبيئة السكنية</h3>
                  <p className="text-xs text-gray-400">للملف العائلي: {selectedFamilyFile.family_code}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowEditHousingModal(false); setFormError(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateHousing} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">عدد الحجرات الكلي بالمنزل</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      value={housingTotalRooms}
                      onChange={(e) => setHousingTotalRooms(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الحجرات المخصصة للنوم</label>
                    <input 
                      type="number" 
                      required
                      min={0}
                      value={housingSleepingRooms}
                      onChange={(e) => setHousingSleepingRooms(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">التهوية</label>
                    <select 
                      value={housingVentilation}
                      onChange={(e) => setHousingVentilation(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="good">جيدة</option>
                      <option value="poor">غير جيدة</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">مصدر المياه</label>
                    <select 
                      value={housingWaterSource}
                      onChange={(e) => setHousingWaterSource(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="public">عام (شبكة عمومية)</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الصرف الصحي</label>
                    <select 
                      value={housingSewageSystem}
                      onChange={(e) => setHousingSewageSystem(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="sanitary">صحي</option>
                      <option value="trench">طرنش (غير صحي)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">نوع الإضاءة</label>
                    <select 
                      value={housingLightingType}
                      onChange={(e) => setHousingLightingType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="electricity">كهرباء</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">حظيرة طيور/حيوانات</label>
                    <select 
                      value={housingBarnLocation}
                      onChange={(e) => setHousingBarnLocation(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="none">لا يوجد حظيرة</option>
                      <option value="inside">بالمنزل</option>
                      <option value="outside">بالخارج</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2.5 pt-6">
                    <input 
                      type="checkbox" 
                      id="edit_has_animals_birds" 
                      checked={housingHasAnimalsBirds}
                      onChange={(e) => setHousingHasAnimalsBirds(e.target.checked)}
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="edit_has_animals_birds" className="text-xs font-bold text-gray-700 cursor-pointer select-none">تربية حيوانات أو طيور بالمنزل</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setShowEditHousingModal(false); setFormError(null); }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Save size={16} /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Social Assessment Modal (تعديل بيان البحث الاجتماعي والتمكين الأسري) */}
      {showEditSocialModal && selectedFamilyFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95" dir="rtl">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Users className="text-slate-600" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-slate-800">تعديل بيان البحث الاجتماعي والتمكين الأسري</h3>
                  <p className="text-xs text-gray-400">للملف العائلي: {selectedFamilyFile.family_code}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowEditSocialModal(false); setFormError(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateSocial} className="flex-1 overflow-y-auto p-6 space-y-6">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">طبيعة دخل الأسرة</label>
                    <select 
                      value={socialIncomeType}
                      onChange={(e) => setSocialIncomeType(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    >
                      <option value="fixed">دخل ثابت</option>
                      <option value="variable">دخل متغير</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">متوسط الدخل الشهري (بالجنيه)</label>
                    <input 
                      type="number" 
                      min={0}
                      value={socialMonthlyIncome}
                      onChange={(e) => setSocialMonthlyIncome(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="text-xs font-bold text-gray-500 block mb-1">العائل البديل (في حالة وفاة الأب)</label>
                    <input 
                      type="text" 
                      value={socialBreadwinnerName}
                      onChange={(e) => setSocialBreadwinnerName(e.target.value)}
                      placeholder="اسم العائل البديل"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3.5 pt-2 border-t border-gray-100 mt-4">
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="edit_has_chronic_diseases" 
                      checked={socialHasChronicDiseases}
                      onChange={(e) => setSocialHasChronicDiseases(e.target.checked)}
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="edit_has_chronic_diseases" className="text-xs font-bold text-gray-700 cursor-pointer select-none">وجود أمراض مزمنة بالأسرة</label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="edit_has_disabilities" 
                      checked={socialHasDisabilities}
                      onChange={(e) => setSocialHasDisabilities(e.target.checked)}
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="edit_has_disabilities" className="text-xs font-bold text-gray-700 cursor-pointer select-none">وجود حالات إعاقة بالأسرة</label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="edit_receives_pension" 
                      checked={socialReceivesPension}
                      onChange={(e) => setSocialReceivesPension(e.target.checked)}
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="edit_receives_pension" className="text-xs font-bold text-gray-700 cursor-pointer select-none">الأسرة تحصل على معاش</label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input 
                      type="checkbox" 
                      id="edit_eligible_for_free_service" 
                      checked={socialEligibleForFreeService}
                      onChange={(e) => setSocialEligibleForFreeService(e.target.checked)}
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer" 
                    />
                    <label htmlFor="edit_eligible_for_free_service" className="text-xs font-bold text-gray-700 cursor-pointer select-none">الأسرة تستحق الخدمة المجانية</label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => { setShowEditSocialModal(false); setFormError(null); }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 transition-colors"
                >
                  <Save size={16} /> حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyFilesModule;
