import React from 'react';
import {
  Users,
  Home,
  CreditCard,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Circle,
  Shield,
  ClipboardList,
  Stethoscope,
  CalendarCheck,
  Baby,
  Heart,
  Smile,
  Award,
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
  viewMode?: 'continuous' | 'single';
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
  viewMode = 'continuous',
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
      {/* رأس القائمة الرأسية الموحدة */}
      <div className="p-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shadow-xs">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-800 leading-tight">
              أقسام ونماذج السجل الأسري
            </h3>
            <span className="text-[10px] font-bold text-slate-500 block">
              14 قسماً ونموذجاً معتمداً
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
          {completedModulesCount}/{totalModulesCount} سريري
        </span>
      </div>

      {/* قائمة التنقل الرأسية الموحدة لجميع النماذج */}
      <nav className="p-3 space-y-1.5 overflow-y-auto scrollbar-thin" aria-label="شجرة أقسام ونماذج السجل الأسري">
        {/* قسم بيانات الأسرة الأساسية */}
        <div className="px-1 pb-1 pt-0.5 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            سجلات وبيانات الأسرة
          </span>
          <span className="text-[9px] font-bold text-slate-400">4 أقسام</span>
        </div>

        {/* 1. سجل أفراد الأسرة */}
        <button
          type="button"
          onClick={() => onSelectSection('members')}
          className={`w-full text-right p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
            activeSection === 'members'
              ? 'bg-primary-600 text-white border-primary-600 shadow-xs font-black'
              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                activeSection === 'members'
                  ? 'bg-white/20 text-white'
                  : 'bg-primary-100 text-primary-700'
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
              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
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
                الغرف، المياه والمرافق
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
              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
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
                الدخل والتمكين الأسري
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
              : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-transparent hover:border-slate-200'
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
                حالات الوفاة وأسبابها
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

        {/* فاصل قسم النماذج الطبية السريرية الـ 10 */}
        <div className="pt-3 pb-1">
          <div className="px-1.5 py-1 flex items-center justify-between border-b border-slate-200/80 mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <Activity size={12} />
              </div>
              <span className="text-[11px] font-black text-slate-800">
                النماذج الطبية والسريرية
              </span>
            </div>
            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
              {completedModulesCount}/{totalModulesCount} مكتمل
            </span>
          </div>

          {activeMemberName && (
            <div className="px-2.5 py-1 mb-2 bg-purple-50 rounded-xl text-[10px] font-bold text-purple-900 flex items-center justify-between border border-purple-100">
              <span className="truncate">الفرد النشط: {activeMemberName}</span>
              <span className="font-mono text-[9px] text-purple-700 font-black shrink-0">
                {completedModulesCount} منجز
              </span>
            </div>
          )}
        </div>

        {/* النماذج الطبية السريرية الـ 10 كمكونات عادية مباشرة في القائمة */}
        {clinicalModules.map((mod) => {
          const ModIcon = mod.icon;
          const isModActive = activeSection === 'clinical' && activeClinicalModule === mod.id;

          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => onSelectClinicalModule(mod.id)}
              className={`w-full text-right p-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                isModActive
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white border-purple-700 shadow-xs font-black'
                  : 'bg-white hover:bg-purple-50/60 text-slate-700 border-slate-200/70 hover:border-purple-200 font-bold'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* أيقونة حالة الاكتمال */}
                {mod.isCompleted ? (
                  <CheckCircle2
                    size={16}
                    className={`shrink-0 ${
                      isModActive ? 'text-emerald-300' : 'text-emerald-600'
                    }`}
                    aria-label="مكتمل"
                  />
                ) : (
                  <Circle
                    size={16}
                    className={`shrink-0 ${
                      isModActive ? 'text-white/40' : 'text-slate-300'
                    }`}
                    aria-label="فارغ - بحاجة لبيانات"
                  />
                )}

                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isModActive
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100/70 text-purple-700'
                  }`}
                >
                  <ModIcon size={14} />
                </div>

                <div className="truncate">
                  <span className="text-xs font-black block truncate leading-tight">
                    {mod.title}
                  </span>
                  {mod.subTitle && (
                    <span
                      className={`text-[9px] block truncate font-mono ${
                        isModActive ? 'text-purple-200' : 'text-slate-400 font-medium'
                      }`}
                    >
                      {mod.subTitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {mod.isCompleted && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                      isModActive
                        ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    مسجل ✓
                  </span>
                )}
                <span
                  className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-lg ${
                    isModActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {mod.num}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default FamilyUnifiedNavigationTree;
