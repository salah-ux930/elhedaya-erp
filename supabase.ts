
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aojoauthvinrdqgakilf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvam9hdXRodmlucmRxZ2FraWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Nzc5OTMsImV4cCI6MjA4NTQ1Mzk5M30.bB1Ni9EbrvCIwAqhTEZwuj-SneTVMCtbAWOvpa97lcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 💡 تنبيه هام لحل مشكلة SCHEMA_ERROR و missing column is_main:
 * 
 * يجب تنفيذ الخطوات التالية في لوحة تحكم Supabase:
 * 1. اذهب إلى SQL Editor.
 * 2. انسخ الكود أدناه بالكامل.
 * 3. اضغط Run.
 * 
 * ملاحظة: هذا الكود سيقوم بحذف الجداول الحالية وإعادة إنشائها لضمان مطابقة أسماء الحقول (is_main, patient_id... إلخ).
 * 
 * -- 1. حذف الجداول القديمة تماماً
 * DROP TABLE IF EXISTS stock_transactions CASCADE;
 * DROP TABLE IF EXISTS transfer_requests CASCADE;
 * DROP TABLE IF EXISTS lab_tests CASCADE;
 * DROP TABLE IF EXISTS lab_test_definitions CASCADE;
 * DROP TABLE IF EXISTS dialysis_sessions CASCADE;
 * DROP TABLE IF EXISTS transactions CASCADE;
 * DROP TABLE IF EXISTS shift_records CASCADE;
 * DROP TABLE IF EXISTS employees CASCADE;
 * DROP TABLE IF EXISTS patients CASCADE;
 * DROP TABLE IF EXISTS products CASCADE;
 * DROP TABLE IF EXISTS stores CASCADE;
 * DROP TABLE IF EXISTS financial_accounts CASCADE;
 * DROP TABLE IF EXISTS funding_entities CASCADE;
 * DROP TABLE IF EXISTS services CASCADE;
 * DROP TABLE IF EXISTS system_users CASCADE;
 * DROP TABLE IF EXISTS audit_logs CASCADE;
 * 
 * -- 2. تفعيل إضافات UUID
 * CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 * 
 * -- 3. إنشاء الجداول بأسماء حقول مطابقة للكود البرمجي (snake_case)
 * CREATE TABLE funding_entities (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE financial_accounts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   balance NUMERIC DEFAULT 0,
 *   linked_employee_id UUID,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE stores (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   is_main BOOLEAN DEFAULT false,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE products (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   unit TEXT,
 *   min_stock NUMERIC DEFAULT 0,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   category TEXT,
 *   barcode TEXT,
 *   description TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE stock_transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   product_id UUID REFERENCES products(id),
 *   store_id UUID REFERENCES stores(id),
 *   type TEXT NOT NULL,
 *   quantity NUMERIC NOT NULL,
 *   target_store_id UUID REFERENCES stores(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   note TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE transfer_requests (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   from_store_id UUID REFERENCES stores(id),
 *   to_store_id UUID REFERENCES stores(id),
 *   items JSONB NOT NULL,
 *   status TEXT DEFAULT 'PENDING',
 *   requested_by TEXT,
 *   note TEXT,
 *   date DATE DEFAULT CURRENT_DATE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE patients (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   national_id TEXT UNIQUE NOT NULL,
 *   phone TEXT,
 *   address TEXT,
 *   blood_type TEXT,
 *   date_of_birth DATE,
 *   funding_entity_id UUID REFERENCES funding_entities(id),
 *   emergency_contact JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE dialysis_sessions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patient_id UUID REFERENCES patients(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   start_time TIME,
 *   end_time TIME,
 *   weight_before NUMERIC(5,2),
 *   weight_after NUMERIC(5,2),
 *   blood_pressure TEXT,
 *   room TEXT,
 *   machine_id TEXT,
 *   status TEXT DEFAULT 'WAITING',
 *   notes TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE services (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   category TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   account_id UUID REFERENCES financial_accounts(id),
 *   amount NUMERIC NOT NULL,
 *   type TEXT NOT NULL,
 *   date DATE DEFAULT CURRENT_DATE,
 *   category TEXT,
 *   note TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE employees (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   code TEXT UNIQUE NOT NULL,
 *   name TEXT NOT NULL,
 *   bank_account TEXT,
 *   shift_price NUMERIC DEFAULT 0,
 *   type TEXT DEFAULT 'PERMANENT',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE shift_records (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   employee_id UUID REFERENCES employees(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   count NUMERIC DEFAULT 1,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE lab_test_definitions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   category TEXT,
 *   sample_type TEXT,
 *   normal_range_male TEXT,
 *   normal_range_female TEXT,
 *   normal_range_child TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE lab_tests (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patient_id UUID REFERENCES patients(id),
 *   test_definition_id UUID REFERENCES lab_test_definitions(id),
 *   result TEXT,
 *   status TEXT DEFAULT 'PENDING',
 *   date DATE DEFAULT CURRENT_DATE,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE system_users (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   username TEXT UNIQUE NOT NULL,
 *   password TEXT NOT NULL,
 *   permissions TEXT[],
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * CREATE TABLE audit_logs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id TEXT,
 *   action TEXT,
 *   details TEXT,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 4. إضافة المستخدم المدير الافتراضي
 * INSERT INTO system_users (name, username, password, permissions) 
 * VALUES ('المدير العام', 'admin', 'admin123', 
 * ARRAY['VIEW_DASHBOARD', 'VIEW_NOTIFICATIONS', 'MANAGE_RECEPTION', 'MANAGE_PATIENTS', 'MANAGE_LAB', 'MANAGE_BILLING', 'MANAGE_PAYROLL', 'MANAGE_INVENTORY', 'MANAGE_FINANCE', 'MANAGE_USERS', 'SYSTEM_SETUP']);
 * 
 * -- 5. 🛑 تحديث الذاكرة المؤقتة لـ PostgREST فوراً (حاسم جداً)
 * NOTIFY pgrst, 'reload schema';
 */
