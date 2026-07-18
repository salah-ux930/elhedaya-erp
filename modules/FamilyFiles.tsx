import React, { useState, useEffect } from 'react';
import { DB } from '../store.ts';
import { supabase } from '../supabase.ts';
import { FamilyFile, Patient, FamilyFileMember } from '../types.ts';
import { 
  FolderOpen, Users, Plus, Search, Phone, MapPin, 
  FileText, UserPlus, Save, X, Loader2, Info, ChevronLeft,
  Calendar, CreditCard, ClipboardList, ShieldAlert
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

  // Form error state
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, p, fe] = await Promise.all([
        DB.getFamilyFiles(),
        DB.getPatients(),
        DB.getFundingEntities()
      ]);
      setFamilyFiles(f);
      setPatients(p);
      setFundingEntities(fe);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        notes: target.notes.value.trim() || null
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
              <table className="w-full text-right border-collapse min-w-[1100px]">
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-bold text-gray-700">
                  {selectedFamilyFile.members && selectedFamilyFile.members.length > 0 ? (
                    selectedFamilyFile.members.map((member: any) => {
                      const parsed = parseFamilyRoleAndNotes(member.family_role);
                      const insuranceName = member.patients?.funding_entity_id 
                        ? (fundingEntities.find(fe => fe.id === member.patients.funding_entity_id)?.name || 'متعاقد')
                        : 'نقدي (بدون تأمين)';

                      return (
                        <tr key={member.id} className="hover:bg-gray-50/50">
                          <td className="p-4 text-gray-900">{member.patients?.name || '---'}</td>
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
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-gray-400 font-bold">
                        <Users size={32} className="mx-auto text-gray-300 mb-2" />
                        لا يوجد أفراد مسجلين في هذا الملف حالياً. اضغط على "إضافة فرد" لربط أفراد العائلة بالملف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    </div>
  );
};

export default FamilyFilesModule;
