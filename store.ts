
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, LabTestDefinition, AuditLog,
  User, Permission
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

  // --- Lab Test Definitions (Dictionary) ---
  static async getLabDefinitions() {
    const { data, error } = await supabase.from('lab_test_definitions').select('*').order('name');
    if (error) throw error;
    return data;
  }

  static async addLabDefinition(def: Partial<LabTestDefinition>) {
    const { data, error } = await supabase.from('lab_test_definitions').insert([def]).select();
    if (error) throw error;
    await this.log('تعريف تحليل', `تم إضافة تعريف للتحليل: ${def.name}`);
    return data[0];
  }

  // --- Lab Tests (Patient Results) ---
  static async getLabTests(patientId?: string) {
    let query = supabase.from('lab_tests').select('*, patients(name), lab_test_definitions(*)');
    if (patientId) query = query.eq('patient_id', patientId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addLabTest(test: Partial<LabTest>) {
    // If no result is provided, status is PENDING
    const payload = {
      ...test,
      status: test.result ? 'COMPLETED' : 'PENDING'
    };
    const { data, error } = await supabase.from('lab_tests').insert([payload]).select();
    if (error) throw error;
    await this.log('حجز تحليل', `تم حجز تحليل لمريض ID: ${test.patientId}`);
    return data[0];
  }

  static async updateLabResult(id: string, result: string) {
    const { data, error } = await supabase.from('lab_tests')
      .update({ result, status: 'COMPLETED' })
      .eq('id', id)
      .select();
    if (error) throw error;
    await this.log('تسجيل نتيجة', `تم تسجيل نتيجة للتحليل ID: ${id}`);
    return data[0];
  }

  // --- Sessions ---
  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)').order('created_at', { ascending: false });
    if (error) throw error;
    this.sessions = data || [];
    return data;
  }

  // Add missing addSession method to fix Reception.tsx error
  static async addSession(session: Partial<DialysisSession>) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([session]).select();
    if (error) throw error;
    await this.log('تسجيل جلسة', `تم تسجيل جلسة لمريض ID: ${session.patientId}`);
    return data[0];
  }

  // --- Funding ---
  // Add missing getFundingEntities method to fix Dashboard.tsx error
  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*').order('name');
    if (error) throw error;
    this.funding = data || [];
    return data;
  }

  // --- Products (Inventory) ---
  // Add missing getProducts method to fix Inventory.tsx error
  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*').order('name');
    if (error) throw error;
    this.products = data || [];
    return data;
  }

  // Add missing addProduct method to fix Inventory.tsx error
  static async addProduct(p: Partial<Product>) {
    const { data, error } = await supabase.from('products').insert([p]).select();
    if (error) throw error;
    await this.log('إضافة صنف', `تم إضافة صنف جديد: ${p.name}`);
    return data[0];
  }

  // --- Payroll ---
  // Add missing resetShifts method to fix Payroll.tsx error
  static async resetShifts() {
    const { error } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    await this.log('تصفير شفتات', 'تم تصفير جميع الشفتات لبدء دورة جديدة');
  }

  // --- Finance ---
  // Add missing addFinanceTx method to fix Finance.tsx error
  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) throw error;
    await this.log('حركة مالية', `تم تسجيل حركة ${tx.type}: ${tx.amount}`);
    return data[0];
  }

  // --- Users ---
  // Add missing addUser method to fix Users.tsx error
  static async addUser(u: User) {
    const { data, error } = await supabase.from('system_users').insert([u]).select();
    if (error) throw error;
    this.users = [...this.users, data[0]];
    await this.log('إضافة مستخدم', `تم إضافة مستخدم: ${u.username}`);
    return data[0];
  }

  // Add missing deleteUser method to fix Users.tsx error
  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
    this.users = this.users.filter(u => u.id !== id);
    await this.log('حذف مستخدم', `تم حذف مستخدم ID: ${id}`);
  }

  // --- Log ---
  static async log(action: string, details: string) {
    const user = JSON.parse(localStorage.getItem('dialysis_user') || '{}');
    const { error } = await supabase.from('audit_logs').insert([{
      user_id: user.name || 'غير معروف',
      action,
      details,
      timestamp: new Date().toISOString()
    }]);
    if (error) console.error('Error logging:', error);
  }
}
