
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, AuditLog,
  User, Permission
} from './types';
import { supabase } from './supabase';

export class DB {
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

  // --- Sessions ---
  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addSession(s: Partial<DialysisSession>) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([s]).select();
    if (error) throw error;
    return data[0];
  }

  // --- Funding ---
  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*');
    if (error) throw error;
    this.funding = data || [];
    return data;
  }

  // --- Services ---
  static async getServices() {
    const { data, error } = await supabase.from('services').select('*');
    if (error) throw error;
    this.services = data || [];
    return data;
  }

  // --- Inventory ---
  static async getProducts() {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    this.products = data || [];
    return data;
  }

  static async getStores() {
    const { data, error } = await supabase.from('stores').select('*');
    if (error) throw error;
    this.stores = data || [];
    return data;
  }

  // --- HR & Payroll ---
  static async getEmployees() {
    const { data, error } = await supabase.from('employees').select('*');
    if (error) throw error;
    this.employees = data || [];
    return data;
  }

  static async getShifts() {
    const { data, error } = await supabase.from('shifts').select('*');
    if (error) throw error;
    this.shifts = data || [];
    return data;
  }

  static async resetShifts() {
    const { error } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    await this.log('تصفير الشفتات', 'تم حذف جميع سجلات الشفتات');
  }

  // --- Finance ---
  static async getAccounts() {
    const { data, error } = await supabase.from('financial_accounts').select('*');
    if (error) throw error;
    this.accounts = data || [];
    return data;
  }

  static async getTransactions() {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    this.transactions = data || [];
    return data;
  }

  static async addFinanceTx(tx: Partial<Transaction>) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) throw error;
    return data[0];
  }

  // --- Users ---
  static async getUsers() {
    const { data, error } = await supabase.from('system_users').select('*');
    if (error) throw error;
    this.users = data || [];
    return data;
  }

  static async addUser(user: Partial<User>) {
    const { data, error } = await supabase.from('system_users').insert([user]).select();
    if (error) throw error;
    await this.log('إضافة مستخدم', `تمت إضافة المستخدم ${user.name}`);
    return data[0];
  }

  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
    await this.log('حذف مستخدم', `تم حذف المستخدم ذو المعرف ${id}`);
  }

  // --- Audit Logs ---
  static async log(action: string, details: string) {
    const { error } = await supabase.from('audit_logs').insert([{
      user_id: 'current-user', // Should be dynamic in production
      action,
      details,
      timestamp: new Date().toISOString()
    }]);
    if (error) console.error('Error logging:', error);
  }
}
