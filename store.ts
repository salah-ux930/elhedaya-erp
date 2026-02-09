
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, LabTestDefinition, AuditLog,
  User, Permission, TransferRequest
} from './types.ts';
import { supabase } from './supabase.ts';

export class DB {
  static currentUser: any = null;
  static patients: Patient[] = [];
  static funding: FundingEntity[] = [];
  static services: Service[] = [];
  static products: Product[] = [];
  static stores: Store[] = [];
  static accounts: FinancialAccount[] = [];
  static transactions: Transaction[] = [];
  static users: User[] = [];
  static employees: Employee[] = [];
  static shifts: ShiftRecord[] = [];
  static sessions: DialysisSession[] = [];

  // --- Auth ---
  static async login(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // في الإنتاج الحقيقي، يجب استخدام تشفير bcrypt
      .single();

    if (error || !data) return null;
    
    await this.log('تسجيل دخول', `دخل المستخدم ${data.name} إلى النظام`);
    return data as User;
  }

  // --- Patients ---
  static async getPatients() {
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    this.patients = data || [];
    return data;
  }

  static async addPatient(p: Partial<Patient>) {
    const { data, error } = await supabase.from('patients').insert([p]).select();
    if (error) throw error;
    await this.log('إضافة مريض', `تمت إضافة المريض ${p.name}`);
    return data[0];
  }

  // --- Funding Entities ---
  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*').order('name');
    if (error) throw error;
    this.funding = data || [];
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
    const { data, error } = await supabase.from('lab_tests').select('*, patients(name), lab_test_definitions(*)').order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addLabTest(test: Partial<LabTest>) {
    const { data, error } = await supabase.from('lab_tests').insert([test]).select();
    if (error) throw error;
    return data[0];
  }

  static async updateLabResult(id: string, result: string) {
    const { data, error } = await supabase.from('lab_tests').update({ result, status: 'COMPLETED' }).eq('id', id).select();
    if (error) throw error;
    return data[0];
  }

  // --- Sessions ---
  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)').order('created_at', { ascending: false });
    if (error) throw error;
    this.sessions = data || [];
    return data;
  }

  static async addSession(session: Partial<DialysisSession>) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([session]).select();
    if (error) throw error;
    return data[0];
  }

  // --- Inventory & Stock ---
  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    this.products = data || [];
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
    this.stores = data || [];
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
    if (error) throw error;
    await this.log('حركة مخزن', `نوع: ${tx.type}, كمية: ${tx.quantity}`);
    return data[0];
  }

  static async createTransferRequest(req: Partial<TransferRequest>) {
    const { data, error } = await supabase.from('transfer_requests').insert([req]).select();
    if (error) throw error;
    await this.log('طلب تحويل', `طلب جديد من مخزن ${req.fromStoreId} إلى ${req.toStoreId}`);
    return data[0];
  }

  static async getTransferRequests() {
    const { data, error } = await supabase.from('transfer_requests').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async updateTransferRequestStatus(id: string, status: 'APPROVED' | 'REJECTED', items?: any[]) {
    const { data, error } = await supabase.from('transfer_requests').update({ status, items }).eq('id', id).select();
    if (error) throw error;
    return data[0];
  }

  // --- System Users ---
  static async getUsers() {
    const { data, error } = await supabase.from('system_users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    this.users = data || [];
    return data;
  }

  static async addUser(u: Partial<User>) {
    const { data, error } = await supabase.from('system_users').insert([u]).select();
    if (error) throw error;
    return data[0];
  }

  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
  }

  // --- Services ---
  static async getServices() {
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) throw error;
    this.services = data || [];
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

  // --- Other ---
  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) throw error;
    return data[0];
  }

  static async resetShifts() {
    const { error } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }

  static async log(action: string, details: string) {
    const user = JSON.parse(localStorage.getItem('dialysis_user') || '{}');
    await supabase.from('audit_logs').insert([{
      user_id: user.name || 'Unknown',
      action,
      details,
      timestamp: new Date().toISOString()
    }]);
  }
}
