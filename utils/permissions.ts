import { PERMISSIONS_MAP } from '../constants.ts';
import type { FinancialAccount, Permission, Store, User } from '../types.ts';

/**
 * تنبيه أمني صريح حول حدود حراسة الواجهة الأمامية (Client-Side Guards)
 * يُعرض في واجهة إدارة الصلاحيات وشاشات الحجب ويُستخدم في توثيق طبقة البيانات.
 */
export const CLIENT_GUARD_SECURITY_NOTICE =
  'تنبيه أمني: حراسة الواجهة الأمامية (UI / Client Guards) تنظّم صلاحيات العرض والتشغيل داخل المتصفح فقط، ولا تحمي الخادم أو قاعدة البيانات من الاستدعاءات المباشرة. الحماية الفعلية للخادم تتطلب تفعيل مصادقة Supabase Auth وسياسات أمن الصفوف (RLS) على الجداول في المرحلة النهائية.';

export type TabId =
  | 'dashboard'
  | 'notifications'
  | 'activePatients'
  | 'reception'
  | 'sessionReception'
  | 'clinicReception'
  | 'patients'
  | 'familyFiles'
  | 'medicalRecords'
  | 'clinics'
  | 'pharmacy'
  | 'lab'
  | 'billing'
  | 'employees'
  | 'inventory'
  | 'finance'
  | 'reports'
  | 'users'
  | 'setup';

/**
 * خريطة ربط كل تبويب في النظام بمفاتيح الصلاحيات المحددة له.
 * إذا كانت القيمة مصفوفة مفاتيح (مثل بوابة الاستقبال الموحدة)، يكفي امتلاك أحد المفاتيح لفتح البوابة،
 * مع تقييد كل قسم داخلي بمفتاحه الخاص.
 */
export const TAB_PERMISSIONS_MAP: Record<TabId, Permission[]> = {
  dashboard: ['VIEW_DASHBOARD', 'MANAGE_DASHBOARD'],
  notifications: ['VIEW_NOTIFICATIONS', 'MANAGE_NOTIFICATIONS'],
  activePatients: ['VIEW_RECEPTION', 'MANAGE_RECEPTION'],
  reception: ['VIEW_RECEPTION', 'MANAGE_RECEPTION', 'VIEW_CLINIC_RECEPTION', 'MANAGE_CLINIC_RECEPTION'],
  sessionReception: ['VIEW_RECEPTION', 'MANAGE_RECEPTION'],
  clinicReception: ['VIEW_CLINIC_RECEPTION', 'MANAGE_CLINIC_RECEPTION'],
  patients: ['VIEW_PATIENTS', 'MANAGE_PATIENTS'],
  familyFiles: ['VIEW_FAMILY_HEALTH', 'MANAGE_FAMILY_HEALTH'],
  medicalRecords: ['VIEW_MEDICAL_RECORDS', 'MANAGE_MEDICAL_RECORDS', 'MANAGE_PATIENTS'],
  clinics: ['VIEW_CLINICS', 'MANAGE_CLINICS'],
  pharmacy: ['VIEW_PHARMACY', 'MANAGE_PHARMACY'],
  lab: ['VIEW_LAB', 'MANAGE_LAB'],
  billing: ['VIEW_BILLING', 'MANAGE_BILLING'],
  employees: ['VIEW_PAYROLL', 'MANAGE_PAYROLL'],
  inventory: ['VIEW_INVENTORY', 'MANAGE_INVENTORY'],
  finance: ['VIEW_FINANCE', 'MANAGE_FINANCE'],
  reports: ['VIEW_REPORTS', 'MANAGE_REPORTS'],
  users: ['VIEW_USERS', 'MANAGE_USERS'],
  setup: ['VIEW_SETUP', 'SYSTEM_SETUP']
};

export const TAB_MANAGE_PERMISSIONS_MAP: Record<TabId, Permission[]> = {
  dashboard: ['MANAGE_DASHBOARD', 'VIEW_DASHBOARD'],
  notifications: ['MANAGE_NOTIFICATIONS', 'VIEW_NOTIFICATIONS'],
  activePatients: ['MANAGE_RECEPTION'],
  reception: ['MANAGE_RECEPTION', 'MANAGE_CLINIC_RECEPTION'],
  sessionReception: ['MANAGE_RECEPTION'],
  clinicReception: ['MANAGE_CLINIC_RECEPTION'],
  patients: ['MANAGE_PATIENTS'],
  familyFiles: ['MANAGE_FAMILY_HEALTH'],
  medicalRecords: ['MANAGE_MEDICAL_RECORDS', 'MANAGE_PATIENTS', 'VIEW_MEDICAL_RECORDS'],
  clinics: ['MANAGE_CLINICS'],
  pharmacy: ['MANAGE_PHARMACY'],
  lab: ['MANAGE_LAB'],
  billing: ['MANAGE_BILLING'],
  employees: ['MANAGE_PAYROLL'],
  inventory: ['MANAGE_INVENTORY'],
  finance: ['MANAGE_FINANCE'],
  reports: ['MANAGE_REPORTS', 'VIEW_REPORTS'],
  users: ['MANAGE_USERS'],
  setup: ['SYSTEM_SETUP']
};

export const ORDERED_TABS: TabId[] = [
  'dashboard',
  'reception',
  'clinics',
  'familyFiles',
  'patients',
  'medicalRecords',
  'pharmacy',
  'lab',
  'billing',
  'finance',
  'inventory',
  'employees',
  'reports',
  'users',
  'setup',
  'notifications'
];

export type UserLike = Pick<User, 'permissions'> & Partial<Pick<User, 'id' | 'name' | 'username'>> | null | undefined;

export function getUserPermissionsList(user: UserLike): string[] {
  if (!user || !Array.isArray(user.permissions)) return [];
  return user.permissions.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
}

export function hasPermissionKey(user: UserLike, key: Permission): boolean {
  if (!key) return false;
  const perms = getUserPermissionsList(user);
  return perms.includes(key);
}

export function hasAnyPermissionKey(user: UserLike, keys: Permission[]): boolean {
  if (!Array.isArray(keys) || keys.length === 0) return false;
  const perms = getUserPermissionsList(user);
  return keys.some((k) => perms.includes(k));
}

export function getPermissionArabicLabel(key: string): string {
  if (PERMISSIONS_MAP[key]) return PERMISSIONS_MAP[key];
  if (key.startsWith('ACCOUNT_VIEW:')) return `مشاهدة خزينة/حساب (${key.split(':')[1]})`;
  if (key.startsWith('ACCOUNT_MANAGE:')) return `إدارة خزينة/حساب (${key.split(':')[1]})`;
  if (key.startsWith('STORE_VIEW:')) return `مشاهدة مخزن (${key.split(':')[1]})`;
  if (key.startsWith('STORE_MANAGE:')) return `إدارة مخزن (${key.split(':')[1]})`;
  return key;
}

/**
 * فحص صلاحية الوصول لتبويب معين بناءً على مفاتيح الصلاحيات الفعلية للمستخدم (قراءة أو إدارة حيث توجد)،
 * وليس بمجرد وجود currentUser.
 */
export function canAccessTab(user: UserLike, tab: string): boolean {
  const perms = getUserPermissionsList(user);
  if (perms.length === 0) return false;

  const required = TAB_PERMISSIONS_MAP[tab as TabId];
  if (!required || required.length === 0) {
    return false;
  }
  if (required.some((permKey) => perms.includes(permKey))) {
    return true;
  }

  // دعم صلاحيات القراءة/الإدارة المخصصة على مستوى الحسابات المالية أو المخازن لفتح تبويب القسم المقابل فقط
  if (tab === 'finance') {
    return perms.some((p) => p.startsWith('ACCOUNT_VIEW:') || p.startsWith('ACCOUNT_MANAGE:'));
  }
  if (tab === 'inventory') {
    return perms.some((p) => p.startsWith('STORE_VIEW:') || p.startsWith('STORE_MANAGE:'));
  }

  return false;
}

export function canManageTab(user: UserLike, tab: string): boolean {
  const perms = getUserPermissionsList(user);
  if (perms.length === 0) return false;

  const manageKeys = TAB_MANAGE_PERMISSIONS_MAP[tab as TabId];
  if (!manageKeys || manageKeys.length === 0) return false;
  if (manageKeys.some((permKey) => perms.includes(permKey))) {
    return true;
  }
  if (tab === 'finance') {
    return perms.some((p) => p.startsWith('ACCOUNT_MANAGE:'));
  }
  if (tab === 'inventory') {
    return perms.some((p) => p.startsWith('STORE_MANAGE:'));
  }
  return false;
}

export interface TabDenialInfo {
  allowed: boolean;
  tab: string;
  requiredPermissions: string[];
  requiredLabels: string[];
  reason: string;
  securityNotice: string;
}

export function getTabDenialInfo(user: UserLike, tab: string): TabDenialInfo {
  const allowed = canAccessTab(user, tab);
  const required = TAB_PERMISSIONS_MAP[tab as TabId] || [];
  const requiredLabels = Array.from(new Set(required.map(getPermissionArabicLabel)));

  if (allowed) {
    return {
      allowed: true,
      tab,
      requiredPermissions: required,
      requiredLabels,
      reason: '',
      securityNotice: CLIENT_GUARD_SECURITY_NOTICE
    };
  }

  const perms = getUserPermissionsList(user);
  let reason = '';
  if (!user) {
    reason = 'لم يتم تسجيل الدخول بحساب مستخدم صالح.';
  } else if (perms.length === 0) {
    reason = 'هذا الحساب لا يملك أي صلاحيات مفعّلة حالياً في النظام. يرجى مراجعة مدير النظام لمنح الصلاحيات اللازمة.';
  } else if (required.length > 0) {
    const labelsText = requiredLabels.join(' أو ');
    const keysText = required.join(' | ');
    reason = `حسابك الحالي لا يملك صلاحية (${labelsText}) المطلوبة لفتح هذا التبويب [المفتاح المطلوب: ${keysText}].`;
  } else {
    reason = `هذا التبويب (${tab}) غير معرّف في جدول الصلاحيات أو غير مصرح بالوصول إليه.`;
  }

  return {
    allowed: false,
    tab,
    requiredPermissions: required,
    requiredLabels,
    reason,
    securityNotice: CLIENT_GUARD_SECURITY_NOTICE
  };
}

/**
 * إرجاع أول تبويب مسموح للمستخدم التوجه إليه بدلاً من التوجيه الأعمى إلى لوحة التحكم.
 */
export function getFirstAllowedTab(user: UserLike): TabId | null {
  for (const tab of ORDERED_TABS) {
    if (canAccessTab(user, tab)) {
      return tab;
    }
  }
  return null;
}

// ============================================================================
// توحيد منطق صلاحيات الخزن والحسابات المالية (Financial Accounts & Safes)
// ============================================================================
// القاعدة الصارمة:
// 1. لا تُمنح صلاحية مشاهدة أو إدارة كل الحسابات المالية لمجرد امتلاك:
//    - MANAGE_ACCOUNTS ("تعريف وإدارة الخزن والحسابات البنكية")
//    - أو MANAGE_FINANCE ("إدارة الحسابات والمالية")
//    - أو SYSTEM_SETUP ("إعدادات النظام")
// 2. الوصول لأي خزينة/حساب مالي محدد يتطلب تخصيصه صراحةً عبر:
//    - ACCOUNT_VIEW:<accountId> أو ACCOUNT_MANAGE:<accountId> للمشاهدة
//    - ACCOUNT_MANAGE:<accountId> للإدارة والقبض والصرف والتعديل والحذف
// 3. لا يتم توسيع الوصول افتراضياً لأي حساب غير مخصص.

export function canViewAccount(user: UserLike, accountOrId: FinancialAccount | string): boolean {
  const accountId = typeof accountOrId === 'string' ? accountOrId : accountOrId?.id;
  if (!accountId) return false;
  const perms = getUserPermissionsList(user);
  return perms.includes(`ACCOUNT_VIEW:${accountId}`) || perms.includes(`ACCOUNT_MANAGE:${accountId}`);
}

export function canManageAccount(user: UserLike, accountOrId: FinancialAccount | string): boolean {
  const accountId = typeof accountOrId === 'string' ? accountOrId : accountOrId?.id;
  if (!accountId) return false;
  const perms = getUserPermissionsList(user);
  return perms.includes(`ACCOUNT_MANAGE:${accountId}`);
}

export function getVisibleAccounts(user: UserLike, accounts: FinancialAccount[]): FinancialAccount[] {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((acc) => canViewAccount(user, acc.id));
}

export function getManageableAccounts(user: UserLike, accounts: FinancialAccount[]): FinancialAccount[] {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((acc) => canManageAccount(user, acc.id));
}

export interface UserAccountPermissionAnalysis {
  visibleAccounts: FinancialAccount[];
  manageableAccounts: FinancialAccount[];
  viewOnlyAccounts: FinancialAccount[];
  unassignedAccounts: FinancialAccount[];
  orphanedAccountIds: string[];
  hasFinanceModulePerm: boolean;
  hasAccountDefPerm: boolean;
  hasContradiction: boolean;
  summaryText: string;
  denialReason: string;
}

export function analyzeUserAccountPermissions(
  user: UserLike,
  accounts: FinancialAccount[]
): UserAccountPermissionAnalysis {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const perms = getUserPermissionsList(user);

  const visibleAccounts = getVisibleAccounts(user, safeAccounts);
  const manageableAccounts = getManageableAccounts(user, safeAccounts);
  const viewOnlyAccounts = visibleAccounts.filter((acc) => !canManageAccount(user, acc.id));
  const unassignedAccounts = safeAccounts.filter((acc) => !canViewAccount(user, acc.id));

  const activeAccountIds = new Set(safeAccounts.map((a) => a.id));
  const referencedIds = new Set<string>();
  for (const p of perms) {
    if (p.startsWith('ACCOUNT_VIEW:') || p.startsWith('ACCOUNT_MANAGE:')) {
      const id = p.split(':')[1]?.trim();
      if (id) referencedIds.add(id);
    }
  }
  const orphanedAccountIds = Array.from(referencedIds).filter(
    (id) => safeAccounts.length > 0 && !activeAccountIds.has(id)
  );

  const hasFinanceModulePerm = perms.includes('MANAGE_FINANCE') || perms.includes('VIEW_FINANCE');
  const hasAccountDefPerm = perms.includes('MANAGE_ACCOUNTS');

  // التناقض يحدث عندما يمتلك المستخدم صلاحية قسم المالية أو تعريف الخزن أو معرف خزينة محذوف،
  // لكن لا توجد أي خزينة نشطة مخصصة له فعلياً.
  const hasContradiction =
    visibleAccounts.length === 0 &&
    (hasFinanceModulePerm || hasAccountDefPerm || orphanedAccountIds.length > 0);

  let summaryText = '';
  if (visibleAccounts.length === 0) {
    if (hasContradiction) {
      summaryText = 'لا توجد خزن نشطة مخصصة لهذا المستخدم (تعارض صلاحيات يتطلب تخصيص خزينة)';
    } else {
      summaryText = 'غير مخصص له أي خزينة أو حساب بنكي';
    }
  } else {
    const parts = visibleAccounts.map((acc) => {
      const mode = canManageAccount(user, acc.id) ? 'إدارة: قبض وصرف' : 'مشاهدة فقط';
      return `${acc.name} (${mode})`;
    });
    summaryText = parts.join(' ، ');
  }

  let denialReason = '';
  if (visibleAccounts.length === 0) {
    const reasons: string[] = [];
    if (hasFinanceModulePerm || hasAccountDefPerm) {
      const heldLabels = [
        hasFinanceModulePerm ? `«${PERMISSIONS_MAP.MANAGE_FINANCE}»` : null,
        hasAccountDefPerm ? `«${PERMISSIONS_MAP.MANAGE_ACCOUNTS}»` : null
      ]
        .filter(Boolean)
        .join(' و');
      reasons.push(
        `امتلاك صلاحية ${heldLabels} يمنح حق فتح شاشة القسم فقط ولا يمنح تلقائياً صلاحية كشف أو إدارة كافة الخزن والحسابات.`
      );
    }
    if (orphanedAccountIds.length > 0) {
      reasons.push(
        `يوجد في ملف صلاحيات المستخدم ربط بمعرّف خزينة قديم/محذوف غير موجود حالياً في قائمة الخزن النشطة (${orphanedAccountIds.join(', ')}).`
      );
    }
    if (safeAccounts.length > 0) {
      const availableNames = safeAccounts.map((a) => a.name).join('، ');
      reasons.push(
        `لم يتم تخصيص أي حساب من الحسابات النشطة الحالية (${availableNames}) لهذا المستخدم عبر مفاتيح ACCOUNT_VIEW أو ACCOUNT_MANAGE. يرجى من مدير النظام فتح «إدارة الحسابات» وتحديد الخزينة المسموحة صراحةً.`
      );
    } else {
      reasons.push('لا توجد خزن أو حسابات مالية معرّفة حالياً في النظام.');
    }
    denialReason = reasons.join(' ');
  }

  return {
    visibleAccounts,
    manageableAccounts,
    viewOnlyAccounts,
    unassignedAccounts,
    orphanedAccountIds,
    hasFinanceModulePerm,
    hasAccountDefPerm,
    hasContradiction,
    summaryText,
    denialReason
  };
}

export function getAccountDenialReason(
  user: UserLike,
  accountId: string,
  action: 'view' | 'manage',
  accounts: FinancialAccount[] = []
): string {
  const targetAccount = accounts.find((a) => a.id === accountId);
  const accountLabel = targetAccount ? `«${targetAccount.name}»` : `(${accountId})`;
  const perms = getUserPermissionsList(user);
  const hasFinanceOrDef = perms.includes('MANAGE_FINANCE') || perms.includes('VIEW_FINANCE') || perms.includes('MANAGE_ACCOUNTS');

  if (action === 'view' && !canViewAccount(user, accountId)) {
    return `غير مصرح لك بمشاهدة رصيد أو حركات الحساب المالي ${accountLabel} لعدم تخصيص صلاحية (ACCOUNT_VIEW:${accountId} أو ACCOUNT_MANAGE:${accountId}) لحسابك.${
      hasFinanceOrDef ? ' ملاحظة: صلاحية إدارة المالية/تعريف الخزن لا تمنح الوصول التلقائي للحسابات غير المخصصة.' : ''
    }`;
  }

  if (action === 'manage' && !canManageAccount(user, accountId)) {
    const canView = canViewAccount(user, accountId);
    if (canView) {
      return `تملك صلاحية المشاهدة فقط على الحساب ${accountLabel}، ولا تملك صلاحية الإدارة (قبض/صرف/تعديل) [المفتاح المطلوب: ACCOUNT_MANAGE:${accountId}].`;
    }
    return `الحساب المالي ${accountLabel} غير مخصص لك ولا تملك صلاحية الإدارة عليه [المفتاح المطلوب: ACCOUNT_MANAGE:${accountId}].${
      hasFinanceOrDef ? ' صلاحية إدارة الخزن لا تمنح صلاحية الصرف أو القبض على كل الحسابات تلقائياً.' : ''
    }`;
  }

  return '';
}

// ============================================================================
// توحيد منطق صلاحيات المخازن (Stores)
// ============================================================================

export function canViewStore(user: UserLike, storeOrId: Store | string): boolean {
  const storeId = typeof storeOrId === 'string' ? storeOrId : storeOrId?.id;
  if (!storeId) return false;
  const perms = getUserPermissionsList(user);
  return perms.includes(`STORE_VIEW:${storeId}`) || perms.includes(`STORE_MANAGE:${storeId}`);
}

export function canManageStore(user: UserLike, storeOrId: Store | string): boolean {
  const storeId = typeof storeOrId === 'string' ? storeOrId : storeOrId?.id;
  if (!storeId) return false;
  const perms = getUserPermissionsList(user);
  return perms.includes(`STORE_MANAGE:${storeId}`);
}

export function getVisibleStores(user: UserLike, stores: Store[]): Store[] {
  if (!Array.isArray(stores)) return [];
  return stores.filter((s) => canViewStore(user, s.id));
}

export function getManageableStores(user: UserLike, stores: Store[]): Store[] {
  if (!Array.isArray(stores)) return [];
  return stores.filter((s) => canManageStore(user, s.id));
}

// ============================================================================
// حراسة عمليات CRUD على مستوى الواجهة وطبقة البيانات (Client-Side CRUD Guards)
// ============================================================================

export type CrudResource =
  | 'patients'
  | 'sessions'
  | 'clinic_reception'
  | 'clinics'
  | 'family_files'
  | 'medical_records'
  | 'lab'
  | 'pharmacy'
  | 'billing'
  | 'payroll'
  | 'inventory'
  | 'stores'
  | 'finance_tx'
  | 'financial_accounts'
  | 'users'
  | 'setup';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface CrudPermissionCheckResult {
  allowed: boolean;
  requiredPermissions: string[];
  reason: string;
}

export function checkCrudPermission(
  user: UserLike,
  resource: CrudResource,
  action: CrudAction,
  targetId?: string
): CrudPermissionCheckResult {
  const perms = getUserPermissionsList(user);
  if (!user || perms.length === 0) {
    return {
      allowed: false,
      requiredPermissions: [],
      reason: 'لا تملك صلاحيات مفعّلة لتنفيذ هذه العملية. يرجى مراجعة إدارة النظام.'
    };
  }

  switch (resource) {
    case 'users': {
      if (action === 'read') {
        const ok = perms.includes('MANAGE_USERS') || perms.includes('VIEW_USERS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_USERS', 'MANAGE_USERS'],
          reason: ok ? '' : `عرض حسابات النظام يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_USERS}» (MANAGE_USERS أو VIEW_USERS).`
        };
      }
      const ok = perms.includes('MANAGE_USERS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_USERS'],
        reason: ok ? '' : `عملية (${action}) على حسابات النظام تتطلب صلاحية الإدارة «${PERMISSIONS_MAP.MANAGE_USERS}» (MANAGE_USERS).`
      };
    }

    case 'financial_accounts': {
      // إنشاء حساب مالي جديد يتطلب صلاحية تعريف وإدارة الخزن (MANAGE_ACCOUNTS) أو إعدادات النظام (SYSTEM_SETUP)
      if (action === 'create') {
        const ok = perms.includes('MANAGE_ACCOUNTS') || perms.includes('SYSTEM_SETUP');
        return {
          allowed: ok,
          requiredPermissions: ['MANAGE_ACCOUNTS'],
          reason: ok
            ? ''
            : `تعريف خزينة أو حساب بنكي جديد يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_ACCOUNTS}» (MANAGE_ACCOUNTS).`
        };
      }
      // قراءة تفاصيل رصيد حساب محدد تتطلب تخصيص الحساب (ACCOUNT_VIEW:<id> أو ACCOUNT_MANAGE:<id>)
      if (action === 'read' && targetId) {
        const ok = canViewAccount(user, targetId);
        return {
          allowed: ok,
          requiredPermissions: [`ACCOUNT_VIEW:${targetId}`, `ACCOUNT_MANAGE:${targetId}`],
          reason: ok ? '' : getAccountDenialReason(user, targetId, 'view')
        };
      }
      // تعديل أو حذف خزينة قائمة يتطلب: صلاحية تعريف الخزن (MANAGE_ACCOUNTS أو SYSTEM_SETUP) + صلاحية إدارة هذه الخزينة المحددة (ACCOUNT_MANAGE:<id>)
      if ((action === 'update' || action === 'delete') && targetId) {
        const hasDefPerm = perms.includes('MANAGE_ACCOUNTS') || perms.includes('SYSTEM_SETUP');
        const hasTargetManage = canManageAccount(user, targetId);
        const ok = hasDefPerm && hasTargetManage;
        return {
          allowed: ok,
          requiredPermissions: ['MANAGE_ACCOUNTS', `ACCOUNT_MANAGE:${targetId}`],
          reason: ok
            ? ''
            : !hasDefPerm
            ? `تعديل أو حذف الخزن يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_ACCOUNTS}» (MANAGE_ACCOUNTS).`
            : `لا يمكن تعديل أو حذف هذا الحساب المالي لأنه غير مخصص لك بصلاحية إدارة (ACCOUNT_MANAGE:${targetId}). صلاحية تعريف الخزن لا تمنح التحكم في الخزن غير المخصصة لك.`
        };
      }
      const ok =
        perms.includes('MANAGE_ACCOUNTS') ||
        perms.includes('MANAGE_FINANCE') ||
        perms.includes('VIEW_FINANCE') ||
        perms.includes('SYSTEM_SETUP');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_ACCOUNTS'],
        reason: ok ? '' : `هذه العملية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_ACCOUNTS}».`
      };
    }

    case 'finance_tx': {
      const hasFinanceReadPerm =
        perms.includes('MANAGE_FINANCE') ||
        perms.includes('VIEW_FINANCE') ||
        perms.includes('MANAGE_BILLING') ||
        perms.includes('VIEW_BILLING') ||
        perms.some((p) => p.startsWith('ACCOUNT_VIEW:') || p.startsWith('ACCOUNT_MANAGE:'));
      const hasFinanceManagePerm =
        perms.includes('MANAGE_FINANCE') ||
        perms.includes('MANAGE_BILLING') ||
        perms.some((p) => p.startsWith('ACCOUNT_MANAGE:'));
      if (action === 'read') {
        if (targetId) {
          const ok = hasFinanceReadPerm && canViewAccount(user, targetId);
          return {
            allowed: ok,
            requiredPermissions: ['VIEW_FINANCE', 'MANAGE_FINANCE', `ACCOUNT_VIEW:${targetId}`],
            reason: ok ? '' : getAccountDenialReason(user, targetId, 'view')
          };
        }
        return {
          allowed: hasFinanceReadPerm,
          requiredPermissions: ['VIEW_FINANCE', 'MANAGE_FINANCE'],
          reason: hasFinanceReadPerm ? '' : `عرض المعاملات المالية يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_FINANCE}».`
        };
      }
      // إنشاء/تعديل/حذف معاملة مالية (قبض/صرف) على حساب مالي يتطلب صراحةً ACCOUNT_MANAGE:<accountId>
      if (!targetId) {
        return {
          allowed: false,
          requiredPermissions: ['MANAGE_FINANCE', 'ACCOUNT_MANAGE:<account_id>'],
          reason: 'يجب تحديد الحساب المالي/الخزينة المستهدفة والتحقق من صلاحية إدارتها قبل تسجيل المعاملة.'
        };
      }
      const canManageTarget = canManageAccount(user, targetId);
      const ok = hasFinanceManagePerm && canManageTarget;
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_FINANCE', `ACCOUNT_MANAGE:${targetId}`],
        reason: ok
          ? ''
          : !hasFinanceManagePerm
          ? `تسجيل المعاملات المالية يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_FINANCE}» (MANAGE_FINANCE).`
          : getAccountDenialReason(user, targetId, 'manage')
      };
    }

    case 'stores': {
      if (action === 'create') {
        const ok = perms.includes('MANAGE_STORES') || perms.includes('SYSTEM_SETUP');
        return {
          allowed: ok,
          requiredPermissions: ['MANAGE_STORES'],
          reason: ok ? '' : `تعريف مخزن جديد يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_STORES}» (MANAGE_STORES).`
        };
      }
      if ((action === 'update' || action === 'delete') && targetId) {
        const hasDef = perms.includes('MANAGE_STORES') || perms.includes('SYSTEM_SETUP');
        const hasTarget = canManageStore(user, targetId);
        const ok = hasDef && hasTarget;
        return {
          allowed: ok,
          requiredPermissions: ['MANAGE_STORES', `STORE_MANAGE:${targetId}`],
          reason: ok
            ? ''
            : !hasDef
            ? `تعديل أو حذف المخازن يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_STORES}».`
            : `لا تملك صلاحية إدارة هذا المخزن المحدد (STORE_MANAGE:${targetId}).`
        };
      }
      const ok =
        perms.includes('MANAGE_STORES') ||
        perms.includes('MANAGE_INVENTORY') ||
        perms.includes('VIEW_INVENTORY') ||
        perms.includes('SYSTEM_SETUP');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_STORES'],
        reason: ok ? '' : `هذه العملية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_STORES}».`
      };
    }

    case 'inventory': {
      if (action === 'read') {
        const hasInvRead =
          perms.includes('MANAGE_INVENTORY') ||
          perms.includes('VIEW_INVENTORY') ||
          perms.includes('MANAGE_PHARMACY') ||
          perms.includes('VIEW_PHARMACY') ||
          perms.some((p) => p.startsWith('STORE_VIEW:') || p.startsWith('STORE_MANAGE:'));
        if (targetId) {
          const ok = hasInvRead && canViewStore(user, targetId);
          return {
            allowed: ok,
            requiredPermissions: ['VIEW_INVENTORY', 'MANAGE_INVENTORY', `STORE_VIEW:${targetId}`],
            reason: ok ? '' : `غير مصرح لك بمشاهدة أرصدة هذا المخزن المحدد (STORE_VIEW:${targetId}).`
          };
        }
        return {
          allowed: hasInvRead,
          requiredPermissions: ['VIEW_INVENTORY', 'MANAGE_INVENTORY'],
          reason: hasInvRead ? '' : `عرض المخزون يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_INVENTORY}».`
        };
      }
      const hasInvManage = perms.includes('MANAGE_INVENTORY') || perms.includes('MANAGE_PHARMACY');
      if (targetId) {
        const hasStoreManage = canManageStore(user, targetId);
        const ok = hasInvManage && hasStoreManage;
        return {
          allowed: ok,
          requiredPermissions: ['MANAGE_INVENTORY', `STORE_MANAGE:${targetId}`],
          reason: ok
            ? ''
            : !hasInvManage
            ? `إدارة حركات المخزون تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_INVENTORY}».`
            : `لا تملك صلاحية الصرف أو التوريد على هذا المخزن المحدد (STORE_MANAGE:${targetId}).`
        };
      }
      return {
        allowed: hasInvManage,
        requiredPermissions: ['MANAGE_INVENTORY'],
        reason: hasInvManage ? '' : `هذه العملية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_INVENTORY}».`
      };
    }

    case 'patients': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_PATIENTS') ||
          perms.includes('MANAGE_PATIENTS') ||
          perms.includes('VIEW_MEDICAL_RECORDS') ||
          perms.includes('VIEW_RECEPTION') ||
          perms.includes('MANAGE_RECEPTION') ||
          perms.includes('VIEW_CLINIC_RECEPTION') ||
          perms.includes('MANAGE_CLINIC_RECEPTION') ||
          perms.includes('VIEW_FAMILY_HEALTH') ||
          perms.includes('MANAGE_FAMILY_HEALTH') ||
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_PATIENTS', 'MANAGE_PATIENTS'],
          reason: ok ? '' : `عرض سجلات المرضى يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PATIENTS}».`
        };
      }
      const ok =
        perms.includes('MANAGE_PATIENTS') ||
        perms.includes('MANAGE_RECEPTION') ||
        perms.includes('MANAGE_CLINIC_RECEPTION') ||
        perms.includes('MANAGE_FAMILY_HEALTH') ||
        perms.includes('MANAGE_CLINICS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_PATIENTS'],
        reason: ok ? '' : `إدارة وتعديل سجلات المرضى تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PATIENTS}».`
      };
    }

    case 'sessions': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_RECEPTION') ||
          perms.includes('MANAGE_RECEPTION') ||
          perms.includes('VIEW_PATIENTS') ||
          perms.includes('MANAGE_PATIENTS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_RECEPTION', 'MANAGE_RECEPTION'],
          reason: ok ? '' : `عرض جلسات الغسيل يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_RECEPTION}».`
        };
      }
      const ok = perms.includes('MANAGE_RECEPTION') || perms.includes('MANAGE_PATIENTS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_RECEPTION'],
        reason: ok ? '' : `إدارة جلسات الغسيل تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_RECEPTION}».`
      };
    }

    case 'clinic_reception': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_CLINIC_RECEPTION') ||
          perms.includes('MANAGE_CLINIC_RECEPTION') ||
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_CLINIC_RECEPTION', 'MANAGE_CLINIC_RECEPTION'],
          reason: ok ? '' : `عرض استقبال العيادات يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_CLINIC_RECEPTION}».`
        };
      }
      const ok = perms.includes('MANAGE_CLINIC_RECEPTION') || perms.includes('MANAGE_CLINICS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_CLINIC_RECEPTION'],
        reason: ok ? '' : `إدارة حجز واستقبال العيادات تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_CLINIC_RECEPTION}».`
      };
    }

    case 'clinics': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS') ||
          perms.includes('VIEW_CLINIC_RECEPTION') ||
          perms.includes('MANAGE_CLINIC_RECEPTION') ||
          perms.includes('VIEW_FAMILY_HEALTH') ||
          perms.includes('MANAGE_FAMILY_HEALTH');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_CLINICS', 'MANAGE_CLINICS'],
          reason: ok ? '' : `عرض العيادات يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_CLINICS}».`
        };
      }
      const ok =
        perms.includes('MANAGE_CLINICS') ||
        perms.includes('MANAGE_CLINIC_RECEPTION') ||
        perms.includes('MANAGE_FAMILY_HEALTH');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_CLINICS'],
        reason: ok ? '' : `إدارة العيادات والكشف تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_CLINICS}».`
      };
    }

    case 'family_files': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_FAMILY_HEALTH') ||
          perms.includes('MANAGE_FAMILY_HEALTH') ||
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_FAMILY_HEALTH', 'MANAGE_FAMILY_HEALTH'],
          reason: ok ? '' : `عرض الملفات العائلية يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_FAMILY_HEALTH}».`
        };
      }
      const ok = perms.includes('MANAGE_FAMILY_HEALTH') || perms.includes('MANAGE_CLINICS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_FAMILY_HEALTH'],
        reason: ok ? '' : `إدارة الملفات العائلية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_FAMILY_HEALTH}».`
      };
    }

    case 'medical_records': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_MEDICAL_RECORDS') ||
          perms.includes('MANAGE_MEDICAL_RECORDS') ||
          perms.includes('VIEW_PATIENTS') ||
          perms.includes('MANAGE_PATIENTS') ||
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_MEDICAL_RECORDS'],
          reason: ok ? '' : `الوصول للسجلات الطبية يتطلب صلاحية «${PERMISSIONS_MAP.VIEW_MEDICAL_RECORDS}».`
        };
      }
      const ok =
        perms.includes('MANAGE_MEDICAL_RECORDS') ||
        perms.includes('MANAGE_PATIENTS') ||
        perms.includes('MANAGE_CLINICS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_PATIENTS'],
        reason: ok ? '' : `تعديل السجلات الطبية يتطلب صلاحية إدارة المرضى أو العيادات.`
      };
    }

    case 'lab': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_LAB') ||
          perms.includes('MANAGE_LAB') ||
          perms.includes('VIEW_CLINICS') ||
          perms.includes('MANAGE_CLINICS');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_LAB', 'MANAGE_LAB'],
          reason: ok ? '' : `عرض التحاليل المعملية يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_LAB}».`
        };
      }
      const ok = perms.includes('MANAGE_LAB') || perms.includes('MANAGE_CLINICS');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_LAB'],
        reason: ok ? '' : `إدارة التحاليل المعملية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_LAB}».`
      };
    }

    case 'pharmacy': {
      if (action === 'read') {
        const ok = perms.includes('VIEW_PHARMACY') || perms.includes('MANAGE_PHARMACY');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_PHARMACY', 'MANAGE_PHARMACY'],
          reason: ok ? '' : `عرض الصيدلية يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PHARMACY}».`
        };
      }
      const ok = perms.includes('MANAGE_PHARMACY');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_PHARMACY'],
        reason: ok ? '' : `إدارة الصيدلية وصرف الأدوية تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PHARMACY}».`
      };
    }

    case 'billing': {
      if (action === 'read') {
        const ok =
          perms.includes('VIEW_BILLING') ||
          perms.includes('MANAGE_BILLING') ||
          perms.includes('VIEW_FINANCE') ||
          perms.includes('MANAGE_FINANCE');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_BILLING', 'MANAGE_BILLING'],
          reason: ok ? '' : `عرض الفواتير يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_BILLING}».`
        };
      }
      const ok = perms.includes('MANAGE_BILLING') || perms.includes('MANAGE_FINANCE');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_BILLING'],
        reason: ok ? '' : `إدارة الفواتير تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_BILLING}».`
      };
    }

    case 'payroll': {
      if (action === 'read') {
        const ok = perms.includes('VIEW_PAYROLL') || perms.includes('MANAGE_PAYROLL');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_PAYROLL', 'MANAGE_PAYROLL'],
          reason: ok ? '' : `عرض الموظفين والرواتب يتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PAYROLL}».`
        };
      }
      const ok = perms.includes('MANAGE_PAYROLL');
      return {
        allowed: ok,
        requiredPermissions: ['MANAGE_PAYROLL'],
        reason: ok ? '' : `إدارة الموظفين والرواتب تتطلب صلاحية «${PERMISSIONS_MAP.MANAGE_PAYROLL}».`
      };
    }

    case 'setup': {
      if (action === 'read') {
        const ok = perms.includes('VIEW_SETUP') || perms.includes('SYSTEM_SETUP');
        return {
          allowed: ok,
          requiredPermissions: ['VIEW_SETUP', 'SYSTEM_SETUP'],
          reason: ok ? '' : `عرض إعدادات النظام يتطلب صلاحية «${PERMISSIONS_MAP.SYSTEM_SETUP}».`
        };
      }
      const ok = perms.includes('SYSTEM_SETUP');
      return {
        allowed: ok,
        requiredPermissions: ['SYSTEM_SETUP'],
        reason: ok ? '' : `تعديل إعدادات النظام يتطلب صلاحية «${PERMISSIONS_MAP.SYSTEM_SETUP}» (SYSTEM_SETUP).`
      };
    }

    default:
      return {
        allowed: false,
        requiredPermissions: [],
        reason: 'المورد المطلوب غير مصرح بالوصول إليه.'
      };
  }
}

export function canPerformCrud(
  user: UserLike,
  resource: CrudResource,
  action: CrudAction,
  targetId?: string
): boolean {
  return checkCrudPermission(user, resource, action, targetId).allowed;
}

export function getCurrentStoredUser(): UserLike {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('dialysis_user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * دالة حراسة على مستوى طبقة البيانات في المتصفح (DB methods).
 * ملاحظة هامة: إذا وُجد مستخدم مسجل دخول في الجلسة الحالية (localStorage) وكانت الصلاحية غير متوفرة،
 * تمنع العملية فوراً برسالة خطأ واضحة. (مع التأكيد أن الحماية النهائية للخادم تكون عبر Supabase Auth + RLS).
 */
export function assertClientCrudPermission(
  resource: CrudResource,
  action: CrudAction,
  targetId?: string,
  explicitUser?: UserLike
): void {
  const user = explicitUser !== undefined ? explicitUser : getCurrentStoredUser();
  if (!user) {
    throw new Error('غير مصرح بتنفيذ العملية: يرجى تسجيل الدخول بحساب يملك الصلاحية المناسبة.');
  }
  const result = checkCrudPermission(user, resource, action, targetId);
  if (!result.allowed) {
    throw new Error(result.reason || 'غير مصرح لك بتنفيذ هذه العملية.');
  }
}

// ============================================================================
// 1. كشف ومنع التكرار في الملفات العائلية والرقم القومي (بدون دمج أو تعديل السجلات الحالية)
// ============================================================================

export interface FamilyFileDuplicateLike {
  id: string;
  family_code?: string;
  family_number?: string;
  head_name?: string;
  national_id?: string;
  members?: Array<{
    id?: string;
    patient_id?: string;
    name?: string;
    national_id?: string;
  }>;
}

export interface PatientDuplicateLike {
  id: string;
  name?: string;
  national_id?: string;
}

export interface FamilyDuplicateGroup {
  type: 'family_code' | 'family_number' | 'national_id' | 'member_national_id' | 'member_patient_id';
  value: string;
  label: string;
  fileIds: string[];
  fileNames: string[];
}

export interface FamilyDuplicateReport {
  hasDuplicates: boolean;
  duplicateGroups: FamilyDuplicateGroup[];
  byFileId: Record<string, { reasons: string[]; duplicateValues: string[] }>;
}

export function normalizeIdentifier(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().toUpperCase();
}

export function detectFamilyFileDuplicates(
  familyFiles: FamilyFileDuplicateLike[],
  patients: PatientDuplicateLike[] = []
): FamilyDuplicateReport {
  const safeFiles = Array.isArray(familyFiles) ? familyFiles : [];
  const safePatients = Array.isArray(patients) ? patients : [];
  const patientNatMap = new Map<string, string>();
  for (const p of safePatients) {
    const nat = normalizeIdentifier(p?.national_id);
    if (p?.id && nat) patientNatMap.set(p.id, nat);
  }

  const byCode = new Map<string, FamilyFileDuplicateLike[]>();
  const byNumber = new Map<string, FamilyFileDuplicateLike[]>();
  const byNationalId = new Map<string, Array<{ file: FamilyFileDuplicateLike; sourceLabel: string }>>();
  const byMemberPatientId = new Map<string, Array<{ file: FamilyFileDuplicateLike; memberName: string }>>();

  for (const f of safeFiles) {
    if (!f || !f.id) continue;
    const code = normalizeIdentifier(f.family_code);
    if (code) {
      const list = byCode.get(code) || [];
      list.push(f);
      byCode.set(code, list);
    }

    const num = normalizeIdentifier(f.family_number);
    if (num) {
      const list = byNumber.get(num) || [];
      list.push(f);
      byNumber.set(num, list);
    }

    const headNat = normalizeIdentifier(f.national_id);
    if (headNat) {
      const list = byNationalId.get(headNat) || [];
      list.push({ file: f, sourceLabel: `رب الأسرة (${f.head_name || f.id})` });
      byNationalId.set(headNat, list);
    }

    const members = Array.isArray(f.members) ? f.members : [];
    for (const m of members) {
      const memberNat = normalizeIdentifier(m?.national_id) || (m?.patient_id ? patientNatMap.get(m.patient_id) || '' : '');
      if (memberNat && memberNat !== headNat) {
        const list = byNationalId.get(memberNat) || [];
        list.push({ file: f, sourceLabel: `فرد بالأسرة (${m?.name || m?.patient_id || ''})` });
        byNationalId.set(memberNat, list);
      }
      if (m?.patient_id) {
        const pList = byMemberPatientId.get(m.patient_id) || [];
        pList.push({ file: f, memberName: m?.name || m.patient_id });
        byMemberPatientId.set(m.patient_id, pList);
      }
    }
  }

  const duplicateGroups: FamilyDuplicateGroup[] = [];
  const byFileId: Record<string, { reasons: string[]; duplicateValues: string[] }> = {};

  const recordFileWarning = (fileId: string, reason: string, value: string) => {
    if (!byFileId[fileId]) {
      byFileId[fileId] = { reasons: [], duplicateValues: [] };
    }
    if (!byFileId[fileId].reasons.includes(reason)) {
      byFileId[fileId].reasons.push(reason);
    }
    if (!byFileId[fileId].duplicateValues.includes(value)) {
      byFileId[fileId].duplicateValues.push(value);
    }
  };

  for (const [code, list] of byCode.entries()) {
    const uniqueFiles = Array.from(new Map(list.map((f) => [f.id, f])).values());
    if (uniqueFiles.length > 1) {
      const names = uniqueFiles.map((f) => f.head_name || f.family_code || f.id);
      duplicateGroups.push({
        type: 'family_code',
        value: code,
        label: `تكرار كود الملف العائلي (${code}) بين الأسر: ${names.join(' ، ')}`,
        fileIds: uniqueFiles.map((f) => f.id),
        fileNames: names
      });
      for (const f of uniqueFiles) {
        recordFileWarning(f.id, `كود العائلة (${code}) مكرر في أكثر من ملف عائلي`, code);
      }
    }
  }

  for (const [num, list] of byNumber.entries()) {
    const uniqueFiles = Array.from(new Map(list.map((f) => [f.id, f])).values());
    if (uniqueFiles.length > 1) {
      const names = uniqueFiles.map((f) => f.head_name || f.family_code || f.id);
      duplicateGroups.push({
        type: 'family_number',
        value: num,
        label: `تكرار الرقم الأسري الدفتري (${num}) بين الأسر: ${names.join(' ، ')}`,
        fileIds: uniqueFiles.map((f) => f.id),
        fileNames: names
      });
      for (const f of uniqueFiles) {
        recordFileWarning(f.id, `الرقم الأسري الدفتري (${num}) مكرر في أكثر من ملف عائلي`, num);
      }
    }
  }

  for (const [nat, entries] of byNationalId.entries()) {
    if (entries.length > 1) {
      const uniqueFileIds = Array.from(new Set(entries.map((e) => e.file.id)));
      const names = entries.map((e) => `${e.sourceLabel} [${e.file.family_code || e.file.id}]`);
      duplicateGroups.push({
        type: 'national_id',
        value: nat,
        label: `تكرار الرقم القومي (${nat}) في: ${names.join(' ، ')}`,
        fileIds: uniqueFileIds,
        fileNames: names
      });
      for (const fid of uniqueFileIds) {
        recordFileWarning(fid, `الرقم القومي (${nat}) مسجل أكثر من مرة في الملفات العائلية`, nat);
      }
    }
  }

  for (const [pid, entries] of byMemberPatientId.entries()) {
    if (entries.length > 1) {
      const uniqueFileIds = Array.from(new Set(entries.map((e) => e.file.id)));
      const names = entries.map((e) => `${e.memberName} [${e.file.family_code || e.file.id}]`);
      duplicateGroups.push({
        type: 'member_patient_id',
        value: pid,
        label: `تكرار ربط نفس المريض (${entries[0]?.memberName || pid}) في أكثر من سجل أسري: ${names.join(' ، ')}`,
        fileIds: uniqueFileIds,
        fileNames: names
      });
      for (const fid of uniqueFileIds) {
        recordFileWarning(fid, `المريض (${entries[0]?.memberName || pid}) مكرر الربط في السجلات الأسرية`, pid);
      }
    }
  }

  return {
    hasDuplicates: duplicateGroups.length > 0,
    duplicateGroups,
    byFileId
  };
}

/**
 * يتحقق من أن الاسم المدخل رباعي على الأقل (يتكون من 4 مقاطع/كلمات على الأقل)
 * ولا يحتوي على أرقام، ويعيد الاسم بعد تطبيع المسافات الزائدة.
 */
export function validateQuadrupleName(
  rawName?: string | null,
  fieldLabel: string = 'اسم المريض'
): {
  valid: boolean;
  normalizedName: string;
  wordCount: number;
  reason: string;
} {
  const normalizedName = String(rawName || '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalizedName) {
    return {
      valid: false,
      normalizedName: '',
      wordCount: 0,
      reason: `يرجى إدخال ${fieldLabel} رباعياً بالكامل (4 مقاطع على الأقل).`
    };
  }

  if (/\d/.test(normalizedName)) {
    return {
      valid: false,
      normalizedName,
      wordCount: 0,
      reason: `${fieldLabel} يجب أن يحتوي على حروف فقط بدون أرقام.`
    };
  }

  const words = normalizedName.split(' ').filter((w) => w.trim().length > 0);

  if (words.length < 4) {
    return {
      valid: false,
      normalizedName,
      wordCount: words.length,
      reason: `لا يمكن الحفظ: يجب إدخال ${fieldLabel} رباعياً بالكامل (4 أسماء على الأقل — المدخل حالياً ${
        words.length === 1
          ? 'اسم واحد فقط'
          : words.length === 2
          ? 'اسمان فقط'
          : '3 أسماء فقط'
      }).`
    };
  }

  const hasTooShortPart = words.slice(0, 4).some((w) => w.length < 2);
  if (hasTooShortPart) {
    return {
      valid: false,
      normalizedName,
      wordCount: words.length,
      reason: `يرجى كتابة مقاطع ${fieldLabel} الأربعة بشكل كامل وصحيح (حرفين على الأقل لكل اسم).`
    };
  }

  return {
    valid: true,
    normalizedName,
    wordCount: words.length,
    reason: ''
  };
}

export interface FamilyFilePreSaveValidationResult {
  valid: boolean;
  reason: string;
  conflictField?: 'family_code' | 'family_number' | 'national_id' | 'patient_id';
  conflictingFileId?: string;
}

export function validateNewFamilyFileInput(
  input: {
    family_code?: string;
    family_number?: string;
    national_id?: string;
    head_name?: string;
  },
  existingFiles: FamilyFileDuplicateLike[],
  existingPatients: PatientDuplicateLike[] = [],
  excludeFileId?: string
): FamilyFilePreSaveValidationResult {
  const safeFiles = (Array.isArray(existingFiles) ? existingFiles : []).filter(
    (f) => f && f.id && f.id !== excludeFileId
  );
  const safePatients = Array.isArray(existingPatients) ? existingPatients : [];
  const patientNatMap = new Map<string, string>();
  for (const p of safePatients) {
    const nat = normalizeIdentifier(p?.national_id);
    if (p?.id && nat) patientNatMap.set(p.id, nat);
  }

  const code = normalizeIdentifier(input.family_code);
  if (code) {
    const conflict = safeFiles.find((f) => normalizeIdentifier(f.family_code) === code);
    if (conflict) {
      return {
        valid: false,
        conflictField: 'family_code',
        conflictingFileId: conflict.id,
        reason: `لا يمكن حفظ الملف العائلي: كود العائلة (${code}) مستخدم بالفعل لأسرة «${conflict.head_name || conflict.id}». يرجى استخدام كود عائلي غير مكرر.`
      };
    }
  }

  const num = normalizeIdentifier(input.family_number);
  if (num) {
    const conflict = safeFiles.find((f) => normalizeIdentifier(f.family_number) === num);
    if (conflict) {
      return {
        valid: false,
        conflictField: 'family_number',
        conflictingFileId: conflict.id,
        reason: `لا يمكن حفظ الملف العائلي: الرقم الأسري الدفتري (${num}) مسجل بالفعل لأسرة «${conflict.head_name || conflict.family_code || conflict.id}».`
      };
    }
  }

  const nat = normalizeIdentifier(input.national_id);
  if (nat) {
    for (const f of safeFiles) {
      if (normalizeIdentifier(f.national_id) === nat) {
        return {
          valid: false,
          conflictField: 'national_id',
          conflictingFileId: f.id,
          reason: `لا يمكن إنشاء تكرار جديد: الرقم القومي (${nat}) مسجل بالفعل كرب أسرة في الملف العائلي «${f.head_name || f.family_code || f.id}».`
        };
      }
      const members = Array.isArray(f.members) ? f.members : [];
      for (const m of members) {
        const mNat = normalizeIdentifier(m?.national_id) || (m?.patient_id ? patientNatMap.get(m.patient_id) || '' : '');
        if (mNat && mNat === nat) {
          return {
            valid: false,
            conflictField: 'national_id',
            conflictingFileId: f.id,
            reason: `لا يمكن إنشاء تكرار جديد: الرقم القومي (${nat}) مسجل بالفعل لفرد (${m?.name || ''}) ضمن الملف العائلي «${f.head_name || f.family_code || f.id}».`
          };
        }
      }
    }
  }

  return { valid: true, reason: '' };
}

export function validateNewFamilyMemberInput(
  input: {
    family_file_id: string;
    patient_id?: string;
    national_id?: string;
    name?: string;
  },
  existingFiles: FamilyFileDuplicateLike[],
  existingPatients: PatientDuplicateLike[] = [],
  excludeMemberId?: string
): FamilyFilePreSaveValidationResult {
  const safeFiles = Array.isArray(existingFiles) ? existingFiles : [];
  const safePatients = Array.isArray(existingPatients) ? existingPatients : [];
  const patientNatMap = new Map<string, string>();
  for (const p of safePatients) {
    const nat = normalizeIdentifier(p?.national_id);
    if (p?.id && nat) patientNatMap.set(p.id, nat);
  }

  const targetNat =
    normalizeIdentifier(input.national_id) ||
    (input.patient_id ? patientNatMap.get(input.patient_id) || '' : '');

  for (const f of safeFiles) {
    const members = Array.isArray(f.members) ? f.members : [];
    for (const m of members) {
      if (excludeMemberId && m.id === excludeMemberId) continue;

      if (input.patient_id && m.patient_id && m.patient_id === input.patient_id) {
        return {
          valid: false,
          conflictField: 'patient_id',
          conflictingFileId: f.id,
          reason:
            f.id === input.family_file_id
              ? `هذا المريض (${m.name || input.name || input.patient_id}) مضاف بالفعل داخل نفس الملف العائلي.`
              : `لا يمكن تكرار ربط المريض: (${m.name || input.name || input.patient_id}) مربوط بالفعل بملف عائلي آخر «${f.head_name || f.family_code || f.id}».`
        };
      }

      const existingMemberNat =
        normalizeIdentifier(m.national_id) || (m.patient_id ? patientNatMap.get(m.patient_id) || '' : '');
      if (targetNat && existingMemberNat && targetNat === existingMemberNat) {
        return {
          valid: false,
          conflictField: 'national_id',
          conflictingFileId: f.id,
          reason:
            f.id === input.family_file_id
              ? `لا يمكن إنشاء تكرار: الرقم القومي (${targetNat}) مسجل بالفعل لفرد آخر (${m.name || ''}) داخل نفس الملف العائلي.`
              : `لا يمكن إنشاء تكرار: الرقم القومي (${targetNat}) مسجل بالفعل لفرد (${m.name || ''}) في الملف العائلي «${f.head_name || f.family_code || f.id}».`
        };
      }
    }
  }

  return { valid: true, reason: '' };
}

// ============================================================================
// 2. منع تكرار عرض نفس معرف مهمة المتابعة مع الحفاظ على كل مهمة مستقلة للمريض نفسه
// ============================================================================

export function deduplicateFollowupsById<T extends { id: string }>(tasks: T[]): T[] {
  if (!Array.isArray(tasks)) return [];
  const seenIds = new Set<string>();
  const result: T[] = [];
  for (const task of tasks) {
    if (!task || typeof task.id !== 'string' || !task.id.trim()) continue;
    const cleanId = task.id.trim();
    if (seenIds.has(cleanId)) continue;
    seenIds.add(cleanId);
    result.push(task);
  }
  return result;
}

// ============================================================================
// 3 & 4. توحيد قوائم الاستقبال والجلسات والمواعيد + تمييز القديم المتروك + منع تاريخ ماضٍ
// ============================================================================

export function getTodayIsoDateString(referenceDate?: Date): string {
  const d = referenceDate || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRecordDateInPast(dateStr?: string | null, todayStr?: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  const today = todayStr || getTodayIsoDateString();
  return clean < today;
}

export interface ClassifiedSessionsResult<T> {
  deduplicatedAll: T[];
  currentActiveSessions: T[];
  currentWaitingSessions: T[];
  currentQueueSessions: T[];
  abandonedOldSessions: T[];
  allNonCompletedSessions: T[];
  completedSessions: T[];
}

export function classifyAndDeduplicateSessions<T extends { id: string; status: string; date?: string }>(
  sessions: T[],
  todayStr?: string
): ClassifiedSessionsResult<T> {
  const today = todayStr || getTodayIsoDateString();
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  const seenIds = new Set<string>();
  const deduplicatedAll: T[] = [];
  for (const s of safeSessions) {
    if (!s || !s.id) continue;
    if (seenIds.has(s.id)) continue;
    seenIds.add(s.id);
    deduplicatedAll.push(s);
  }

  const currentActiveSessions: T[] = [];
  const currentWaitingSessions: T[] = [];
  const abandonedOldSessions: T[] = [];
  const completedSessions: T[] = [];

  for (const s of deduplicatedAll) {
    const status = String(s.status || '').toUpperCase();
    if (status === 'FINISHED' || status === 'COMPLETED' || status === 'CANCELLED') {
      completedSessions.push(s);
      continue;
    }

    const isOld = isRecordDateInPast(s.date, today);
    if (isOld) {
      // جلسة قديمة متروكة من تاريخ سابق: لا نغيّر حالتها المخزنة ولكن لا نعرضها أو نحسبها كجارية الآن
      abandonedOldSessions.push(s);
      continue;
    }

    if (status === 'ACTIVE' || status === 'IN_PROGRESS') {
      currentActiveSessions.push(s);
    } else if (status === 'WAITING') {
      currentWaitingSessions.push(s);
    }
  }

  const currentQueueSessions = [...currentActiveSessions, ...currentWaitingSessions];
  const allNonCompletedSessions = [...currentQueueSessions, ...abandonedOldSessions];

  return {
    deduplicatedAll,
    currentActiveSessions,
    currentWaitingSessions,
    currentQueueSessions,
    abandonedOldSessions,
    allNonCompletedSessions,
    completedSessions
  };
}

export interface ClassifiedAppointmentsResult<T> {
  deduplicatedAll: T[];
  currentInProgressAppointments: T[];
  currentWaitingAppointments: T[];
  currentQueueAppointments: T[];
  abandonedOldAppointments: T[];
  allNonCompletedAppointments: T[];
  completedAppointments: T[];
}

export function classifyAndDeduplicateAppointments<T extends { id: string; status: string; date?: string }>(
  appointments: T[],
  todayStr?: string
): ClassifiedAppointmentsResult<T> {
  const today = todayStr || getTodayIsoDateString();
  const safeAppointments = Array.isArray(appointments) ? appointments : [];

  const seenIds = new Set<string>();
  const deduplicatedAll: T[] = [];
  for (const a of safeAppointments) {
    if (!a || !a.id) continue;
    if (seenIds.has(a.id)) continue;
    seenIds.add(a.id);
    deduplicatedAll.push(a);
  }

  const currentInProgressAppointments: T[] = [];
  const currentWaitingAppointments: T[] = [];
  const abandonedOldAppointments: T[] = [];
  const completedAppointments: T[] = [];

  for (const a of deduplicatedAll) {
    const status = String(a.status || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'FINISHED' || status === 'CANCELLED') {
      completedAppointments.push(a);
      continue;
    }

    const isOld = isRecordDateInPast(a.date, today);
    if (isOld) {
      // موعد قديم متروك من تاريخ سابق: لا نغيّر حالته المخزنة تلقائياً ولا نعرضه كجارٍ الآن
      abandonedOldAppointments.push(a);
      continue;
    }

    if (status === 'IN_PROGRESS' || status === 'ACTIVE') {
      currentInProgressAppointments.push(a);
    } else if (status === 'WAITING') {
      currentWaitingAppointments.push(a);
    }
  }

  const currentQueueAppointments = [...currentInProgressAppointments, ...currentWaitingAppointments];
  const allNonCompletedAppointments = [...currentQueueAppointments, ...abandonedOldAppointments];

  return {
    deduplicatedAll,
    currentInProgressAppointments,
    currentWaitingAppointments,
    currentQueueAppointments,
    abandonedOldAppointments,
    allNonCompletedAppointments,
    completedAppointments
  };
}

export function validateNewWaitingDateNotInPast(
  dateStr?: string | null,
  status?: string | null,
  todayStr?: string
): { valid: boolean; reason: string } {
  const normalizedStatus = String(status || 'WAITING').toUpperCase();
  if (normalizedStatus !== 'WAITING') {
    return { valid: true, reason: '' };
  }
  const today = todayStr || getTodayIsoDateString();
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.trim()) {
    return { valid: true, reason: '' };
  }
  if (isRecordDateInPast(dateStr, today)) {
    return {
      valid: false,
      reason: `لا يمكن إنشاء موعد انتظار أو جلسة انتظار جديدة بتاريخ ماضٍ (${dateStr.slice(0, 10)}). يرجى اختيار تاريخ اليوم (${today}) أو تاريخ مستقبلي.`
    };
  }
  return { valid: true, reason: '' };
}

