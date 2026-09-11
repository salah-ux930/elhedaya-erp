import React, { useState, useEffect } from "react";
import { DB } from "../store.ts";
import { supabase } from "../supabase.ts";
import { FamilyFile, Patient, FamilyFileMember } from "../types.ts";
import PatientTimeline from "../components/PatientTimeline.tsx";
import FamilyComprehensiveHealthRecordModal from "../components/FamilyComprehensiveHealthRecordModal.tsx";
import QuickClinicBookingModal from "../components/QuickClinicBookingModal.tsx";
import FamilyUnifiedNavigationTree, { ClinicalModuleItem } from "../components/FamilyUnifiedNavigationTree.tsx";
import { calculatePatientSuggestedFollowups } from "../services/followupSuggestions.ts";
import {
  FolderOpen,
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  FileText,
  UserPlus,
  Save,
  X,
  Loader2,
  Info,
  ChevronLeft,
  Calendar,
  CreditCard,
  ClipboardList,
  ShieldAlert,
  HeartPulse,
  Trash2,
  Home,
  Wind,
  Droplet,
  Zap,
  Sparkles,
  Pencil,
  Activity,
  FileCheck,
  ExternalLink,
  Eye,
  Shield,
  FilePlus,
  UserCheck,
  FileSpreadsheet,
  Layers,
  User,
  Baby,
  Heart,
  Smile,
  Award,
  CheckCircle2,
  Stethoscope,
  BarChart2,
  AlertCircle,
  CalendarCheck,
  ScrollText,
  Square,
  Printer,
} from "lucide-react";
import { printFamilyFileFull, printHtmlDocument } from "../utils/printUtils.ts";

// تفتيت وحفظ الدور والملاحظات مدمجة لعدم كسر الهيكل الحالي لقاعدة البيانات
const parseFamilyRoleAndNotes = (combinedRole: string | null) => {
  if (!combinedRole) return { role: "", notes: "" };
  const parts = combinedRole.split(" | ");
  return {
    role: parts[0] || "",
    notes: parts[1] || "",
  };
};

// التحقق من صحة أرقام الهواتف (أرقام فقط وطول من 8 إلى 15 رقم)
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true;
  const clean = phone.replace(/\s+/g, ""); // إزالة الفراغات
  if (!/^\d+$/.test(clean)) return false;
  return clean.length >= 8 && clean.length <= 15;
};

const FamilyFilesModule: React.FC = () => {
  const [familyFiles, setFamilyFiles] = useState<FamilyFile[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fundingEntities, setFundingEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals / View States
  const [showAddFamilyFile, setShowAddFamilyFile] = useState(false);
  const [showAddFamilyMember, setShowAddFamilyMember] = useState(false);
  const [selectedFamilyFile, setSelectedFamilyFile] =
    useState<FamilyFile | null>(null);
  const [selectedFamilyFileForMember, setSelectedFamilyFileForMember] =
    useState<FamilyFile | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // States for adding/viewing medical history for family members
  const [patientProblems, setPatientProblems] = useState<any[]>([]);
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [selectedMemberForProblem, setSelectedMemberForProblem] = useState<
    any | null
  >(null);
  const [problemName, setProblemName] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [problemType, setProblemType] = useState("chronic");
  const [problemNotes, setProblemNotes] = useState("");

  // States for patient deaths (بيان الوفيات)
  const [patientDeaths, setPatientDeaths] = useState<any[]>([]);
  const [showAddDeathModal, setShowAddDeathModal] = useState(false);
  const [selectedMemberForDeath, setSelectedMemberForDeath] = useState<
    any | null
  >(null);
  const [deceasedName, setDeceasedName] = useState("");
  const [ageAtDeath, setAgeAtDeath] = useState<number>(0);
  const [deathDate, setDeathDate] = useState("");
  const [deathCode, setDeathCode] = useState("");
  const [deathNotes, setDeathNotes] = useState("");

  // States for housing conditions (بيان حالة المسكن)
  const [showEditHousingModal, setShowEditHousingModal] = useState(false);
  const [housingTotalRooms, setHousingTotalRooms] = useState<number>(0);
  const [housingSleepingRooms, setHousingSleepingRooms] = useState<number>(0);
  const [housingVentilation, setHousingVentilation] = useState<string>("good");
  const [housingWaterSource, setHousingWaterSource] =
    useState<string>("public");
  const [housingSewageSystem, setHousingSewageSystem] =
    useState<string>("sanitary");
  const [housingLightingType, setHousingLightingType] =
    useState<string>("electricity");
  const [housingHasAnimalsBirds, setHousingHasAnimalsBirds] =
    useState<boolean>(false);
  const [housingBarnLocation, setHousingBarnLocation] =
    useState<string>("none");

  // States for social search (البحث الاجتماعي)
  const [showEditSocialModal, setShowEditSocialModal] = useState(false);
  const [socialIncomeType, setSocialIncomeType] = useState<string>("fixed");
  const [socialMonthlyIncome, setSocialMonthlyIncome] = useState<number>(0);
  const [socialHasChronicDiseases, setSocialHasChronicDiseases] =
    useState<boolean>(false);
  const [socialHasDisabilities, setSocialHasDisabilities] =
    useState<boolean>(false);
  const [socialReceivesPension, setSocialReceivesPension] =
    useState<boolean>(false);
  const [socialBreadwinnerName, setSocialBreadwinnerName] =
    useState<string>("");
  const [socialEligibleForFreeService, setSocialEligibleForFreeService] =
    useState<boolean>(false);

  // States for History & Physical Exams & Timeline
  const [physicalExams, setPhysicalExams] = useState<any[]>([]);
  const [timelinePatient, setTimelinePatient] = useState<Patient | null>(null);

  // States for Visits Form
  const [patientVisits, setPatientVisits] = useState<any[]>([]);

  // States for Comprehensive Health Record
  const [fileViewMode, setFileViewMode] = useState<"continuous" | "single">("continuous");
  const [familyDetailTab, setFamilyDetailTab] = useState<
    "members" | "clinical" | "housing" | "social" | "deaths"
  >("members");
  const [clinicalModelTab, setClinicalModelTab] = useState<string>("history");
  const [showComprehensiveModal, setShowComprehensiveModal] = useState(false);
  const [comprehensiveModalPatient, setComprehensiveModalPatient] =
    useState<any | null>(null);
  const [comprehensiveInitialModule, setComprehensiveInitialModule] =
    useState<string>("history");
  const [selectedClinicalMemberId, setSelectedClinicalMemberId] =
    useState<string>("");

  const scrollToSection = (targetId: string) => {
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add(
          "ring-4",
          "ring-primary-500",
          "ring-offset-2",
          "transition-all",
          "duration-500"
        );
        setTimeout(() => {
          el.classList.remove("ring-4", "ring-primary-500", "ring-offset-2");
        }, 1800);
      }
    }, 60);
  };

  const openComprehensiveForMember = (member: any, initialModule: string = "history") => {
    const fullPatient =
      patients.find((p) => p.id === member.patient_id) ||
      member.patients || {
        id: member.patient_id,
        name: member.patients?.name || member.name,
        national_id: member.patients?.national_id || member.national_id,
        date_of_birth: member.patients?.date_of_birth || member.date_of_birth,
        gender: member.patients?.gender || member.gender,
      };
    setComprehensiveModalPatient(fullPatient);
    setComprehensiveInitialModule(initialModule);
    setClinicalModelTab(initialModule);
    setShowComprehensiveModal(true);
  };

  // Quick Clinic Booking state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [quickBookingPatient, setQuickBookingPatient] = useState<Patient | null>(null);
  const [quickBookingModule, setQuickBookingModule] = useState<any>(undefined);
  const [quickBookingReason, setQuickBookingReason] = useState<string>('');

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  const calculateAge = (dobString?: string): number | null => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateAgeAtDeath = (
    dobString?: string,
    deathDateString?: string,
  ) => {
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
      const [f, p, fe, probs, deaths, exams, visits, appts] = await Promise.all([
        DB.getFamilyFiles(),
        DB.getPatients(),
        DB.getFundingEntities(),
        DB.getPatientProblems(),
        DB.getPatientDeaths(),
        DB.getPhysicalExams(),
        DB.getPatientVisits(),
        DB.getClinicAppointments ? DB.getClinicAppointments() : Promise.resolve([])
      ]);
      setFamilyFiles(f);
      setPatients(p);
      setFundingEntities(fe);
      setPatientProblems(probs);
      setPatientDeaths(deaths);
      setPhysicalExams(exams);
      setPatientVisits(visits || []);
      setAppointments(appts || []);
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
        status: "active",
      });

      const probs = await DB.getPatientProblems();
      setPatientProblems(probs);

      setProblemName("");
      setOnsetDate("");
      setProblemNotes("");

      // Update selectedFamilyFile members so UI is in sync if needed (since familyFiles is also updated or selection is live)
      const updatedFiles = await DB.getFamilyFiles();
      setFamilyFiles(updatedFiles);
      if (selectedFamilyFile) {
        const updatedFile = updatedFiles.find(
          (f: any) => f.id === selectedFamilyFile.id,
        );
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
        const updatedFile = updatedFiles.find(
          (f: any) => f.id === selectedFamilyFile.id,
        );
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
        notes: deathNotes.trim() || null,
      };

      await DB.addPatientDeath(payload);

      setShowAddDeathModal(false);
      setSelectedMemberForDeath(null);
      setDeceasedName("");
      setAgeAtDeath(0);
      setDeathDate("");
      setDeathCode("");
      setDeathNotes("");

      await loadData();
      if (selectedFamilyFile) {
        const updatedFiles = await DB.getFamilyFiles();
        const updatedFile = updatedFiles.find(
          (f: any) => f.id === selectedFamilyFile.id,
        );
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
      alert("تم تسجيل حالة الوفاة بنجاح");
    } catch (err: any) {
      setFormError(err.message || "خطأ في تسجيل حالة الوفاة");
    }
  };

  const handleDeletePatientDeath = async (id: string) => {
    if (
      !window.confirm(
        "هل أنت متأكد من حذف حالة الوفاة هذه؟ سيتم استعادة العضو كفرد نشط.",
      )
    )
      return;
    try {
      await DB.deletePatientDeath(id);
      await loadData();
      if (selectedFamilyFile) {
        const updatedFiles = await DB.getFamilyFiles();
        const updatedFile = updatedFiles.find(
          (f: any) => f.id === selectedFamilyFile.id,
        );
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
        barn_location: housingBarnLocation,
      };

      await DB.updateFamilyFile(selectedFamilyFile.id, payload);
      setShowEditHousingModal(false);

      await loadData();
      const updatedFiles = await DB.getFamilyFiles();
      const updatedFile = updatedFiles.find(
        (f: any) => f.id === selectedFamilyFile.id,
      );
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
        eligible_for_free_service: socialEligibleForFreeService,
      };

      await DB.updateFamilyFile(selectedFamilyFile.id, payload);
      setShowEditSocialModal(false);

      await loadData();
      const updatedFiles = await DB.getFamilyFiles();
      const updatedFile = updatedFiles.find(
        (f: any) => f.id === selectedFamilyFile.id,
      );
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
      setFormError(
        "رقم الهاتف الأساسي غير صحيح. يجب أن يتكون من 8 إلى 15 رقماً.",
      );
      return;
    }
    if (workPhone && !validatePhoneNumber(workPhone)) {
      setFormError(
        "رقم تليفون العمل غير صحيح. يجب أن يتكون من 8 إلى 15 رقماً.",
      );
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
        house_number: target.house_number?.value?.trim() || null,
        family_number: target.family_number?.value?.trim() || null,
        phone: phone || null,
        home_number: workPhone || null, // تليفون العمل
        nearest_landmark: nearestPhone || null, // أقرب تليفون
        notes: target.notes.value.trim() || null,

        // Housing conditions (بيان حالة المسكن)
        total_rooms: target.total_rooms?.value
          ? Number(target.total_rooms.value)
          : null,
        sleeping_rooms: target.sleeping_rooms?.value
          ? Number(target.sleeping_rooms.value)
          : null,
        ventilation: target.ventilation?.value || "good",
        water_source: target.water_source?.value || "public",
        sewage_system: target.sewage_system?.value || "sanitary",
        lighting_type: target.lighting_type?.value || "electricity",
        has_animals_birds: target.has_animals_birds?.checked || false,
        barn_location: target.barn_location?.value || "none",

        // Social Search (البحث الاجتماعي)
        income_type: target.income_type?.value || "fixed",
        monthly_income: target.monthly_income?.value
          ? Number(target.monthly_income.value)
          : null,
        has_chronic_diseases: target.has_chronic_diseases?.checked || false,
        has_disabilities: target.has_disabilities?.checked || false,
        receives_pension: target.receives_pension?.checked || false,
        breadwinner_name: target.breadwinner_name?.value
          ? target.breadwinner_name.value.trim()
          : null,
        eligible_for_free_service:
          target.eligible_for_free_service?.checked || false,
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

    const individualNumber = target.family_individual_number?.value
      ? parseInt(target.family_individual_number.value, 10)
      : (selectedFamilyFileForMember.members?.length || 0) + 1;

    try {
      // 1. تحديث بيانات المريض في قاعدة البيانات لضمان دقة الاسم رباعي، النوع، تاريخ الميلاد، ونوع التأمين
      const { error: patientErr } = await supabase
        .from("patients")
        .update({
          name: memberName,
          gender: memberGender,
          date_of_birth: memberDob || null,
          funding_entity_id:
            memberInsurance && memberInsurance !== "cash"
              ? memberInsurance
              : null,
        })
        .eq("id", patientId);

      if (patientErr) throw patientErr;

      // 2. ربط المريض بالملف العائلي مع الرقم الفردي
      await DB.addFamilyMember({
        family_file_id: selectedFamilyFileForMember.id,
        patient_id: patientId,
        relationship_to_head: relationshipToHead,
        family_role: combinedRole || null,
        is_head: isHead,
        family_individual_number: individualNumber,
      });

      setShowAddFamilyMember(false);
      setSelectedFamilyFileForMember(null);
      setSelectedPatientId("");

      // Refresh family files to show the updated members
      const updatedFiles = await DB.getFamilyFiles();
      setFamilyFiles(updatedFiles);
      if (selectedFamilyFile) {
        const updatedFile = updatedFiles.find(
          (f: any) => f.id === selectedFamilyFile.id,
        );
        if (updatedFile) setSelectedFamilyFile(updatedFile);
      }
    } catch (err: any) {
      setFormError(err.message || "خطأ في إضافة فرد للأسرة");
    }
  };

  // Filtered family files based on search input
  const filteredFamilyFiles = familyFiles.filter((file) => {
    const searchLower = searchTerm.toLowerCase();
    const familyCode = (file.family_code || "").toLowerCase();
    const headName = (file.head_name || "").toLowerCase();
    const nationalId = (file.national_id || "").toLowerCase();
    const governorate = (file.governorate || "").toLowerCase();
    const administration = (file.administration || "").toLowerCase();
    const villageCity = (file.village_city || "").toLowerCase();
    const healthUnit = (file.health_unit || "").toLowerCase();

    return (
      familyCode.includes(searchLower) ||
      headName.includes(searchLower) ||
      nationalId.includes(searchLower) ||
      governorate.includes(searchLower) ||
      administration.includes(searchLower) ||
      villageCity.includes(searchLower) ||
      healthUnit.includes(searchLower)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="البحث برقم الملف، اسم رب العائلة، الرقم القومي، المحافظة، أو الوحدة..."
            className="w-full pr-10 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-bold placeholder-gray-400 transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                <h3 className="font-bold text-xl text-gray-800">
                  تفاصيل الملف العائلي: {selectedFamilyFile.family_code}
                </h3>
                <p className="text-xs text-gray-400">
                  تاريخ الإنشاء:{" "}
                  {new Date(
                    selectedFamilyFile.created_at || new Date(),
                  ).toLocaleDateString("ar-EG")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const membersList = selectedFamilyFile.members || [];
                  const familyMemberIds = membersList.map((m: any) => m.patient_id);
                  const deaths = patientDeaths.filter((d: any) => {
                    const isMember = familyMemberIds.includes(d.patient_id);
                    const headNameMatches =
                      d.notes &&
                      d.notes.includes(selectedFamilyFile.head_name || "---");
                    return isMember || headNameMatches;
                  });
                  const housing = {
                    total_rooms: selectedFamilyFile.total_rooms,
                    sleeping_rooms: selectedFamilyFile.sleeping_rooms,
                    ventilation_condition: selectedFamilyFile.ventilation,
                    water_source: selectedFamilyFile.water_source,
                    sanitation_type: selectedFamilyFile.sewage_system,
                    electricity_available: selectedFamilyFile.lighting_type !== "none",
                  };
                  const social = {
                    income_source: selectedFamilyFile.income_type,
                    monthly_income: selectedFamilyFile.monthly_income,
                    social_aid: selectedFamilyFile.receives_pension ? "مستفيد من معاش/دعم" : "غير مستفيد",
                    economic_status: selectedFamilyFile.eligible_for_free_service ? "مستحق للرعاية المجانية" : "عادي",
                  };
                  printFamilyFileFull(selectedFamilyFile, membersList, deaths, housing, social);
                }}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="طباعة الملف العائلي الشامل (معايير الاعتماد GAHAR)"
              >
                <Printer size={16} />
                <span>طباعة الملف العائلي</span>
              </button>
              <button
                onClick={() => setSelectedFamilyFile(null)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                اسم رب العائلة
              </span>
              <span className="font-bold text-gray-800 text-base">
                {selectedFamilyFile.head_name || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                الرقم القومي لرب العائلة
              </span>
              <span className="font-bold text-gray-800 text-base font-mono">
                {selectedFamilyFile.national_id || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                رقم الهاتف الأساسي
              </span>
              <span className="font-bold text-gray-800 flex items-center gap-1">
                <Phone size={14} className="text-gray-400" />{" "}
                {selectedFamilyFile.phone || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                تليفون العمل
              </span>
              <span className="font-bold text-gray-800 flex items-center gap-1">
                <Phone size={14} className="text-gray-400" />{" "}
                {selectedFamilyFile.home_number || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                أقرب تليفون
              </span>
              <span className="font-bold text-gray-800 flex items-center gap-1">
                <Phone size={14} className="text-gray-400" />{" "}
                {selectedFamilyFile.nearest_landmark || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                المحافظة
              </span>
              <span className="font-bold text-gray-800">
                {selectedFamilyFile.governorate || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                الإدارة الصحية
              </span>
              <span className="font-bold text-gray-800">
                {selectedFamilyFile.administration || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                القرية أو المدينة
              </span>
              <span className="font-bold text-gray-800">
                {selectedFamilyFile.village_city || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                الوحدة الصحية المسجل بها
              </span>
              <span className="font-bold text-primary-600 font-extrabold">
                {selectedFamilyFile.health_unit || "---"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                رقم المنزل (للطباعة)
              </span>
              <span className="font-mono font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200 inline-block">
                {selectedFamilyFile.house_number || "غير محدد (............)"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-bold block">
                رقم الأسرة (للطباعة)
              </span>
              <span className="font-mono font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200 inline-block">
                {selectedFamilyFile.family_number || "غير محدد (............)"}
              </span>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <span className="text-xs text-gray-400 font-bold block">
                العنوان بالتفصيل
              </span>
              <span className="font-bold text-gray-800 flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" />{" "}
                {selectedFamilyFile.address || "---"}
              </span>
            </div>
            {selectedFamilyFile.notes && (
              <div className="col-span-full pt-4 border-t border-gray-100 space-y-1">
                <span className="text-xs text-gray-400 font-bold block">
                  ملاحظات ديموغرافية واجتماعية
                </span>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-xl border">
                  {selectedFamilyFile.notes}
                </p>
              </div>
            )}
          </div>

          {/* إحصائيات ديموغرافية وسريعة لتركيب الأسرة وشجرة التنقل الموحدة */}
          {(() => {
            const membersList = selectedFamilyFile.members || [];
            const totalMembers = membersList.length;
            const maleCount = membersList.filter(
              (m: any) =>
                m.patients?.gender === "ذكر" || m.patients?.gender === "male",
            ).length;
            const femaleCount = membersList.filter(
              (m: any) =>
                m.patients?.gender === "أنثى" || m.patients?.gender === "female",
            ).length;
            const childCount = membersList.filter((m: any) => {
              const a = calculateAge(m.patients?.date_of_birth);
              return a !== null && a < 18;
            }).length;
            const elderlyCount = membersList.filter((m: any) => {
              const a = calculateAge(m.patients?.date_of_birth);
              return a !== null && a >= 60;
            }).length;
            const familyMemberIds = membersList.map((m: any) => m.patient_id);
            const familyDeaths = patientDeaths.filter((d: any) => {
              const isMember = familyMemberIds.includes(d.patient_id);
              const headNameMatches =
                d.notes &&
                d.notes.includes(selectedFamilyFile.head_name || "---");
              return isMember || headNameMatches;
            });

            const activeMember =
              membersList.find(
                (m: any) => m.patient_id === selectedClinicalMemberId,
              ) ||
              membersList.find((m: any) => m.is_head) ||
              membersList[0];
            const activePatient =
              (activeMember &&
                (patients.find((p) => p.id === activeMember.patient_id) ||
                  activeMember.patients)) ||
              null;
            const activeAge = activePatient
              ? calculateAge(activePatient.date_of_birth)
              : null;
            const activeGender = activePatient?.gender || "";
            const isFemale =
              activeGender === "أنثى" || activeGender === "female";
            const isChild = activeAge !== null && activeAge < 18;
            const isElderly = activeAge !== null && activeAge >= 60;
            const currentPatientId = activePatient?.id || (activeMember ? activeMember.patient_id : null);

            // حساب حالة اكتمال كل نموذج من النماذج العشرة للفرد المختار
            const hasHistory = currentPatientId
              ? physicalExams.some(e => e.patient_id === currentPatientId && (e.allergy || e.previous_operations || e.current_medications || e.family_history || e.surgical_history))
              : false;
            const hasSignificant = currentPatientId
              ? patientProblems.some(p => p.patient_id === currentPatientId)
              : false;
            const hasClinicalExam = currentPatientId
              ? physicalExams.some(e => e.patient_id === currentPatientId && (e.blood_pressure || e.pulse_rate || e.temperature || e.weight || e.height || e.heart_exam || e.chest_exam || e.abdomen_exam))
              : false;
            const hasVisits = currentPatientId
              ? (patientVisits || []).some((v: any) => v.patient_id === currentPatientId)
              : false;
            const hasChildHealth = currentPatientId
              ? (isChild && physicalExams.some(e => e.patient_id === currentPatientId))
              : false;
            const hasMaternal = currentPatientId
              ? (isFemale && appointments.some((a: any) => a.patient_id === currentPatientId && a.module === "maternal"))
              : false;
            const hasFamilyPlanning = currentPatientId
              ? (isFemale && appointments.some((a: any) => a.patient_id === currentPatientId && a.module === "family_planning"))
              : false;
            const hasPremarital = currentPatientId
              ? appointments.some((a: any) => a.patient_id === currentPatientId && a.module === "premarital")
              : false;
            const hasGeriatric = currentPatientId
              ? (isElderly && physicalExams.some(e => e.patient_id === currentPatientId))
              : false;
            const hasDental = currentPatientId
              ? appointments.some((a: any) => a.patient_id === currentPatientId && a.module === "dental")
              : false;

            const clinicalModulesStatusList: ClinicalModuleItem[] = [
              {
                id: "history",
                num: "١",
                title: "التاريخ المرضي والفحص الشامل",
                subTitle: "Medical History",
                icon: Shield,
                color: "purple",
                isCompleted: !!hasHistory,
              },
              {
                id: "significant",
                num: "٢",
                title: "صحيفة الأحداث الطبية الهامة",
                subTitle: "Significant Events",
                icon: ClipboardList,
                color: "amber",
                isCompleted: !!hasSignificant,
              },
              {
                id: "clinical",
                num: "٣",
                title: "الفحص السريري الشامل لطب الأسرة",
                subTitle: "Physical Exam",
                icon: Stethoscope,
                color: "indigo",
                isCompleted: !!hasClinicalExam,
              },
              {
                id: "visits",
                num: "٤",
                title: "سجل التردد والزيارات الطبية",
                subTitle: "Patient Visits",
                icon: CalendarCheck,
                color: "teal",
                isCompleted: !!hasVisits,
              },
              {
                id: "child",
                num: "٥",
                title: "رعاية صحة الطفل والتطعيمات",
                subTitle: "Child Health",
                icon: Baby,
                color: "emerald",
                isCompleted: !!hasChildHealth,
              },
              {
                id: "maternal",
                num: "٦",
                title: "متابعة رعاية الحوامل وصحة الأم",
                subTitle: "Maternal Care",
                icon: Heart,
                color: "rose",
                isCompleted: !!hasMaternal,
              },
              {
                id: "family_planning",
                num: "٧",
                title: "تنظيم الأسرة والصحة الإنجابية",
                subTitle: "Family Planning",
                icon: Users,
                color: "fuchsia",
                isCompleted: !!hasFamilyPlanning,
              },
              {
                id: "premarital",
                num: "٨",
                title: "فحص المقبلين على الزواج",
                subTitle: "Premarital Screening",
                icon: CheckCircle2,
                color: "cyan",
                isCompleted: !!hasPremarital,
              },
              {
                id: "geriatric",
                num: "٩",
                title: "الرعاية الصحية لكبار السن",
                subTitle: "Geriatric Care",
                icon: Award,
                color: "orange",
                isCompleted: !!hasGeriatric,
              },
              {
                id: "dental",
                num: "١٠",
                title: "طب وجراحة الفم والأسنان",
                subTitle: "Dental Health",
                icon: Smile,
                color: "blue",
                isCompleted: !!hasDental,
              },
            ];

            const completedClinicalCount = clinicalModulesStatusList.filter(
              (m) => m.isCompleted,
            ).length;

            return (
              <div className="space-y-6">
                {/* إحصائيات ديموغرافية وسريعة لتركيب الأسرة (صف مدمج ومضغوط أعلى الصفحة) */}
                <div className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-2xl flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap shadow-2xs">
                  <div className="flex items-center gap-2.5 pr-1">
                    <div className="w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black shrink-0 shadow-2xs">
                      <Users size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        إجمالي الأفراد
                      </span>
                      <span className="text-base font-black text-slate-900 font-mono leading-none">
                        {totalMembers}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0">
                      <User size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        الذكور
                      </span>
                      <span className="text-sm font-black text-blue-900 font-mono leading-none">
                        {maleCount}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center font-black shrink-0">
                      <Heart size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        الإناث
                      </span>
                      <span className="text-sm font-black text-pink-900 font-mono leading-none">
                        {femaleCount}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0">
                      <Baby size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        أطفال (&lt;18)
                      </span>
                      <span className="text-sm font-black text-amber-900 font-mono leading-none">
                        {childCount}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-black shrink-0">
                      <Award size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        كبار سن (≥60)
                      </span>
                      <span className="text-sm font-black text-purple-900 font-mono leading-none">
                        {elderlyCount}
                      </span>
                    </div>
                  </div>

                  <div className="h-7 w-[1px] bg-slate-200 hidden sm:block"></div>

                  <div className="flex items-center gap-2 pl-1">
                    <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-black shrink-0">
                      <ShieldAlert size={15} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        وفيات مسجلة
                      </span>
                      <span className="text-sm font-black text-red-900 font-mono leading-none">
                        {familyDeaths.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* تخطيط الأقسام وشجرة التنقل الرأسية الموحدة */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
                  {/* العمود الجانبي: شجرة التنقل الرأسية الموحدة (Vertical Accordion Tree) */}
                  <div className="lg:col-span-4 xl:col-span-3 sticky top-4 z-10">
                    <FamilyUnifiedNavigationTree
                      activeSection={familyDetailTab}
                      activeClinicalModule={clinicalModelTab}
                      onSelectSection={(sec) => {
                        setFamilyDetailTab(sec);
                        if (
                          sec === "clinical" &&
                          !selectedClinicalMemberId &&
                          selectedFamilyFile.members &&
                          selectedFamilyFile.members.length > 0
                        ) {
                          const headMember =
                            selectedFamilyFile.members.find((m: any) => m.is_head) ||
                            selectedFamilyFile.members[0];
                          setSelectedClinicalMemberId(headMember.patient_id);
                        }
                        if (fileViewMode === "continuous") {
                          scrollToSection(`section-${sec}`);
                        }
                      }}
                      onSelectClinicalModule={(modId) => {
                        setFamilyDetailTab("clinical");
                        setClinicalModelTab(modId);
                        if (
                          !selectedClinicalMemberId &&
                          selectedFamilyFile.members &&
                          selectedFamilyFile.members.length > 0
                        ) {
                          const headMember =
                            selectedFamilyFile.members.find((m: any) => m.is_head) ||
                            selectedFamilyFile.members[0];
                          setSelectedClinicalMemberId(headMember.patient_id);
                        }
                        if (fileViewMode === "continuous") {
                          scrollToSection(`section-clinical-${modId}`);
                        }
                      }}
                      membersCount={selectedFamilyFile.members?.length || 0}
                      hasHousingData={
                        !!(
                          selectedFamilyFile.housing_condition ||
                          selectedFamilyFile.total_rooms ||
                          selectedFamilyFile.water_source
                        )
                      }
                      hasSocialData={
                        !!(
                          selectedFamilyFile.monthly_income ||
                          selectedFamilyFile.income_nature ||
                          selectedFamilyFile.eligible_for_free_service !== undefined
                        )
                      }
                      deathsCount={familyDeaths.length}
                      clinicalModules={clinicalModulesStatusList}
                      completedModulesCount={completedClinicalCount}
                      totalModulesCount={10}
                      activeMemberName={activePatient?.name}
                      viewMode={fileViewMode}
                    />
                  </div>

                  {/* العمود الرئيسي: لوحة عرض محتوى القسم أو النموذج المختار */}
                  <div className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-6">

          {/* بيان حالة المسكن والبيئة السكنية */}
          {(fileViewMode === "continuous" || familyDetailTab === "housing") && (
            <div id="section-housing" className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl space-y-4 shadow-sm animate-in fade-in duration-300 scroll-mt-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <Home size={20} className="text-slate-600" />
                  بيان حالة المسكن والبيئة السكنية
                </h4>
                <button
                  onClick={() => {
                    setHousingTotalRooms(selectedFamilyFile.total_rooms || 0);
                    setHousingSleepingRooms(
                      selectedFamilyFile.sleeping_rooms || 0,
                    );
                    setHousingVentilation(
                      selectedFamilyFile.ventilation || "good",
                    );
                    setHousingWaterSource(
                      selectedFamilyFile.water_source || "public",
                    );
                    setHousingSewageSystem(
                      selectedFamilyFile.sewage_system || "sanitary",
                    );
                    setHousingLightingType(
                      selectedFamilyFile.lighting_type || "electricity",
                    );
                    setHousingHasAnimalsBirds(
                      !!selectedFamilyFile.has_animals_birds,
                    );
                    setHousingBarnLocation(
                      selectedFamilyFile.barn_location || "none",
                    );
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
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    عدد الحجرات بالمنزل
                  </span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    الكلية: {selectedFamilyFile.total_rooms ?? "---"} | للنوم:{" "}
                    {selectedFamilyFile.sleeping_rooms ?? "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Wind size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    حالة التهوية
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.ventilation === "good" ? "text-emerald-600" : selectedFamilyFile.ventilation === "poor" ? "text-red-500" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.ventilation === "good"
                      ? "جيدة"
                      : selectedFamilyFile.ventilation === "poor"
                        ? "غير جيدة"
                        : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Droplet size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    مصدر المياه
                  </span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.water_source === "public"
                      ? "عام (شبكة عمومية)"
                      : selectedFamilyFile.water_source === "other"
                        ? "أخرى"
                        : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Activity size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    الصرف الصحي
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.sewage_system === "sanitary" ? "text-emerald-600" : selectedFamilyFile.sewage_system === "trench" ? "text-amber-600" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.sewage_system === "sanitary"
                      ? "صحي"
                      : selectedFamilyFile.sewage_system === "trench"
                        ? "طرنش (غير صحي)"
                        : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Zap size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    نوع الإضاءة
                  </span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.lighting_type === "electricity"
                      ? "كهرباء"
                      : selectedFamilyFile.lighting_type === "other"
                        ? "أخرى"
                        : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    طيور أو حيوانات بالمنزل
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.has_animals_birds ? "text-amber-600" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.has_animals_birds
                      ? "يوجد بالمنزل"
                      : "لا يوجد"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-100 flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                  <Home size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    مكان الحظيرة
                  </span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    {selectedFamilyFile.barn_location === "inside"
                      ? "بالمنزل"
                      : selectedFamilyFile.barn_location === "outside"
                        ? "بالخارج"
                        : selectedFamilyFile.barn_location === "none"
                          ? "لا يوجد حظيرة"
                          : "---"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* بيان البحث الاجتماعي والتمكين */}
        {(fileViewMode === "continuous" || familyDetailTab === "social") && (
          <div id="section-social" className="bg-sky-50/50 border border-sky-100 p-6 rounded-3xl space-y-4 shadow-sm animate-in fade-in duration-300 scroll-mt-6">
            <div className="flex justify-between items-center pb-3 border-b border-sky-100">
              <h4 className="font-bold text-lg text-sky-900 flex items-center gap-2">
                <Users size={20} className="text-sky-700" />
                بيان البحث الاجتماعي والتمكين الأسري
              </h4>
              <button
                onClick={() => {
                  setSocialIncomeType(
                    selectedFamilyFile.income_type || "fixed",
                  );
                  setSocialMonthlyIncome(
                    selectedFamilyFile.monthly_income || 0,
                  );
                  setSocialHasChronicDiseases(
                    !!selectedFamilyFile.has_chronic_diseases,
                  );
                  setSocialHasDisabilities(
                    !!selectedFamilyFile.has_disabilities,
                  );
                  setSocialReceivesPension(
                    !!selectedFamilyFile.receives_pension,
                  );
                  setSocialBreadwinnerName(
                    selectedFamilyFile.breadwinner_name || "",
                  );
                  setSocialEligibleForFreeService(
                    !!selectedFamilyFile.eligible_for_free_service,
                  );
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
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    طبيعة دخل الأسرة
                  </span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.income_type === "fixed"
                      ? "ثابت"
                      : selectedFamilyFile.income_type === "variable"
                        ? "متغير"
                        : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <span className="font-bold text-xs font-mono">EGP</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    متوسط الدخل الشهري
                  </span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.monthly_income != null
                      ? `${selectedFamilyFile.monthly_income.toLocaleString("ar-EG")} ج.م`
                      : "---"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <HeartPulse size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    وجود أمراض مزمنة
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.has_chronic_diseases ? "text-amber-600" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.has_chronic_diseases
                      ? "يوجد أمراض مزمنة"
                      : "لا يوجد"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    وجود حالات إعاقة
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.has_disabilities ? "text-red-500" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.has_disabilities
                      ? "يوجد حالات إعاقة"
                      : "لا يوجد"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    الحصول على معاش
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.receives_pension ? "text-emerald-600" : "text-gray-500"}`}
                  >
                    {selectedFamilyFile.receives_pension
                      ? "نعم (تحصل على معاش)"
                      : "لا (لا تحصل)"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <Plus size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    استحقاق الخدمة المجانية
                  </span>
                  <span
                    className={`font-extrabold text-sm ${selectedFamilyFile.eligible_for_free_service ? "text-emerald-600" : "text-gray-400"}`}
                  >
                    {selectedFamilyFile.eligible_for_free_service
                      ? "تستحق الخدمة المجانية"
                      : "غير مستحقة"}
                  </span>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-sky-100/50 flex items-center gap-3 md:col-span-2">
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-bold block mb-0.5">
                    العائل البديل (عند وفاة الأب)
                  </span>
                  <span className="font-extrabold text-sky-950 text-sm">
                    {selectedFamilyFile.breadwinner_name || "---"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* سجل أفراد الأسرة */}
        {(fileViewMode === "continuous" || familyDetailTab === "members") && (
          <div id="section-members" className="space-y-4 animate-in fade-in duration-300 scroll-mt-6">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <Users size={20} className="text-primary-600" /> أفراد العائلة
                المسجلين بالملف ({selectedFamilyFile.members?.length || 0})
              </h4>
              <button
                onClick={() => {
                  setSelectedFamilyFileForMember(selectedFamilyFile);
                  setFormError(null);
                  setShowAddFamilyMember(true);
                }}
                className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all border border-primary-100 cursor-pointer"
              >
                <Plus size={16} /> إضافة فرد للملف
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-100 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-right border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs">
                    <th className="p-4 text-center">الرقم الفردي</th>
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
                    <th className="p-4">نموذج الفحص الشامل</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
                  {selectedFamilyFile.members &&
                  selectedFamilyFile.members.length > 0 ? (
                    selectedFamilyFile.members.map(
                      (member: any, memberIdx: number) => {
                        const parsed = parseFamilyRoleAndNotes(
                          member.family_role,
                        );
                        const insuranceName = member.patients?.funding_entity_id
                          ? fundingEntities.find(
                              (fe) =>
                                fe.id === member.patients.funding_entity_id,
                            )?.name || "متعاقد"
                          : "نقدي (بدون تأمين)";
                        const memberProblems = patientProblems.filter(
                          (p) => p.patient_id === member.patient_id,
                        );
                        const memberExams = physicalExams.filter(
                          (e) => e.patient_id === member.patient_id,
                        );
                        const isDeceased = patientDeaths.some(
                          (d) => d.patient_id === member.patient_id,
                        );

                        const fullPatient =
                          patients.find((p) => p.id === member.patient_id) ||
                          member.patients || {
                            id: member.patient_id,
                            name: member.patients?.name,
                            national_id: member.patients?.national_id,
                            date_of_birth: member.patients?.date_of_birth,
                            gender: member.patients?.gender,
                          };

                        const memberSuggestions = calculatePatientSuggestedFollowups(fullPatient, { appointments });

                        return (
                          <tr
                            key={member.id}
                            className={`hover:bg-gray-50/50 ${isDeceased ? "bg-gray-50/30" : ""}`}
                          >
                            <td className="p-4 text-center">
                              <span className="px-2.5 py-1 bg-primary-50 text-primary-700 font-mono font-black text-xs rounded-lg border border-primary-100 shadow-xs">
                                {member.family_individual_number ??
                                  memberIdx + 1}
                              </span>
                            </td>
                            <td className="p-4">
                            <div className="flex flex-col items-start gap-1">
                              <button
                                onClick={() => {
                                  setTimelinePatient(fullPatient);
                                }}
                                className="text-right group flex items-center gap-1.5 hover:underline cursor-pointer"
                                title="اضغط لفتح الملف الطبي الكامل للمريض"
                              >
                                <User
                                  size={15}
                                  className="text-primary-600 shrink-0 group-hover:scale-110 transition-transform"
                                />
                                <span
                                  className={`font-black text-sm ${isDeceased ? "text-gray-400 line-through" : "text-primary-700 group-hover:text-primary-900"}`}
                                >
                                  {member.patients?.name || "---"}
                                </span>
                                <ExternalLink
                                  size={12}
                                  className="text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                              </button>

                              {/* شارة التنبيه بالاقتراحات السريرية المستحقة لفرد الأسرة */}
                              {memberSuggestions.length > 0 && !isDeceased && (
                                <div className="flex flex-col gap-1 items-start mt-0.5">
                                  {memberSuggestions.map((s) => {
                                    const tabMap: Record<string, string> = {
                                      child_followup: "child",
                                      maternal_care: "maternal",
                                      family_planning: "family_planning",
                                      geriatric_care: "geriatric",
                                      dental: "dental",
                                      premarital: "premarital",
                                    };
                                    const targetTab = tabMap[s.module_type] || "history";

                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => {
                                          setQuickBookingPatient(fullPatient);
                                          setQuickBookingModule(targetTab);
                                          setQuickBookingReason(s.reason);
                                        }}
                                        className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border transition-all cursor-pointer shadow-xs ${
                                          s.urgency === "high"
                                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse"
                                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                        }`}
                                        title={`${s.reason} - اضغط لحجز العيادة المقترحة فوراً`}
                                      >
                                        <AlertCircle
                                          size={10}
                                          className={
                                            s.urgency === "high"
                                              ? "text-rose-600"
                                              : "text-amber-600"
                                          }
                                        />
                                        <span>{s.title}</span>
                                        <CalendarCheck
                                          size={10}
                                          className="mr-0.5 opacity-80"
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {isDeceased && (
                                <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md w-fit">
                                  <span>متوفى</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-gray-600">
                            {member.patients?.national_id || "---"}
                          </td>
                          <td className="p-4">
                            {member.patients?.gender ? (
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                  member.patients.gender === "ذكر"
                                    ? "bg-blue-50 text-blue-700 border border-blue-100"
                                    : "bg-pink-50 text-pink-700 border border-pink-100"
                                }`}
                              >
                                {member.patients.gender}
                              </span>
                            ) : (
                              <span className="text-gray-400">---</span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-gray-600">
                            {member.patients?.date_of_birth
                              ? new Date(
                                  member.patients.date_of_birth,
                                ).toLocaleDateString("ar-EG")
                              : "---"}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-xs font-bold border border-purple-100">
                              {insuranceName}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold border border-gray-200">
                              {member.relationship_to_head || "---"}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {parsed.role || "---"}
                          </td>
                          <td
                            className="p-4 text-gray-500 font-normal max-w-[200px] truncate"
                            title={parsed.notes}
                          >
                            {parsed.notes || "---"}
                          </td>
                          <td className="p-4 text-center">
                            {member.is_head ? (
                              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100 inline-block">
                                نعم (رب الأسرة)
                              </span>
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
                                    title={`تاريخ الاكتشاف: ${prob.onset_date || "غير محدد"} | ملاحظات: ${prob.notes || "لا يوجد"}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-bold"
                                  >
                                    <HeartPulse
                                      size={12}
                                      className="shrink-0"
                                    />
                                    <span>{prob.problem_name}</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs font-normal">
                                  سليم / لا يوجد
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5 min-w-[210px]">
                              {memberExams.length > 0 ? (
                                memberExams.map((exam: any) => (
                                  <div
                                    key={exam.id}
                                    className="p-2 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-black text-purple-900">
                                      <span className="flex items-center gap-1">
                                        <FileText
                                          size={12}
                                          className="text-purple-600"
                                        />
                                        <span>فحص بتاريخ:</span>
                                      </span>
                                      <span className="font-mono text-[10px]">
                                        {new Date(
                                          exam.exam_date || exam.created_at,
                                        ).toLocaleDateString("ar-EG")}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 pt-1 border-t border-purple-100/60 text-[10px]">
                                      <button
                                        onClick={() => openComprehensiveForMember(member, "history")}
                                        className="px-1.5 py-1 bg-white hover:bg-purple-600 hover:text-white text-purple-800 rounded-md font-bold border border-purple-200 text-center transition-all"
                                      >
                                        التاريخ المرضي
                                      </button>
                                      <button
                                        onClick={() => openComprehensiveForMember(member, "significant")}
                                        className="px-1.5 py-1 bg-white hover:bg-amber-600 hover:text-white text-amber-800 rounded-md font-bold border border-amber-200 text-center transition-all"
                                      >
                                        الأحداث الهامة
                                      </button>
                                      <button
                                        onClick={() => openComprehensiveForMember(member, "clinical")}
                                        className="px-1.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-800 rounded-md font-bold border border-indigo-200 text-center transition-all"
                                      >
                                        الفحص الإكلينيكي
                                      </button>
                                      <button
                                        onClick={() => openComprehensiveForMember(member, "history")}
                                        className="px-1.5 py-1 bg-purple-700 text-white rounded-md font-bold text-center transition-all"
                                      >
                                        الملف الشامل
                                      </button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-gray-400 text-xs italic">
                                  لا توجد فحوصات مسجلة
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {!isDeceased ? (
                              <div className="flex flex-wrap items-center justify-center gap-1.5 min-w-[280px]">
                                <button
                                  onClick={() => openComprehensiveForMember(member, "history")}
                                  className="px-2.5 py-1 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg text-xs font-black transition-all shadow-sm flex items-center gap-1 shrink-0 cursor-pointer"
                                  title="فتح وتوثيق الملف الصحي العائلي الشامل"
                                >
                                  <Activity
                                    size={12}
                                    className="text-purple-200"
                                  />
                                  الملف الشامل
                                </button>

                                <button
                                  onClick={() => openComprehensiveForMember(member, "history")}
                                  className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-purple-200 flex items-center gap-1 shrink-0"
                                  title="التاريخ المرضي والوراثي"
                                >
                                  <Shield size={12} />
                                  التاريخ المرضي
                                </button>

                                <button
                                  onClick={() => openComprehensiveForMember(member, "significant")}
                                  className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-amber-200 flex items-center gap-1 shrink-0"
                                  title="الأحداث الطبية الهامة"
                                >
                                  <ClipboardList size={12} />
                                  الأحداث الهامة
                                </button>

                                <button
                                  onClick={() => openComprehensiveForMember(member, "clinical")}
                                  className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-indigo-200 flex items-center gap-1 shrink-0"
                                  title="الفحص الإكلينيكي والبدني"
                                >
                                  <Activity size={12} />
                                  الفحص الإكلينيكي
                                </button>

                                <button
                                  onClick={() => openComprehensiveForMember(member, "visits")}
                                  className="px-2 py-1 bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-teal-200 flex items-center gap-1 shrink-0"
                                  title="سجل الزيارات والتردد"
                                >
                                  <FileText size={12} />
                                  سجل الزيارات
                                </button>

                                <button
                                  onClick={() => {
                                    const fullPatient = patients.find(
                                      (p) => p.id === member.patient_id,
                                    ) ||
                                      member.patients || {
                                        id: member.patient_id,
                                        name: member.patients?.name,
                                        national_id:
                                          member.patients?.national_id,
                                        date_of_birth:
                                          member.patients?.date_of_birth,
                                      };
                                    setTimelinePatient(fullPatient);
                                  }}
                                  className="px-2 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-emerald-200 flex items-center gap-1 shrink-0"
                                  title="فتح ملف المريض والتايم لاين الكامل"
                                >
                                  <User size={12} />
                                  الملف الكامل
                                </button>

                                <button
                                  onClick={() => {
                                    setSelectedMemberForDeath(member);
                                    setDeceasedName(
                                      member.patients?.name || "",
                                    );
                                    const birthDate =
                                      member.patients?.date_of_birth;
                                    const calculated = birthDate
                                      ? calculateAgeAtDeath(
                                          birthDate,
                                          new Date()
                                            .toISOString()
                                            .split("T")[0],
                                        )
                                      : 0;
                                    setAgeAtDeath(calculated);
                                    setDeathDate(
                                      new Date().toISOString().split("T")[0],
                                    );
                                    setDeathCode("");
                                    setDeathNotes("");
                                    setShowAddDeathModal(true);
                                  }}
                                  className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 flex items-center gap-1 shrink-0"
                                >
                                  <ShieldAlert size={12} />
                                  وفاة
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs font-normal">
                                تم الوفاة
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={13}
                        className="p-12 text-center text-gray-400 font-bold"
                      >
                        <Users
                          size={32}
                          className="mx-auto text-gray-300 mb-2"
                        />
                        لا يوجد أفراد مسجلين في هذا الملف حالياً. اضغط على
                        "إضافة فرد" لربط أفراد العائلة بالملف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* موديولات الملف الصحي الشامل المعتمدة (10 أقسام إكلينيكية) */}
        {(fileViewMode === "continuous" || familyDetailTab === "clinical") && (
          <div id="section-clinical" className="space-y-8 animate-in fade-in duration-300 scroll-mt-6">
            {/* محدد أفراد الأسرة لاختيار المريض المراد توثيق ملفه */}
            {(() => {
              const membersList = selectedFamilyFile.members || [];
              const activeMember =
                membersList.find(
                  (m: any) => m.patient_id === selectedClinicalMemberId,
                ) ||
                membersList.find((m: any) => m.is_head) ||
                membersList[0];
              const activePatient =
                (activeMember &&
                  (patients.find((p) => p.id === activeMember.patient_id) ||
                    activeMember.patients)) ||
                null;
              const activeAge = activePatient
                ? calculateAge(activePatient.date_of_birth)
                : null;
              const activeGender = activePatient?.gender || "";
              const isFemale =
                activeGender === "أنثى" || activeGender === "female";
              const isChild = activeAge !== null && activeAge < 18;
              const isElderly = activeAge !== null && activeAge >= 60;
              const isReproductiveFemale =
                isFemale &&
                activeAge !== null &&
                activeAge >= 15 &&
                activeAge <= 49;

              const accreditationModulesList = [
                {
                  id: "history",
                  num: "١",
                  title: "نموذج التاريخ المرضي والفحص الشامل",
                  sub: "Comprehensive Medical History & Physical Exam",
                  icon: Shield,
                  color: "purple",
                  bgClass: "from-purple-500/10 to-purple-600/5",
                  borderClass: "border-purple-200",
                  textClass: "text-purple-700",
                  btnClass: "bg-purple-600 hover:bg-purple-700 text-white",
                  badge: "متاح لجميع الأعمار",
                  eligible: true,
                  desc: "الحساسية، الأمراض المزمنة، العمليات، العادات الشخصية، والتاريخ الدوائي.",
                },
                {
                  id: "significant",
                  num: "٢",
                  title: "صحيفة وسجل الأحداث الطبية الهامة",
                  sub: "Significant Medical Events Sheet",
                  icon: ClipboardList,
                  color: "amber",
                  bgClass: "from-amber-500/10 to-amber-600/5",
                  borderClass: "border-amber-200",
                  textClass: "text-amber-700",
                  btnClass: "bg-amber-600 hover:bg-amber-700 text-white",
                  badge: "متاح لجميع الأعمار",
                  eligible: true,
                  desc: "الأزمات الحادة، دخول المستشفيات، العمليات الكبرى، ومضاعفات العلاج.",
                },
                {
                  id: "clinical",
                  num: "٣",
                  title: "الفحص الإكلينيكي السريري والعلامات الحيوية",
                  sub: "Clinical Findings & Vital Signs Assessment",
                  icon: Activity,
                  color: "indigo",
                  bgClass: "from-indigo-500/10 to-indigo-600/5",
                  borderClass: "border-indigo-200",
                  textClass: "text-indigo-700",
                  btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
                  badge: "متاح لجميع الأعمار",
                  eligible: true,
                  desc: "فحص أجهزة الجسم، الضغط، النبض، السكر، ومؤشر كتلة الجسم (BMI).",
                },
                {
                  id: "visits",
                  num: "٤",
                  title: "نموذج التردد والزيارات الطبية",
                  sub: "Visits & Consultations Register Form",
                  icon: FileText,
                  color: "teal",
                  bgClass: "from-teal-500/10 to-teal-600/5",
                  borderClass: "border-teal-200",
                  textClass: "text-teal-700",
                  btnClass: "bg-teal-600 hover:bg-teal-700 text-white",
                  badge: "متاح لجميع الأعمار",
                  eligible: true,
                  desc: "سجل الاستشارات، الشكوى، التشخيص الطبي، والخطة العلاجية الدورية.",
                },
                {
                  id: "child",
                  num: "٥",
                  title: "صحة ورعاية الطفل ومنحنيات النمو والتطعيمات",
                  sub: "Child Health, Growth Charts & Vaccinations",
                  icon: Baby,
                  color: "emerald",
                  bgClass: "from-emerald-500/10 to-emerald-600/5",
                  borderClass: "border-emerald-200",
                  textClass: "text-emerald-700",
                  btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
                  badge: isChild
                    ? "متاح (طفل دون 18 سنة)"
                    : "خاص بالأطفال دون 18 سنة",
                  eligible: isChild,
                  desc: "متابعة النمو (Under 5 & Over 5)، الوزن، الطول، وجدول التطعيمات.",
                },
                {
                  id: "maternal",
                  num: "٦",
                  title: "رعاية الأمومة ومتابعة الحمل والنفاس",
                  sub: "Maternal Health, Antenatal Care (ANC) & Postnatal",
                  icon: Heart,
                  color: "rose",
                  bgClass: "from-rose-500/10 to-rose-600/5",
                  borderClass: "border-rose-200",
                  textClass: "text-rose-700",
                  btnClass: "bg-rose-600 hover:bg-rose-700 text-white",
                  badge: isFemale ? "متاح (إناث)" : "خاص بالسيدات",
                  eligible: isFemale,
                  desc: "رعاية الحوامل (ANC)، قياسات الحمل، رعاية ما بعد الولادة، وفحص حديثي الولادة.",
                },
                {
                  id: "family_planning",
                  num: "٧",
                  title: "تنظيم الأسرة والصحة الإنجابية",
                  sub: "Family Planning & Reproductive Health",
                  icon: Users,
                  color: "fuchsia",
                  bgClass: "from-fuchsia-500/10 to-fuchsia-600/5",
                  borderClass: "border-fuchsia-200",
                  textClass: "text-fuchsia-700",
                  btnClass: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
                  badge: isReproductiveFemale
                    ? "متاح (إناث 15-49)"
                    : "خاص بالسيدات (15-49)",
                  eligible: isFemale,
                  desc: "استشارات ووسائل تنظيم الأسرة، المتابعة، والفحص الإنجابي الشامل.",
                },
                {
                  id: "premarital",
                  num: "٨",
                  title: "الفحص الطبي الشامل للمقبلين على الزواج",
                  sub: "Premarital Screening & Genetic Counseling",
                  icon: CheckCircle2,
                  color: "cyan",
                  bgClass: "from-cyan-500/10 to-cyan-600/5",
                  borderClass: "border-cyan-200",
                  textClass: "text-cyan-700",
                  btnClass: "bg-cyan-600 hover:bg-cyan-700 text-white",
                  badge: "متاح للبالغين",
                  eligible: true,
                  desc: "فحص الأمراض الوراثية والمعدية، التوافق الزواجي، والتثقيف الصحي.",
                },
                {
                  id: "geriatric",
                  num: "٩",
                  title: "الرعاية الصحية الشاملة لكبار السن",
                  sub: "Comprehensive Geriatric Health Assessment",
                  icon: Award,
                  color: "orange",
                  bgClass: "from-orange-500/10 to-orange-600/5",
                  borderClass: "border-orange-200",
                  textClass: "text-orange-700",
                  btnClass: "bg-orange-600 hover:bg-orange-700 text-white",
                  badge: isElderly
                    ? "متاح (كبار السن ≥ 60 سنة)"
                    : "خاص بكبار السن (≥ 60 سنة)",
                  eligible: isElderly,
                  desc: "تقييم الوظائف الإدراكية، النشاط اليومي (ADL)، مخاطر السقوط، ورعاية الشيخوخة.",
                },
                {
                  id: "dental",
                  num: "١٠",
                  title: "طب وجراحة الفم والأسنان",
                  sub: "Dental & Oral Health Examination",
                  icon: Smile,
                  color: "blue",
                  bgClass: "from-blue-500/10 to-blue-600/5",
                  borderClass: "border-blue-200",
                  textClass: "text-blue-700",
                  btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
                  badge: "متاح لجميع الأعمار",
                  eligible: true,
                  desc: "فحص اللثة والأسنان، مؤشر التسوس (DMFT)، خطط العلاج والتوعية الوقائية.",
                },
              ];

              const currentMod =
                accreditationModulesList.find((m) => m.id === clinicalModelTab) ||
                accreditationModulesList[0];
              const CurrentModIcon = currentMod.icon;

              return (
                <div className="space-y-6">
                  {/* شريط اختيار أفراد العائلة */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                        <Users size={16} className="text-primary-600" />
                        اختر فرد العائلة لتوثيق وتعديل أقسام ملفه الصحي المعتمد:
                      </span>
                      {activePatient && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 font-bold">
                            الفرد المحدد:
                          </span>
                          <span className="font-black text-primary-900 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                            {activePatient.name} ({activeGender || "---"}
                            {activeAge !== null ? ` - ${activeAge} سنة` : ""})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {membersList.map((m: any, idx: number) => {
                        const mPatient =
                          patients.find((p) => p.id === m.patient_id) ||
                          m.patients;
                        const mAge = mPatient
                          ? calculateAge(mPatient.date_of_birth)
                          : null;
                        const isSelected =
                          activeMember &&
                          activeMember.patient_id === m.patient_id;
                        const isDeceased = patientDeaths.some(
                          (d) => d.patient_id === m.patient_id,
                        );

                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() =>
                              setSelectedClinicalMemberId(m.patient_id)
                            }
                            className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-purple-700 shadow-md shadow-purple-100"
                                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[11px] ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-white text-primary-700 border border-gray-200"
                              }`}
                            >
                              {m.family_individual_number ?? idx + 1}
                            </span>
                            <span
                              className={`${isDeceased ? "line-through opacity-70" : ""}`}
                            >
                              {mPatient?.name || "مريض بدون اسم"}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {m.relationship_to_head || "فرد"}
                            </span>
                            {mAge !== null && (
                              <span
                                className={`text-[10px] font-mono ${
                                  isSelected
                                    ? "text-purple-200"
                                    : "text-gray-400"
                                }`}
                              >
                                {mAge} سنة
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* بطاقة النموذج المعتمد للفرد المحدد */}
                  {fileViewMode === "single" ? (
                    activePatient ? (
                      <div
                        className={`p-6 rounded-3xl border ${currentMod.borderClass} bg-gradient-to-br ${currentMod.bgClass} bg-white shadow-sm space-y-4`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`w-12 h-12 rounded-2xl ${currentMod.btnClass} flex items-center justify-center font-black shadow-md shrink-0`}
                            >
                              <CurrentModIcon size={24} />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-black text-base md:text-lg text-gray-900">
                                  {currentMod.title}
                                </h4>
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    currentMod.eligible
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-gray-100 text-gray-600 border border-gray-200"
                                  }`}
                                >
                                  {currentMod.badge}
                                </span>
                                <span className="text-xs text-gray-400 font-mono font-bold">
                                  [{currentMod.sub}]
                                </span>
                              </div>
                              <p className="text-xs text-gray-700 font-medium leading-relaxed max-w-3xl">
                                {currentMod.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setComprehensiveModalPatient(activePatient);
                                setComprehensiveInitialModule(currentMod.id);
                                setShowComprehensiveModal(true);
                              }}
                              className={`py-2.5 px-4 ${currentMod.btnClass} rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer`}
                            >
                              <Activity size={16} />
                              <span>فتح وتوثيق السجل في الملف الشامل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setQuickBookingPatient(activePatient);
                                setQuickBookingModule(currentMod.id as any);
                                setQuickBookingReason(
                                  `متابعة وفحص (${currentMod.title}) بالملف العائلي`,
                                );
                              }}
                              className="py-2.5 px-3.5 bg-white hover:bg-gray-50 text-gray-800 rounded-xl font-black text-xs flex items-center gap-2 transition-all border border-gray-300 shadow-xs cursor-pointer"
                            >
                              <CalendarCheck
                                size={16}
                                className="text-primary-600"
                              />
                              <span>حجز موعد عيادة سريعة</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-gray-50 rounded-3xl border border-gray-200">
                        <p className="text-sm font-bold text-gray-500">
                          الرجاء اختيار فرد من الأسرة لعرض وتوثيق سجلاته الصحية
                          في هذا النموذج.
                        </p>
                      </div>
                    )
                  ) : (
                    activePatient ? (
                      <div className="p-5 rounded-3xl border border-purple-200/80 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                            <Activity size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-base text-gray-900">
                                الملف الصحي الشامل لـ: <span className="text-purple-700 font-black">{activePatient.name}</span>
                              </h4>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                {activeMember?.relationship_to_head || "فرد أسرة"}
                              </span>
                              {activeAge !== null && (
                                <span className="text-xs font-mono font-bold text-gray-500">
                                  {activeAge} سنة
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              تُعرض أدناه جميع النماذج السريرية الـ 10 الخاصة بالأسرة وفردها المحدد. اضغط على أي نموذج في القائمة الجانبية للتمرير الفوري إليه مباشرة.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setComprehensiveModalPatient(activePatient);
                              setComprehensiveInitialModule(clinicalModelTab || "history");
                              setShowComprehensiveModal(true);
                            }}
                            className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            <Activity size={15} />
                            <span>فتح وتوثيق ملف {activePatient.name} الشامل</span>
                          </button>
                        </div>
                      </div>
                    ) : null
                  )}

                  {/* عنوان جدول وسجلات النموذج النشط */}
                  {fileViewMode === "single" && (
                    <div className="pt-2 border-t border-gray-200/80">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-base text-gray-800 flex items-center gap-2">
                          <FileSpreadsheet
                            size={18}
                            className="text-purple-600"
                          />
                          بيانات وجدول السجلات الطبية لنموذج ({currentMod.title})
                        </h4>
                        <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                          النموذج المعروض: {currentMod.title}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ---------------- 1. جدول موديول التاريخ المرضي والصحي ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "history") && (
              <div id="section-clinical-history" className="bg-white border border-purple-100 rounded-3xl overflow-hidden shadow-sm space-y-3 scroll-mt-6">
              <div className="p-4 bg-gradient-to-r from-purple-50 via-white to-purple-50/30 border-b border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-purple-200">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-base text-purple-950">
                      سجل التاريخ المرضي والوراثي
                    </h5>
                    <span className="text-[11px] font-bold text-purple-700">
                      Medical History Module Results
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black bg-purple-100 text-purple-800 px-3 py-1 rounded-full border border-purple-200">
                  التاريخ المرضي
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-purple-50/50 text-purple-900 font-black text-xs border-b border-purple-100">
                      <th className="p-3.5">اسم المريض (اضغط لفتح الملف)</th>
                      <th className="p-3.5">صلة القرابة</th>
                      <th className="p-3.5">تاريخ الفحص</th>
                      <th className="p-3.5">
                        العمليات السابقة والأدوية الحالية
                      </th>
                      <th className="p-3.5">الحساسية والآثار العكسية</th>
                      <th className="p-3.5">التاريخ العائلي والعادات</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                    {(() => {
                      const familyMemberIds = (
                        selectedFamilyFile.members || []
                      ).map((m: any) => m.patient_id);
                      const familyExams = physicalExams.filter((e) =>
                        familyMemberIds.includes(e.patient_id),
                      );

                      if (familyExams.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-8 text-center text-gray-400 font-bold italic"
                            >
                              لا توجد فحوصات أو سجلات تاريخ مرضي مسجلة لأفراد
                              هذه العائلة بعد.
                            </td>
                          </tr>
                        );
                      }

                      return familyExams.map((exam: any) => {
                        const member = (selectedFamilyFile.members || []).find(
                          (m: any) => m.patient_id === exam.patient_id,
                        );
                        const patientName =
                          member?.patients?.name || "مريض بالعائلة";
                        const relation =
                          member?.relationship_to_head || "عضو الأسرة";
                        const fullPatientObj = patients.find(
                          (p) => p.id === exam.patient_id,
                        ) ||
                          member?.patients || {
                            id: exam.patient_id,
                            name: patientName,
                          };

                        return (
                          <tr
                            key={exam.id}
                            className="hover:bg-purple-50/30 transition-colors"
                          >
                            <td className="p-3.5">
                              <button
                                onClick={() =>
                                  setTimelinePatient(fullPatientObj)
                                }
                                className="group text-right flex items-center gap-1.5 font-black text-purple-900 hover:text-purple-600 hover:underline cursor-pointer"
                                title="انقر لفتح الملف الطبي الكامل للمريض في صفحة كاملة"
                              >
                                <User
                                  size={15}
                                  className="text-purple-600 shrink-0 group-hover:scale-110 transition-transform"
                                />
                                <span className="text-sm">{patientName}</span>
                                <ExternalLink
                                  size={12}
                                  className="text-purple-400 opacity-80"
                                />
                              </button>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-purple-100/70 text-purple-900 text-[11px] px-2.5 py-0.5 rounded-md font-extrabold">
                                {relation}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-extrabold text-gray-600">
                              {new Date(
                                exam.exam_date || exam.created_at,
                              ).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate">
                              <div className="space-y-0.5">
                                <div className="text-gray-900 font-extrabold">
                                  <span className="text-gray-400">عمليات:</span>{" "}
                                  {exam.previous_operations || "—"}
                                </div>
                                <div className="text-purple-800">
                                  <span className="text-gray-400">أدوية:</span>{" "}
                                  {exam.current_medications || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-[180px] truncate">
                              <div className="space-y-0.5">
                                <div className="text-red-700 font-bold">
                                  <span className="text-gray-400">حساسية:</span>{" "}
                                  {exam.allergy || "—"}
                                </div>
                                <div className="text-amber-800">
                                  <span className="text-gray-400">
                                    آثار عكسية:
                                  </span>{" "}
                                  {exam.adverse_drug_reactions || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-[180px] truncate">
                              <div className="space-y-0.5">
                                <div>
                                  <span className="text-gray-400">عائلي:</span>{" "}
                                  {exam.family_history || "—"}
                                </div>
                                <div>
                                  <span className="text-gray-400">عادات:</span>{" "}
                                  {exam.special_habits || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openComprehensiveForMember({ patient_id: exam.patient_id, patients: fullPatientObj }, "history")}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 transition-all shadow-sm"
                                  title="فتح وتعديل التاريخ المرضي"
                                >
                                  <Shield size={12} /> عرض في الملف الشامل
                                </button>
                                <button
                                  onClick={() =>
                                    setTimelinePatient(fullPatientObj)
                                  }
                                  className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg font-extrabold text-[11px] transition-all border border-purple-200"
                                  title="فتح الملف الكامل"
                                >
                                  الملف الكامل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* ---------------- 2. جدول موديول ملخص الأحداث الطبية الهامة ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "significant") && (
              <div id="section-clinical-significant" className="bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm space-y-3 scroll-mt-6">
              <div className="p-4 bg-gradient-to-r from-amber-50 via-white to-amber-50/30 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-200">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-base text-amber-950">
                      سجل ملخص الأحداث الطبية الهامة (Significant Data Sheet)
                    </h5>
                    <span className="text-[11px] font-bold text-amber-700">
                      Significant Events & Medical Milestones Register
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                  الأحداث الهامة
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-amber-50/50 text-amber-950 font-black text-xs border-b border-amber-100">
                      <th className="p-3.5">اسم المريض (اضغط لفتح الملف)</th>
                      <th className="p-3.5">صلة القرابة</th>
                      <th className="p-3.5">تاريخ التسجيل</th>
                      <th className="p-3.5">عدد الأحداث الهامة</th>
                      <th className="p-3.5">
                        تفاصيل وملخص الأحداث والتشخيصات الهامة
                      </th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                    {(() => {
                      const familyMemberIds = (
                        selectedFamilyFile.members || []
                      ).map((m: any) => m.patient_id);
                      const familyExams = physicalExams.filter((e) =>
                        familyMemberIds.includes(e.patient_id),
                      );

                      if (familyExams.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-8 text-center text-gray-400 font-bold italic"
                            >
                              لا توجد أحداث طبية هامة مسجلة لأفراد هذه العائلة
                              بعد.
                            </td>
                          </tr>
                        );
                      }

                      return familyExams.map((exam: any) => {
                        const member = (selectedFamilyFile.members || []).find(
                          (m: any) => m.patient_id === exam.patient_id,
                        );
                        const patientName =
                          member?.patients?.name || "مريض بالعائلة";
                        const relation =
                          member?.relationship_to_head || "عضو الأسرة";
                        const fullPatientObj = patients.find(
                          (p) => p.id === exam.patient_id,
                        ) ||
                          member?.patients || {
                            id: exam.patient_id,
                            name: patientName,
                          };

                        let parsedSig: any[] = [];
                        try {
                          if (exam.significant_events)
                            parsedSig = JSON.parse(exam.significant_events);
                        } catch (e) {}

                        return (
                          <tr
                            key={exam.id}
                            className="hover:bg-amber-50/30 transition-colors"
                          >
                            <td className="p-3.5">
                              <button
                                onClick={() =>
                                  setTimelinePatient(fullPatientObj)
                                }
                                className="group text-right flex items-center gap-1.5 font-black text-amber-950 hover:text-amber-600 hover:underline cursor-pointer"
                                title="انقر لفتح الملف الطبي الكامل للمريض في صفحة كاملة"
                              >
                                <User
                                  size={15}
                                  className="text-amber-600 shrink-0 group-hover:scale-110 transition-transform"
                                />
                                <span className="text-sm">{patientName}</span>
                                <ExternalLink
                                  size={12}
                                  className="text-amber-400 opacity-80"
                                />
                              </button>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-amber-100/70 text-amber-900 text-[11px] px-2.5 py-0.5 rounded-md font-extrabold">
                                {relation}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-extrabold text-gray-600">
                              {new Date(
                                exam.exam_date || exam.created_at,
                              ).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-black">
                                {parsedSig.length} حدث طبي
                              </span>
                            </td>
                            <td className="p-3.5">
                              {parsedSig.length > 0 ? (
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                  {parsedSig.map((evt: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="p-1.5 bg-amber-50/60 rounded-lg border border-amber-100/80 text-[11px] flex items-center justify-between gap-2"
                                    >
                                      <span className="font-extrabold text-amber-950">
                                        {evt.description || "—"}
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                                        {evt.date && (
                                          <span className="bg-white px-1.5 py-0.5 rounded text-amber-900 font-mono">
                                            {evt.date}
                                          </span>
                                        )}
                                        {evt.doctor && (
                                          <span className="text-amber-800 font-bold">
                                            د/ {evt.doctor}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">
                                  لا توجد تفاصيل أحداث مدونة
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openComprehensiveForMember({ patient_id: exam.patient_id, patients: fullPatientObj }, "significant")}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 transition-all shadow-sm"
                                  title="فتح وتعديل الأحداث الطبية الهامة"
                                >
                                  <ClipboardList size={12} /> عرض في الملف الشامل
                                </button>
                                <button
                                  onClick={() =>
                                    setTimelinePatient(fullPatientObj)
                                  }
                                  className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-extrabold text-[11px] transition-all border border-amber-200"
                                  title="فتح الملف الكامل"
                                >
                                  الملف الكامل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* ---------------- 3. جدول موديول الفحص السريري الإكلينيكي ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "clinical") && (
              <div id="section-clinical-clinical" className="bg-white border border-indigo-100 rounded-3xl overflow-hidden shadow-sm space-y-3 scroll-mt-6">
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-white to-indigo-50/30 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-base text-indigo-950">
                      سجل الفحص السريري الإكلينيكي (Clinical Findings)
                    </h5>
                    <span className="text-[11px] font-bold text-indigo-700">
                      Physical Examination & Vital Signs Module Results
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black bg-indigo-100 text-indigo-900 px-3 py-1 rounded-full border border-indigo-200">
                  الفحص الإكلينيكي
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-indigo-50/50 text-indigo-950 font-black text-xs border-b border-indigo-100">
                      <th className="p-3.5">اسم المريض (اضغط لفتح الملف)</th>
                      <th className="p-3.5">صلة القرابة</th>
                      <th className="p-3.5">تاريخ الفحص</th>
                      <th className="p-3.5">العلامات الحيوية (Vitals)</th>
                      <th className="p-3.5">ملخص نتائج الفحص السريري</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                    {(() => {
                      const familyMemberIds = (
                        selectedFamilyFile.members || []
                      ).map((m: any) => m.patient_id);
                      const familyExams = physicalExams.filter((e) =>
                        familyMemberIds.includes(e.patient_id),
                      );

                      if (familyExams.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={6}
                              className="p-8 text-center text-gray-400 font-bold italic"
                            >
                              لا توجد نتائج فحص إكلينيكي مسجلة لأفراد هذه
                              العائلة بعد.
                            </td>
                          </tr>
                        );
                      }

                      return familyExams.map((exam: any) => {
                        const member = (selectedFamilyFile.members || []).find(
                          (m: any) => m.patient_id === exam.patient_id,
                        );
                        const patientName =
                          member?.patients?.name || "مريض بالعائلة";
                        const relation =
                          member?.relationship_to_head || "عضو الأسرة";
                        const fullPatientObj = patients.find(
                          (p) => p.id === exam.patient_id,
                        ) ||
                          member?.patients || {
                            id: exam.patient_id,
                            name: patientName,
                          };

                        let parsedClin: any = null;
                        try {
                          if (exam.clinical_findings)
                            parsedClin = JSON.parse(exam.clinical_findings);
                        } catch (e) {}

                        return (
                          <tr
                            key={exam.id}
                            className="hover:bg-indigo-50/30 transition-colors"
                          >
                            <td className="p-3.5">
                              <button
                                onClick={() =>
                                  setTimelinePatient(fullPatientObj)
                                }
                                className="group text-right flex items-center gap-1.5 font-black text-indigo-950 hover:text-indigo-600 hover:underline cursor-pointer"
                                title="انقر لفتح الملف الطبي الكامل للمريض في صفحة كاملة"
                              >
                                <User
                                  size={15}
                                  className="text-indigo-600 shrink-0 group-hover:scale-110 transition-transform"
                                />
                                <span className="text-sm">{patientName}</span>
                                <ExternalLink
                                  size={12}
                                  className="text-indigo-400 opacity-80"
                                />
                              </button>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-indigo-100/70 text-indigo-900 text-[11px] px-2.5 py-0.5 rounded-md font-extrabold">
                                {relation}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-extrabold text-gray-600">
                              {new Date(
                                exam.exam_date || exam.created_at,
                              ).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3.5">
                              {parsedClin ? (
                                <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                                  {parsedClin.vital_bp && (
                                    <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                                      ضغط: {parsedClin.vital_bp}
                                    </span>
                                  )}
                                  {parsedClin.vital_pulse && (
                                    <span className="bg-red-100 text-red-900 px-2 py-0.5 rounded">
                                      نبض: {parsedClin.vital_pulse}
                                    </span>
                                  )}
                                  {parsedClin.vital_temp && (
                                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                                      حرارة: {parsedClin.vital_temp}°
                                    </span>
                                  )}
                                  {parsedClin.vital_resp_rate && (
                                    <span className="bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
                                      تنفس: {parsedClin.vital_resp_rate}
                                    </span>
                                  )}
                                  {parsedClin.vital_weight && (
                                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                                      وزن: {parsedClin.vital_weight} كجم
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">
                                  لم تسجل علامات حيوية
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 max-w-[220px] truncate">
                              {parsedClin ? (
                                <div className="space-y-0.5 text-gray-800">
                                  {parsedClin.general_appearance && (
                                    <div>
                                      <span className="text-gray-400">
                                        مظهر:
                                      </span>{" "}
                                      {parsedClin.general_appearance}
                                    </div>
                                  )}
                                  {parsedClin.head_neck && (
                                    <div>
                                      <span className="text-gray-400">
                                        رأس/عنق:
                                      </span>{" "}
                                      {parsedClin.head_neck}
                                    </div>
                                  )}
                                  {parsedClin.cardiovascular && (
                                    <div>
                                      <span className="text-gray-400">
                                        قلب:
                                      </span>{" "}
                                      {parsedClin.cardiovascular}
                                    </div>
                                  )}
                                  {parsedClin.respiratory && (
                                    <div>
                                      <span className="text-gray-400">
                                        صدر:
                                      </span>{" "}
                                      {parsedClin.respiratory}
                                    </div>
                                  )}
                                  {!parsedClin.general_appearance &&
                                    !parsedClin.head_neck &&
                                    !parsedClin.cardiovascular &&
                                    !parsedClin.respiratory && (
                                      <span className="text-gray-400 italic">
                                        تم الفحص بدون ملاحظات إضافية
                                      </span>
                                    )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openComprehensiveForMember({ patient_id: exam.patient_id, patients: fullPatientObj }, "clinical")}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 transition-all shadow-sm"
                                  title="فتح وتعديل الفحص السريري الإكلينيكي"
                                >
                                  <Activity size={12} /> عرض في الملف الشامل
                                </button>
                                <button
                                  onClick={() =>
                                    setTimelinePatient(fullPatientObj)
                                  }
                                  className="px-2 py-1 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 rounded-lg font-extrabold text-[11px] transition-all border border-indigo-200"
                                  title="فتح الملف الكامل"
                                >
                                  الملف الكامل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* ---------------- 4. سجل الزيارات والتردد (Visits Form) ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "visits") && (
              <div id="section-clinical-visits" className="bg-white border border-teal-100 rounded-3xl overflow-hidden shadow-sm space-y-3 scroll-mt-6">
              <div className="p-4 bg-gradient-to-r from-teal-50 via-white to-teal-50/30 border-b border-teal-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black shadow-md shadow-teal-200">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h5 className="font-black text-base text-teal-950">
                      سجل الزيارات والتردد (Visits Form)
                    </h5>
                    <span className="text-[11px] font-bold text-teal-700">
                      Patient Visits & Consultations Register Module
                    </span>
                  </div>
                </div>
                <span className="text-xs font-black bg-teal-100 text-teal-900 px-3 py-1 rounded-full border border-teal-200">
                  سجل التردد
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-teal-50/50 text-teal-950 font-black text-xs border-b border-teal-100">
                      <th className="p-3.5">اسم المريض (اضغط لفتح الملف)</th>
                      <th className="p-3.5">صلة القرابة</th>
                      <th className="p-3.5">تاريخ الزيارة</th>
                      <th className="p-3.5">نوع الزيارة</th>
                      <th className="p-3.5">الشكوى والتشخيص</th>
                      <th className="p-3.5">العلاج والإجراءات</th>
                      <th className="p-3.5">طبيب الزيارة</th>
                      <th className="p-3.5 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-bold text-gray-700">
                    {(() => {
                      const familyMemberIds = (selectedFamilyFile.members || []).map(
                        (m: any) => m.patient_id,
                      );
                      const familyVisitsList = patientVisits.filter((v) =>
                        familyMemberIds.includes(v.patient_id),
                      );

                      if (familyVisitsList.length === 0) {
                        return (
                          <tr>
                            <td
                              colSpan={8}
                              className="p-8 text-center text-gray-400 font-bold italic"
                            >
                              لا توجد زيارات أو ترددات مسجلة لأفراد هذه العائلة بعد.
                            </td>
                          </tr>
                        );
                      }

                      return familyVisitsList.map((visit: any) => {
                        const member = (selectedFamilyFile.members || []).find(
                          (m: any) => m.patient_id === visit.patient_id,
                        );
                        const patientName =
                          visit.patients?.name || member?.patients?.name || "مريض بالعائلة";
                        const relation =
                          member?.relationship_to_head || "عضو الأسرة";
                        const fullPatientObj =
                          patients.find((p) => p.id === visit.patient_id) ||
                          visit.patients ||
                          member?.patients || {
                            id: visit.patient_id,
                            name: patientName,
                          };

                        return (
                          <tr
                            key={visit.id}
                            className="hover:bg-teal-50/30 transition-colors"
                          >
                            <td className="p-3.5">
                              <button
                                onClick={() => setTimelinePatient(fullPatientObj)}
                                className="group text-right flex items-center gap-1.5 font-black text-teal-950 hover:text-teal-600 hover:underline cursor-pointer"
                                title="انقر لفتح الملف الطبي الكامل للمريض"
                              >
                                <User
                                  size={15}
                                  className="text-teal-600 shrink-0 group-hover:scale-110 transition-transform"
                                />
                                <span className="text-sm">{patientName}</span>
                                <ExternalLink
                                  size={12}
                                  className="text-teal-400 opacity-80"
                                />
                              </button>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-teal-100/70 text-teal-900 text-[11px] px-2.5 py-0.5 rounded-md font-extrabold">
                                {relation}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] font-extrabold text-gray-600">
                              {new Date(
                                visit.visit_date || visit.created_at,
                              ).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 bg-teal-100 text-teal-900 rounded-lg text-xs font-black">
                                {visit.visit_type_code ? `[${visit.visit_type_code}] ` : ""}
                                {visit.visit_type_name || "زيارة اعتيادية"}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate">
                              <div className="space-y-0.5">
                                <div className="text-gray-900 font-extrabold">
                                  <span className="text-gray-400">الشكوى:</span>{" "}
                                  {visit.patient_complaint || "—"}
                                </div>
                                <div className="text-teal-800">
                                  <span className="text-gray-400">التشخيص:</span>{" "}
                                  {visit.diagnosis || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-[200px] truncate">
                              <div className="space-y-0.5">
                                <div className="text-blue-900 font-bold">
                                  <span className="text-gray-400">العلاج:</span>{" "}
                                  {visit.management_plan || "—"}
                                </div>
                                <div className="text-gray-500 text-[11px]">
                                  <span className="text-gray-400">الفحوصات:</span>{" "}
                                  {visit.investigations_requested || "—"}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-bold text-gray-800">
                              {visit.doctor_signature ? `د/ ${visit.doctor_signature}` : "—"}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openComprehensiveForMember({ patient_id: visit.patient_id, patients: fullPatientObj }, "visits")}
                                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black text-[11px] flex items-center gap-1 transition-all shadow-sm"
                                  title="عرض وتعديل جدول زيارات المريض"
                                >
                                  <FileText size={12} /> عرض في الملف الشامل
                                </button>
                                <button
                                  onClick={() => setTimelinePatient(fullPatientObj)}
                                  className="px-2 py-1 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-lg font-extrabold text-[11px] transition-all border border-teal-200"
                                  title="فتح الملف الكامل"
                                >
                                  الملف الكامل
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            )}

            {/* ---------------- 5. سجل صحة ورعاية الطفل والتطعيمات ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "child") && (
              <div id="section-clinical-child" className="bg-white border border-cyan-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-cyan-50 via-white to-cyan-50/30 border-b border-cyan-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black shadow-md shadow-cyan-200">
                      <Baby size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-cyan-950">
                        سجل صحة ورعاية الطفل والتطعيمات ومتابعة النمو
                      </h5>
                      <span className="text-[11px] font-bold text-cyan-700">
                        Child Health, Immunization & Developmental Milestones (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full border border-cyan-200">
                    النموذج 5 - صحة الطفل
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-cyan-50/50 text-cyan-950 font-black text-xs border-b border-cyan-100">
                        <th className="p-3.5">الطفل / فرد الأسرة</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">مؤشرات النمو (الوزن / الطول / محيط الرأس)</th>
                        <th className="p-3.5">حالة التطعيمات الإلزامية</th>
                        <th className="p-3.5">التطور النمائي والحركي</th>
                        <th className="p-3.5">مستوى الأهلية للمتابعة</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;
                          const isEligibleChild = mAge !== null && mAge < 18;
                          const isInfant = mAge !== null && mAge < 2;
                          const exam = physicalExams.find(
                            (pe) => pe.patient_id === m.patient_id,
                          );

                          return (
                            <tr
                              key={m.id || idx}
                              className={`hover:bg-cyan-50/30 transition-colors ${
                                isEligibleChild ? "bg-cyan-50/10" : "opacity-75"
                              }`}
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريض بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                {exam?.vital_signs?.weight || exam?.vital_signs?.height ? (
                                  <div className="space-y-0.5 text-[11px]">
                                    <span className="font-black text-cyan-800 block">
                                      وزن: {exam.vital_signs.weight || "--"} كجم | طول: {exam.vital_signs.height || "--"} سم
                                    </span>
                                    <span className="text-[10px] text-gray-500">
                                      {exam.date ? `بتاريخ: ${exam.date}` : "فحص حديث"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-[11px]">
                                    لم تسجل قياسات بعد
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2.5 py-1 rounded-md font-black text-[10px] inline-flex items-center gap-1 ${
                                    isEligibleChild
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-gray-100 text-gray-500 border border-gray-200"
                                  }`}
                                >
                                  <CheckCircle2 size={12} />
                                  {isInfant
                                    ? "جدول التطعيمات الدورية نشط"
                                    : isEligibleChild
                                    ? "تطعيمات الطفولة مسجلة"
                                    : "فوق السن المستهدف"}
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                {isInfant ? (
                                  <span className="font-bold text-cyan-800">
                                    متابعة الرضاعة والنمو الحركي والذهني
                                  </span>
                                ) : isEligibleChild ? (
                                  <span>فحص نمو عام وفحص الأسنان المدرسي</span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isEligibleChild
                                      ? "bg-cyan-100 text-cyan-900 border border-cyan-200"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {isEligibleChild ? "مستهدف بالنموذج" : "فرد بالغ"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "child")
                                    }
                                    className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Baby size={13} />
                                    <span>توثيق صحة الطفل</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("child");
                                      setQuickBookingReason("متابعة صحة الطفل والتطعيمات بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-cyan-50 text-cyan-800 rounded-lg font-bold text-[11px] border border-cyan-200 transition-all cursor-pointer"
                                  >
                                    موعد تطعيم
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- 6. سجل رعاية الأمومة ومتابعة الحمل والنفاس ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "maternal") && (
              <div id="section-clinical-maternal" className="bg-white border border-rose-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-rose-50 via-white to-rose-50/30 border-b border-rose-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-200">
                      <Heart size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-rose-950">
                        سجل رعاية الأمومة ومتابعة الحمل والولادة والنفاس
                      </h5>
                      <span className="text-[11px] font-bold text-rose-700">
                        Antenatal, Perinatal & Postnatal Care Module (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-rose-100 text-rose-800 px-3 py-1 rounded-full border border-rose-200">
                    النموذج 6 - رعاية الأمومة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-rose-50/50 text-rose-950 font-black text-xs border-b border-rose-100">
                        <th className="p-3.5">السيدة / فرد الأسرة</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">التاريخ الولادي (G/P/A)</th>
                        <th className="p-3.5">متابعة الحمل والضغط</th>
                        <th className="p-3.5">فحص ما بعد الولادة (النفاس)</th>
                        <th className="p-3.5">الأهلية والمطابقة</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;
                          const mGender = mPatient?.gender || "";
                          const isFemale = mGender === "أنثى" || mGender === "female";
                          const isEligibleFemale = isFemale && (mAge === null || (mAge >= 15 && mAge <= 49));
                          const exam = physicalExams.find(
                            (pe) => pe.patient_id === m.patient_id,
                          );

                          return (
                            <tr
                              key={m.id || idx}
                              className={`hover:bg-rose-50/30 transition-colors ${
                                isEligibleFemale ? "bg-rose-50/10" : "opacity-70"
                              }`}
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريضة بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                {isFemale ? (
                                  <span className="font-mono font-black text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                                    سجل ولادي دوري
                                  </span>
                                ) : (
                                  <span className="text-gray-400">غير منطبق (ذكر)</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                {exam?.vital_signs?.bp_systolic ? (
                                  <div className="text-[11px] space-y-0.5">
                                    <span className="font-black text-rose-900">
                                      ضغط: {exam.vital_signs.bp_systolic}/{exam.vital_signs.bp_diastolic} mmHg
                                    </span>
                                    <span className="text-[10px] text-gray-500 block">
                                      مؤشر أمان تسمم الحمل
                                    </span>
                                  </div>
                                ) : isFemale ? (
                                  <span className="text-gray-400 italic text-[11px]">
                                    لم يسجل فحص ضغط حديث
                                  </span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                {isFemale ? (
                                  <span>فحص دوري، الحديد وحمض الفوليك وفيتامينات الأمومة</span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isEligibleFemale
                                      ? "bg-rose-100 text-rose-900 border border-rose-200"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {isEligibleFemale ? "سيدة في سن الإنجاب" : isFemale ? "أنثى" : "غير مستهدف"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "maternal")
                                    }
                                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Heart size={13} />
                                    <span>توثيق رعاية الأمومة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("maternal");
                                      setQuickBookingReason("متابعة رعاية الأمومة والحمل بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-800 rounded-lg font-bold text-[11px] border border-rose-200 transition-all cursor-pointer"
                                  >
                                    حجز متابعة
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- 7. سجل تنظيم الأسرة والصحة الإنجابية ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "family_planning") && (
              <div id="section-clinical-family_planning" className="bg-white border border-fuchsia-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-fuchsia-50 via-white to-fuchsia-50/30 border-b border-fuchsia-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center font-black shadow-md shadow-fuchsia-200">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-fuchsia-950">
                        سجل تنظيم الأسرة ومباعدة الولادات والصحة الإنجابية
                      </h5>
                      <span className="text-[11px] font-bold text-fuchsia-700">
                        Family Planning & Reproductive Health Module (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-fuchsia-100 text-fuchsia-800 px-3 py-1 rounded-full border border-fuchsia-200">
                    النموذج 7 - تنظيم الأسرة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-fuchsia-50/50 text-fuchsia-950 font-black text-xs border-b border-fuchsia-100">
                        <th className="p-3.5">المنتفعة / فرد الأسرة</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">الوسيلة المستخدمة حالياً</th>
                        <th className="p-3.5">تاريخ بدء / متابعة الوسيلة</th>
                        <th className="p-3.5">المشورة والتوعية الإنجابية</th>
                        <th className="p-3.5">الأهلية المستهدفة</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;
                          const mGender = mPatient?.gender || "";
                          const isFemale = mGender === "أنثى" || mGender === "female";
                          const isReproductiveAge = isFemale && (mAge === null || (mAge >= 15 && mAge <= 49));

                          return (
                            <tr
                              key={m.id || idx}
                              className={`hover:bg-fuchsia-50/30 transition-colors ${
                                isReproductiveAge ? "bg-fuchsia-50/10" : "opacity-70"
                              }`}
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-fuchsia-100 text-fuchsia-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريضة بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                {isFemale ? (
                                  <span className="px-2 py-1 rounded-md bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 font-bold text-[11px] inline-block">
                                    استشارة ومتابعة وسائل تنظيم الأسرة
                                  </span>
                                ) : (
                                  <span className="text-gray-400">غير منطبق</span>
                                )}
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                {isFemale ? (
                                  <span>مجدول بالمتابعة الدورية للعيادة</span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                {isFemale ? (
                                  <span>مشورة مباعدة الولادات والرضاعة الطبيعية</span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isReproductiveAge
                                      ? "bg-fuchsia-100 text-fuchsia-900 border border-fuchsia-200"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {isReproductiveAge ? "مستهدفة بتنظيم الأسرة" : "غير مستهدف"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "family_planning")
                                    }
                                    className="px-2.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles size={13} />
                                    <span>توثيق تنظيم الأسرة</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("family_planning");
                                      setQuickBookingReason("استشارة ومتابعة تنظيم الأسرة بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-fuchsia-50 text-fuchsia-800 rounded-lg font-bold text-[11px] border border-fuchsia-200 transition-all cursor-pointer"
                                  >
                                    حجز استشارة
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- 8. سجل الفحص الطبي الشامل للمقبلين على الزواج ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "premarital") && (
              <div id="section-clinical-premarital" className="bg-white border border-emerald-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-200">
                      <UserCheck size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-emerald-950">
                        سجل الفحص الطبي الشامل للمقبلين على الزواج والمشورة الوراثية
                      </h5>
                      <span className="text-[11px] font-bold text-emerald-700">
                        Premarital Screening & Genetic Counseling Module (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                    النموذج 8 - فحص المقبلين على الزواج
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-emerald-50/50 text-emerald-950 font-black text-xs border-b border-emerald-100">
                        <th className="p-3.5">فرد الأسرة المفحوص</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">أمراض الدم الوراثية (الثلاسيميا / المنجلية)</th>
                        <th className="p-3.5">الفحوصات الفيروسية (HBV/HCV/HIV)</th>
                        <th className="p-3.5">فصيلة الدم وعامل ريسس (Rh)</th>
                        <th className="p-3.5">حالة الشهادة الطبية</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;
                          const isAdult = mAge === null || mAge >= 18;

                          return (
                            <tr
                              key={m.id || idx}
                              className={`hover:bg-emerald-50/30 transition-colors ${
                                isAdult ? "bg-emerald-50/10" : "opacity-70"
                              }`}
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريض بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-[11px]">
                                <span className="text-gray-700 font-medium">
                                  فحص الهيموجلوبين واستبعاد أنيميا البحر المتوسط
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px]">
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                  مسح الفيروسات الكبدية والمناعية
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px] font-mono font-bold text-emerald-900">
                                {mPatient?.blood_group || "غير محدد"}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isAdult
                                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {isAdult ? "مؤهل للفحص الطبي" : "أقل من سن الزواج"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "premarital")
                                    }
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <UserCheck size={13} />
                                    <span>توثيق فحص الزواج</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("premarital");
                                      setQuickBookingReason("فحص المقبلين على الزواج بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 rounded-lg font-bold text-[11px] border border-emerald-200 transition-all cursor-pointer"
                                  >
                                    حجز فحص
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- 9. سجل الرعاية الشاملة لكبار السن ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "geriatric") && (
              <div id="section-clinical-geriatric" className="bg-white border border-amber-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-amber-50 via-white to-amber-50/30 border-b border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-200">
                      <ShieldAlert size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-amber-950">
                        سجل الرعاية الشاملة لكبار السن والتقييم الوظيفي والإدراكي
                      </h5>
                      <span className="text-[11px] font-bold text-amber-700">
                        Comprehensive Geriatric Assessment & Fall Risk Module (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                    النموذج 9 - كبار السن
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-amber-50/50 text-amber-950 font-black text-xs border-b border-amber-100">
                        <th className="p-3.5">المسن / فرد الأسرة</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">التقييم الوظيفي ومخاطر السقوط</th>
                        <th className="p-3.5">التقييم الإدراكي والذاكرة</th>
                        <th className="p-3.5">الأمراض المزمنة وتعدد الأدوية</th>
                        <th className="p-3.5">الأهلية والمطابقة</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;
                          const isElderly = mAge !== null && mAge >= 60;
                          const exam = physicalExams.find(
                            (pe) => pe.patient_id === m.patient_id,
                          );

                          return (
                            <tr
                              key={m.id || idx}
                              className={`hover:bg-amber-50/30 transition-colors ${
                                isElderly ? "bg-amber-50/10" : "opacity-70"
                              }`}
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريض بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-[11px]">
                                <span className="font-bold text-amber-900">
                                  تقييم الحركة والتوازن والقدرة على الاعتماد على الذات
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                <span>فحص الذاكرة ومقياس الاكتئاب لكبار السن (GDS)</span>
                              </td>
                              <td className="p-3.5 text-[11px]">
                                {exam?.vital_signs?.bp_systolic ? (
                                  <span className="font-mono text-gray-800 font-bold">
                                    ضغط: {exam.vital_signs.bp_systolic}/{exam.vital_signs.bp_diastolic} | سكر: {exam.vital_signs.random_blood_sugar || "--"}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">متابعة الأمراض المزمنة</span>
                                )}
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isElderly
                                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {isElderly ? "مستهدف (≥ 60 سنة)" : "أقل من 60 سنة"}
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "geriatric")
                                    }
                                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <ShieldAlert size={13} />
                                    <span>توثيق رعاية المسن</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("geriatric");
                                      setQuickBookingReason("تقييم رعاية كبار السن بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 rounded-lg font-bold text-[11px] border border-amber-200 transition-all cursor-pointer"
                                  >
                                    حجز تقييم
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ---------------- 10. سجل طب وجراحة الفم والأسنان ---------------- */}
            {(fileViewMode === "continuous" || clinicalModelTab === "dental") && (
              <div id="section-clinical-dental" className="bg-white border border-blue-100 rounded-3xl overflow-hidden shadow-sm space-y-3 animate-in fade-in duration-200 scroll-mt-6">
                <div className="p-4 bg-gradient-to-r from-blue-50 via-white to-blue-50/30 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-200">
                      <Smile size={18} />
                    </div>
                    <div>
                      <h5 className="font-black text-base text-blue-950">
                        سجل طب وجراحة الفم والأسنان وصحة اللثة
                      </h5>
                      <span className="text-[11px] font-bold text-blue-700">
                        Dental & Oral Health Examination Module (موديول معتمد)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black bg-blue-100 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
                    النموذج 10 - طب الأسنان
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse min-w-[950px]">
                    <thead>
                      <tr className="bg-blue-50/50 text-blue-950 font-black text-xs border-b border-blue-100">
                        <th className="p-3.5">فرد الأسرة المفحوص</th>
                        <th className="p-3.5">العمر والصلة</th>
                        <th className="p-3.5">مؤشر التسوس (DMFT / dft)</th>
                        <th className="p-3.5">صحة اللثة والجير (Gingival Index)</th>
                        <th className="p-3.5">الخطة العلاجية والوقائية</th>
                        <th className="p-3.5">الأهلية</th>
                        <th className="p-3.5 text-center">إجراءات الموديول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {(() => {
                        const members = selectedFamilyFile.members || [];
                        return members.map((m: any, idx: number) => {
                          const mPatient =
                            patients.find((p) => p.id === m.patient_id) ||
                            m.patients;
                          const mAge = mPatient
                            ? calculateAge(mPatient.date_of_birth)
                            : null;

                          return (
                            <tr
                              key={m.id || idx}
                              className="hover:bg-blue-50/30 transition-colors bg-blue-50/5"
                            >
                              <td className="p-3.5 font-black text-gray-900">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-mono font-black">
                                    {m.family_individual_number ?? idx + 1}
                                  </span>
                                  <span>{mPatient?.name || "مريض بدون اسم"}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-gray-700 block">
                                    {mAge !== null ? `${mAge} سنة` : "غير محدد"}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    {m.relationship_to_head || "فرد"}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 text-[11px]">
                                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  فحص نخر وتسوس الأسنان الدوري
                                </span>
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-600">
                                <span>تقييم التهابات اللثة والتكلسات الجيرية</span>
                              </td>
                              <td className="p-3.5 text-[11px] text-gray-700">
                                <span>علاج تحفظي، حشو، تنظيف وقائي، وتوعية بصحة الفم</span>
                              </td>
                              <td className="p-3.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  متاح لجميع أفراد الأسرة
                                </span>
                              </td>
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openComprehensiveForMember(mPatient, "dental")
                                    }
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Smile size={13} />
                                    <span>توثيق فحص الأسنان</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPatient(mPatient);
                                      setQuickBookingModule("dental");
                                      setQuickBookingReason("كشف عيادة طب الفم والأسنان بالملف العائلي");
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-blue-50 text-blue-800 rounded-lg font-bold text-[11px] border border-blue-200 transition-all cursor-pointer"
                                  >
                                    حجز كشف أسنان
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* بيان الوفيات بالملف العائلي */}
        {(fileViewMode === "continuous" || familyDetailTab === "deaths") && (
          <div id="section-deaths" className="space-y-4 animate-in fade-in duration-300 scroll-mt-6">
          {(() => {
            const familyMemberIds = (selectedFamilyFile.members || []).map(
              (m: any) => m.patient_id,
            );
            const familyDeaths = patientDeaths.filter((d) =>
              familyMemberIds.includes(d.patient_id),
            );
            if (familyDeaths.length === 0) {
              return (
                <div className="p-12 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-3xl space-y-3">
                  <ShieldAlert size={40} className="mx-auto text-gray-300" />
                  <h5 className="text-gray-800 font-black text-base">
                    لا توجد وفيات مسجلة في هذا الملف العائلي
                  </h5>
                  <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
                    لتسجيل حالة وفاة لأحد أفراد الأسرة، انتقل إلى تبويب "سجل
                    أفراد الأسرة" واضغط على زر "وفاة" بجوار اسم الفرد لإدخال
                    تاريخ وسبب الوفاة.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4 pt-6 border-t border-gray-100 animate-in fade-in duration-300">
                <h4 className="font-bold text-lg text-red-800 flex items-center gap-2">
                  <ShieldAlert
                    size={20}
                    className="text-red-600 animate-pulse"
                  />
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
                          <td className="p-4 text-red-900">
                            {death.deceased_name}
                          </td>
                          <td className="p-4 font-mono text-gray-800">
                            {death.age_at_death} سنة
                          </td>
                          <td className="p-4 font-mono text-gray-600">
                            {new Date(death.death_date).toLocaleDateString(
                              "ar-EG",
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-md text-xs font-mono font-bold border border-red-100">
                              {death.death_code}
                            </span>
                          </td>
                          <td className="p-4 text-gray-500 font-normal">
                            {death.notes || "---"}
                          </td>
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
      )}
                  </div>
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
                      <td className="p-4 text-gray-900 text-base">
                        {file.head_name || "غير مسجل"}
                      </td>
                      <td className="p-4 font-mono text-gray-500 text-sm">
                        {file.national_id || "---"}
                      </td>
                      <td className="p-4 text-xs">
                        <div className="font-bold text-gray-800">
                          {file.governorate || "---"}
                        </div>
                        <div className="text-gray-400 mt-0.5">
                          {file.administration || "---"}
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {file.village_city || "---"}
                      </td>
                      <td className="p-4">
                        <span className="text-gray-800 font-extrabold bg-blue-50/50 border border-blue-100 px-2 py-1 rounded-lg text-xs">
                          {file.health_unit || "---"}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-normal">
                        <div className="flex flex-col gap-1 font-mono">
                          {file.phone && (
                            <span className="flex items-center gap-1 text-gray-800 font-bold">
                              <Phone
                                size={10}
                                className="text-primary-500 shrink-0"
                              />{" "}
                              {file.phone}
                            </span>
                          )}
                          {file.home_number && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded shrink-0 font-sans font-bold">
                                عمل
                              </span>{" "}
                              {file.home_number}
                            </span>
                          )}
                          {file.nearest_landmark && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-1 rounded shrink-0 font-sans font-bold">
                                أقرب
                              </span>{" "}
                              {file.nearest_landmark}
                            </span>
                          )}
                          {!file.phone &&
                            !file.home_number &&
                            !file.nearest_landmark && (
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
                        {new Date(
                          file.created_at || new Date(),
                        ).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <div
                          className="flex items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                    <td
                      colSpan={10}
                      className="p-16 text-center text-gray-400 font-bold"
                    >
                      <FolderOpen
                        size={48}
                        className="mx-auto text-gray-300 mb-3"
                      />
                      {searchTerm
                        ? "لا توجد نتائج مطابقة لعملية البحث."
                        : "لم يتم تسجيل أي ملفات عائلية بالسيستم بعد."}
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
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95"
            dir="rtl"
          >
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <FolderOpen className="text-primary-600" size={24} />
                <h3 className="font-bold text-xl text-gray-800">
                  إنشاء ملف عائلي جديد
                </h3>
              </div>
              <button
                onClick={() => setShowAddFamilyFile(false)}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddFamilyFile}
              className="p-6 md:p-8 space-y-5 overflow-y-auto"
            >
              {formError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-700 font-bold text-sm">
                  <ShieldAlert size={18} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    رقم الملف العائلي *
                  </label>
                  <input
                    name="family_code"
                    required
                    placeholder="مثال: FF-5001"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    الرقم القومي لرب العائلة *
                  </label>
                  <input
                    name="national_id"
                    required
                    maxLength={14}
                    minLength={14}
                    placeholder="14 رقم قومي مصري"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              {/* حقول الترقيم للطباعة الرسمية (رقم المنزل / رقم الأسرة) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      رقم المنزل
                    </label>
                    <input
                      name="house_number"
                      placeholder="رقم المنزل للنموذج الورقي (اختياري)"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      رقم الأسرة
                    </label>
                    <input
                      name="family_number"
                      placeholder="رقم الأسرة للنموذج الورقي (اختياري)"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 font-bold leading-relaxed">
                  تُستخدم هذه الحقول فقط عند طباعة النموذج الرسمي المطابق لبطاقة الملف العائلي الورقية، وليست إلزامية للعمل اليومي على النظام.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    اسم رب العائلة *
                  </label>
                  <input
                    name="head_name"
                    required
                    placeholder="الاسم الرباعي كاملاً لرب الأسرة"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    رقم الهاتف الأساسي للأسرة *
                  </label>
                  <input
                    name="phone"
                    required
                    placeholder="مثال: 01xxxxxxxxx"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    تليفون العمل
                  </label>
                  <input
                    name="work_phone"
                    placeholder="تليفون مكان العمل"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    أقرب تليفون (طوارئ أو قريب)
                  </label>
                  <input
                    name="nearest_phone"
                    placeholder="تليفون قريب لحالات الطوارئ"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    المحافظة *
                  </label>
                  <input
                    name="governorate"
                    required
                    placeholder="مثال: الجيزة"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    الإدارة الصحية *
                  </label>
                  <input
                    name="administration"
                    required
                    placeholder="مثال: إدارة البدرشين"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    القرية أو المدينة *
                  </label>
                  <input
                    name="village_city"
                    required
                    placeholder="مثال: الشوبك"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    وحدة طب الأسرة / المركز الطبي *
                  </label>
                  <input
                    name="health_unit"
                    required
                    placeholder="مثال: وحدة الشوبك الصحية"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    العنوان بالتفصيل *
                  </label>
                  <input
                    name="address"
                    required
                    placeholder="الشارع، رقم المنزل، علامة مميزة"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <h4 className="font-extrabold text-sm text-primary-600 flex items-center gap-1.5 pb-2 border-b">
                  <Home size={16} /> بيان حالة المسكن والبيئة السكنية (اختياري)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      عدد الحجرات الكلي بالمنزل
                    </label>
                    <input
                      type="number"
                      name="total_rooms"
                      min={0}
                      placeholder="عدد الحجرات الكلي"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      الحجرات المخصصة للنوم
                    </label>
                    <input
                      type="number"
                      name="sleeping_rooms"
                      min={0}
                      placeholder="عدد حجرات النوم"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        التهوية
                      </label>
                      <select
                        name="ventilation"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="good">جيدة</option>
                        <option value="poor">غير جيدة</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        مصدر المياه
                      </label>
                      <select
                        name="water_source"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="public">عام (شبكة عمومية)</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        الصرف الصحي
                      </label>
                      <select
                        name="sewage_system"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="sanitary">صحي</option>
                        <option value="trench">طرنش (غير صحي)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        نوع الإضاءة
                      </label>
                      <select
                        name="lighting_type"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="electricity">كهرباء</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        حظيرة طيور/حيوانات
                      </label>
                      <select
                        name="barn_location"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="none">لا يوجد حظيرة</option>
                        <option value="inside">بالمنزل</option>
                        <option value="outside">بالخارج</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2.5 pt-6">
                      <input
                        type="checkbox"
                        id="has_animals_birds"
                        name="has_animals_birds"
                        className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="has_animals_birds"
                        className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                      >
                        تربية حيوانات أو طيور بالمنزل
                      </label>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="font-extrabold text-sm text-primary-600 flex items-center gap-1.5 pb-2 border-b">
                    <Users size={16} /> بيان البحث الاجتماعي والتمكين الأسري
                    (اختياري)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        طبيعة دخل الأسرة
                      </label>
                      <select
                        name="income_type"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      >
                        <option value="fixed">دخل ثابت</option>
                        <option value="variable">دخل متغير</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        متوسط الدخل الشهري (بالجنيه)
                      </label>
                      <input
                        type="number"
                        name="monthly_income"
                        min={0}
                        placeholder="متوسط الدخل الشهري بالجنيه"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        العائل البديل (في حالة وفاة الأب)
                      </label>
                      <input
                        type="text"
                        name="breadwinner_name"
                        placeholder="اسم العائل البديل"
                        className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="has_chronic_diseases"
                          name="has_chronic_diseases"
                          className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="has_chronic_diseases"
                          className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                        >
                          وجود أمراض مزمنة بالأسرة
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="has_disabilities"
                          name="has_disabilities"
                          className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="has_disabilities"
                          className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                        >
                          وجود حالات إعاقة بالأسرة
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="receives_pension"
                          name="receives_pension"
                          className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="receives_pension"
                          className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                        >
                          الأسرة تحصل على معاش
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="eligible_for_free_service"
                          name="eligible_for_free_service"
                          className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="eligible_for_free_service"
                          className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                        >
                          الأسرة تستحق الخدمة المجانية
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  ملاحظات ديموغرافية واجتماعية
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="تفاصيل ديموغرافية، الحالة الاجتماعية أو أي ملاحظات هامة للأسرة..."
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddFamilyFile(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors"
                >
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
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95"
            dir="rtl"
          >
            <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <UserPlus className="text-primary-600" size={24} />
                <h3 className="font-bold text-lg text-gray-800">
                  إضافة عضو للملف: {selectedFamilyFileForMember.family_code}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddFamilyMember(false);
                  setSelectedFamilyFileForMember(null);
                  setSelectedPatientId("");
                }}
                className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleAddFamilyMember}
              className="p-6 space-y-4 overflow-y-auto flex-1"
            >
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-700 font-bold text-sm">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  اختر المريض من السجل الطبي بالمركز *
                </label>
                <select
                  name="patient_id"
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                >
                  <option value="">-- اختر مريضاً --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (الرقم القومي: {p.national_id || "غير مسجل"})
                    </option>
                  ))}
                </select>
              </div>

              {selectedPatientId &&
                (() => {
                  const selectedPatient = patients.find(
                    (p) => p.id === selectedPatientId,
                  );
                  if (!selectedPatient) return null;
                  return (
                    <div
                      key={selectedPatientId}
                      className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-200/60 animate-in fade-in slide-in-from-top-2 duration-200"
                    >
                      <div className="text-xs font-bold text-primary-600 mb-2 border-b pb-1.5 flex items-center gap-1.5">
                        <Info size={14} /> بيانات العضو المستوردة (قابلة للتعديل
                        والتحديث)
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">
                          الاسم رباعي *
                        </label>
                        <input
                          name="member_name"
                          required
                          defaultValue={selectedPatient.name || ""}
                          placeholder="الاسم رباعياً بالكامل"
                          className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">
                            النوع *
                          </label>
                          <select
                            name="member_gender"
                            required
                            defaultValue={selectedPatient.gender || ""}
                            className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                          >
                            <option value="">-- اختر النوع --</option>
                            <option value="ذكر">ذكر</option>
                            <option value="أنثى">أنثى</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-gray-500 block mb-1">
                            تاريخ الميلاد *
                          </label>
                          <input
                            type="date"
                            name="member_dob"
                            required
                            defaultValue={selectedPatient.date_of_birth || ""}
                            className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">
                          نوع التأمين (جهة التعاقد) *
                        </label>
                        <select
                          name="member_insurance"
                          required
                          defaultValue={selectedPatient.funding_entity_id || ""}
                          className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-primary-500 outline-none font-bold text-sm"
                        >
                          <option value="">-- اختر نوع التأمين --</option>
                          {fundingEntities.map((fe) => (
                            <option key={fe.id} value={fe.id}>
                              {fe.name}
                            </option>
                          ))}
                          <option value="cash">نقدي (بدون تأمين)</option>
                        </select>
                      </div>
                    </div>
                  );
                })()}

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  الرقم الفردي للعضو بالأسرة (التسلسل العائلي) *
                </label>
                <input
                  type="number"
                  name="family_individual_number"
                  min="1"
                  required
                  defaultValue={
                    (selectedFamilyFileForMember.members?.length || 0) + 1
                  }
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    صلة القرابة برب العائلة *
                  </label>
                  <select
                    name="relationship_to_head"
                    required
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                  >
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
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    الوظيفة والدور *
                  </label>
                  <input
                    name="family_role"
                    required
                    placeholder="مثال: طالب، موظف، ربة منزل"
                    className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  ملاحظات العضو
                </label>
                <textarea
                  name="member_notes"
                  rows={2}
                  placeholder="أي ملاحظات خاصة بالفرد (حالة صحية، احتياجات، إلخ)..."
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none font-bold text-sm"
                />
              </div>

              <div className="flex items-center gap-2.5 py-1">
                <input
                  type="checkbox"
                  id="is_head"
                  name="is_head"
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="is_head"
                  className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                >
                  هل هذا الفرد هو رب الأسرة (Head of Family)؟
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFamilyMember(false);
                    setSelectedFamilyFileForMember(null);
                    setSelectedPatientId("");
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Save size={18} /> ربط العضو بالملف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddProblem && selectedMemberForProblem && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                  <HeartPulse size={22} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">
                    التاريخ المرضي للعضو
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    المريض: {selectedMemberForProblem.patients?.name || "---"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddProblem(false);
                  setSelectedMemberForProblem(null);
                }}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Form to Add New History */}
              <form
                onSubmit={handleAddPatientProblem}
                className="bg-red-50/20 border border-red-100/50 rounded-2xl p-4 space-y-4"
              >
                <h4 className="font-extrabold text-red-800 text-sm flex items-center gap-1.5">
                  <Plus size={16} /> إضافة سجل مرضي جديد
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      اسم المرض / نوع المرض *
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      تاريخ اكتشاف المرض *
                    </label>
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
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    ملاحظات إضافية
                  </label>
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
                  <ClipboardList size={16} className="text-gray-500" /> السجل
                  المرضي الحالي (
                  {
                    patientProblems.filter(
                      (p) =>
                        p.patient_id === selectedMemberForProblem.patient_id,
                    ).length
                  }
                  )
                </h4>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {(() => {
                    const memberProblems = patientProblems.filter(
                      (p) =>
                        p.patient_id === selectedMemberForProblem.patient_id,
                    );
                    if (memberProblems.length === 0) {
                      return (
                        <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-xs">
                          لا يوجد سجلات مرضية مسجلة لهذا العضو حالياً.
                        </div>
                      );
                    }
                    return memberProblems.map((prob: any) => (
                      <div
                        key={prob.id}
                        className="flex justify-between items-start p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">
                              {prob.problem_name}
                            </span>
                            <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold border border-red-100">
                              نشط
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
                            <Calendar size={12} />
                            تاريخ الاكتشاف:{" "}
                            {prob.onset_date
                              ? new Date(prob.onset_date).toLocaleDateString(
                                  "ar-EG",
                                )
                              : "غير محدد"}
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          dir="rtl"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">
                    تسجيل حالة وفاة جديدة
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">
                    العضو: {selectedMemberForDeath.patients?.name || "---"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddDeathModal(false);
                  setSelectedMemberForDeath(null);
                  setFormError(null);
                }}
                className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleAddPatientDeath}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    اسم المتوفى *
                  </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      تاريخ الوفاة *
                    </label>
                    <input
                      type="date"
                      required
                      value={deathDate}
                      onChange={(e) => {
                        setDeathDate(e.target.value);
                        const birthDate =
                          selectedMemberForDeath.patients?.date_of_birth;
                        if (birthDate) {
                          setAgeAtDeath(
                            calculateAgeAtDeath(birthDate, e.target.value),
                          );
                        }
                      }}
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      السن عند الوفاة *
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={ageAtDeath || ""}
                      onChange={(e) => setAgeAtDeath(Number(e.target.value))}
                      placeholder="السن بالسنوات"
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    كود الوفاة *
                  </label>
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
                  <label className="text-xs font-bold text-gray-500 block mb-1">
                    ملاحظات أو سبب الوفاة الإضافي
                  </label>
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
                  onClick={() => {
                    setShowAddDeathModal(false);
                    setSelectedMemberForDeath(null);
                    setFormError(null);
                  }}
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
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95"
            dir="rtl"
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Home className="text-slate-600" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    تعديل بيان حالة المسكن والبيئة السكنية
                  </h3>
                  <p className="text-xs text-gray-400">
                    للملف العائلي: {selectedFamilyFile.family_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditHousingModal(false);
                  setFormError(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateHousing}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      عدد الحجرات الكلي بالمنزل
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={housingTotalRooms}
                      onChange={(e) =>
                        setHousingTotalRooms(Number(e.target.value))
                      }
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      الحجرات المخصصة للنوم
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={housingSleepingRooms}
                      onChange={(e) =>
                        setHousingSleepingRooms(Number(e.target.value))
                      }
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      التهوية
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      مصدر المياه
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      الصرف الصحي
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      نوع الإضاءة
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      حظيرة طيور/حيوانات
                    </label>
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
                      onChange={(e) =>
                        setHousingHasAnimalsBirds(e.target.checked)
                      }
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="edit_has_animals_birds"
                      className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                    >
                      تربية حيوانات أو طيور بالمنزل
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditHousingModal(false);
                    setFormError(null);
                  }}
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
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95"
            dir="rtl"
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Users className="text-slate-600" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-slate-800">
                    تعديل بيان البحث الاجتماعي والتمكين الأسري
                  </h3>
                  <p className="text-xs text-gray-400">
                    للملف العائلي: {selectedFamilyFile.family_code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowEditSocialModal(false);
                  setFormError(null);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleUpdateSocial}
              className="flex-1 overflow-y-auto p-6 space-y-6"
            >
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
                  <Info size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      طبيعة دخل الأسرة
                    </label>
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
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      متوسط الدخل الشهري (بالجنيه)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={socialMonthlyIncome}
                      onChange={(e) =>
                        setSocialMonthlyIncome(Number(e.target.value))
                      }
                      className="w-full border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-slate-500 outline-none font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="text-xs font-bold text-gray-500 block mb-1">
                      العائل البديل (في حالة وفاة الأب)
                    </label>
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
                      onChange={(e) =>
                        setSocialHasChronicDiseases(e.target.checked)
                      }
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="edit_has_chronic_diseases"
                      className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                    >
                      وجود أمراض مزمنة بالأسرة
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="edit_has_disabilities"
                      checked={socialHasDisabilities}
                      onChange={(e) =>
                        setSocialHasDisabilities(e.target.checked)
                      }
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="edit_has_disabilities"
                      className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                    >
                      وجود حالات إعاقة بالأسرة
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="edit_receives_pension"
                      checked={socialReceivesPension}
                      onChange={(e) =>
                        setSocialReceivesPension(e.target.checked)
                      }
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="edit_receives_pension"
                      className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                    >
                      الأسرة تحصل على معاش
                    </label>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="edit_eligible_for_free_service"
                      checked={socialEligibleForFreeService}
                      onChange={(e) =>
                        setSocialEligibleForFreeService(e.target.checked)
                      }
                      className="w-5 h-5 text-slate-800 focus:ring-slate-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="edit_eligible_for_free_service"
                      className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                    >
                      الأسرة تستحق الخدمة المجانية
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSocialModal(false);
                    setFormError(null);
                  }}
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

      {/* الملف الصحي العائلي الشامل (الأقسام الإكلينيكية المعتمدة) */}
      {showComprehensiveModal && comprehensiveModalPatient && (
        <FamilyComprehensiveHealthRecordModal
          isOpen={showComprehensiveModal}
          onClose={() => {
            setShowComprehensiveModal(false);
            setComprehensiveModalPatient(null);
            loadData();
          }}
          patient={comprehensiveModalPatient}
          familyFile={selectedFamilyFile || undefined}
          initialModule={comprehensiveInitialModule}
        />
      )}

      {/* مودال حجز العيادة السريع المقترح لأفراد الأسرة */}
      {quickBookingPatient && (
        <QuickClinicBookingModal
          isOpen={!!quickBookingPatient}
          onClose={() => {
            setQuickBookingPatient(null);
            setQuickBookingModule(undefined);
            setQuickBookingReason('');
          }}
          patient={quickBookingPatient}
          initialModule={quickBookingModule}
          prefilledReason={quickBookingReason}
          onBookingSuccess={(appointment) => {
            alert(`تم حجز العيادة بنجاح لفرد الأسرة ${quickBookingPatient.name} برقم حجز #${appointment.id.slice(0, 8)}`);
            loadData();
          }}
        />
      )}

      {/* عرض الملف الكامل للمريض والتايم لاين عند النقر على اسم المريض من داخل الملف العائلي */}
      {timelinePatient && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 animate-in fade-in print:static print:bg-white print:p-0 print:m-0 print:block">
          <div className="bg-white w-full max-w-6xl h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col print:static print:w-full print:h-auto print:max-w-none print:shadow-none print:border-none print:rounded-none print:p-0 print:overflow-visible">
            <PatientTimeline
              patient={timelinePatient}
              onClose={() => {
                setTimelinePatient(null);
                loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyFilesModule;
