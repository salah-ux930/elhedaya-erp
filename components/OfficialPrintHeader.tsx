import React from 'react';
import { FamilyFile, Patient, FamilyFileMember } from '../types.ts';

interface OfficialPrintHeaderProps {
  patient?: Partial<Patient> | null;
  familyFile?: Partial<FamilyFile> | null;
  member?: Partial<FamilyFileMember> | null;
  documentTitle?: string;
  className?: string;
}

export const OfficialPrintHeader: React.FC<OfficialPrintHeaderProps> = ({
  patient,
  familyFile,
  member,
  documentTitle,
  className = '',
}) => {
  const familyFileCode = familyFile?.family_code || familyFile?.id || null;
  const houseNumber = familyFile?.house_number?.trim() || null;
  const familyNumber = familyFile?.family_number?.trim() || null;
  const individualNumber = member?.family_individual_number != null 
    ? String(member.family_individual_number) 
    : (patient?.family_individual_number != null ? String(patient.family_individual_number) : null);

  const patientName = patient?.name?.trim() || null;
  const nationalId = patient?.national_id?.trim() || null;
  const dob = patient?.birth_date 
    ? new Date(patient.birth_date).toLocaleDateString('ar-EG') 
    : (patient?.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('ar-EG') : null);
  const gender = patient?.gender?.trim() || null;

  const renderDotted = (val: string | null, fallbackDots = '................') => {
    if (val && val.length > 0) {
      return <span className="text-slate-900 font-black">{val}</span>;
    }
    return <span className="font-mono text-slate-400 font-normal">{fallbackDots}</span>;
  };

  return (
    <div 
      className={`hidden print:block mb-4 border-2 border-slate-900 rounded-2xl p-3.5 bg-white text-slate-900 text-xs shadow-none ${className}`}
      dir="rtl"
    >
      {/* Top Center Title & GAHAR Accreditation */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-2.5">
        <div className="text-right">
          <p className="font-black text-sm text-slate-900">مركز الهداية الطبي للرعاية الأولية ووحدة الكلى</p>
          <p className="text-[10px] text-slate-600 font-bold">AL-HEDAYA PRIMARY HEALTH CARE & FAMILY MEDICINE</p>
        </div>
        <div className="text-center">
          <span className="font-black text-sm px-3.5 py-1 border-2 border-slate-900 rounded-xl bg-slate-50">
            {documentTitle || 'بطاقة الملف العائلي — السجل الطبي المعتمد'}
          </span>
        </div>
        <div className="text-left text-[10px] text-slate-600 font-bold">
          <p>معايير الاعتماد الوطنية GAHAR</p>
          <p className="font-mono text-[9px] text-slate-400">{new Date().toLocaleDateString('ar-EG')}</p>
        </div>
      </div>

      {/* 4-Level Official Numbering Bar (شريط الترقيم الرسمي من 4 مستويات) */}
      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-xl border border-slate-300 font-bold text-center mb-2.5 text-[11px]">
        <div className="border-l border-slate-300 pl-1">
          <span className="text-slate-500 text-[10px] block font-semibold mb-0.5">رقم الملف العائلي</span>
          <span className="font-mono">{renderDotted(familyFileCode, '............')}</span>
        </div>
        <div className="border-l border-slate-300 pl-1">
          <span className="text-slate-500 text-[10px] block font-semibold mb-0.5">رقم المنزل</span>
          <span className="font-mono">{renderDotted(houseNumber, '............')}</span>
        </div>
        <div className="border-l border-slate-300 pl-1">
          <span className="text-slate-500 text-[10px] block font-semibold mb-0.5">رقم الأسرة</span>
          <span className="font-mono">{renderDotted(familyNumber, '............')}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] block font-semibold mb-0.5">رقم الفرد</span>
          <span className="font-mono">{renderDotted(individualNumber, '............')}</span>
        </div>
      </div>

      {/* Patient Demographic Bar (شريط البيانات الديموغرافية للمريض) */}
      <div className="grid grid-cols-4 gap-3 px-1.5 text-[11px] font-bold border-t border-slate-200 pt-2">
        <div className="truncate">
          <span className="text-slate-500">الاسم: </span>
          {renderDotted(patientName, '........................')}
        </div>
        <div className="truncate">
          <span className="text-slate-500">الرقم القومي: </span>
          <span className="font-mono">{renderDotted(nationalId, '................')}</span>
        </div>
        <div className="truncate">
          <span className="text-slate-500">تاريخ الميلاد: </span>
          <span className="font-mono">{renderDotted(dob, '............')}</span>
        </div>
        <div className="truncate">
          <span className="text-slate-500">النوع: </span>
          {renderDotted(gender, '........')}
        </div>
      </div>
    </div>
  );
};

export default OfficialPrintHeader;
