
export type Permission = 
  | 'VIEW_DASHBOARD' 
  | 'VIEW_NOTIFICATIONS'
  | 'MANAGE_RECEPTION'
  | 'MANAGE_PATIENTS' 
  | 'MANAGE_LAB'
  | 'MANAGE_BILLING' 
  | 'MANAGE_PAYROLL' 
  | 'MANAGE_INVENTORY' 
  | 'MANAGE_FINANCE' 
  | 'MANAGE_USERS' 
  | 'SYSTEM_SETUP'
  | 'MANAGE_STORES'
  | 'MANAGE_ACCOUNTS'
  | string;

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  permissions: Permission[];
}

export interface Patient {
  id: string;
  name: string;
  national_id: string;
  phone: string;
  address: string;
  blood_type: string;
  date_of_birth?: string;
  funding_entity_id: string;
  emergency_contact: {
    name: string;
    phone: string;
    relation: string;
  };
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'DIALYSIS' | 'LAB' | 'PHARMACY' | 'OTHER';
  config?: {
    required_fields?: string[];
    consumables?: { product_id: string; quantity: number }[];
  };
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  min_stock: number;
  price: number;
  category?: string;
  barcode?: string;
  description?: string;
}

export interface Store {
  id: string;
  name: string;
  is_main: boolean;
}

export interface StockTransaction {
  id: string;
  product_id: string;
  store_id: string;
  type: 'ADD' | 'DEDUCT' | 'TRANSFER';
  quantity: number;
  target_store_id?: string;
  date: string;
  note?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  bank_account: string;
  shift_price: number;
  type: 'PERMANENT' | 'TEMPORARY';
}

export interface ShiftRecord {
  id: string;
  employee_id: string;
  date: string;
  count: number;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  balance: number;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
  note: string;
}

export interface DialysisSession {
  id: string;
  patient_id: string;
  service_id?: string;
  date: string;
  start_time: string;
  end_time?: string;
  weight_before: number;
  weight_after?: number;
  blood_pressure: string;
  room: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  notes: string;
  custom_data?: Record<string, string>;
  machine_id?: string;
}

// Add missing FundingEntity type
export interface FundingEntity {
  id: string;
  name: string;
  created_at: string;
}

// Add missing TransferRequest type
export interface TransferRequest {
  id: string;
  from_store_id: string;
  to_store_id: string;
  items: { product_id: string; quantity: number }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by?: string;
  note?: string;
  date: string;
}

// Add missing Invoice type
export interface Invoice {
  id: string;
  patient_id: string;
  date: string;
  amount: number;
  status: 'PAID' | 'DEFERRED' | 'FREE';
  room?: string;
}

// Add missing LabTestDefinition type
export interface LabTestDefinition {
  id: string;
  name: string;
  category?: string;
  sample_type?: string;
  normal_range_male?: string;
  normal_range_female?: string;
  normal_range_child?: string;
}

// Add missing LabTest type
export interface LabTest {
  id: string;
  patient_id: string;
  test_definition_id: string;
  result?: string;
  status: 'PENDING' | 'COMPLETED';
  date: string;
}
