
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aojoauthvinrdqgakilf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvam9hdXRodmlucmRxZ2FraWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Nzc5OTMsImV4cCI6MjA4NTQ1Mzk5M30.bB1Ni9EbrvCIwAqhTEZwuj-SneTVMCtbAWOvpa97lcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL Schema (قم بنسخ هذا الكود وتشغيله في SQL Editor في Supabase):
 * 
 * -- 1. جهات التمويل
 * CREATE TABLE funding_entities (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. الحسابات المالية (الخزائن والبنك)
 * CREATE TABLE financial_accounts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   type TEXT NOT NULL, -- 'CASH' or 'BANK'
 *   balance NUMERIC DEFAULT 0,
 *   linkedEmployeeId UUID,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. المخازن
 * CREATE TABLE stores (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   isMain BOOLEAN DEFAULT false,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 4. الأصناف
 * CREATE TABLE products (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   unit TEXT,
 *   minStock NUMERIC DEFAULT 0,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 5. المرضى
 * CREATE TABLE patients (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   nationalId TEXT UNIQUE NOT NULL,
 *   phone TEXT,
 *   bloodType TEXT,
 *   dateOfBirth DATE,
 *   fundingEntityId UUID REFERENCES funding_entities(id),
 *   emergencyContact JSONB,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 6. جلسات الغسيل
 * CREATE TABLE dialysis_sessions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patientId UUID REFERENCES patients(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   startTime TIME,
 *   endTime TIME,
 *   weightBefore NUMERIC(5,2),
 *   weightAfter NUMERIC(5,2),
 *   bloodPressure TEXT,
 *   room TEXT,
 *   machineId TEXT,
 *   status TEXT DEFAULT 'WAITING',
 *   notes TEXT,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 7. الخدمات
 * CREATE TABLE services (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   category TEXT,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 8. حركات المخزن
 * CREATE TABLE stock_transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   productId UUID REFERENCES products(id),
 *   storeId UUID REFERENCES stores(id),
 *   type TEXT NOT NULL, -- 'ADD', 'DEDUCT', 'TRANSFER'
 *   quantity NUMERIC NOT NULL,
 *   date DATE DEFAULT CURRENT_DATE,
 *   note TEXT,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 9. طلبات التحويل
 * CREATE TABLE transfer_requests (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   fromStoreId UUID REFERENCES stores(id),
 *   toStoreId UUID REFERENCES stores(id),
 *   items JSONB NOT NULL,
 *   status TEXT DEFAULT 'PENDING',
 *   note TEXT,
 *   date DATE DEFAULT CURRENT_DATE,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 10. المعاملات المالية
 * CREATE TABLE transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   accountId UUID REFERENCES financial_accounts(id),
 *   amount NUMERIC NOT NULL,
 *   type TEXT NOT NULL, -- 'INCOME', 'EXPENSE'
 *   date DATE DEFAULT CURRENT_DATE,
 *   category TEXT,
 *   note TEXT,
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 11. حسابات النظام
 * CREATE TABLE system_users (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   username TEXT UNIQUE NOT NULL,
 *   password TEXT NOT NULL,
 *   permissions TEXT[],
 *   createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 12. سجل العمليات
 * CREATE TABLE audit_logs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   userId TEXT,
 *   action TEXT,
 *   details TEXT,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */
