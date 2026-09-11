import React from 'react';
import { 
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp, LucideIcon, 
  HelpCircle, AlertTriangle, Check
} from 'lucide-react';

/**
 * Reusable Card container for clinical sub-sections.
 * Supports progressive disclosure (collapsible accordion) and visual hierarchy.
 */
interface ClinicalSectionCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: 'rose' | 'emerald' | 'indigo' | 'amber' | 'blue' | 'slate';
  color?: 'rose' | 'emerald' | 'indigo' | 'amber' | 'blue' | 'slate';
  collapsible?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const colorStyles = {
  rose: {
    border: 'border-rose-200/90',
    headerBg: 'bg-gradient-to-r from-rose-50/80 via-rose-50/40 to-white',
    iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
    title: 'text-rose-950',
    badge: 'bg-rose-100 text-rose-800 border-rose-200'
  },
  emerald: {
    border: 'border-emerald-200/90',
    headerBg: 'bg-gradient-to-r from-emerald-50/80 via-emerald-50/40 to-white',
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    title: 'text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  indigo: {
    border: 'border-indigo-200/90',
    headerBg: 'bg-gradient-to-r from-indigo-50/80 via-indigo-50/40 to-white',
    iconBg: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    title: 'text-indigo-950',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  amber: {
    border: 'border-amber-200/90',
    headerBg: 'bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-white',
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
    title: 'text-amber-950',
    badge: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  blue: {
    border: 'border-blue-200/90',
    headerBg: 'bg-gradient-to-r from-blue-50/80 via-blue-50/40 to-white',
    iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
    title: 'text-blue-950',
    badge: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  slate: {
    border: 'border-slate-200',
    headerBg: 'bg-gradient-to-r from-slate-50 via-slate-50/40 to-white',
    iconBg: 'bg-slate-100 text-slate-700 border-slate-200',
    title: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

export const ClinicalSectionCard: React.FC<ClinicalSectionCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'rose',
  color = 'slate',
  collapsible = false,
  isExpanded = true,
  onToggle,
  children,
  headerAction,
  footer,
  className = ''
}) => {
  const c = colorStyles[color] || colorStyles.slate;
  const b = colorStyles[badgeColor] || colorStyles.slate;

  return (
    <div className={`bg-white rounded-2xl border ${c.border} shadow-sm overflow-hidden transition-all ${className}`}>
      {/* Header */}
      <div 
        onClick={collapsible && onToggle ? onToggle : undefined}
        className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 ${c.headerBg} ${
          collapsible ? 'cursor-pointer select-none hover:bg-slate-50/80' : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 ${c.iconBg}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`text-sm font-black ${c.title} truncate`}>{title}</h4>
              {badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${b.badge}`}>
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-500 font-bold truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          {collapsible && (
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              aria-label={isExpanded ? 'طي القسم' : 'توسيع القسم'}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {(!collapsible || isExpanded) && (
        <div className="p-4 sm:p-5 space-y-4">
          {children}
          {footer && (
            <div className="pt-3 border-t border-slate-100">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Reusable Form Field Wrapper with label, mandatory indicator, error, and helper texts.
 */
interface ClinicalFormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  helperText?: string;
  className?: string;
  id?: string;
  badge?: string;
  children: React.ReactNode;
}

export const ClinicalFormField: React.FC<ClinicalFormFieldProps> = ({
  label,
  required = false,
  error,
  helperText,
  className = '',
  id,
  badge,
  children
}) => {
  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      <div className="flex items-center justify-between gap-1.5">
        <label htmlFor={id} className="font-black text-slate-700 flex items-center gap-1">
          <span>{label}</span>
          {required && (
            <span className="text-rose-600 font-bold" title="حقل إلزامي">*</span>
          )}
          {required && (
            <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-bold">
              إلزامي
            </span>
          )}
        </label>
        {badge && (
          <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>

      <div>
        {children}
      </div>

      {error ? (
        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 animate-in fade-in">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] font-bold text-slate-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};

/**
 * Reusable Circular Progress Ring for Modules
 */
interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  hasData?: boolean;
}

export const ModuleProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 20,
  strokeWidth = 2.5,
  color = '#4f46e5',
  hasData = false
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  if (hasData && percent >= 100) {
    return (
      <div 
        className="rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm"
        style={{ width: size, height: size }}
        title="مكتمل 100%"
      >
        <Check size={size * 0.65} strokeWidth={3} />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      {percent > 0 && percent < 100 && (
        <span className="absolute text-[8px] font-mono font-black text-slate-600">
          {Math.round(percent)}
        </span>
      )}
    </div>
  );
};

/**
 * Confirmation dialog for unsaved changes when navigating away.
 */
interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onDiscard: () => void;
  tabTitle?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onDiscard,
  tabTitle
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border-2 border-amber-300 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-base">تنبيه: توجد تعديلات لم يتم حفظها</h4>
            <p className="text-xs text-slate-600 font-bold mt-1">
              أنت تقوم حالياً بتعديل بيانات <span className="text-amber-800 font-black">"{tabTitle || 'النموذج'}"</span>. إذا غادرت الآن فستفقد البيانات التي قمت بإدخالها قبل الحفظ في قاعدة البيانات.
            </p>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold">
          هل تريد البقاء وحفظ البيانات أم تجاهل التعديلات والانتقال؟
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors"
          >
            تجاهل التغييرات والمتابعة
          </button>
          <button
            type="button"
            onClick={onStay}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all"
          >
            البقاء لإكمال الحفظ
          </button>
        </div>
      </div>
    </div>
  );
};
