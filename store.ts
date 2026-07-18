
import { 
  Patient, Service, Product, Store, StockTransaction, 
  Employee, FinancialAccount, Transaction, ShiftRecord, User,
  FundingEntity, TransferRequest, LabTest, LabTestDefinition, DialysisSession
} from './types.ts';
import { supabase } from './supabase.ts';

const handleError = (error: any, fallbackMessage: string) => {
  console.error("Database Error Detail:", error);
  const code = error.code;
  if (['42P01', 'PGRST107'].includes(code)) {
    throw new Error(`MISSING_TABLE: الجدول غير موجود. يرجى تشغيل SQL Schema في لوحة تحكم Supabase.`);
  }
  throw new Error(error.message || fallbackMessage);
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
    const { data, error } = await supabase.from('patients').select('*').order('created_at', { ascending: false });
    if (error) return handleError(error, "فشل جلب المرضى");
    return data || [];
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
  static async getFundingEntities() { const { data, error } = await supabase.from('funding_entities').select('*'); if (error) return handleError(error, "فشل جلب جهات التعاقد"); return data || []; }
  static async getStores() { const { data, error } = await supabase.from('stores').select('*'); if (error) return handleError(error, "فشل جلب المخازن"); return data || []; }
  static async getProducts() { const { data, error } = await supabase.from('products').select('*'); if (error) return handleError(error, "فشل جلب المنتجات"); return data || []; }
  static async getStockTransactions() {
    try {
      const { data, error } = await supabase.from('stock_transactions').select('*');
      if (error) {
        if (['42P01', 'PGRST116'].includes(error.code) || error.message.includes('schema cache')) return [];
        return handleError(error, "فشل جلب حركات المخزون");
      }
      return data || [];
    } catch (e) { return []; }
  }
  static async getTransferRequests() { const { data, error } = await supabase.from('transfer_requests').select('*'); if (error) return handleError(error, "فشل جلب طلبات التحويل"); return data || []; }
  static async getServices() { const { data, error } = await supabase.from('services').select('*'); if (error) return handleError(error, "فشل جلب الخدمات"); return data || []; }
  static async getSessions() { const { data, error } = await supabase.from('dialysis_sessions').select('*, patients(*)'); if (error) return handleError(error, "فشل جلب الجلسات"); return data || []; }
  static async getEmployees() { const { data, error } = await supabase.from('employees').select('*'); if (error) return handleError(error, "فشل جلب الموظفين"); return data || []; }
  static async getShifts() { const { data, error } = await supabase.from('shift_records').select('*'); if (error) return handleError(error, "فشل جلب الشفتات"); return data || []; }
  static async getAccounts() { const { data, error } = await supabase.from('financial_accounts').select('*'); if (error) return handleError(error, "فشل جلب الحسابات"); return data || []; }
  static async getTransactions() { const { data, error } = await supabase.from('transactions').select('*'); if (error) return handleError(error, "فشل جلب العمليات المالية"); return data || []; }
  static async getUsers() { const { data, error } = await supabase.from('system_users').select('*'); if (error) return handleError(error, "فشل جلب المستخدمين"); return data || []; }
  static async getLabDefinitions() { const { data, error } = await supabase.from('lab_test_definitions').select('*'); if (error) return handleError(error, "فشل جلب تعريفات التحاليل"); return data || []; }
  static async getLabTests() { const { data, error } = await supabase.from('lab_tests').select('*, patients(*), lab_test_definitions(*)'); if (error) return handleError(error, "فشل جلب التحاليل"); return data || []; }

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

  static async getClinicAppointments() { 
    try {
      const { data, error } = await supabase.from('clinic_appointments').select('*, patients(*), doctors(*), clinics(*)').order('date', { ascending: false }); 
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
      return data || [];
    } catch (e) { return []; }
  }
  static async addFamilyFile(f: any) {
    const { data, error } = await supabase.from('family_files').insert([f]).select();
    if (error) return handleError(error, "فشل إنشاء الملف العائلي");
    return data?.[0];
  }
  static async addFamilyMember(m: any) {
    const { data, error } = await supabase.from('family_file_members').insert([m]).select();
    if (error) return handleError(error, "فشل إضافة فرد للأسرة");
    return data?.[0];
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

  // --- Accreditation Specialized Forms Generic Fetch/Save ---
  static async getAccreditationRecords(tableName: string, patientId?: string) {
    try {
      let query = supabase.from(tableName).select('*').order('created_at', { ascending: false });
      if (patientId) query = query.eq('patient_id', patientId);
      const { data, error } = await query;
      if (error) { if (['42P01', 'PGRST116'].includes(error.code)) return []; throw error; }
      return data || [];
    } catch (e) { return []; }
  }
  static async addAccreditationRecord(tableName: string, record: any) {
    const { data, error } = await supabase.from(tableName).insert([record]).select();
    if (error) return handleError(error, `فشل حفظ السجل في ${tableName}`);
    return data?.[0];
  }

  static async getPatientHistory(patientId: string) {
    try {
      const [sessions, labTests, appointments, invoices] = await Promise.all([
        supabase.from('dialysis_sessions').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('lab_tests').select('*, lab_test_definitions(*)').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('clinic_appointments').select('*, doctors(*), clinics(*)').eq('patient_id', patientId).order('date', { ascending: false }),
        supabase.from('invoices').select('*').eq('patient_id', patientId).order('date', { ascending: false })
      ]);

      const events: any[] = [];

      sessions.data?.forEach(s => events.push({ ...s, type: 'SESSION' }));
      labTests.data?.forEach(l => events.push({ ...l, type: 'LAB' }));
      appointments.data?.forEach(a => events.push({ ...a, type: 'APPOINTMENT' }));
      invoices.data?.forEach(i => events.push({ ...i, type: 'INVOICE' }));

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
}
