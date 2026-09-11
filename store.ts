
import { 
  Patient, Service, Product, Store, StockTransaction, 
  Employee, FinancialAccount, Transaction, ShiftRecord, User,
  FundingEntity, TransferRequest, LabTest, LabTestDefinition, DialysisSession
} from './types.ts';
import { supabase } from './supabase.ts';

const handleError = (error: any, fallbackMessage: string) => {
  console.warn("Database Operation Note:", error?.message || error);
  const msg = error?.message || (typeof error === 'string' ? error : '') || error?.details || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
    throw new Error(`تعذر الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت أو خادم Supabase.`);
  }
  const code = error?.code;
  if (['42P01', 'PGRST107', 'PGRST116'].includes(code) || msg.includes('schema cache')) {
    throw new Error(`MISSING_TABLE: الجدول غير موجود. يرجى تشغيل SQL Schema في لوحة تحكم Supabase.`);
  }
  throw new Error(error?.message || fallbackMessage);
};

export class DB {
  static async login(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.from('system_users').select('*').eq('username', username).eq('password', password).single();
    if (error || !data) return null;
    return data as User;
  }

  // --- Patients ---
  static async addPatient(p: Partial<Patient>) {
    // Phone validation (Must start with 01 and have 11 digits)
    const phoneRegex = /^01\d{9}$/;
    if (p.phone && !phoneRegex.test(p.phone)) {
      throw new Error("رقم الهاتف غير صحيح. يجب أن يبدأ بـ 01 ويتكون من 11 رقم.");
    }

    const { data, error } = await supabase.from('patients').insert([p]).select();
    if (error) return handleError(error, "فشل إضافة المريض");
    return data?.[0];
  }

  static async getPatients() {
    try {
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
  static async addNotification(notif: any) { const { error } = await supabase.from('notifications').insert([notif]); if (error) return handleError(error, "فشل إضافة التنبيه"); }
  
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
      if (data && data.length > 0) {
        localStorage.setItem('local_dialysis_sessions', JSON.stringify(data));
      }
      return data || [];
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
  static async addEmployee(e: any) { const { data, error } = await supabase.from('employees').insert([e]).select(); if (error) return handleError(error, "فشل إضافة الموظف"); return data?.[0]; }
  static async updateEmployee(id: string, e: any) { const { data, error } = await supabase.from('employees').update(e).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث بيانات الموظف"); return data?.[0]; }
  static async deleteEmployee(id: string) { const { error } = await supabase.from('employees').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الموظف"); }
  static async addService(s: any) { const { data, error } = await supabase.from('services').insert([s]).select(); if (error) return handleError(error, "فشل إضافة الخدمة"); return data?.[0]; }
  static async updateService(id: string, s: any) { const { data, error } = await supabase.from('services').update(s).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث الخدمة"); return data?.[0]; }
  static async deleteService(id: string) { const { error } = await supabase.from('services').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الخدمة"); }
  static async addStore(s: any) { const { data, error } = await supabase.from('stores').insert([s]).select(); if (error) return handleError(error, "فشل إضافة المخزن"); return data?.[0]; }
  static async updateStore(id: string, s: any) { const { data, error } = await supabase.from('stores').update(s).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المخزن"); return data?.[0]; }
  static async deleteStore(id: string) { const { error } = await supabase.from('stores').delete().eq('id', id); if (error) return handleError(error, "فشل حذف المخزن"); }
  static async addProduct(p: any) { const { data, error } = await supabase.from('products').insert([p]).select(); if (error) return handleError(error, "فشل إضافة المنتج"); return data?.[0]; }
  static async updateProduct(id: string, p: any) { const { data, error } = await supabase.from('products').update(p).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المنتج"); return data?.[0]; }
  static async addFinancialAccount(a: any) { const { data, error } = await supabase.from('financial_accounts').insert([a]).select(); if (error) return handleError(error, "فشل إضافة الحساب"); return data?.[0]; }
  static async updateFinancialAccount(id: string, a: any) { const { data, error } = await supabase.from('financial_accounts').update(a).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث الحساب"); return data?.[0]; }
  static async deleteFinancialAccount(id: string) { const { error } = await supabase.from('financial_accounts').delete().eq('id', id); if (error) return handleError(error, "فشل حذف الحساب"); }
  static async addFundingEntity(fe: any) { const { data, error } = await supabase.from('funding_entities').insert([fe]).select(); if (error) return handleError(error, "فشل إضافة جهة التعاقد"); return data?.[0]; }
  static async deleteFundingEntity(id: string) { const { error } = await supabase.from('funding_entities').delete().eq('id', id); if (error) return handleError(error, "فشل حذف جهة التعاقد"); }
  static async addUser(u: any) { const { data, error } = await supabase.from('system_users').insert([u]).select(); if (error) return handleError(error, "فشل إضافة المستخدم"); return data?.[0]; }
  static async updateUser(id: string, u: any) { const { data, error } = await supabase.from('system_users').update(u).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث المستخدم"); return data?.[0]; }
  static async deleteUser(id: string) { const { error } = await supabase.from('system_users').delete().eq('id', id); if (error) return handleError(error, "فشل حذف المستخدم"); }
  static async addLabTest(t: any) { const { data, error } = await supabase.from('lab_tests').insert([t]).select(); if (error) return handleError(error, "فشل إضافة التحليل"); return data?.[0]; }
  static async addLabDefinition(d: any) { const { data, error } = await supabase.from('lab_test_definitions').insert([d]).select(); if (error) return handleError(error, "فشل إضافة تعريف التحليل"); return data?.[0]; }
  static async updateLabResult(id: string, res: string) { const { data, error } = await supabase.from('lab_tests').update({ result: res, status: 'COMPLETED' }).eq('id', id).select(); if (error) return handleError(error, "فشل تحديث نتيجة التحليل"); return data?.[0]; }
  
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
  static async addClinic(c: any) { const { data, error } = await supabase.from('clinics').insert([c]).select(); if (error) return handleError(error, "فشل إضافة العيادة"); return data?.[0]; }
  
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
  static async addDoctor(d: any) { const { data, error } = await supabase.from('doctors').insert([d]).select(); if (error) return handleError(error, "فشل إضافة الطبيب"); return data?.[0]; }

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
  static async addClinicAppointment(a: any) { const { data, error } = await supabase.from('clinic_appointments').insert([a]).select(); if (error) return handleError(error, "فشل إضافة الموعد"); return data?.[0]; }
  static async updateAppointmentStatus(id: string, status: string, diagnosis?: string, prescription?: string) {
    const { data, error } = await supabase.from('clinic_appointments').update({ status, diagnosis, prescription }).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث حالة الموعد");
    return data?.[0];
  }

  // --- Family Files (الملفات العائلية) ---
  static async getFamilyFiles() {
    try {
      const { data, error } = await supabase.from('family_files').select('*, family_file_members(*, patients(*))').order('created_at', { ascending: false });
      if (error) { if (['42P01', 'PGRST116'].includes(error.code)) return []; throw error; }
      return (data || []).map((file: any) => ({
        ...file,
        members: file.family_file_members || []
      }));
    } catch (e) { return []; }
  }
  static async addFamilyFile(f: any) {
    const { data, error } = await supabase.from('family_files').insert([f]).select();
    if (error) return handleError(error, "فشل إنشاء الملف العائلي");
    return data?.[0];
  }
  static async updateFamilyFile(id: string, f: any) {
    const { data, error } = await supabase.from('family_files').update(f).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث الملف العائلي");
    return data?.[0];
  }
  static async addFamilyMember(m: any) {
    const { data, error } = await supabase.from('family_file_members').insert([m]).select();
    if (error) return handleError(error, "فشل إضافة فرد للأسرة");
    return data?.[0];
  }
  static async updateFamilyMember(id: string, m: any) {
    const { data, error } = await supabase.from('family_file_members').update(m).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث بيانات الفرد");
    return data?.[0];
  }
  static async deleteFamilyMember(id: string) {
    const { error } = await supabase.from('family_file_members').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف الفرد من الأسرة");
    return true;
  }

  // --- Clinical Encounters (اللقاءات السريرية) ---
  static async getClinicalEncounters(patientId?: string) {
    try {
      let query = supabase.from('clinical_encounters').select('*, patients(*), doctors(*), clinics(*)').order('encounter_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) { if (['42P01', 'PGRST116'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addClinicalEncounter(e: any) {
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
      const { data, error } = await supabase.from('patient_vitals').select('*').eq('patient_id', patientId).order('measured_at', { ascending: false });
      if (error) { if (['42P01'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addPatientVitals(v: any) {
    const { data, error } = await supabase.from('patient_vitals').insert([v]).select();
    if (error) return handleError(error, "فشل تسجيل العلامات الحيوية");
    return data?.[0];
  }

  static async getPatientProblems(patientId?: string) {
    try {
      let query = supabase.from('patient_problem_list').select('*, patients(*)').order('onset_date', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) { if (['42P01'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addPatientProblem(prob: any) {
    const { data, error } = await supabase.from('patient_problem_list').insert([prob]).select();
    if (error) return handleError(error, "فشل إضافة التاريخ المرضي");
    return data?.[0];
  }
  static async deletePatientProblem(id: string) {
    const { error } = await supabase.from('patient_problem_list').delete().eq('id', id);
    if (error) return handleError(error, "فشل حذف التاريخ المرضي");
    return true;
  }

  // --- Patient Deaths (بيانات الوفيات) ---
  static async getPatientDeaths() {
    try {
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

  static async addPhysicalExam(exam: any) {
    try {
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
    const { data, error } = await supabase.from('dialysis_sessions').insert([s]).select(); if (error) return handleError(error, "فشل إضافة الجلسة"); return data?.[0]; 
  }

  static async updateSession(id: string, s: any) {
    const { data, error } = await supabase.from('dialysis_sessions').update(s).eq('id', id).select();
    if (error) return handleError(error, "فشل تحديث الجلسة");
    return data?.[0];
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
    return this.updateSession(id, { ...data, status: 'FINISHED', end_time: new Date().toTimeString().split(' ')[0] });
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
}
