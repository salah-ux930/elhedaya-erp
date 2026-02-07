
import { createClient } from '@supabase/supabase-js';

// إعدادات المشروع المقدمة من المستخدم
const supabaseUrl = 'https://aojoauthvinrdqgakilf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvam9hdXRodmlucmRxZ2FraWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Nzc5OTMsImV4cCI6MjA4NTQ1Mzk5M30.bB1Ni9EbrvCIwAqhTEZwuj-SneTVMCtbAWOvpa97lcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL Schema Corrected (Run this in Supabase SQL Editor):
 * 
 * -- 1. جهات التمويل (Funding Entities)
 * CREATE TABLE funding_entities (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. المرضى (Patients)
 * CREATE TABLE patients (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   national_id TEXT UNIQUE NOT NULL,
 *   phone TEXT, -- تم التغيير لـ TEXT لضمان حفظ الأصفار في البداية
 *   address TEXT,
 *   blood_type TEXT,
 *   date_of_birth DATE, -- تاريخ الميلاد المطلوب
 *   funding_entity_id UUID REFERENCES funding_entities(id),
 *   emergency_contact JSONB, -- حفظ كائن الطوارئ (الاسم، الهاتف، الصلة)
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 3. جلسات الغسيل (Dialysis Sessions)
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
 * -- 4. قاموس التحاليل (Lab Test Definitions)
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
 * -- 5. سجل نتائج التحاليل (Lab Tests)
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
 * -- 6. الخدمات والأسعار (Services)
 * CREATE TABLE services (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   category TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 7. الفواتير (Invoices)
 * CREATE TABLE invoices (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patient_id UUID REFERENCES patients(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   total_amount NUMERIC(10,2) DEFAULT 0,
 *   status TEXT, -- PAID, DEFERRED, FREE
 *   funding_entity_id UUID REFERENCES funding_entities(id),
 *   room TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 8. أصناف المخزن (Products)
 * CREATE TABLE products (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   unit TEXT,
 *   min_stock NUMERIC DEFAULT 0,
 *   price NUMERIC(10,2) DEFAULT 0,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 9. الموظفين (Employees)
 * CREATE TABLE employees (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   code TEXT UNIQUE,
 *   name TEXT NOT NULL,
 *   bank_account TEXT,
 *   shift_price NUMERIC(10,2) DEFAULT 0,
 *   type TEXT, -- PERMANENT, TEMPORARY
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 10. سجل الشفتات (Shifts)
 * CREATE TABLE shifts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   employee_id UUID REFERENCES employees(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   count NUMERIC DEFAULT 1,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 11. حسابات النظام (System Users)
 * CREATE TABLE system_users (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   username TEXT UNIQUE NOT NULL,
 *   permissions TEXT[], -- مصفوفة الصلاحيات
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 12. سجل العمليات (Audit Logs)
 * CREATE TABLE audit_logs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id TEXT,
 *   action TEXT,
 *   details TEXT,
 *   timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 */
