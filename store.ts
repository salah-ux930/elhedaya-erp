
import { 
  Patient, Service, Product, Store, StockTransaction, 
  Employee, FinancialAccount, Transaction, ShiftRecord, User,
  FundingEntity, TransferRequest, LabTest, LabTestDefinition
} from './types.ts';
import { supabase } from './supabase.ts';

const handleError = (error: any, fallbackMessage: string) => {
  console.error("Database Error:", error);
  const code = error.code;
  if (['42P01', '42703', 'PGRST107'].includes(code)) {
    throw new Error(`SCHEMA_ERROR: خطأ في بنية قاعدة البيانات. يرجى التوجه لصفحة الإعدادات وتشغيل كود SQL المحدث.`);
  }
  throw new Error(error.message || fallbackMessage);
};

export class DB {
  static async login(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.from('system_users').select('*').eq('username', username).eq('password', password).single();
    if (error || !data) return null;
    return data as User;
  }

  static async getPatients() {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) return handleError(error, "فشل جلب المرضى");
    return data || [];
  }

  static async addPatient(p: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert([p]).select();
    if (error) return handleError(error, "فشل إضافة المريض");
    return data?.[0];
  }

  // Add missing getFundingEntities method
  static async getFundingEntities(): Promise<FundingEntity[]> {
    const { data, error } = await supabase.from('funding_entities').select('*').order('name');
    if (error) return handleError(error, "فشل جلب جهات التعاقد") as any;
    return (data || []) as FundingEntity[];
  }

  // --- إدارة المخزون والصلاحيات ---
  static async getStores() {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) return handleError(error, "فشل جلب المخازن");
    return data || [];
  }

  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الأصناف");
    return data || [];
  }

  static async getStockTransactions() {
    const { data, error } = await supabase.from('stock_transactions').select('*');
    if (error) return handleError(error, "فشل جلب الحركات");
    return data || [];
  }

  static async addStockTransaction(tx: Partial<StockTransaction>) {
    const { data, error } = await supabase.from('stock_transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل الحركة");
    return data?.[0];
  }

  // Add missing getTransferRequests method
  static async getTransferRequests(): Promise<TransferRequest[]> {
    const { data, error } = await supabase.from('transfer_requests').select('*').order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب طلبات التحويل") as any;
    return (data || []) as TransferRequest[];
  }

  // --- إدارة الخدمات والخصم التلقائي ---
  static async getServices() {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الخدمات");
    return data || [];
  }

  static async addService(s: Partial<Service>) {
    const { data, error } = await supabase.from('services').insert([s]).select();
    if (error) return handleError(error, "فشل إضافة الخدمة");
    return data?.[0];
  }

  static async deleteService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الخدمة");
  }

  static async addSession(s: any, storeId?: string) {
    // 1. تسجيل الجلسة
    const { data: session, error } = await supabase.from('dialysis_sessions').insert([s]).select();
    if (error) return handleError(error, "فشل تسجيل الجلسة");

    // 2. الخصم التلقائي إذا كانت الخدمة مرتبطة بأصناف
    if (s.service_id && storeId) {
      const { data: service } = await supabase.from('services').select('config').eq('id', s.service_id).single();
      if (service?.config?.consumables) {
        for (const item of service.config.consumables) {
          await this.addStockTransaction({
            product_id: item.product_id,
            store_id: storeId,
            type: 'DEDUCT',
            quantity: item.quantity,
            date: new Date().toISOString().split('T')[0],
            note: `خصم تلقائي: جلسة مريض (رقم ${session?.[0].id})`
          });
        }
      }
    }
    return session?.[0];
  }

  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name, date_of_birth)');
    if (error) return handleError(error, "فشل جلب الجلسات");
    return data || [];
  }

  // Add missing getPatientSessions method
  static async getPatientSessions(patientId: string) {
    const { data, error } = await supabase.from('dialysis_sessions').select('*').eq('patient_id', patientId).order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب جلسات المريض");
    return data || [];
  }

  // --- الرواتب والموظفين ---
  static async getEmployees() {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الموظفين");
    return data || [];
  }

  static async addEmployee(e: Partial<Employee>) {
    const { data, error } = await supabase.from('employees').insert([e]).select();
    if (error) return handleError(error, "فشل إضافة الموظف");
    return data?.[0];
  }

  static async updateEmployee(id: string, e: Partial<Employee>) {
    const { data, error } = await supabase.from('employees').update(e).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث الموظف");
    return data?.[0];
  }

  static async deleteEmployee(id: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الموظف");
  }

  static async getShifts() {
    const { data, error } = await supabase.from('shift_records').select('*');
    if (error) return handleError(error, "فشل جلب الشفتات");
    return data || [];
  }

  static async bulkUpdateShifts(shifts: { employee_code: string, count: number }[]) {
    for (const shift of shifts) {
      const { data: emp } = await supabase.from('employees').select('id').eq('code', shift.employee_code).single();
      if (emp) {
        await supabase.from('shift_records').insert([{
          employee_id: emp.id,
          count: shift.count,
          date: new Date().toISOString().split('T')[0]
        }]);
      }
    }
  }

  static async resetShifts() {
    await supabase.from('shift_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  // --- الحسابات والمالية ---
  static async getAccounts() {
    const { data, error } = await supabase.from('financial_accounts').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الحسابات");
    return data || [];
  }

  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل المعاملة");
    const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('id', tx.account_id).single();
    if (acc) {
        const newBalance = tx.type === 'INCOME' ? Number(acc.balance) + Number(tx.amount) : Number(acc.balance) - Number(tx.amount);
        await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', tx.account_id);
    }
    return data?.[0];
  }

  static async getTransactions() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب المعاملات");
    return data || [];
  }

  static async getUsers() {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) return handleError(error, "فشل جلب المستخدمين");
    return data || [];
  }

  static async addUser(u: Partial<User>) {
    const { data, error } = await supabase.from('system_users').insert([u]).select();
    if (error) return handleError(error, "فشل إضافة المستخدم");
    return data?.[0];
  }

  // Add missing updateUser method
  static async updateUser(id: string, u: Partial<User>) {
    const { data, error } = await supabase.from('system_users').update(u).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث المستخدم");
    return data?.[0];
  }

  // Add missing deleteUser method
  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف المستخدم");
  }

  // --- Lab Methods ---
  
  // Add missing getLabDefinitions method
  static async getLabDefinitions(): Promise<LabTestDefinition[]> {
    const { data, error } = await supabase.from('lab_test_definitions').select('*').order('name');
    if (error) return handleError(error, "فشل جلب تعاريف التحاليل") as any;
    return (data || []) as LabTestDefinition[];
  }

  // Add missing getLabTests method
  static async getLabTests(): Promise<LabTest[]> {
    const { data, error } = await supabase.from('lab_tests').select('*, patients(name, date_of_birth), lab_test_definitions(name, category, sample_type)').order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب نتائج التحاليل") as any;
    return (data || []) as LabTest[];
  }

  // Add missing addLabTest method
  static async addLabTest(t: Partial<LabTest>): Promise<LabTest> {
    const { data, error } = await supabase.from('lab_tests').insert([t]).select();
    if (error) return handleError(error, "فشل حجز التحليل") as any;
    return data?.[0] as LabTest;
  }

  // Add missing addLabDefinition method
  static async addLabDefinition(d: Partial<LabTestDefinition>): Promise<LabTestDefinition> {
    const { data, error } = await supabase.from('lab_test_definitions').insert([d]).select();
    if (error) return handleError(error, "فشل إضافة تعريف التحليل") as any;
    return data?.[0] as LabTestDefinition;
  }

  // Add missing updateLabResult method
  static async updateLabResult(id: string, result: string): Promise<LabTest> {
    const { data, error } = await supabase.from('lab_tests').update({ result, status: 'COMPLETED' }).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث النتيجة") as any;
    return data?.[0] as LabTest;
  }
}
