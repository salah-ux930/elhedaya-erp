
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, LabTestDefinition, AuditLog,
  User, Permission, TransferRequest
} from './types.ts';
import { supabase } from './supabase.ts';

const handleError = (error: any, fallbackMessage: string) => {
  console.error("Database Error Details:", error);
  const msg = error.message?.toLowerCase() || "";
  const code = error.code;
  
  if (
    code === '42P01' || 
    code === '42703' || 
    code === 'PGRST107' ||
    msg.includes('not found') || 
    msg.includes('schema cache') || 
    msg.includes('column') ||
    msg.includes('relation')
  ) {
    throw new Error(`SCHEMA_ERROR: خطأ في بنية قاعدة البيانات. يرجى التوجه لصفحة الإعدادات وتشغيل كود SQL المحدث لإعادة بناء الجداول.`);
  }
  
  throw new Error(error.message || fallbackMessage);
};

export class DB {
  static async login(username: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();
      if (error || !data) return null;
      await this.log('تسجيل دخول', `دخل المستخدم ${data.name} إلى النظام`);
      return data as User;
    } catch (e) { return null; }
  }

  static async getPatients() {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) return handleError(error, "فشل جلب المرضى");
    return data || [];
  }

  static async addPatient(p: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert([p]).select();
    if (error) return handleError(error, "فشل إضافة المريض");
    await this.log('إضافة مريض', `تمت إضافة المريض ${p.name}`);
    return data?.[0];
  }

  static async getAccounts() {
    const { data, error } = await supabase.from('financial_accounts').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الحسابات");
    return data || [];
  }

  static async addAccount(a: Partial<FinancialAccount>) {
    const { data, error } = await supabase.from('financial_accounts').insert([a]).select();
    if (error) return handleError(error, "فشل إضافة الحساب");
    return data?.[0];
  }

  static async deleteAccount(id: string) {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الحساب");
  }

  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الأصناف");
    return data || [];
  }

  static async addProduct(p: Partial<Product>) {
    const { data, error } = await supabase.from('products').insert([p]).select();
    if (error) return handleError(error, "فشل إضافة الصنف");
    return data?.[0];
  }

  static async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الصنف");
  }

  static async getStores() {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) return handleError(error, "فشل جلب المخازن");
    return data || [];
  }

  static async addStore(s: Partial<Store>) {
    const { data, error } = await supabase.from('stores').insert([s]).select();
    if (error) return handleError(error, "فشل إضافة المخزن");
    return data?.[0];
  }

  static async deleteStore(id: string) {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف المخزن");
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

  static async updateUser(id: string, u: Partial<User>) {
    const updateData = { ...u };
    if (!updateData.password) delete updateData.password;
    const { data, error } = await supabase.from('system_users').update(updateData).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث المستخدم");
    return data?.[0];
  }

  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف المستخدم");
  }

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

  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*').order('name');
    if (error) return handleError(error, "فشل جلب جهات التمويل");
    return data || [];
  }

  static async addFundingEntity(name: string) {
    const { data, error } = await supabase.from('funding_entities').insert([{ name }]).select();
    if (error) return handleError(error, "فشل إضافة جهة التعاقد");
    return data?.[0];
  }

  static async deleteFundingEntity(id: string) {
    const { error } = await supabase.from('funding_entities').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف جهة التعاقد");
  }

  static async getTransactions() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب المعاملات");
    return data || [];
  }

  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل المعاملة");

    const { data: acc } = await supabase.from('financial_accounts').select('balance').eq('id', tx.account_id).single();
    if (acc) {
        const newBalance = tx.type === 'INCOME' 
            ? Number(acc.balance) + Number(tx.amount) 
            : Number(acc.balance) - Number(tx.amount);
        
        await supabase.from('financial_accounts').update({ balance: newBalance }).eq('id', tx.account_id);
    }
    
    await this.log('معاملة مالية', `تم تسجيل ${tx.type === 'INCOME' ? 'إيراد' : 'مصروف'} بمبلغ ${tx.amount}`);
    return data?.[0];
  }

  static async log(action: string, details: string) {
    try {
      const userStr = localStorage.getItem('dialysis_user');
      const user = userStr ? JSON.parse(userStr) : { name: 'Unknown' };
      await supabase.from('audit_logs').insert([{
        user_id: user.name,
        action,
        details,
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {}
  }

  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)');
    if (error) return handleError(error, "فشل جلب الجلسات");
    return data || [];
  }

  static async getPatientSessions(patientId: string) {
    const { data, error } = await supabase
      .from('dialysis_sessions')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });
    if (error) return handleError(error, "فشل جلب جلسات المريض");
    return data || [];
  }

  static async addSession(s: any) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([s]).select();
    if (error) return handleError(error, "فشل تسجيل الجلسة");
    return data?.[0];
  }

  static async getLabDefinitions() {
    const { data, error } = await supabase.from('lab_test_definitions').select('*');
    if (error) return handleError(error, "فشل جلب تعاريف المعمل");
    return data || [];
  }

  static async addLabDefinition(d: Partial<LabTestDefinition>) {
    const { data, error } = await supabase.from('lab_test_definitions').insert([d]).select();
    if (error) return handleError(error, "فشل إضافة تعريف التحليل");
    return data?.[0];
  }

  static async getLabTests() {
    const { data, error } = await supabase.from('lab_tests').select('*, patients(name), lab_test_definitions(name)');
    if (error) return handleError(error, "فشل جلب فحوصات المعمل");
    return data || [];
  }

  static async addLabTest(t: Partial<LabTest>) {
    const { data, error } = await supabase.from('lab_tests').insert([t]).select();
    if (error) return handleError(error, "فشل حجز التحليل");
    return data?.[0];
  }

  static async updateLabResult(id: string, result: string) {
    const { data, error } = await supabase.from('lab_tests').update({ result, status: 'COMPLETED' }).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث نتيجة التحليل");
    return data?.[0];
  }

  // --- دوال الموظفين ---
  static async getEmployees() {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) return handleError(error, "فشل جلب الموظفين");
    return data || [];
  }

  static async addEmployee(e: Partial<Employee>) {
    const { data, error } = await supabase.from('employees').insert([e]).select();
    if (error) return handleError(error, "فشل إضافة الموظف");
    await this.log('إضافة موظف', `تمت إضافة الموظف ${e.name}`);
    return data?.[0];
  }

  static async updateEmployee(id: string, e: Partial<Employee>) {
    const { data, error } = await supabase.from('employees').update(e).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث بيانات الموظف");
    return data?.[0];
  }

  static async deleteEmployee(id: string) {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الموظف");
  }

  static async getShifts() {
    const { data, error } = await supabase.from('shift_records').select('*');
    if (error) return handleError(error, "فشل جلب سجلات الشفتات");
    return data || [];
  }

  static async addShift(s: Partial<ShiftRecord>) {
    const { data, error } = await supabase.from('shift_records').insert([s]).select();
    if (error) return handleError(error, "فشل تسجيل الشفت");
    return data?.[0];
  }

  static async resetShifts() {
    const { error } = await supabase.from('shift_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) return handleError(error, "فشل تصفير سجلات الشفتات");
  }

  static async getTransferRequests() {
    const { data, error } = await supabase.from('transfer_requests').select('*');
    if (error) return handleError(error, "فشل جلب طلبات التحويل");
    return data || [];
  }

  static async createTransferRequest(req: Partial<TransferRequest>) {
    const { data, error } = await supabase.from('transfer_requests').insert([req]).select();
    if (error) return handleError(error, "فشل إنشاء طلب التحويل");
    return data?.[0];
  }

  static async getStockTransactions() {
    const { data, error } = await supabase.from('stock_transactions').select('*');
    if (error) return handleError(error, "فشل جلب الحركات المخزنية");
    return data || [];
  }

  static async addStockTransaction(tx: Partial<StockTransaction>) {
    const { data, error } = await supabase.from('stock_transactions').insert([tx]).select();
    if (error) return handleError(error, "فشل تسجيل العملية المخزنية");
    return data?.[0];
  }
}
