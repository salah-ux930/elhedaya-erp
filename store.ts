
import { 
  Patient, Service, Product, Store, StockTransaction, 
  Employee, FinancialAccount, Transaction, ShiftRecord, User,
  FundingEntity, TransferRequest, LabTest, LabTestDefinition, DialysisSession,
  PharmacyItem, PharmacyBatch, PharmacyBatchStatus, PharmacyDispenseOrder,
  PharmacyDispenseItem, BatchAllocationSlice
} from './types.ts';
import { supabase } from './supabase.ts';
import { realtimeNotificationService } from './services/realtimeNotificationService.ts';
import {
  assertClientCrudPermission,
  normalizeIdentifier,
  validateNewFamilyFileInput,
  validateNewFamilyMemberInput,
  validateNewWaitingDateNotInPast,
  validateQuadrupleName
} from './utils/permissions.ts';

/**
 * ملاحظة أمنية: دوال الحراسة المستدعاة عبر assertClientCrudPermission تمنع تنفيذ العمليات غير المصرح بها
 * من جانب العميل (Client-Side CRUD Guards)، لكنها لا تغني عن تفعيل مصادقة Supabase Auth وسياسات RLS
 * على الخادم في المرحلة النهائية لحماية قاعدة البيانات من الاستدعاءات المباشرة.
 */
const handleError = (error: any, fallbackMessage: string) => {
  console.warn("Database Operation Note:", error?.message || error);
  const msg = error?.message || (typeof error === 'string' ? error : '') || error?.details || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    throw new Error(`تعذر الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت أو خادم Supabase.`);
  }
  const code = error?.code;
  const missingColumnMatch = msg.match(/Could not find the '([^']+)' column of '([^']+)' in the schema cache/i);
  if (code === 'PGRST204' || missingColumnMatch) {
    const colName = missingColumnMatch?.[1] || 'غير محدد';
    const tableName = missingColumnMatch?.[2] || 'غير محدد';
    throw new Error(`MISSING_COLUMN: العمود '${colName}' غير موجود في جدول '${tableName}'. يرجى تشغيل ملف الـ Migration في لوحة تحكم Supabase.`);
  }
  if (['42P01', 'PGRST107', 'PGRST116', 'PGRST205'].includes(code) || /Could not find the table/i.test(msg)) {
    throw new Error(`MISSING_TABLE: الجدول غير موجود. يرجى تشغيل SQL Schema في لوحة تحكم Supabase.`);
  }
  throw new Error(error?.message || fallbackMessage);
};

export function toSupabaseAuthEmail(username: string): string {
  const clean = String(username || '').trim().toLowerCase();
  if (/^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
    return clean;
  }
  const bytes = new TextEncoder().encode(clean || 'staff');
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `u_${hex}@elhedaya.local`;
}

export function toSupabaseAuthPassword(password: string): string {
  const raw = String(password || '');
  return raw.length >= 6 ? raw : `${raw}_elhedaya_auth`;
}

export class DB {
  private static authInitPromise: Promise<boolean> | null = null;

  /**
   * يضمن وجود جلسة Supabase Auth (role = authenticated) للمستخدم المسجل دخوله
   * حتى تعمل جميع سياسات الحماية (RLS: TO authenticated) بأمان.
   */
  static async ensureSupabaseAuthSession(explicitUser?: any, explicitPassword?: string): Promise<boolean> {
    if (this.authInitPromise) {
      return this.authInitPromise;
    }

    this.authInitPromise = (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          return true;
        }

        let targetUser = explicitUser;
        if (!targetUser) {
          const saved = localStorage.getItem('dialysis_user');
          if (saved) {
            try {
              targetUser = JSON.parse(saved);
            } catch {
              targetUser = null;
            }
          }
        }

        const username = String(targetUser?.username || '').trim();
        const rawPassword = String(explicitPassword ?? targetUser?.password ?? '');

        if (!username || !rawPassword) {
          return false;
        }

        const email = toSupabaseAuthEmail(username);
        const derivedPassword = toSupabaseAuthPassword(rawPassword);

        // 1. محاولة تسجيل الدخول عبر Supabase Auth بالبريد المشتق وكلمة المرور المشتقة
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password: derivedPassword
        });
        if (!signInErr && signInData?.session) {
          return true;
        }

        // 2. إذا كانت كلمة المرور الأصلية مختلفة، جرب كلمة المرور الأصلية مباشرة
        if (rawPassword !== derivedPassword && rawPassword.length >= 6) {
          const { data: rawSignInData, error: rawSignInErr } = await supabase.auth.signInWithPassword({
            email,
            password: rawPassword
          });
          if (!rawSignInErr && rawSignInData?.session) {
            return true;
          }
        }

        // 3. في حال لم يتم مزامنة الحساب بعد في auth.users، حاول إنشاء حساب Supabase Auth مطابق
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password: derivedPassword,
          options: {
            data: {
              username,
              name: targetUser?.name || username,
              role: targetUser?.role || 'STAFF'
            }
          }
        });
        if (!signUpErr && signUpData?.session) {
          return true;
        }

        return false;
      } catch (e) {
        console.warn('Supabase Auth session initialization note:', e);
        return false;
      } finally {
        this.authInitPromise = null;
      }
    })();

    return this.authInitPromise;
  }

  static async login(username: string, password: string): Promise<User | null> {
    const cleanUsername = String(username || '').trim();
    const email = toSupabaseAuthEmail(cleanUsername);
    const derivedPassword = toSupabaseAuthPassword(password);

    // 1. محاولة المصادقة عبر Supabase Auth أولاً للحصول على جلسة authenticated
    await supabase.auth.signInWithPassword({
      email,
      password: derivedPassword
    });

    // 2. جلب بيانات وصلاحيات الموظف من جدول system_users
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', cleanUsername)
      .eq('password', password)
      .single();

    if (error || !data) {
      return null;
    }

    // 3. التأكد من تفعيل جلسة Supabase Auth لهذا المستخدم
    await this.ensureSupabaseAuthSession(data, password);
    return data as User;
  }

  static async logout(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut note:', e);
    }
  }

  // --- Patients ---
  static async addPatient(p: Partial<Patient>) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('patients', 'create');

    const nameCheck = validateQuadrupleName(p.name, 'اسم المريض');
    if (!nameCheck.valid) {
      throw new Error(nameCheck.reason);
    }

    // Phone validation (Must start with 01 and have 11 digits)
    const phoneRegex = /^01\d{9}$/;
    if (p.phone && !phoneRegex.test(p.phone)) {
      throw new Error("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 01 ويتكون من 11 رقم.");
    }

    const cleanNat = normalizeIdentifier(p.national_id);
    if (cleanNat) {
      const existingPatients = await this.getPatients();
      const duplicatePatient = (existingPatients || []).find(
        (ep: any) => normalizeIdentifier(ep?.national_id) === cleanNat
      );
      if (duplicatePatient) {
        throw new Error(
          `لا يمكن إنشاء سجل مكرر: الرقم القومي (${cleanNat}) مسجل بالفعل للمريض «${duplicatePatient.name || duplicatePatient.id}».`
        );
      }
    }

    const payload = { ...p, name: nameCheck.normalizedName };
    const { data, error } = await supabase.from('patients').insert([payload]).select();
    if (error) return handleError(error, "فشل إضافة المريض");
    return data?.[0];
  }

  static async getPatients() {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn("Supabase getPatients warning:", error.message || error);
        const local = localStorage.getItem('local_patients');
        return local ? JSON.parse(local) : [];
      }
      if (data && data.length > 0) {
        localStorage.setItem('local_patients', JSON.stringify(data));
      }
      return data || [];
    } catch (e) {
      console.warn("Exception getPatients, using local cache:", e);
      const local = localStorage.getItem('local_patients');
      return local ? JSON.parse(local) : [];
    }
  }

  // --- Inventory & Stock Logic ---
  static async getCurrentStock(productId: string, storeId: string): Promise<number> {
    const { data, error } = await supabase.from('stock_transactions').select('*').eq('product_id', productId);
    if (error) return 0;
    
    let balance = 0;
    data.forEach((tx: any) => {
      if (tx.type === 'ADD' && tx.store_id === storeId) balance += tx.quantity;
      else if (tx.type === 'DEDUCT' && tx.store_id === storeId) balance -= tx.quantity;
      else if (tx.type === 'TRANSFER') {
        if (tx.store_id === storeId) balance -= tx.quantity;
        if (tx.target_store_id === storeId) balance += tx.quantity;
      }
    });
    return balance;
  }

  static async addStockTransaction(tx: Partial<StockTransaction>) {
    assertClientCrudPermission('inventory', 'create', tx.store_id);
    // PREVENT NEGATIVE STOCK
    if (tx.type === 'DEDUCT' || tx.type === 'TRANSFER') {
      const current = await this.getCurrentStock(tx.product_id!, tx.store_id!);
      if (current < tx.quantity!) {
        throw new Error(`عذراً، الرصيد غير كافٍ في هذا المخزن. المتوفر حالياً: ${current}`);
      }
    }

    const { data, error } = await supabase.from('stock_transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل الحركة");
    return data?.[0];
  }

  // --- Transfer Requests & Notifications ---
  static async addTransferRequest(req: Partial<TransferRequest>) {
    assertClientCrudPermission('inventory', 'create', req.from_store_id);
    const { data, error } = await supabase.from('transfer_requests').insert([req]).select();
    if (error) return handleError(error, "فشل إضافة الطلب");

    await this.addNotification({
      title: "طلب تحويل مخزني جديد",
      message: `تم إنشاء طلب تحويل جديد من مخزن ${req.from_store_id} بواسطة ${req.requested_by}`,
      type: 'info',
      category: 'المخازن'
    });

    return data?.[0];
  }

  static async updateTransferStatus(id: string, status: string) {
    const { data: requestData, error: fetchError } = await supabase.from('transfer_requests').select('*').eq('id', id).single();
    if (fetchError) return handleError(fetchError, "فشل جلب الطلب");

    const requiredStoreId = status === 'COMPLETED' ? requestData?.to_store_id : requestData?.from_store_id;
    assertClientCrudPermission('inventory', 'update', requiredStoreId);

    const { data, error } = await supabase.from('transfer_requests').update({ status }).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث الحالة");
    
    const request = data?.[0];
    // Rule: Stock moves only when approved/completed
    if (status === 'COMPLETED' && request) {
      for (const item of request.items) {
        await this.addStockTransaction({
          product_id: item.product_id,
          store_id: request.from_store_id,
          target_store_id: request.to_store_id,
          type: 'TRANSFER',
          quantity: item.quantity,
          date: new Date().toISOString().split('T')[0],
          note: `تحويل آلي - طلب مكتمل #${id}`
        });
      }
    }
    return request;
  }

  // --- Financials ---
  static async addFinanceTx(tx: Partial<Transaction>) {
    assertClientCrudPermission('finance_tx', 'create', tx.account_id);
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل العملية المالية");
    
    // Update balance immediately
    const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('id', tx.account_id).single();
    if (acc) {
      const newBalance = tx.type === 'INCOME' ? Number(acc.balance) + Number(tx.amount) : Number(acc.balance) - Number(tx.amount);
      await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', tx.account_id);
    }
    return data?.[0];
  }

  static async resetShifts() {
    assertClientCrudPermission('payroll', 'delete');
    const { error } = await supabase.from('shift_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return handleError(error, "فشل تصفير الدورة المالية");
  }

  // --- Reporting Aggregations ---
  static async getRevenueStats() {
    const { data, error } = await supabase.from('transactions').select('amount, type, date');
    if (error) return [];
    return data;
  }

  // Common CRUDs
  static async getNotifications() {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return handleError(error, "فشل جلب التنبيهات");
      }
      return data || [];
    } catch (e) { return []; }
  }
  static async addNotification(notif: any) {
    try {
      const { error } = await supabase.from('notifications').insert([notif]);
      if (error) {
        if (error.code === '42703' || error.message?.includes('category') || error.message?.includes('column')) {
          // Graceful fallback if database schema is still being updated
          const fallbackNotif: any = {
            title: notif.title || '',
            message: notif.message || '',
            type: notif.type || 'error',
            is_read: notif.is_read ?? false
          };
          const { error: err2 } = await supabase.from('notifications').insert([fallbackNotif]);
          if (!err2) return;
        }
        return handleError(error, "فشل إضافة التنبيه");
      }
    } catch (e) {
      console.warn('addNotification error:', e);
    }
  }
  
  static async getFundingEntities() {
    try {
      const { data, error } = await supabase.from('funding_entities').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getStores() {
    try {
      const { data, error } = await supabase.from('stores').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getProducts() {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getStockTransactions() {
    try {
      const { data, error } = await supabase.from('stock_transactions').select('*');
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return [];
      }
      return data || [];
    } catch (e) { return []; }
  }

  static async getTransferRequests() {
    try {
      const { data, error } = await supabase.from('transfer_requests').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getServices() {
    try {
      const { data, error } = await supabase.from('services').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getSessions() {
    try {
      const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(*)');
      if (error) {
        console.warn("Supabase getSessions warning:", error.message || error);
        const local = localStorage.getItem('local_dialysis_sessions');
        return local ? JSON.parse(local) : [];
      }
      const mapped = (data || []).map((session: any) => {
        if (!session.disconnection_time && session.custom_data) {
          try {
            const parsed = typeof session.custom_data === 'string' ? JSON.parse(session.custom_data) : session.custom_data;
            if (parsed?.disconnection_time) {
              session.disconnection_time = parsed.disconnection_time;
            }
          } catch (e) {}
        }
        return session;
      });
      if (mapped.length > 0) {
        localStorage.setItem('local_dialysis_sessions', JSON.stringify(mapped));
      }
      return mapped;
    } catch (e) {
      console.warn("Exception getSessions, using local cache:", e);
      const local = localStorage.getItem('local_dialysis_sessions');
      return local ? JSON.parse(local) : [];
    }
  }

  static async getEmployees() {
    try {
      const { data, error } = await supabase.from('employees').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getShifts() {
    try {
      const { data, error } = await supabase.from('shift_records').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getAccounts() {
    try {
      const { data, error } = await supabase.from('financial_accounts').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getTransactions() {
    try {
      const { data, error } = await supabase.from('transactions').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getUsers() {
    try {
      const { data, error } = await supabase.from('system_users').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getLabDefinitions() {
    try {
      const { data, error } = await supabase.from('lab_test_definitions').select('*');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  static async getLabTests() {
    try {
      const { data, error } = await supabase.from('lab_tests').select('*, patients(*), lab_test_definitions(*)');
      if (error) return [];
      return data || [];
    } catch (e) { return []; }
  }

  // Admin Crud Helpers
  static async addEmployee(e: any) { assertClientCrudPermission('payroll', 'create'); const { data, error } = await supabase.from('employees').insert([e]).select(); if (error) return handleError(error, "فشل إضافة الموظف"); return data?.[0]; }
  static async updateEmployee(id: string, e: any) { assertClientCrudPermission('payroll', 'update', id); const { data, error } = await supabase.from('employees').update(e).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث بيانات الموظف"); return data?.[0]; }
  static async deleteEmployee(id: string) { assertClientCrudPermission('payroll', 'delete', id); const { error } = await supabase.from('employees').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الموظف"); }
  static async addService(s: any) { assertClientCrudPermission('setup', 'create'); const { data, error } = await supabase.from('services').insert([s]).select(); if (error) return handleError(error, "فشل إضافة الخدمة"); return data?.[0]; }
  static async updateService(id: string, s: any) { assertClientCrudPermission('setup', 'update', id); const { data, error } = await supabase.from('services').update(s).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث الخدمة"); return data?.[0]; }
  static async deleteService(id: string) { assertClientCrudPermission('setup', 'delete', id); const { error } = await supabase.from('services').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الخدمة"); }
  static async addStore(s: any) { assertClientCrudPermission('stores', 'create'); const { data, error } = await supabase.from('stores').insert([s]).select(); if (error) return handleError(error, "فشل إضافة المخزن"); return data?.[0]; }
  static async updateStore(id: string, s: any) { assertClientCrudPermission('stores', 'update', id); const { data, error } = await supabase.from('stores').update(s).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المخزن"); return data?.[0]; }
  static async deleteStore(id: string) { assertClientCrudPermission('stores', 'delete', id); const { error } = await supabase.from('stores').delete().eq('id', id); if (error) return handleError(error, "فشل حذف المخزن"); }
  static async addProduct(p: any) { assertClientCrudPermission('setup', 'create'); const { data, error } = await supabase.from('products').insert([p]).select(); if (error) return handleError(error, "فشل إضافة المنتج"); return data?.[0]; }
  static async updateProduct(id: string, p: any) { assertClientCrudPermission('setup', 'update', id); const { data, error } = await supabase.from('products').update(p).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المنتج"); return data?.[0]; }
  static async addFinancialAccount(a: any) { assertClientCrudPermission('financial_accounts', 'create'); const { data, error } = await supabase.from('financial_accounts').insert([a]).select(); if (error) return handleError(error, "فشل إضافة الحساب"); return data?.[0]; }
  static async updateFinancialAccount(id: string, a: any) { assertClientCrudPermission('financial_accounts', 'update', id); const { data, error } = await supabase.from('financial_accounts').update(a).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث الحساب"); return data?.[0]; }
  static async deleteFinancialAccount(id: string) { assertClientCrudPermission('financial_accounts', 'delete', id); const { error } = await supabase.from('financial_accounts').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الحساب"); }
  static async addFundingEntity(fe: any) { assertClientCrudPermission('setup', 'create'); const { data, error } = await supabase.from('funding_entities').insert([fe]).select(); if (error) return handleError(error, "فشل إضافة جهة التعاقد"); return data?.[0]; }
  static async deleteFundingEntity(id: string) { assertClientCrudPermission('setup', 'delete', id); const { error } = await supabase.from('funding_entities').delete().eq('id', id); if (error) return handleError(error, "فشل حذف جهة التعاقد"); }
  static async addUser(u: any) { assertClientCrudPermission('users', 'create'); const { data, error } = await supabase.from('system_users').insert([u]).select(); if (error) return handleError(error, "فشل إضافة المستخدم"); return data?.[0]; }
  static async updateUser(id: string, u: any) { assertClientCrudPermission('users', 'update', id); const { data, error } = await supabase.from('system_users').update(u).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المستخدم"); return data?.[0]; }
  static async deleteUser(id: string) { assertClientCrudPermission('users', 'delete', id); const { error } = await supabase.from('system_users').delete().eq('id', id); if (error) return handleError(error, "فشل حذف المستخدم"); }
  static async addLabTest(t: any) { assertClientCrudPermission('lab', 'create'); const { data, error } = await supabase.from('lab_tests').insert([t]).select(); if (error) return handleError(error, "فشل إضافة التحليل"); return data?.[0]; }
  static async addLabDefinition(d: any) { assertClientCrudPermission('lab', 'create'); const { data, error } = await supabase.from('lab_test_definitions').insert([d]).select(); if (error) return handleError(error, "فشل إضافة تعريف التحليل"); return data?.[0]; }
  static async updateLabResult(id: string, res: string) { 
    assertClientCrudPermission('lab', 'update', id);
    const { data, error } = await supabase.from('lab_tests').update({ result: res, status: 'COMPLETED' }).eq('id', id).select(); 
    if (error) return handleError(error, "فشل تحديث نتيجة التحليل"); 

    // Instant clinical evaluation for urgent lab results
    supabase
      .from('lab_tests')
      .select('*, patients(*), lab_test_definitions(*)')
      .eq('id', id)
      .single()
      .then(({ data: fullLab }) => {
        if (fullLab) realtimeNotificationService.evaluateAndTriggerLabAlert(fullLab);
      }, () => {});

    return data?.[0]; 
  }
  
  // --- Clinics & Doctors ---
  static async getClinics() {
    try {
      const { data, error } = await supabase.from('clinics').select('*');
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return handleError(error, "فشل جلب العيادات");
      }
      return data || [];
    } catch (e) { return []; }
  }
  static async addClinic(c: any) { assertClientCrudPermission('clinics', 'create'); const { data, error } = await supabase.from('clinics').insert([c]).select(); if (error) return handleError(error, "فشل إضافة العيادة"); return data?.[0]; }
  
  static async getDoctors() {
    try {
      const { data, error } = await supabase.from('doctors').select('*, clinics(*)');
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return handleError(error, "فشل جلب الأطباء");
      }
      return data || [];
    } catch (e) { return []; }
  }
  static async addDoctor(d: any) { assertClientCrudPermission('clinics', 'create'); const { data, error } = await supabase.from('doctors').insert([d]).select(); if (error) return handleError(error, "فشل إضافة الطبيب"); return data?.[0]; }

  static async getClinicAppointments(clinicId?: string, doctorId?: string, date?: string, patientId?: string) { 
    try {
      let query = supabase.from('clinic_appointments').select('*, patients(*), doctors(*), clinics(*)').order('date', { ascending: false }); 
      if (clinicId) query = query.eq('clinic_id', clinicId);
      if (doctorId) query = query.eq('doctor_id', doctorId);
      if (date) query = query.eq('date', date);
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return handleError(error, "فشل جلب المواعيد"); 
      }
      return data || [];
    } catch (e) { return []; }
  }
  static async addClinicAppointment(a: any) {
    assertClientCrudPermission('clinic_reception', 'create');
    const dateCheck = validateNewWaitingDateNotInPast(a?.date, a?.status || 'WAITING');
    if (!dateCheck.valid) {
      throw new Error(dateCheck.reason);
    }
    const { data, error } = await supabase.from('clinic_appointments').insert([a]).select();
    if (error) return handleError(error, "فشل إضافة الموعد");
    return data?.[0];
  }
  static async updateAppointmentStatus(id: string, status: string, diagnosis?: string, prescription?: string) {
    assertClientCrudPermission('clinics', 'update', id);
    const { data, error } = await supabase.from('clinic_appointments').update({ status, diagnosis, prescription }).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث حالة الموعد");
    return data?.[0];
  }

  // --- Family Files (الملفات العائلية) ---
  static async getFamilyFiles() {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('family_files').select('*, family_file_members(*, patients(*))').order('created_at', { ascending: false });
      if (error) { if (['42P01', 'PGRST116'].includes(error.code)) return []; throw error; }
      return (data || []).map((file: any) => ({
        ...file,
        members: file.family_file_members || []
      }));
    } catch (e) { return []; }
  }
  static async addFamilyFile(f: any) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('family_files', 'create');
    const [existingFiles, existingPatients] = await Promise.all([
      this.getFamilyFiles(),
      this.getPatients()
    ]);
    const dupCheck = validateNewFamilyFileInput(f || {}, existingFiles, existingPatients);
    if (!dupCheck.valid) {
      throw new Error(dupCheck.reason);
    }
    const { data, error } = await supabase.from('family_files').insert([f]).select();
    if (error) return handleError(error, "فشل إنشاء الملف العائلي");
    return data?.[0];
  }
  static async updateFamilyFile(id: string, f: any) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('family_files', 'update', id);
    const [existingFiles, existingPatients] = await Promise.all([
      this.getFamilyFiles(),
      this.getPatients()
    ]);
    const dupCheck = validateNewFamilyFileInput(f || {}, existingFiles, existingPatients, id);
    if (!dupCheck.valid) {
      throw new Error(dupCheck.reason);
    }
    const { data, error } = await supabase.from('family_files').update(f).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث الملف العائلي");
    return data?.[0];
  }
  static async addFamilyMember(m: any) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('family_files', 'create');
    const [existingFiles, existingPatients] = await Promise.all([
      this.getFamilyFiles(),
      this.getPatients()
    ]);
    const dupCheck = validateNewFamilyMemberInput(m || {}, existingFiles, existingPatients);
    if (!dupCheck.valid) {
      throw new Error(dupCheck.reason);
    }
    const { data, error } = await supabase.from('family_file_members').insert([m]).select();
    if (error) return handleError(error, "فشل إضافة فرد للأسرة");
    return data?.[0];
  }
  static async updateFamilyMember(id: string, m: any) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('family_files', 'update', id);
    const { data, error } = await supabase.from('family_file_members').update(m).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث بيانات الفرد");
    return data?.[0];
  }
  static async deleteFamilyMember(id: string) {
    await this.ensureSupabaseAuthSession();
    assertClientCrudPermission('family_files', 'delete', id);
    const { error } = await supabase.from('family_file_members').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الفرد من الأسرة");
    return true;
  }

  // --- Clinical Encounters (اللقاءات السريرية) ---
  static async getClinicalEncounters(patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      let query = supabase.from('clinical_encounters').select('*, patients(*), doctors(*), clinics(*)').order('encounter_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) { if (['42P01', 'PGRST116'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addClinicalEncounter(e: any) {
    await this.ensureSupabaseAuthSession();
    const { data, error } = await supabase.from('clinical_encounters').insert([e]).select();
    if (error) return handleError(error, "فشل إنشاء اللقاء الطبي");
    if (data?.[0] && e.appointment_id) {
       await supabase.from('clinic_appointments').update({ encounter_id: data[0].id, status: 'IN_PROGRESS' }).eq('id', e.appointment_id);
    }
    return data?.[0];
  }

  // --- Patient Vitals & Problems ---
  static async getPatientVitals(patientId: string) {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('patient_vitals').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false });
      if (error) { if (['42P01'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addPatientVitals(v: any) {
    await this.ensureSupabaseAuthSession();
    const { data, error } = await supabase.from('patient_vitals').insert([v]).select();
    if (error) return handleError(error, "فشل تسجيل العلامات الحيوية");
    return data?.[0];
  }

  static async getPatientProblems(patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      let query = supabase.from('patient_problem_list').select('*, patients(*)').order('onset_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) { if (['42P01'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addPatientProblem(prob: any) {
    await this.ensureSupabaseAuthSession();
    const { data, error } = await supabase.from('patient_problem_list').insert([prob]).select();
    if (error) return handleError(error, "فشل إضافة التاريخ المرضي");
    return data?.[0];
  }
  static async deletePatientProblem(id: string) {
    await this.ensureSupabaseAuthSession();
    const { error } = await supabase.from('patient_problem_list').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف التاريخ المرضي");
    return true;
  }

  // --- Patient Deaths (بيانات الوفيات) ---
  static async getPatientDeaths() {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('patient_deaths').select('*, patients(*)').order('death_date', { ascending: false });
      if (error) {
        if (['42P01', 'PGRST116', 'PGRST107'].includes(error.code)) {
          const local = localStorage.getItem('local_patient_deaths');
          return local ? JSON.parse(local) : [];
        }
        throw error;
      }
      return data || [];
    } catch (e) {
      const local = localStorage.getItem('local_patient_deaths');
      return local ? JSON.parse(local) : [];
    }
  }

  static async addPatientDeath(death: any) {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('patient_deaths').insert([death]).select();
      if (error) {
        if (['42P01', 'PGRST116', 'PGRST107'].includes(error.code)) {
          const local = localStorage.getItem('local_patient_deaths');
          const list = local ? JSON.parse(local) : [];
          const newDeath = {
            id: Math.random().toString(36).substring(2) + Date.now().toString(36),
            ...death,
            created_at: new Date().toISOString()
          };
          list.push(newDeath);
          localStorage.setItem('local_patient_deaths', JSON.stringify(list));
          return newDeath;
        }
        return handleError(error, "فشل تسجيل حالة الوفاة");
      }
      return data?.[0];
    } catch (e: any) {
      const local = localStorage.getItem('local_patient_deaths');
      const list = local ? JSON.parse(local) : [];
      const newDeath = {
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        ...death,
        created_at: new Date().toISOString()
      };
      list.push(newDeath);
      localStorage.setItem('local_patient_deaths', JSON.stringify(list));
      return newDeath;
    }
  }

  static async deletePatientDeath(id: string) {
    try {
      await this.ensureSupabaseAuthSession();
      const { error } = await supabase.from('patient_deaths').delete().eq('id', id);
      if (error) {
        if (['42P01', 'PGRST116', 'PGRST107'].includes(error.code)) {
          const local = localStorage.getItem('local_patient_deaths');
          if (local) {
            let list = JSON.parse(local);
            list = list.filter((d: any) => d.id !== id);
            localStorage.setItem('local_patient_deaths', JSON.stringify(list));
          }
          return true;
        }
        return handleError(error, "فشل حذف حالة الوفاة");
      }
      return true;
    } catch (e: any) {
      const local = localStorage.getItem('local_patient_deaths');
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((d: any) => d.id !== id);
        localStorage.setItem('local_patient_deaths', JSON.stringify(list));
      }
      return true;
    }
  }

  // --- Accreditation Specialized Forms Generic Fetch/Save ---
  static async getAccreditationRecords(tableName: string, patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) {
        console.warn(`Supabase getAccreditationRecords (${tableName}) warning:`, error.message || error);
        const local = localStorage.getItem(`local_accreditation_${tableName}`);
        const list = local ? JSON.parse(local) : [];
        return patientId ? list.filter((r: any) => r.patient_id === patientId) : list;
      }
      return data || [];
    } catch (e) {
      console.warn(`Exception getAccreditationRecords (${tableName}):`, e);
      const local = localStorage.getItem(`local_accreditation_${tableName}`);
      const list = local ? JSON.parse(local) : [];
      return patientId ? list.filter((r: any) => r.patient_id === patientId) : list;
    }
  }

  static async addAccreditationRecord(tableName: string, record: any) {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from(tableName).insert([record]).select();
      if (error) {
        console.warn(`Supabase insert (${tableName}) warning, caching locally:`, error.message || error);
        const local = localStorage.getItem(`local_accreditation_${tableName}`);
        const list = local ? JSON.parse(local) : [];
        const newRecord = {
          id: 'rec_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          ...record,
          created_at: new Date().toISOString()
        };
        list.push(newRecord);
        localStorage.setItem(`local_accreditation_${tableName}`, JSON.stringify(list));
        return newRecord;
      }
      return data?.[0];
    } catch (e: any) {
      console.warn(`Exception adding record to (${tableName}), caching locally:`, e);
      const local = localStorage.getItem(`local_accreditation_${tableName}`);
      const list = local ? JSON.parse(local) : [];
      const newRecord = {
        id: 'rec_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        ...record,
        created_at: new Date().toISOString()
      };
      list.push(newRecord);
      localStorage.setItem(`local_accreditation_${tableName}`, JSON.stringify(list));
      return newRecord;
    }
  }

  static async deleteAccreditationRecord(tableName: string, id: string) {
    try {
      await this.ensureSupabaseAuthSession();
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      const local = localStorage.getItem(`local_accreditation_${tableName}`);
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem(`local_accreditation_${tableName}`, JSON.stringify(list));
      }
      if (error) console.warn(`Supabase delete (${tableName}) warning:`, error.message || error);
      return true;
    } catch (e: any) {
      const local = localStorage.getItem(`local_accreditation_${tableName}`);
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem(`local_accreditation_${tableName}`, JSON.stringify(list));
      }
      return true;
    }
  }

  // --- History & Physical Exams (نموذج الفحص الشامل والتاريخ المرضي) ---
  static async getPhysicalExams(patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      let query = supabase.from('history_physical_exams').select('*, patients(*)').order('exam_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      
      const local = localStorage.getItem('local_history_physical_exams');
      const localList = local ? JSON.parse(local) : [];
      const filteredLocal = patientId ? localList.filter((item: any) => item.patient_id === patientId) : localList;

      if (error) {
        console.warn("Supabase query history_physical_exams info:", error.message || error);
        return filteredLocal;
      }

      // Combine remote data and local fallback data without duplicates
      const combined = [...(data || [])];
      for (const locItem of filteredLocal) {
        if (!combined.some(c => c.id === locItem.id)) {
          combined.push(locItem);
        }
      }
      return combined;
    } catch (e) {
      console.warn("Exception fetching physical exams, using local cache:", e);
      const local = localStorage.getItem('local_history_physical_exams');
      const list = local ? JSON.parse(local) : [];
      return patientId ? list.filter((item: any) => item.patient_id === patientId) : list;
    }
  }

  static async getPhysicalExamForAppointment(appointmentId?: string, patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      if (appointmentId) {
        const { data, error } = await supabase
          .from('history_physical_exams')
          .select('*')
          .eq('appointment_id', appointmentId)
          .maybeSingle();
        if (!error && data) return data;
      }
      if (patientId) {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('history_physical_exams')
          .select('*')
          .eq('patient_id', patientId)
          .eq('exam_date', today)
          .order('created_at', { ascending: false })
          .limit(1);
        if (!error && data && data.length > 0) return data[0];
      }
      return null;
    } catch (e) {
      console.warn("Exception fetching physical exam for appointment:", e);
      return null;
    }
  }

  static async saveClinicPhysicalExam(examData: any) {
    await this.ensureSupabaseAuthSession();
    // Check if an existing record matches appointment_id or (patient_id AND exam_date)
    let existingId: string | null = null;
    if (examData.appointment_id) {
      const { data: byAppt, error: errAppt } = await supabase
        .from('history_physical_exams')
        .select('id')
        .eq('appointment_id', examData.appointment_id)
        .maybeSingle();
      if (!errAppt && byAppt?.id) {
        existingId = byAppt.id;
      }
    }

    if (!existingId && examData.patient_id && examData.exam_date) {
      const { data: byPatientDate, error: errDate } = await supabase
        .from('history_physical_exams')
        .select('id')
        .eq('patient_id', examData.patient_id)
        .eq('exam_date', examData.exam_date)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!errDate && byPatientDate && byPatientDate.length > 0) {
        existingId = byPatientDate[0].id;
      }
    }

    if (existingId) {
      const { data, error } = await supabase
        .from('history_physical_exams')
        .update(examData)
        .eq('id', existingId)
        .select();
      if (error) {
        return handleError(error, "فشل تحديث بيانات الفحص والتاريخ الطبي");
      }
      return data?.[0];
    } else {
      const { data, error } = await supabase
        .from('history_physical_exams')
        .insert([examData])
        .select();
      if (error) {
        return handleError(error, "فشل حفظ بيانات الفحص والتاريخ الطبي");
      }
      return data?.[0];
    }
  }

  static async addPhysicalExam(exam: any) {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('history_physical_exams').insert([exam]).select();
      if (error) {
        console.warn("Supabase insert history_physical_exams warning, saving locally:", error.message || error);
        const local = localStorage.getItem('local_history_physical_exams');
        const list = local ? JSON.parse(local) : [];
        const newExam = {
          id: 'exam_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          ...exam,
          created_at: new Date().toISOString()
        };
        list.push(newExam);
        localStorage.setItem('local_history_physical_exams', JSON.stringify(list));
        return newExam;
      }
      return data?.[0];
    } catch (e: any) {
      console.warn("Exception adding physical exam, saving locally:", e);
      const local = localStorage.getItem('local_history_physical_exams');
      const list = local ? JSON.parse(local) : [];
      const newExam = {
        id: 'exam_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        ...exam,
        created_at: new Date().toISOString()
      };
      list.push(newExam);
      localStorage.setItem('local_history_physical_exams', JSON.stringify(list));
      return newExam;
    }
  }

  static async deletePhysicalExam(id: string) {
    try {
      await this.ensureSupabaseAuthSession();
      const { error } = await supabase.from('history_physical_exams').delete().eq('id', id);
      const local = localStorage.getItem('local_history_physical_exams');
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem('local_history_physical_exams', JSON.stringify(list));
      }
      if (error) console.warn("Supabase delete history_physical_exams warning:", error.message || error);
      return true;
    } catch (e: any) {
      const local = localStorage.getItem('local_history_physical_exams');
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem('local_history_physical_exams', JSON.stringify(list));
      }
      return true;
    }
  }

  // --- Visits Form (نموذج التردد) ---
  static async getPatientVisits(patientId?: string) {
    try {
      await this.ensureSupabaseAuthSession();
      let query = supabase.from('patient_visits').select('*, patients(*)').order('visit_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      
      const local = localStorage.getItem('local_patient_visits');
      const localList = local ? JSON.parse(local) : [];
      const filteredLocal = patientId ? localList.filter((item: any) => item.patient_id === patientId) : localList;

      if (error) {
        console.warn("Supabase query patient_visits info:", error.message || error);
        return filteredLocal;
      }

      const combined = [...(data || [])];
      for (const locItem of filteredLocal) {
        if (!combined.some(c => c.id === locItem.id)) {
          combined.push(locItem);
        }
      }
      return combined.sort((a, b) => new Date(b.visit_date || b.created_at).getTime() - new Date(a.visit_date || a.created_at).getTime());
    } catch (e) {
      console.warn("Exception fetching patient visits, using local cache:", e);
      const local = localStorage.getItem('local_patient_visits');
      const list = local ? JSON.parse(local) : [];
      return patientId ? list.filter((item: any) => item.patient_id === patientId) : list;
    }
  }

  static async addPatientVisit(visit: any) {
    try {
      await this.ensureSupabaseAuthSession();
      const { data, error } = await supabase.from('patient_visits').insert([visit]).select();
      if (error) {
        console.warn("Supabase insert patient_visits warning, saving locally:", error.message || error);
        const local = localStorage.getItem('local_patient_visits');
        const list = local ? JSON.parse(local) : [];
        const newVisit = {
          id: 'visit_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
          ...visit,
          created_at: new Date().toISOString()
        };
        list.push(newVisit);
        localStorage.setItem('local_patient_visits', JSON.stringify(list));
        return newVisit;
      }
      return data?.[0];
    } catch (e: any) {
      console.warn("Exception adding patient visit, saving locally:", e);
      const local = localStorage.getItem('local_patient_visits');
      const list = local ? JSON.parse(local) : [];
      const newVisit = {
        id: 'visit_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        ...visit,
        created_at: new Date().toISOString()
      };
      list.push(newVisit);
      localStorage.setItem('local_patient_visits', JSON.stringify(list));
      return newVisit;
    }
  }

  static async deletePatientVisit(id: string) {
    try {
      const { error } = await supabase.from('patient_visits').delete().eq('id', id);
      const local = localStorage.getItem('local_patient_visits');
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem('local_patient_visits', JSON.stringify(list));
      }
      if (error) console.warn("Supabase delete patient_visits warning:", error.message || error);
      return true;
    } catch (e: any) {
      const local = localStorage.getItem('local_patient_visits');
      if (local) {
        let list = JSON.parse(local);
        list = list.filter((item: any) => item.id !== id);
        localStorage.setItem('local_patient_visits', JSON.stringify(list));
      }
      return true;
    }
  }

  static async getPatientHistory(patientId: string) {
    try {
      const [sessions, labTests, appointments, invoices, physicalExams, visits] = await Promise.all([
        supabase.from('dialysis_sessions').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('lab_tests').select('*, lab_test_definitions(*)').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('clinic_appointments').select('*, doctors(*), clinics(*)').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('invoices').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        this.getPhysicalExams(patientId),
        this.getPatientVisits(patientId)
      ]);

      const events: any[] = [];

      sessions.data?.forEach(s => events.push({ ...s, type: 'SESSION' }));
      labTests.data?.forEach(l => events.push({ ...l, type: 'LAB' }));
      appointments.data?.forEach(a => events.push({ ...a, type: 'APPOINTMENT' }));
      invoices.data?.forEach(i => events.push({ ...i, type: 'INVOICE' }));
      physicalExams.forEach((p: any) => events.push({ ...p, type: 'PHYSICAL_EXAM', date: p.exam_date }));
      visits.forEach((v: any) => events.push({ ...v, type: 'VISIT', date: v.visit_date || v.created_at }));

      return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (e) {
      console.error(e);
      return [];
    }
  }


  static async addSession(s: any, storeId?: string) { 
    assertClientCrudPermission('sessions', 'create');
    const dateCheck = validateNewWaitingDateNotInPast(s?.date, s?.status || 'WAITING');
    if (!dateCheck.valid) {
      throw new Error(dateCheck.reason);
    }
    if (storeId && s.service_id) {
      // Auto consume consumables if config exists
      const { data: service, error: sError } = await supabase.from('services').select('*').eq('id', s.service_id).single();
      if (sError) return handleError(sError, "فشل جلب بيانات الخدمة");
      if (service?.config?.consumables) {
        for (const item of service.config.consumables) {
           await this.addStockTransaction({
             product_id: item.product_id,
             store_id: storeId,
             type: 'DEDUCT',
             quantity: item.quantity,
             date: new Date().toISOString().split('T')[0],
             note: `استهلاك آلي - جلسة طبية`
           });
        }
      }
    }
    const { data, error } = await supabase.from('dialysis_sessions').insert([s]).select(); 
    if (error) return handleError(error, "فشل إضافة الجلسة"); 
    const sessionRes = data?.[0];
    if (sessionRes && sessionRes.blood_pressure) {
      supabase.from('dialysis_sessions').select('*, patients(*)').eq('id', sessionRes.id).single().then(({ data: fullSess }) => {
        if (fullSess) realtimeNotificationService.evaluateAndTriggerSessionBPAlert(fullSess);
      }, () => {});
    }
    return sessionRes; 
  }

  static async updateSession(id: string, s: any) {
    let payload = { ...s };
    let { data, error } = await supabase.from('dialysis_sessions').update(payload).eq('id', id).select();
    
    // Graceful resilience: If column disconnection_time is not yet in Supabase schema (error 42703), store it inside custom_data
    if (error && (error.code === '42703' || error.message?.includes('disconnection_time')) && payload.disconnection_time !== undefined) {
      const discTime = payload.disconnection_time;
      delete payload.disconnection_time;
      try {
        const { data: curr } = await supabase.from('dialysis_sessions').select('custom_data').eq('id', id).single();
        let cData: any = {};
        if (curr?.custom_data) {
          cData = typeof curr.custom_data === 'string' ? JSON.parse(curr.custom_data) : curr.custom_data;
        }
        cData.disconnection_time = discTime;
        payload.custom_data = cData;
      } catch (e) {
        payload.custom_data = { disconnection_time: discTime };
      }
      const retry = await supabase.from('dialysis_sessions').update(payload).eq('id', id).select();
      data = retry.data;
      error = retry.error;
    }

    if (error) return handleError(error, "فشل تحديث الجلسة");
    const sessionRes = data?.[0];
    if (sessionRes) {
      if (!sessionRes.disconnection_time && sessionRes.custom_data) {
        try {
          const parsed = typeof sessionRes.custom_data === 'string' ? JSON.parse(sessionRes.custom_data) : sessionRes.custom_data;
          if (parsed?.disconnection_time) sessionRes.disconnection_time = parsed.disconnection_time;
        } catch (e) {}
      }
      if (sessionRes.blood_pressure) {
        supabase.from('dialysis_sessions').select('*, patients(*)').eq('id', id).single().then(({ data: fullSess }) => {
          if (fullSess) realtimeNotificationService.evaluateAndTriggerSessionBPAlert(fullSess);
        }, () => {});
      }
    }
    return sessionRes;
  }

  static async recordDisconnectionTime(id: string, disconnectionTime?: string) {
    const timeToRecord = disconnectionTime || new Date().toTimeString().slice(0, 5);
    return this.updateSession(id, { disconnection_time: timeToRecord });
  }

  static async finishSession(id: string, data: any, storeId?: string) {
    if (storeId && data.service_id) {
        const { data: service } = await supabase.from('services').select('*').eq('id', data.service_id).single();
        if (service?.config?.consumables) {
            for (const item of service.config.consumables) {
                await this.addStockTransaction({
                    product_id: item.product_id,
                    store_id: storeId,
                    type: 'DEDUCT',
                    quantity: item.quantity,
                    date: new Date().toISOString().split('T')[0],
                    note: `استهلاك آلي - إنهاء جلسة`
                });
            }
        }
    }
    const nowTime = new Date().toTimeString().slice(0, 5);
    const disconnectionTime = data.disconnection_time || nowTime;
    const endTime = data.end_time || nowTime;

    const updatedSession = await this.updateSession(id, { 
      ...data, 
      status: 'FINISHED', 
      disconnection_time: disconnectionTime,
      end_time: endTime 
    });

    // التحديث التلقائي للملف العائلي وسجل متابعات المريض فور انتهاء جلسة الغسيل
    try {
      const patientId = updatedSession?.patient_id || data?.patient_id;
      if (patientId) {
        const todayStr = new Date().toISOString().split('T')[0];
        const summaryParts = [
          `[جلسة غسيل كلوي مكتملة]`,
          data.room || updatedSession?.room ? `غرفة: ${data.room || updatedSession?.room}` : '',
          data.weight_before || updatedSession?.weight_before ? `وزن قبل: ${data.weight_before || updatedSession?.weight_before} كجم` : '',
          data.weight_after ? `وزن بعد: ${data.weight_after} كجم` : '',
          data.blood_pressure || updatedSession?.blood_pressure ? `الضغط: ${data.blood_pressure || updatedSession?.blood_pressure}` : '',
          `وقت فك الوصلة: ${disconnectionTime}`,
          data.notes ? `ملاحظات: ${data.notes}` : ''
        ].filter(Boolean);

        await this.addPatientVisit({
          patient_id: patientId,
          visit_date: updatedSession?.date || todayStr,
          complaint_and_diagnosis: summaryParts.join(' | '),
          treatment_plan: 'إتمام جلسة الاستصفاء الدموي ومتابعة العلامات الحيوية والوصلة الوعائية',
          doctor_signature: 'وحدة الغسيل الكلوي'
        });
      }
    } catch (syncErr) {
      console.warn('Auto-sync dialysis session to family visit log warning:', syncErr);
    }

    return updatedSession;
  }

  // =========================================================================
  // Comprehensive Dialysis Nursing Assessment (موديول التقييم التمريضي الشامل)
  // Strict Real Error Handling - No Silent Local Fallbacks
  // =========================================================================

  static async getDialysisNursingAssessment(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_nursing_assessments')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) {
      throw new Error(`فشل جلب التقييم التمريضي للجلسة: ${error.message}`);
    }
    return data;
  }

  static async saveDialysisNursingAssessment(assessment: any) {
    if (assessment.id) {
      const { data, error } = await supabase
        .from('dialysis_nursing_assessments')
        .update(assessment)
        .eq('id', assessment.id)
        .select()
        .single();
      if (error) throw new Error(`فشل تحديث التقييم التمريضي: ${error.message}`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('dialysis_nursing_assessments')
        .insert([assessment])
        .select()
        .single();
      if (error) throw new Error(`فشل حفظ التقييم التمريضي: ${error.message}`);
      return data;
    }
  }

  static async getDialysisAccessLines(patientId: string) {
    const { data, error } = await supabase
      .from('dialysis_access_lines')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`فشل جلب سجل الوصلات والقساطر: ${error.message}`);
    return data || [];
  }

  static async addDialysisAccessLine(line: any) {
    const { data, error } = await supabase
      .from('dialysis_access_lines')
      .insert([line])
      .select()
      .single();
    if (error) throw new Error(`فشل إضافة وصلة/قسطرة جديدة: ${error.message}`);
    return data;
  }

  static async updateDialysisAccessLine(id: string, updates: any) {
    const { data, error } = await supabase
      .from('dialysis_access_lines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`فشل تحديث حالة الوصلة/القسطرة: ${error.message}`);
    return data;
  }

  static async getDialysisNursingNotes(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_nursing_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('note_time', { ascending: true });
    if (error) throw new Error(`فشل جلب ملاحظات التمريض: ${error.message}`);
    return data || [];
  }

  static async addDialysisNursingNote(note: any) {
    const { data, error } = await supabase
      .from('dialysis_nursing_notes')
      .insert([note])
      .select()
      .single();
    if (error) throw new Error(`فشل حفظ ملاحظة التمريض: ${error.message}`);
    return data;
  }

  static async deleteDialysisNursingNote(id: string) {
    const { error } = await supabase
      .from('dialysis_nursing_notes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف ملاحظة التمريض: ${error.message}`);
    return true;
  }

  static async getDialysisNursingCarePlans(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_nursing_care_plan')
      .select('*')
      .eq('session_id', sessionId)
      .order('plan_time', { ascending: true });
    if (error) throw new Error(`فشل جلب خطة الرعاية التمريضية: ${error.message}`);
    return data || [];
  }

  static async addDialysisNursingCarePlan(plan: any) {
    const { data, error } = await supabase
      .from('dialysis_nursing_care_plan')
      .insert([plan])
      .select()
      .single();
    if (error) throw new Error(`فشل حفظ خطة الرعاية التمريضية: ${error.message}`);
    return data;
  }

  static async deleteDialysisNursingCarePlan(id: string) {
    const { error } = await supabase
      .from('dialysis_nursing_care_plan')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف خطة الرعاية التمريضية: ${error.message}`);
    return true;
  }

  static async getDialysisVitalSignsEws(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_vital_signs_ews')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_time', { ascending: true });
    if (error) throw new Error(`فشل جلب العلامات الحيوية وسجل الإنذار المبكر: ${error.message}`);
    return data || [];
  }

  static async addDialysisVitalSignsEws(vitals: any) {
    const { data, error } = await supabase
      .from('dialysis_vital_signs_ews')
      .insert([vitals])
      .select()
      .single();
    if (error) throw new Error(`فشل حفظ العلامات الحيوية وتقييم الإنذار المبكر: ${error.message}`);

    // Instant clinical evaluation for vital signs alerts
    if (data) {
      supabase
        .from('dialysis_sessions')
        .select('*, patients(*)')
        .eq('id', vitals.session_id)
        .maybeSingle()
        .then(({ data: sess }) => {
          if (sess) {
            realtimeNotificationService.evaluateAndTriggerVitalsAlert(data, sess.patients, sess);
          }
        }, () => {});
    }

    return data;
  }

  static async deleteDialysisVitalSignsEws(id: string) {
    const { error } = await supabase
      .from('dialysis_vital_signs_ews')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف سجل العلامات الحيوية: ${error.message}`);
    return true;
  }

  static async getDialysisPainGlucoseLogs(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_pain_glucose_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('log_time', { ascending: true });
    if (error) throw new Error(`فشل جلب سجل الألم والسكر وكمية السحب: ${error.message}`);
    return data || [];
  }

  static async addDialysisPainGlucoseLog(log: any) {
    const { data, error } = await supabase
      .from('dialysis_pain_glucose_log')
      .insert([log])
      .select()
      .single();
    if (error) throw new Error(`فشل حفظ سجل الألم والسكر: ${error.message}`);
    return data;
  }

  static async deleteDialysisPainGlucoseLog(id: string) {
    const { error } = await supabase
      .from('dialysis_pain_glucose_log')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف سجل الألم والسكر: ${error.message}`);
    return true;
  }

  static async getDialysisMedicalCareLogs(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_medical_care_log')
      .select('*')
      .eq('session_id', sessionId)
      .order('log_time', { ascending: true });
    if (error) throw new Error(`فشل جلب سجل المرور والرعاية الطبية: ${error.message}`);
    return data || [];
  }

  static async addDialysisMedicalCareLog(log: any) {
    const { data, error } = await supabase
      .from('dialysis_medical_care_log')
      .insert([log])
      .select()
      .single();
    if (error) throw new Error(`فشل حفظ سجل الرعاية الطبية: ${error.message}`);
    return data;
  }

  static async deleteDialysisMedicalCareLog(id: string) {
    const { error } = await supabase
      .from('dialysis_medical_care_log')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف سجل الرعاية الطبية: ${error.message}`);
    return true;
  }

  static async getDialysisMedicationAdmins(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_medication_administration')
      .select('*')
      .eq('session_id', sessionId)
      .order('administered_datetime', { ascending: true });
    if (error) throw new Error(`فشل جلب سجل الأدوية MAR: ${error.message}`);
    return data || [];
  }

  static async addDialysisMedicationAdmin(med: any) {
    const { data, error } = await supabase
      .from('dialysis_medication_administration')
      .insert([med])
      .select()
      .single();
    if (error) throw new Error(`فشل تسجيل إعطاء الدواء: ${error.message}`);
    return data;
  }

  static async deleteDialysisMedicationAdmin(id: string) {
    const { error } = await supabase
      .from('dialysis_medication_administration')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف سجل الدواء: ${error.message}`);
    return true;
  }

  static async getDialysisHealthEducations(patientId: string, sessionId?: string) {
    let query = supabase
      .from('dialysis_health_education')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await query;
    if (error) throw new Error(`فشل جلب سجلات التثقيف الصحي: ${error.message}`);
    return data || [];
  }

  static async saveDialysisHealthEducation(edu: any) {
    if (edu.id) {
      const { data, error } = await supabase
        .from('dialysis_health_education')
        .update(edu)
        .eq('id', edu.id)
        .select()
        .single();
      if (error) throw new Error(`فشل تحديث التثقيف الصحي: ${error.message}`);
      return data;
    } else {
      const { data, error } = await supabase
        .from('dialysis_health_education')
        .insert([edu])
        .select()
        .single();
      if (error) throw new Error(`فشل حفظ التثقيف الصحي: ${error.message}`);
      return data;
    }
  }

  // --- Dialysis Fall Risk Reviews (إجراءات الوقاية من مخاطر السقوط - مرتان بالجلسة) ---
  static async getDialysisFallRiskReviews(sessionId: string) {
    const { data, error } = await supabase
      .from('dialysis_fall_risk_reviews')
      .select('*')
      .eq('session_id', sessionId)
      .order('review_time', { ascending: true });
    if (error) {
      console.warn("Could not load fall risk reviews from DB, fallback to empty list:", error.message);
      return [];
    }
    return data || [];
  }

  static async getFallRiskReviewsForSessions(sessionIds: string[]) {
    if (!sessionIds || sessionIds.length === 0) return [];
    const { data, error } = await supabase
      .from('dialysis_fall_risk_reviews')
      .select('*')
      .in('session_id', sessionIds)
      .order('review_time', { ascending: false });
    if (error) {
      console.warn("Could not load batch fall risk reviews:", error.message);
      return [];
    }
    return data || [];
  }

  static async saveDialysisFallRiskReview(review: any) {
    let resultData = null;
    if (review.id) {
      const { data, error } = await supabase
        .from('dialysis_fall_risk_reviews')
        .update(review)
        .eq('id', review.id)
        .select()
        .single();
      if (error) throw new Error(`فشل تحديث مراجعة مخاطر السقوط: ${error.message}`);
      resultData = data;
    } else {
      const { data, error } = await supabase
        .from('dialysis_fall_risk_reviews')
        .insert([review])
        .select()
        .single();
      if (error) throw new Error(`فشل حفظ مراجعة مخاطر السقوط: ${error.message}`);
      resultData = data;
    }

    // Acknowledge corresponding hall notification if any
    try {
      realtimeNotificationService.dismissFallRiskAlert(review.session_id, review.review_stage, review.reviewer_name);
    } catch (e) {}

    return resultData;
  }

  static async deleteDialysisFallRiskReview(id: string) {
    const { error } = await supabase
      .from('dialysis_fall_risk_reviews')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`فشل حذف مراجعة مخاطر السقوط: ${error.message}`);
    return true;
  }

  // ============================================================================
  // PHARMACY & BATCH MANAGEMENT (FEFO + FIFO DISPENSING ENGINE)
  // ============================================================================

  static isMissingTableError(error: any): boolean {
    if (!error) return false;
    const code = error?.code || '';
    const msg = (error?.message || error?.details || '').toLowerCase();
    return (
      ['42P01', 'PGRST107', 'PGRST205'].includes(code) ||
      msg.includes('schema cache') ||
      msg.includes('could not find the table') ||
      msg.includes('does not exist')
    );
  }

  static async getPharmacyItems(): Promise<PharmacyItem[]> {
    const { data, error } = await supabase
      .from('pharmacy_items')
      .select('*')
      .order('trade_name', { ascending: true });
    if (error) {
      if (this.isMissingTableError(error)) {
        throw new Error('MISSING_PHARMACY_SCHEMA: جداول الصيدلية (pharmacy_items) غير موجودة بعد في قاعدة البيانات الحية.');
      }
      return handleError(error, 'فشل جلب دليل الأدوية');
    }
    return (data || []) as PharmacyItem[];
  }

  static async savePharmacyItem(item: Partial<PharmacyItem>): Promise<PharmacyItem> {
    const payload: any = {
      code: item.code?.trim() || null,
      trade_name: item.trade_name?.trim(),
      generic_name: item.generic_name?.trim() || null,
      dosage_form: item.dosage_form || 'أقراص',
      strength: item.strength?.trim() || null,
      unit: item.unit || 'علبة',
      min_stock_level: Number(item.min_stock_level ?? 10),
      storage_conditions: item.storage_conditions?.trim() || 'درجة حرارة الغرفة (أقل من 25°C)',
      notes: item.notes?.trim() || null,
      is_active: item.is_active ?? true,
      updated_at: new Date().toISOString()
    };

    if (item.id) {
      const { data, error } = await supabase
        .from('pharmacy_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();
      if (error) return handleError(error, 'فشل تحديث الصنف الدوائي');
      return data as PharmacyItem;
    } else {
      payload.created_by = item.created_by || null;
      const { data, error } = await supabase
        .from('pharmacy_items')
        .insert([payload])
        .select()
        .single();
      if (error) return handleError(error, 'فشل إضافة الصنف الدوائي');
      return data as PharmacyItem;
    }
  }

  static async deletePharmacyItem(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('pharmacy_items')
      .delete()
      .eq('id', id);
    if (error) return handleError(error, 'لا يمكن حذف الصنف الدوائي لارتباطه بباتشات أو حركات صرف سابقة');
    return true;
  }

  static async getPharmacyBatches(itemId?: string): Promise<PharmacyBatch[]> {
    let query = supabase
      .from('pharmacy_batches')
      .select('*, pharmacy_items(*)')
      .order('expiry_date', { ascending: true })
      .order('received_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;
    if (error) {
      if (this.isMissingTableError(error)) {
        throw new Error('MISSING_PHARMACY_SCHEMA: جدول الباتشات (pharmacy_batches) غير موجود بعد في قاعدة البيانات الحية.');
      }
      return handleError(error, 'فشل جلب سجل الباتشات');
    }
    return (data || []) as PharmacyBatch[];
  }

  static async addPharmacyBatch(batch: Partial<PharmacyBatch>): Promise<PharmacyBatch> {
    const qty = Number(batch.initial_quantity || 0);
    if (qty <= 0) {
      throw new Error('يجب أن تكون الكمية الواردة للباتش أكبر من صفر');
    }
    if (!batch.expiry_date) {
      throw new Error('تاريخ انتهاء الصلاحية إلزامي لتشغيل خوارزمية FEFO/FIFO');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyExpired = batch.expiry_date < todayStr;

    const payload = {
      item_id: batch.item_id,
      batch_number: batch.batch_number?.trim(),
      production_date: batch.production_date || null,
      expiry_date: batch.expiry_date,
      received_date: batch.received_date || todayStr,
      initial_quantity: qty,
      remaining_quantity: qty,
      supplier_name: batch.supplier_name?.trim() || null,
      status: isAlreadyExpired ? 'EXPIRED' : 'ACTIVE',
      notes: batch.notes?.trim() || null,
      received_by: batch.received_by || null
    };

    const { data, error } = await supabase
      .from('pharmacy_batches')
      .insert([payload])
      .select('*, pharmacy_items(*)')
      .single();

    if (error) return handleError(error, 'فشل تسجيل الباتش الجديد');
    return data as PharmacyBatch;
  }

  static async updatePharmacyBatchStatus(batchId: string, status: PharmacyBatchStatus, notes?: string): Promise<PharmacyBatch> {
    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    const { data, error } = await supabase
      .from('pharmacy_batches')
      .update(updatePayload)
      .eq('id', batchId)
      .select('*, pharmacy_items(*)')
      .single();

    if (error) return handleError(error, 'فشل تحديث حالة الباتش');
    return data as PharmacyBatch;
  }

  /**
   * محرك التخصيص الذكي للباتشات (FEFO ثم FIFO):
   * 1. يستبعد أي باتش منتهي الصلاحية (expiry_date < اليوم) أو محجور أو نافد (remaining_quantity <= 0).
   * 2. يرتب الباتشات الصالحة حسب:
   *    أولاً: الأقرب انتهاء صلاحية (expiry_date ASC - FEFO)
   *    ثانياً: الأقدم في تاريخ التوريد (received_date ASC - FIFO)
   *    ثالثاً: الأسبق إدخالاً بالنظام (created_at ASC)
   * 3. يجزئ الكمية المطلوبة تلقائياً عبر الباتشات المتاحة بالترتيب.
   */
  static allocateBatchesFEFO_FIFO(
    itemId: string,
    requestedQuantity: number,
    allBatches: PharmacyBatch[]
  ): {
    allocations: BatchAllocationSlice[];
    totalAllocated: number;
    shortage: number;
    isFullyCovered: boolean;
    totalValidAvailable: number;
    excludedExpiredCount: number;
  } {
    const todayStr = new Date().toISOString().split('T')[0];
    const itemBatches = allBatches.filter(b => b.item_id === itemId);

    const excludedExpiredCount = itemBatches.filter(
      b => b.remaining_quantity > 0 && (b.expiry_date < todayStr || b.status === 'EXPIRED')
    ).length;

    const eligibleBatches = itemBatches
      .filter(
        b =>
          b.status === 'ACTIVE' &&
          Number(b.remaining_quantity) > 0 &&
          b.expiry_date >= todayStr
      )
      .sort((a, b) => {
        if (a.expiry_date !== b.expiry_date) {
          return a.expiry_date.localeCompare(b.expiry_date);
        }
        if (a.received_date !== b.received_date) {
          return a.received_date.localeCompare(b.received_date);
        }
        return (a.created_at || '').localeCompare(b.created_at || '');
      });

    const totalValidAvailable = eligibleBatches.reduce(
      (sum, b) => sum + Number(b.remaining_quantity),
      0
    );

    const allocations: BatchAllocationSlice[] = [];
    let remainingToAllocate = Number(requestedQuantity);

    eligibleBatches.forEach((batch, index) => {
      if (remainingToAllocate <= 0) return;
      const avail = Number(batch.remaining_quantity);
      const take = Math.min(avail, remainingToAllocate);
      if (take > 0) {
        allocations.push({
          batch_id: batch.id,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
          received_date: batch.received_date,
          available_in_batch: avail,
          allocated_quantity: take,
          priority_rank: index + 1
        });
        remainingToAllocate -= take;
      }
    });

    const totalAllocated = Number(requestedQuantity) - remainingToAllocate;
    return {
      allocations,
      totalAllocated,
      shortage: Math.max(0, remainingToAllocate),
      isFullyCovered: remainingToAllocate <= 0 && requestedQuantity > 0,
      totalValidAvailable,
      excludedExpiredCount
    };
  }

  static async getPharmacyDispenseOrders(): Promise<PharmacyDispenseOrder[]> {
    const { data, error } = await supabase
      .from('pharmacy_dispense_orders')
      .select('*, patients(*), pharmacy_dispense_items(*, pharmacy_items(*), pharmacy_batches(*))')
      .order('dispensed_at', { ascending: false });

    if (error) {
      if (this.isMissingTableError(error)) {
        throw new Error('MISSING_PHARMACY_SCHEMA: جدول أذونات الصرف (pharmacy_dispense_orders) غير موجود بعد في قاعدة البيانات الحية.');
      }
      return handleError(error, 'فشل جلب سجل أذونات الصرف الدوائي');
    }
    return (data || []) as PharmacyDispenseOrder[];
  }

  static async createPharmacyDispenseOrder(
    orderInput: {
      patient_id: string;
      source_type: 'CLINIC_PRESCRIPTION' | 'DIALYSIS_SESSION' | 'DIRECT';
      appointment_id?: string;
      session_id?: string;
      prescribing_doctor?: string;
      dispensed_by: string;
      diagnosis_or_notes?: string;
    },
    lines: {
      item_id: string;
      requested_quantity: number;
      dosage_instructions?: string;
    }[]
  ): Promise<PharmacyDispenseOrder> {
    if (!orderInput.patient_id) {
      throw new Error('يرجى اختيار المريض أولاً قبل اعتماد الصرف');
    }
    if (!lines || lines.length === 0) {
      throw new Error('يرجى إضافة صنف دوائي واحد على الأقل للصرف');
    }

    // 1. Fetch fresh batches from DB to guarantee atomic accuracy
    const freshBatches = await this.getPharmacyBatches();
    const allItems = await this.getPharmacyItems();
    const itemsMap = new Map(allItems.map(i => [i.id, i]));

    // 2. Compute FEFO + FIFO allocations for every requested medication line
    const preparedDispenseItems: {
      item_id: string;
      batch_id: string;
      batch_number_snapshot: string;
      expiry_date_snapshot: string;
      quantity: number;
      dosage_instructions?: string;
      new_batch_remaining: number;
    }[] = [];

    for (const line of lines) {
      const drug = itemsMap.get(line.item_id);
      const drugName = drug?.trade_name || 'صنف دوائي';
      const allocationResult = this.allocateBatchesFEFO_FIFO(
        line.item_id,
        line.requested_quantity,
        freshBatches
      );

      if (!allocationResult.isFullyCovered) {
        throw new Error(
          `الرصيد الصالح غير كافٍ للصنف (${drugName}). المطلوب: ${line.requested_quantity}، المتاح الصالح للصرف: ${allocationResult.totalValidAvailable}`
        );
      }

      for (const slice of allocationResult.allocations) {
        // Also update our in-memory freshBatches copy in case the same drug appears twice
        const targetBatch = freshBatches.find(b => b.id === slice.batch_id);
        if (!targetBatch || Number(targetBatch.remaining_quantity) < slice.allocated_quantity) {
          throw new Error(`تعارض في رصيد الباتش (${slice.batch_number}) للصنف (${drugName})`);
        }
        targetBatch.remaining_quantity = Number(targetBatch.remaining_quantity) - slice.allocated_quantity;

        preparedDispenseItems.push({
          item_id: line.item_id,
          batch_id: slice.batch_id,
          batch_number_snapshot: slice.batch_number,
          expiry_date_snapshot: slice.expiry_date,
          quantity: slice.allocated_quantity,
          dosage_instructions: line.dosage_instructions?.trim() || undefined,
          new_batch_remaining: targetBatch.remaining_quantity
        });
      }
    }

    // 3. Generate unique readable order number
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PH-${dateStamp}-${randSuffix}`;

    // 4. Insert header into pharmacy_dispense_orders
    const { data: createdOrder, error: orderError } = await supabase
      .from('pharmacy_dispense_orders')
      .insert([
        {
          order_number: orderNumber,
          patient_id: orderInput.patient_id,
          source_type: orderInput.source_type,
          appointment_id: orderInput.appointment_id || null,
          session_id: orderInput.session_id || null,
          prescribing_doctor: orderInput.prescribing_doctor?.trim() || null,
          dispensed_by: orderInput.dispensed_by,
          dispensed_at: now.toISOString(),
          diagnosis_or_notes: orderInput.diagnosis_or_notes?.trim() || null
        }
      ])
      .select()
      .single();

    if (orderError) return handleError(orderError, 'فشل إنشاء إذن الصرف الدوائي');

    // 5. Insert batch-level line items into pharmacy_dispense_items
    const itemsPayload = preparedDispenseItems.map(p => ({
      dispense_order_id: createdOrder.id,
      item_id: p.item_id,
      batch_id: p.batch_id,
      batch_number_snapshot: p.batch_number_snapshot,
      expiry_date_snapshot: p.expiry_date_snapshot,
      quantity: p.quantity,
      dosage_instructions: p.dosage_instructions || null
    }));

    const { error: itemsError } = await supabase
      .from('pharmacy_dispense_items')
      .insert(itemsPayload);

    if (itemsError) return handleError(itemsError, 'فشل حفظ تفاصيل الباتشات المنصرفة');

    // 6. Deduct quantities from pharmacy_batches & update status to DEPLETED if 0
    for (const p of preparedDispenseItems) {
      const nextStatus: PharmacyBatchStatus = p.new_batch_remaining <= 0 ? 'DEPLETED' : 'ACTIVE';
      const { error: batchUpdateError } = await supabase
        .from('pharmacy_batches')
        .update({
          remaining_quantity: p.new_batch_remaining,
          status: nextStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', p.batch_id);

      if (batchUpdateError) {
        return handleError(batchUpdateError, `فشل خصم الكمية من الباتش ${p.batch_number_snapshot}`);
      }
    }

    // 7. Check if any dispensed item dropped below min_stock_level and notify
    const uniqueItemIds = Array.from(new Set(lines.map(l => l.item_id)));
    const todayStr = now.toISOString().split('T')[0];
    for (const itemId of uniqueItemIds) {
      const drug = itemsMap.get(itemId);
      if (!drug) continue;
      const remainingValid = freshBatches
        .filter(b => b.item_id === itemId && b.status === 'ACTIVE' && b.expiry_date >= todayStr)
        .reduce((acc, b) => acc + Number(b.remaining_quantity), 0);

      if (remainingValid <= Number(drug.min_stock_level)) {
        await this.addNotification({
          title: `تنبيه نقص رصيد دوائي: ${drug.trade_name}`,
          message: `انخفض الرصيد الصالح للصرف من الدواء (${drug.trade_name}) إلى ${remainingValid} ${drug.unit} (حد الطلب الأدنى: ${drug.min_stock_level}).`,
          type: 'warning',
          category: 'الصيدلية'
        });
      }
    }

    // Return full order with relations
    const { data: fullOrder } = await supabase
      .from('pharmacy_dispense_orders')
      .select('*, patients(*), pharmacy_dispense_items(*, pharmacy_items(*), pharmacy_batches(*))')
      .eq('id', createdOrder.id)
      .single();

    // التحديث التلقائي للملف العائلي وسجل زيارات المريض فور صرف الدواء من الصيدلية
    try {
      const medsSummary = preparedDispenseItems
        .map(p => {
          const drug = itemsMap.get(p.item_id);
          return `${drug?.trade_name || 'دواء'} (كمية: ${p.quantity} - باتش: ${p.batch_number_snapshot})${p.dosage_instructions ? ` [${p.dosage_instructions}]` : ''}`;
        })
        .join(' + ');

      await this.addPatientVisit({
        patient_id: orderInput.patient_id,
        visit_date: todayStr,
        complaint_and_diagnosis: `[صرف دوائي من الصيدلية - إذن #${orderNumber}] ${orderInput.diagnosis_or_notes || ''}`.trim(),
        treatment_plan: medsSummary,
        doctor_signature: orderInput.prescribing_doctor || orderInput.dispensed_by || 'قسم الصيدلية'
      });
    } catch (syncErr) {
      console.warn('Auto-sync pharmacy dispense to family visit log warning:', syncErr);
    }

    return (fullOrder || createdOrder) as PharmacyDispenseOrder;
  }

  /**
   * جلب طابور الروشتات الواردة من العيادات وجلسات الغسيل الكلوي
   */
  static async getPendingPharmacyQueues() {
    const [appointmentsRes, sessionsRes, dialysisMedsRes, dispensedOrdersRes] = await Promise.all([
      supabase
        .from('clinic_appointments')
        .select('*, patients(*), doctors(*), clinics(*)')
        .not('prescription', 'is', null)
        .neq('prescription', '')
        .order('date', { ascending: false })
        .limit(50),
      supabase
        .from('dialysis_sessions')
        .select('*')
        .in('status', ['WAITING', 'ACTIVE', 'FINISHED'])
        .order('date', { ascending: false })
        .limit(50),
      supabase
        .from('dialysis_medication_administration')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('pharmacy_dispense_orders')
        .select('id, appointment_id, session_id, order_number, dispensed_at')
        .order('dispensed_at', { ascending: false })
        .limit(200)
    ]);

    const dispensedOrders = dispensedOrdersRes.data || [];
    const dispensedByAppointment = new Map<string, any>();
    const dispensedBySession = new Map<string, any>();
    dispensedOrders.forEach((o: any) => {
      if (o.appointment_id) dispensedByAppointment.set(o.appointment_id, o);
      if (o.session_id) dispensedBySession.set(o.session_id, o);
    });

    const clinicPrescriptions = (appointmentsRes.data || []).map((apt: any) => ({
      ...apt,
      dispensedOrder: dispensedByAppointment.get(apt.id) || null
    }));

    const medsBySession = new Map<string, any[]>();
    (dialysisMedsRes.data || []).forEach((m: any) => {
      if (!medsBySession.has(m.session_id)) medsBySession.set(m.session_id, []);
      medsBySession.get(m.session_id)!.push(m);
    });

    const dialysisSessionsWithMeds = (sessionsRes.data || []).map((sess: any) => ({
      ...sess,
      medications: medsBySession.get(sess.id) || [],
      dispensedOrder: dispensedBySession.get(sess.id) || null
    }));

    return {
      clinicPrescriptions,
      dialysisSessions: dialysisSessionsWithMeds
    };
  }
}
