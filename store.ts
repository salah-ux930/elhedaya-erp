
import { 
  Patient, DialysisSession, Service, Invoice, Product, 
  Store, StockTransaction, Employee, FinancialAccount, 
  Transaction, FundingEntity, ShiftRecord, LabTest, AuditLog,
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

  // --- Sessions ---
  static async getSessions() {
    const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(name)').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  static async addSession(s: Partial<DialysisSession>) {
    const { data, error } = await supabase.from('dialysis_sessions').insert([s]).select();
    if (error) throw error;
    await this.log('تسجيل حضور', `بدء جلسة للمريض ID: ${s.patientId}`);
    return data[0];
  }

  // --- Funding ---
  static async getFundingEntities() {
    const { data, error } = await supabase.from('funding_entities').select('*');
    if (error) throw error;
    this.funding = data || [];
    return data;
  }

  // --- Users ---
  // Fix for: Property 'addUser' does not exist on type 'typeof DB'.
  static async addUser(user: User) {
    const { data, error } = await supabase.from('system_users').insert([user]).select();
    if (error) throw error;
    this.users.push(user);
    await this.log('إضافة مستخدم', `تمت إضافة المستخدم ${user.name}`);
    return data?.[0];
  }

  // Fix for: Property 'deleteUser' does not exist on type 'typeof DB'.
  static async deleteUser(id: string) {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
    this.users = this.users.filter(u => u.id !== id);
    await this.log('حذف مستخدم', `تم حذف المستخدم ID: ${id}`);
  }

  // --- Finance ---
  // Fix for: Property 'addFinanceTx' does not exist on type 'typeof DB'.
  static async addFinanceTx(tx: Transaction) {
    const { data, error } = await supabase.from('transactions').insert([tx]).select();
    if (error) throw error;
    this.transactions.push(tx);
    // Locally update balance if account exists
    const acc = this.accounts.find(a => a.id === tx.accountId);
    if (acc) {
      if (tx.type === 'INCOME') acc.balance += tx.amount;
      else acc.balance -= tx.amount;
    }
    await this.log('حركة مالية', `تم تسجيل ${tx.type === 'INCOME' ? 'إيراد' : 'مصروف'} بقيمة ${tx.amount}`);
    return data?.[0];
  }

  // --- Payroll ---
  // Fix for: Property 'resetShifts' does not exist on type 'typeof DB'.
  static async resetShifts() {
    const { error } = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
    this.shifts = [];
    await this.log('تصفير الشفتات', 'تم حذف جميع سجلات الشفتات');
  }

  // --- Audit Logs ---
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
