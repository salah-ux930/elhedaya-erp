import React, { useState, useEffect } from 'react';
import {
  Users,
  Home,
  CreditCard,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  Circle,
  Shield,
  ClipboardList,
  Stethoscope,
  CalendarCheck,
  Baby,
  HeartHandshake,
  Sparkles,
  Heart,
  Clock,
  Smile,
  Check,
  UserCheck,
} from 'lucide-react';

export interface ClinicalModuleItem {
  id: string;
  num: string;
  title: string;
  subTitle?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  isCompleted: boolean;
  badge?: string;
  eligible?: boolean;
}

export interface FamilyUnifiedNavigationTreeProps {
  activeSection: 'members' | 'clinical' | 'housing' | 'social' | 'deaths';
  activeClinicalModule: string;
  onSelectSection: (section: 'members' | 'clinical' | 'housing' | 'social' | 'deaths') => void;
  onSelectClinicalModule: (moduleId: string) => void;
  membersCount: number;
  hasHousingData: boolean;
  hasSocialData: boolean;
  deathsCount: number;
  clinicalModules: ClinicalModuleItem[];
  completedModulesCount: number;
  totalModulesCount?: number;
  activeMemberName?: string;
}

export const FamilyUnifiedNavigationTree: React.FC<FamilyUnifiedNavigationTreeProps> = ({
  activeSection,
  activeClinicalModule,
  onSelectSection,
  onSelectClinicalModule,
  membersCount,
  hasHousingData,
  hasSocialData,
  deathsCount,
  clinicalModules,
  completedModulesCount,
  totalModulesCount = 10,
  activeMemberName,
}) => {
  // Clinical accordion expansion state (open by default if activeSection is 'clinical')
  const [isClinicalExpanded, setIsClinicalExpanded] = useState<boolean>(
    activeSection === 'clinical'
  );

  // Sync expansion state when activeSection changes externally
  useEffect(() => {
    if (activeSection === 'clinical') {
      setIsClinicalExpanded(true);
    }
  }, [activeSection]);

  const handleClinicalParentClick = () => {
    if (activeSection !== 'clinical') {
      onSelectSection('clinical');
      setIsClinicalExpanded(true);
    } else {
      // Toggle accordion if already active
      setIsClinicalExpanded(!isClinicalExpanded);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
      {/* رأس القائمة الرأسية الموحدة */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-800 leading-tight">
              أقسام ونماذج السجل الأسري
            </h3>
            <span className="text-[10px] font-bold text-slate-500 block">
              نظام التنقل الهيكلي الموحد
            </span>
          </div>
        </div>
      </div>

      {/* شجرة التنقل الرأسية المجمعة */}
      <nav className="p-3 space-y-1.5" aria-label="شجرة أقسام السجل الأسري">
        {/* 1. سجل أفراد الأسرة */}
        <button
          type="button"
          onClick={() => onSelectSection('members')}
          className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
            activeSection === 'members'
              ? 'bg-primary-600 text-white border-primary-600 shadow-xs font-black'
              : 'bg-slate-50/60 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'members'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary-100/70 text-primary-700'
              }`}
            >
              <Users size={16} />
            </div>
            <div className="truncate">
              <span className="text-xs font-black block truncate">سجل أفراد الأسرة</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'members' ? 'text-primary-100' : 'text-slate-400 font-medium'
                }`}
              >
                أفراد العائلة وصلات القرابة
              </span>
            </div>
          </div>
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeSection === 'members'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200/80 text-slate-700'
            }`}
          >
            {membersCount} أفراد
          </span>
        </button>

        {/* 2. بيان حالة المسكن والبيئة */}
        <button
          type="button"
          onClick={() => onSelectSection('housing')}
          className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
            activeSection === 'housing'
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs font-black'
              : 'bg-slate-50/60 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'housing'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              <Home size={16} />
            </div>
            <div className="truncate">
              <span className="text-xs font-black block truncate">بيان حالة المسكن والبيئة</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'housing' ? 'text-slate-200' : 'text-slate-400 font-medium'
                }`}
              >
                الغرف، المياه، التهوية والمرافق
              </span>
            </div>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeSection === 'housing'
                ? 'bg-white/25 text-white'
                : hasHousingData
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-200/80 text-slate-500'
            }`}
          >
            {hasHousingData ? 'مسجل ✓' : 'غير مدون'}
          </span>
        </button>

        {/* 3. البحث الاجتماعي والتمكين */}
        <button
          type="button"
          onClick={() => onSelectSection('social')}
          className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
            activeSection === 'social'
              ? 'bg-sky-700 text-white border-sky-700 shadow-xs font-black'
              : 'bg-slate-50/60 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'social'
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              <CreditCard size={16} />
            </div>
            <div className="truncate">
              <span className="text-xs font-black block truncate">البحث الاجتماعي والتمكين</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'social' ? 'text-sky-100' : 'text-slate-400 font-medium'
                }`}
              >
                الدخل، الإعانات، والتمكين الأسري
              </span>
            </div>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeSection === 'social'
                ? 'bg-white/25 text-white'
                : hasSocialData
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-200/80 text-slate-500'
            }`}
          >
            {hasSocialData ? 'مسجل ✓' : 'غير مدون'}
          </span>
        </button>

        {/* 4. سجل وفيات الأسرة */}
        <button
          type="button"
          onClick={() => onSelectSection('deaths')}
          className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
            activeSection === 'deaths'
              ? 'bg-red-700 text-white border-red-700 shadow-xs font-black'
              : 'bg-slate-50/60 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'deaths'
                  ? 'bg-white/20 text-white'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <ShieldAlert size={16} />
            </div>
            <div className="truncate">
              <span className="text-xs font-black block truncate">سجل وفيات الأسرة</span>
              <span
                className={`text-[10px] block truncate ${
                  activeSection === 'deaths' ? 'text-red-100' : 'text-slate-400 font-medium'
                }`}
              >
                حالات الوفاة وأسبابها المسجلة
              </span>
            </div>
          </div>
          <span
            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
              activeSection === 'deaths'
                ? 'bg-white/25 text-white'
                : deathsCount > 0
                ? 'bg-red-100 text-red-800 font-bold border border-red-200'
                : 'bg-slate-200/80 text-slate-600'
            }`}
          >
            {deathsCount} وفيات
          </span>
        </button>

        {/* 5. الملف الصحي الشامل (الصف القابل للطي مع الـ 10 نماذج الفرعية) */}
        <div className="pt-1">
          <div
            className={`rounded-2xl transition-all border ${
              activeSection === 'clinical'
                ? 'bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border-purple-200 shadow-2xs'
                : 'bg-slate-50/60 hover:bg-slate-100 border-transparent hover:border-slate-200'
            }`}
          >
            {/* عنوان الملف الصحي الشامل الرئيسي */}
            <div
              onClick={handleClinicalParentClick}
              className="p-3 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    activeSection === 'clinical'
                      ? 'bg-gradient-to-br from-purple-700 to-indigo-700 text-white'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <Activity size={16} />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 block truncate">
                      الملف الصحي الشامل
                    </span>
                  </div>
                  <span className="text-[10px] text-purple-700 font-bold block truncate">
                    10 نماذج سريرية معتمدة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* ملخص الإنجاز المطلوب: X / 10 مكتمل */}
                <span
                  className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-full ${
                    completedModulesCount === totalModulesCount
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : completedModulesCount > 0
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {completedModulesCount} / {totalModulesCount} مكتمل
                </span>

                <button
                  type="button"
                  aria-label="طي أو توسيع نماذج الملف الصحي"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsClinicalExpanded(!isClinicalExpanded);
                  }}
                  className="p-1 hover:bg-black/5 rounded-lg transition-transform text-slate-500 cursor-pointer"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      isClinicalExpanded ? 'rotate-180 text-purple-700' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* النماذج الفرعية العشرة (Indented sub-rows تحت الملف الصحي الشامل) */}
            {isClinicalExpanded && (
              <div className="mr-5 ml-2 pr-3 pl-1 mb-2 border-r-2 border-purple-300/70 space-y-1 pt-1 animate-in fade-in duration-200">
                {activeMemberName && (
                  <div className="px-2 py-1 mb-1.5 bg-purple-100/50 rounded-lg text-[10px] font-bold text-purple-900 flex items-center justify-between">
                    <span>حالة نماذج: {activeMemberName}</span>
                    <span className="font-mono text-[9px] text-purple-600 font-black">
                      {completedModulesCount} منجز
                    </span>
                  </div>
                )}

                {clinicalModules.map((mod) => {
                  const ModIcon = mod.icon;
                  const isModActive =
                    activeSection === 'clinical' && activeClinicalModule === mod.id;

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => onSelectClinicalModule(mod.id)}
                      className={`w-full text-right p-2 rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer border text-xs ${
                        isModActive
                          ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-purple-700 shadow-xs font-black'
                          : 'bg-white hover:bg-purple-50/70 text-slate-700 border-slate-200/70 hover:border-purple-200 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* أيقونة الحالة المطلوبة: مكتمل (✓ أخضر) أو فاضي (دائرة فاضية رمادية) */}
                        {mod.isCompleted ? (
                          <CheckCircle2
                            size={14}
                            className={`shrink-0 ${
                              isModActive ? 'text-emerald-300' : 'text-emerald-500'
                            }`}
                            aria-label="مكتمل"
                          />
                        ) : (
                          <Circle
                            size={14}
                            className={`shrink-0 ${
                              isModActive ? 'text-white/40' : 'text-slate-300'
                            }`}
                            aria-label="فارغ - بحاجة لبيانات"
                          />
                        )}

                        <ModIcon
                          size={13}
                          className={`shrink-0 ${
                            isModActive ? 'text-purple-200' : 'text-slate-400'
                          }`}
                        />

                        <span className="truncate leading-tight text-[11px]">{mod.title}</span>
                      </div>

                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md shrink-0 font-black ${
                          isModActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {mod.num}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default FamilyUnifiedNavigationTree;
