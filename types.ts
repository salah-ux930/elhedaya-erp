
export type Permission = 
  | 'VIEW_DASHBOARD' 
  | 'MANAGE_RECEPTION'
  | 'MANAGE_PATIENTS' 
  | 'MANAGE_LAB'
  | 'MANAGE_BILLING' 
  | 'MANAGE_PAYROLL' 
  | 'MANAGE_INVENTORY' 
  | 'MANAGE_FINANCE' 
  | 'MANAGE_USERS' 
  | 'SYSTEM_SETUP';

export interface User {
  id: string;
  name: string;
  username: string;
  permissions: Permission[];
}

export interface Patient {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  address: string;
  bloodType: string;
  fundingEntityId: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  createdAt: string;
}

export interface LabTestDefinition {
  id: string;
  name: string;
  category: string;
  sampleType: string;
  normalRangeMale: string;
  normalRangeFemale: string;
  normalRangeChild: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  testDefinitionId: string;
  result?: string;
  status: 'PENDING' | 'COMPLETED';
  date: string;
  testName?: string; // For legacy or display cache
}

export interface DialysisSession {
  id: string;
  patientId: string;
  date: string;
  startTime: string;
  endTime: string;
  weightBefore: number;
  weightAfter: number;
  bloodPressure: string;
  room: string;
  machineId: string;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED';
  notes: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'DIALYSIS' | 'LAB' | 'PHARMACY' | 'OTHER';
}

export interface Invoice {
  id: string;
  patientId: string;
  date: string;
  items: { serviceId: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'PAID' | 'DEFERRED' | 'FREE';
  fundingEntityId: string;
  room?: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  minStock: number;
  price: number;
}

export interface Store {
  id: string;
  name: string;
  isMain: boolean;
}

export interface StockTransaction {
  id: string;
  productId: string;
  storeId: string;
  type: 'ADD' | 'DEDUCT' | 'TRANSFER';
  quantity: number;
  targetStoreId?: string;
  date: string;
  note?: string;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  bankAccount: string;
  shiftPrice: number;
  type: 'PERMANENT' | 'TEMPORARY';
}

export interface ShiftRecord {
  id: string;
  employeeId: string;
  date: string;
  count: number;
}

export interface FinancialAccount {
  id: string;
  name: string;
  type: 'CASH' | 'BANK';
  balance: number;
  linkedEmployeeId?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
  note: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface FundingEntity {
  id: string;
  name: string;
}
