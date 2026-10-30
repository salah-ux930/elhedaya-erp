import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDERED_TABS,
  CLIENT_GUARD_SECURITY_NOTICE,
  canAccessTab,
  canManageTab,
  getTabDenialInfo,
  getFirstAllowedTab,
  canViewAccount,
  canManageAccount,
  getVisibleAccounts,
  getManageableAccounts,
  analyzeUserAccountPermissions,
  getAccountDenialReason,
  canViewStore,
  canManageStore,
  getVisibleStores,
  getManageableStores,
  checkCrudPermission,
  canPerformCrud,
  assertClientCrudPermission,
  detectFamilyFileDuplicates,
  validateNewFamilyFileInput,
  validateNewFamilyMemberInput,
  deduplicateFollowupsById,
  classifyAndDeduplicateSessions,
  classifyAndDeduplicateAppointments,
  validateNewWaitingDateNotInPast
} from './permissions.ts';
import type {
  FamilyFileDuplicateLike,
  PatientDuplicateLike
} from './permissions.ts';
import type { DialysisSession, FinancialAccount, Store, User } from '../types.ts';

const ACTIVE_ACCOUNTS: FinancialAccount[] = [
  {
    id: '1866f8c3-8221-4c33-93c3-a3c3aef196b7',
    name: 'بنك مصر',
    type: 'BANK',
    balance: 0
  },
  {
    id: 'b1544cc7-c576-482f-bb95-f11053bb1530',
    name: 'شيماء',
    type: 'CASH',
    balance: 42000
  },
  {
    id: '101e865f-a2ce-4b22-a829-ac3bb8a52914',
    name: 'salah mohamed',
    type: 'CASH',
    balance: 5500
  }
];

const ACTIVE_STORES: Store[] = [
  { id: 'c5394452-24ae-4767-8cb5-015522026606', name: 'bbb', is_main: true },
  { id: 'aa57b887-a03f-4ff0-8285-169918b55d20', name: 'bb', is_main: false },
  { id: '098bc322-203a-4154-99d3-3e71978e035f', name: 'التمريض', is_main: false }
];

// 1. حساب مدير النظام (مصطفى على هلال) كما هو في قاعدة البيانات
const ADMIN_USER: User = {
  id: '286942a4-f722-4a2b-8287-a886f8bc1207',
  name: 'مصطفى على هلال',
  username: 'admin',
  permissions: [
    'VIEW_DASHBOARD',
    'VIEW_NOTIFICATIONS',
    'MANAGE_RECEPTION',
    'MANAGE_CLINIC_RECEPTION',
    'MANAGE_PATIENTS',
    'MANAGE_FAMILY_HEALTH',
    'MANAGE_LAB',
    'MANAGE_BILLING',
    'MANAGE_PAYROLL',
    'MANAGE_INVENTORY',
    'MANAGE_STORES',
    'MANAGE_FINANCE',
    'MANAGE_ACCOUNTS',
    'MANAGE_USERS',
    'VIEW_REPORTS',
    'VIEW_MEDICAL_RECORDS',
    'MANAGE_CLINICS',
    'MANAGE_PHARMACY',
    'SYSTEM_SETUP',
    'ACCOUNT_VIEW:1866f8c3-8221-4c33-93c3-a3c3aef196b7',
    'ACCOUNT_MANAGE:1866f8c3-8221-4c33-93c3-a3c3aef196b7',
    'ACCOUNT_VIEW:b1544cc7-c576-482f-bb95-f11053bb1530',
    'ACCOUNT_MANAGE:b1544cc7-c576-482f-bb95-f11053bb1530',
    'STORE_VIEW:c5394452-24ae-4767-8cb5-015522026606',
    'STORE_MANAGE:c5394452-24ae-4767-8cb5-015522026606',
    'STORE_VIEW:aa57b887-a03f-4ff0-8285-169918b55d20',
    'STORE_MANAGE:aa57b887-a03f-4ff0-8285-169918b55d20'
  ]
};

// 2. مستخدم محدود الصلاحيات (شيماء محمد + محمدين)
const LIMITED_FINANCE_USER: User = {
  id: 'e1234567-89ab-4cde-8123-456789abcdef',
  name: 'شيماء محمد',
  username: 'shimaa',
  permissions: [
    'MANAGE_BILLING',
    'MANAGE_PAYROLL',
    'VIEW_NOTIFICATIONS',
    'MANAGE_FINANCE',
    'ACCOUNT_VIEW:b1544cc7-c576-482f-bb95-f11053bb1530',
    'ACCOUNT_MANAGE:b1544cc7-c576-482f-bb95-f11053bb1530'
  ]
};

const LIMITED_CLINIC_USER: User = {
  id: 'c1234567-89ab-4cde-8123-456789abcdef',
  name: 'محمدين',
  username: 'mohamedin',
  permissions: ['VIEW_MEDICAL_RECORDS', 'MANAGE_CLINICS']
};

// 3. مستخدم بلا صلاحيات
const NO_PERMS_USER: User = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'مستخدم تجريبي بلا صلاحيات',
  username: 'noperm',
  permissions: []
};

// 4. حساب صلاح محمد الفعلي الذي يحتوي على التعارض (MANAGE_FINANCE + MANAGE_ACCOUNTS + معرف خزينة قديم محذوف)
const SALAH_CONTRADICTION_USER: User = {
  id: '626e7ff8-0269-4058-a7b7-15116ba8c76b',
  name: 'صلاح محمد',
  username: 'salah',
  permissions: [
    'VIEW_DASHBOARD',
    'VIEW_NOTIFICATIONS',
    'MANAGE_RECEPTION',
    'MANAGE_PATIENTS',
    'MANAGE_LAB',
    'MANAGE_BILLING',
    'MANAGE_PAYROLL',
    'MANAGE_INVENTORY',
    'MANAGE_FINANCE',
    'MANAGE_ACCOUNTS',
    'VIEW_REPORTS',
    'VIEW_MEDICAL_RECORDS',
    'MANAGE_CLINICS',
    'ACCOUNT_VIEW:641a8dda-e41e-48d7-8698-2efd67a540e4',
    'STORE_VIEW:098bc322-203a-4154-99d3-3e71978e035f',
    'STORE_MANAGE:098bc322-203a-4154-99d3-3e71978e035f'
  ]
};

describe('نظام الصلاحيات الموحد وحراسة التبويبات والخزن المالية', () => {
  it('1) حالة المدير (Admin): يصل لجميع التبويبات الممنوحة له، ولا يفتح الحسابات المالية غير المخصصة له تلقائياً', () => {
    for (const tab of ORDERED_TABS) {
      assert.equal(canAccessTab(ADMIN_USER, tab), true, `يجب السماح للمدير بفتح تبويب ${tab}`);
    }

    assert.equal(canPerformCrud(ADMIN_USER, 'users', 'create'), true);
    assert.equal(canPerformCrud(ADMIN_USER, 'users', 'delete'), true);
    assert.equal(canPerformCrud(ADMIN_USER, 'setup', 'create'), true);

    // المدير مخصص له حسابان فقط (بنك مصر + شيماء) وغير مخصص له حساب (salah mohamed)
    // حتى مع امتلاكه MANAGE_ACCOUNTS و MANAGE_FINANCE و SYSTEM_SETUP لا يُمنح الحساب غير المخصص افتراضياً
    const visible = getVisibleAccounts(ADMIN_USER, ACTIVE_ACCOUNTS);
    assert.equal(visible.length, 2);
    assert.deepEqual(
      visible.map((a) => a.name),
      ['بنك مصر', 'شيماء']
    );
    assert.equal(canViewAccount(ADMIN_USER, '101e865f-a2ce-4b22-a829-ac3bb8a52914'), false);
    assert.equal(canManageAccount(ADMIN_USER, '101e865f-a2ce-4b22-a829-ac3bb8a52914'), false);
  });

  it('2) حالة المستخدم المحدود (Limited User): يفتح فقط التبويبات والخزائن المسموحة له ويُمنع من الباقي مع سبب واضح، ويدعم التفرقة بين القراءة والإدارة', () => {
    // فحص محمدين (عيادات وسجلات طبية فقط)
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'clinics'), true);
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'medicalRecords'), true);
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'dashboard'), false);
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'finance'), false);
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'users'), false);
    assert.equal(canAccessTab(LIMITED_CLINIC_USER, 'setup'), false);
    assert.equal(getFirstAllowedTab(LIMITED_CLINIC_USER), 'clinics');

    const denial = getTabDenialInfo(LIMITED_CLINIC_USER, 'users');
    assert.equal(denial.allowed, false);
    assert.deepEqual(denial.requiredPermissions, ['VIEW_USERS', 'MANAGE_USERS']);
    assert.match(denial.reason, /MANAGE_USERS/);
    assert.equal(denial.securityNotice, CLIENT_GUARD_SECURITY_NOTICE);

    // فحص دعم صلاحيات القراءة فقط (VIEW_*) مقابل الإدارة (MANAGE_*)
    const readOnlyReceptionAndFinanceUser: User = {
      id: 'ro-1',
      name: 'موظف قراءة فقط',
      username: 'readonly',
      permissions: [
        'VIEW_RECEPTION',
        'VIEW_PATIENTS',
        'ACCOUNT_VIEW:b1544cc7-c576-482f-bb95-f11053bb1530',
        'STORE_VIEW:098bc322-203a-4154-99d3-3e71978e035f'
      ]
    };
    assert.equal(canAccessTab(readOnlyReceptionAndFinanceUser, 'reception'), true);
    assert.equal(canManageTab(readOnlyReceptionAndFinanceUser, 'reception'), false);
    assert.equal(canPerformCrud(readOnlyReceptionAndFinanceUser, 'sessions', 'read'), true);
    assert.equal(canPerformCrud(readOnlyReceptionAndFinanceUser, 'sessions', 'create'), false);
    assert.equal(canAccessTab(readOnlyReceptionAndFinanceUser, 'finance'), true);
    assert.equal(canManageTab(readOnlyReceptionAndFinanceUser, 'finance'), false);
    assert.equal(canAccessTab(readOnlyReceptionAndFinanceUser, 'inventory'), true);
    assert.equal(canManageTab(readOnlyReceptionAndFinanceUser, 'inventory'), false);

    // فحص شيماء محمد (مالية + فواتير + رواتب + خزينة شيماء فقط)
    assert.equal(canAccessTab(LIMITED_FINANCE_USER, 'finance'), true);
    assert.equal(canAccessTab(LIMITED_FINANCE_USER, 'billing'), true);
    assert.equal(canAccessTab(LIMITED_FINANCE_USER, 'employees'), true);
    assert.equal(canAccessTab(LIMITED_FINANCE_USER, 'users'), false);
    assert.equal(canAccessTab(LIMITED_FINANCE_USER, 'inventory'), false);

    const shimaaVisible = getVisibleAccounts(LIMITED_FINANCE_USER, ACTIVE_ACCOUNTS);
    assert.equal(shimaaVisible.length, 1);
    assert.equal(shimaaVisible[0].name, 'شيماء');
    assert.equal(canManageAccount(LIMITED_FINANCE_USER, 'b1544cc7-c576-482f-bb95-f11053bb1530'), true);
    assert.equal(canViewAccount(LIMITED_FINANCE_USER, '1866f8c3-8221-4c33-93c3-a3c3aef196b7'), false);
    assert.equal(canManageAccount(LIMITED_FINANCE_USER, '1866f8c3-8221-4c33-93c3-a3c3aef196b7'), false);
  });

  it('3) حالة مستخدم بلا صلاحيات (No Permissions): يُمنع من جميع التبويبات وعمليات CRUD والخزائن والمخازن', () => {
    for (const tab of ORDERED_TABS) {
      assert.equal(
        canAccessTab(NO_PERMS_USER, tab),
        false,
        `المستخدم بلا صلاحيات يجب منعه من تبويب ${tab}`
      );
    }
    assert.equal(canAccessTab(null, 'dashboard'), false);
    assert.equal(getFirstAllowedTab(NO_PERMS_USER), null);
    assert.equal(getVisibleAccounts(NO_PERMS_USER, ACTIVE_ACCOUNTS).length, 0);
    assert.equal(getManageableAccounts(NO_PERMS_USER, ACTIVE_ACCOUNTS).length, 0);
    assert.equal(getVisibleStores(NO_PERMS_USER, ACTIVE_STORES).length, 0);

    assert.equal(canPerformCrud(NO_PERMS_USER, 'patients', 'create'), false);
    assert.equal(canPerformCrud(NO_PERMS_USER, 'users', 'create'), false);
    assert.equal(
      canPerformCrud(NO_PERMS_USER, 'finance_tx', 'create', 'b1544cc7-c576-482f-bb95-f11053bb1530'),
      false
    );

    assert.throws(
      () =>
        assertClientCrudPermission(
          'finance_tx',
          'create',
          'b1544cc7-c576-482f-bb95-f11053bb1530',
          NO_PERMS_USER
        ),
      /لا تملك صلاحيات مفعّلة/
    );
  });

  it('4) اختبار حساب مالي غير مخصص وتناقض صلاح محمد: لا يمنح كل الحسابات لمجرد صلاحية إدارة الخزن ويكتشف الخزينة المحذوفة', () => {
    // صلاح محمد يملك MANAGE_FINANCE و MANAGE_ACCOUNTS ومعرف خزينة قديم محذوف (641a8dda-...)
    assert.equal(canAccessTab(SALAH_CONTRADICTION_USER, 'finance'), true);
    assert.equal(canAccessTab(SALAH_CONTRADICTION_USER, 'users'), false);
    assert.equal(canAccessTab(SALAH_CONTRADICTION_USER, 'setup'), false);

    const analysis = analyzeUserAccountPermissions(SALAH_CONTRADICTION_USER, ACTIVE_ACCOUNTS);
    assert.equal(analysis.visibleAccounts.length, 0);
    assert.equal(analysis.manageableAccounts.length, 0);
    assert.equal(analysis.unassignedAccounts.length, 3);
    assert.deepEqual(analysis.orphanedAccountIds, ['641a8dda-e41e-48d7-8698-2efd67a540e4']);
    assert.equal(analysis.hasContradiction, true);
    assert.match(analysis.denialReason, /لا يمنح تلقائياً/);
    assert.match(analysis.denialReason, /641a8dda-e41e-48d7-8698-2efd67a540e4/);

    // منع صلاح محمد من كشف أو الصرف من خزينة (salah mohamed) أو (شيماء) لأنها غير مخصصة له
    const salahSafeId = '101e865f-a2ce-4b22-a829-ac3bb8a52914';
    assert.equal(canViewAccount(SALAH_CONTRADICTION_USER, salahSafeId), false);
    assert.equal(canManageAccount(SALAH_CONTRADICTION_USER, salahSafeId), false);

    const manageCheck = checkCrudPermission(
      SALAH_CONTRADICTION_USER,
      'finance_tx',
      'create',
      salahSafeId
    );
    assert.equal(manageCheck.allowed, false);
    assert.match(manageCheck.reason, /ACCOUNT_MANAGE:101e865f-a2ce-4b22-a829-ac3bb8a52914/);

    assert.throws(
      () =>
        assertClientCrudPermission(
          'finance_tx',
          'create',
          salahSafeId,
          SALAH_CONTRADICTION_USER
        ),
      /ACCOUNT_MANAGE:101e865f-a2ce-4b22-a829-ac3bb8a52914/
    );

    // منع حذف خزينة غير مخصصة حتى لمن يملك MANAGE_ACCOUNTS
    const deleteAccountCheck = checkCrudPermission(
      SALAH_CONTRADICTION_USER,
      'financial_accounts',
      'delete',
      salahSafeId
    );
    assert.equal(deleteAccountCheck.allowed, false);
    assert.match(deleteAccountCheck.reason, /غير مخصص لك بصلاحية إدارة/);

    // التحقق من حالة مستخدم يملك مشاهدة فقط (ACCOUNT_VIEW) دون إدارة (ACCOUNT_MANAGE)
    const viewOnlyUser: User = {
      id: 'v1',
      name: 'مراجع مالي',
      username: 'auditor',
      permissions: ['MANAGE_FINANCE', `ACCOUNT_VIEW:${salahSafeId}`]
    };
    assert.equal(canViewAccount(viewOnlyUser, salahSafeId), true);
    assert.equal(canManageAccount(viewOnlyUser, salahSafeId), false);
    const viewOnlyDenial = getAccountDenialReason(
      viewOnlyUser,
      salahSafeId,
      'manage',
      ACTIVE_ACCOUNTS
    );
    assert.match(viewOnlyDenial, /تملك صلاحية المشاهدة فقط/);

    // التحقق من صلاحيات المخازن لصلاح محمد (يرى ويدير مخزن التمريض فقط، ولا يرى مخزني bbb و bb)
    const salahStores = getVisibleStores(SALAH_CONTRADICTION_USER, ACTIVE_STORES);
    assert.equal(salahStores.length, 1);
    assert.equal(salahStores[0].name, 'التمريض');
    assert.equal(
      canManageStore(SALAH_CONTRADICTION_USER, '098bc322-203a-4154-99d3-3e71978e035f'),
      true
    );
    assert.equal(
      canViewStore(SALAH_CONTRADICTION_USER, 'c5394452-24ae-4767-8cb5-015522026606'),
      false
    );
    assert.equal(
      getManageableStores(SALAH_CONTRADICTION_USER, ACTIVE_STORES).length,
      1
    );
  });

  it('5) كشف التكرار في الملف العائلي والرقم القومي ومنع حفظ تكرار جديد دون دمج السجلات', () => {
    const existingFiles: FamilyFileDuplicateLike[] = [
      {
        id: 'f1',
        family_code: 'FAM-2026-001',
        head_name: 'أحمد محمود',
        national_id: '28501011234567',
        members: []
      },
      {
        id: 'f2',
        family_code: 'FAM-2026-001',
        head_name: 'أحمد محمود مكرر',
        national_id: '28501011234567',
        members: [
          {
            id: 'm1',
            patient_id: 'p1',
            name: 'سعيد حسن'
          }
        ]
      }
    ];
    const existingPatients: PatientDuplicateLike[] = [
      {
        id: 'p1',
        name: 'سعيد حسن',
        national_id: '29005051234567'
      }
    ];

    const report = detectFamilyFileDuplicates(existingFiles, existingPatients);
    assert.equal(report.hasDuplicates, true);
    assert.equal(report.duplicateGroups.length, 2);
    assert.equal(Boolean(report.byFileId['f1']), true);
    assert.equal(Boolean(report.byFileId['f2']), true);

    // منع إنشاء ملف جديد بنفس رقم الملف أو الرقم القومي
    const dupCodeCheck = validateNewFamilyFileInput(
      { family_code: 'FAM-2026-001', head_name: 'عميل جديد' },
      existingFiles,
      existingPatients
    );
    assert.equal(dupCodeCheck.valid, false);
    assert.match(dupCodeCheck.reason, /مستخدم بالفعل/);

    const dupNatIdCheck = validateNewFamilyFileInput(
      { family_code: 'FAM-2026-999', national_id: '29005051234567', head_name: 'عميل جديد' },
      existingFiles,
      existingPatients
    );
    assert.equal(dupNatIdCheck.valid, false);
    assert.match(dupNatIdCheck.reason, /مسجل بالفعل/);

    const dupMemberCheck = validateNewFamilyMemberInput(
      { family_file_id: 'f1', name: 'عضو جديد', national_id: '29005051234567' },
      existingFiles,
      existingPatients
    );
    assert.equal(dupMemberCheck.valid, false);
  });

  it('6) مهام المتابعة: تعرض كل مهمة مستقلة للمريض نفسه إذا اختلف معرفها وتمنع تكرار نفس معرف المهمة فقط', () => {
    const tasks = [
      { id: 'task-1', patientId: 'p1', title: 'قياس ضغط' },
      { id: 'task-2', patientId: 'p1', title: 'تحليل سكري' },
      { id: 'task-1', patientId: 'p1', title: 'قياس ضغط (نسخة مكررة بالخطأ)' }
    ];
    const deduped = deduplicateFollowupsById(tasks);
    assert.equal(deduped.length, 2);
    assert.deepEqual(deduped.map((t) => t.id), ['task-1', 'task-2']);
  });

  it('7) توحيد قوائم الجلسات والاستقبال: استبعاد المكتمل من النشط، عدم تكرار نفس المعرف، وتمييز السجلات القديمة المتروكة', () => {
    const todayStr = '2026-04-19';
    const rawSessions: DialysisSession[] = [
      {
        id: 's-active-today',
        patient_id: 'p1',
        date: '2026-04-19',
        start_time: '09:00',
        weight_before: 70,
        blood_pressure: '120/80',
        room: '1',
        notes: '',
        status: 'ACTIVE'
      },
      {
        id: 's-active-today', // مكرر بنفس المعرف الثابت
        patient_id: 'p1',
        date: '2026-04-19',
        start_time: '09:00',
        weight_before: 70,
        blood_pressure: '120/80',
        room: '1',
        notes: '',
        status: 'ACTIVE'
      },
      {
        id: 's-old-abandoned',
        patient_id: 'p2',
        date: '2026-04-10',
        start_time: '09:00',
        weight_before: 72,
        blood_pressure: '130/85',
        room: '2',
        notes: '',
        status: 'ACTIVE'
      },
      {
        id: 's-finished',
        patient_id: 'p3',
        date: '2026-04-19',
        start_time: '08:00',
        weight_before: 68,
        blood_pressure: '120/80',
        room: '1',
        notes: '',
        status: 'FINISHED'
      }
    ];

    const classifiedSessions = classifyAndDeduplicateSessions(rawSessions, todayStr);
    assert.equal(classifiedSessions.deduplicatedAll.length, 3);
    assert.equal(classifiedSessions.currentActiveSessions.length, 1);
    assert.equal(classifiedSessions.currentActiveSessions[0].id, 's-active-today');
    assert.equal(classifiedSessions.abandonedOldSessions.length, 1);
    assert.equal(classifiedSessions.abandonedOldSessions[0].id, 's-old-abandoned');
    // لا يتم احتساب المكتمل ضمن الجلسات الجارية اليوم ولا ضمن غير المكتمل
    assert.equal(classifiedSessions.currentQueueSessions.length, 1);
    assert.equal(classifiedSessions.allNonCompletedSessions.length, 2);

    const rawAppointments = [
      {
        id: 'a-waiting-today',
        patient_id: 'p1',
        clinic_id: 'c1',
        date: '2026-04-19',
        time: '10:00',
        status: 'WAITING' as const,
        is_paid: true
      },
      {
        id: 'a-old-waiting',
        patient_id: 'p2',
        clinic_id: 'c1',
        date: '2026-04-01',
        time: '09:00',
        status: 'WAITING' as const,
        is_paid: false
      },
      {
        id: 'a-completed-today',
        patient_id: 'p3',
        clinic_id: 'c1',
        date: '2026-04-19',
        time: '11:00',
        status: 'COMPLETED' as const,
        is_paid: true
      }
    ];

    const classifiedAppts = classifyAndDeduplicateAppointments(rawAppointments, todayStr);
    assert.equal(classifiedAppts.currentQueueAppointments.length, 1);
    assert.equal(classifiedAppts.currentQueueAppointments[0].id, 'a-waiting-today');
    assert.equal(classifiedAppts.abandonedOldAppointments.length, 1);
    assert.equal(classifiedAppts.abandonedOldAppointments[0].id, 'a-old-waiting');
    assert.equal(classifiedAppts.completedAppointments.length, 1);

    // منع إنشاء موعد منتظر جديد بتاريخ في الماضي
    const pastValidation = validateNewWaitingDateNotInPast('2026-04-01', 'WAITING', todayStr);
    assert.equal(pastValidation.valid, false);
    assert.match(pastValidation.reason, /بتاريخ ماضٍ/);

    const todayValidation = validateNewWaitingDateNotInPast('2026-04-19', 'WAITING', todayStr);
    assert.equal(todayValidation.valid, true);
  });
});

