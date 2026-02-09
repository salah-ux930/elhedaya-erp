
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, LabTestDefinition, AuditLog,
  User, Permission, TransferRequest
} from './types.ts';
import { supabase } from './supabase.ts';

export class DB {
  // --- Auth ---
  static async login(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) return null;
    await this.log('تسجيل دخول', `دخل المستخدم ${data.name} إلى النظام`);
    return data as User;
  }

  // --- Patients ---
  static async getPatients() {
    const { data, error } = await supabase.from('patients').select('*').order('createdAt', { ascending: false });
    if (error) { console.error(error); throw error; }
    return data;
  }

  static async addPatient(p: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert([p]).select();
    if (error) { console.error(error); throw error; }
    await this.log('إضافة مريض', `تمت إضافة المريض ${p.name}`);
    return data[0];
  }

  // --- Financial Accounts ---
  static async getAccounts() {
    const { data, error } = await supabase.from('financial_accounts').select('*').order('name');
    if (error) { console.error(error); throw error; }
    return data;
  }

  static async addAccount(acc: Partial<FinancialAccount>) {
    const { data, error } = await supabase.from('financial_accounts').insert([acc]).select();
    if (error) { console.error(error); throw error; }
    return data[0];
  }

  static async deleteAccount(id: string) {
    const { error } = await supabase.from('financial_accounts').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Inventory & Stores ---
  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addProduct(p: Partial<Product>) {
    const { data, error } = await supabase.from('products').insert([p]).select();
    if (error) throw error;
    return data[0];
  }

  static async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  static async getStores() {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addStore(s: Partial<Store>) {
    const { data, error } = await supabase.from('stores').insert([s]).select();
    if (error) throw error;
    return data[0];
  }

  static async deleteStore(id: string) {
    const { error } = await supabase.from('stores').delete().eq('id', id);
    if (error) throw error;
  }

  static async addStockTransaction(tx: Partial<StockTransaction>) {
    const { data, error } = await supabase.from('stock_transactions').insert([tx]).select();
    if (error) { console.error(error); throw error; }
    return data[0];
  }

  static async createTransferRequest(req: Partial<TransferRequest>) {
    const { data, error } = await supabase.from('transfer_requests').insert([req]).select();
    if (error) { console.error(error); throw error; }
    return data[0];
  }

  static async getTransferRequests() {
    const { data, error } = await supabase.from('transfer_requests').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  // --- Users ---
  static async getUsers() {
    const { data, error } = await supabase.from('system_users').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addUser(u: Partial<User>) {
    const { data, error } = await supabase.from('system_users').insert([u]).select();
    if (error) { console.error(error); throw error; }
    return data[0];
  }

  static async updateUser(id: string, u: Partial<User>) {
    // إزالة كلمة المرور إذا كانت فارغة لتجنب مسحها في القاعدة
    const updateData = { ...u };
    if (!updateData.password) {
      delete updateData.password;
    }
    const { data, error } = await supabase.from('system_users').update(updateData).eq('id', id).select();
    if (error) { console.error(error); throw error; }
    return data[0];
  }

  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Funding Entities ---
  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addFundingEntity(name: string) {
    const { data, error } = await supabase.from('funding_entities').insert([{ name }]).select();
    if (error) throw error;
    return data[0];
  }

  static async deleteFundingEntity(id: string) {
    const { error } = await supabase.from('funding_entities').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Services ---
  static async getServices() {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addService(s: Partial<Service>) {
    const { data, error } = await supabase.from('services').insert([s]).select();
    if (error) throw error;
    return data[0];
  }

  static async deleteService(id: string) {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Sessions ---
  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)').order('createdAt', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addSession(session: Partial<DialysisSession>) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([session]).select();
    if (error) throw error;
    return data[0];
  }

  // --- Finance Txs ---
  static async getTransactions() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) throw error;
    return data[0];
  }

  // --- Lab ---
  static async getLabDefinitions() {
    const { data, error } = await supabase.from('lab_test_definitions').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addLabDefinition(def: Partial<LabTestDefinition>) {
    const { data, error } = await supabase.from('lab_test_definitions').insert([def]).select();
    if (error) throw error;
    return data[0];
  }

  static async getLabTests() {
    const { data, error } = await supabase
      .from('lab_tests')
      .select('*, patients(name, dateOfBirth), lab_test_definitions(name, sampleType)')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addLabTest(test: Partial<LabTest>) {
    const { data, error } = await supabase.from('lab_tests').insert([{ ...test, status: 'PENDING' }]).select();
    if (error) throw error;
    return data[0];
  }

  static async updateLabResult(id: string, result: string) {
    const { data, error } = await supabase.from('lab_tests').update({ result, status: 'COMPLETED' }).eq('id', id).select();
    if (error) throw error;
    return data[0];
  }

  // --- Employees & Payroll ---
  static async getEmployees() {
    const { data, error } = await supabase.from('employees').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async getShifts() {
    const { data, error } = await supabase.from('shift_records').select('*');
    if (error) throw error;
    return data;
  }

  static async resetShifts() {
    const { error } = await supabase.from('shift_records').delete().neq('id', '0');
    if (error) throw error;
  }

  // --- Logging ---
  static async log(action: string, details: string) {
    try {
      const userStr = localStorage.getItem('dialysis_user');
      const user = userStr ? JSON.parse(userStr) : { name: 'Unknown' };
      await supabase.from('audit_logs').insert([{
        userId: user.name,
        action,
        details,
        timestamp: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn("Logging failed", e);
    }
  }
}
