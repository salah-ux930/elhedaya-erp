
import { createClient } from '@supabase/supabase-js';

// إعدادات المشروع المقدمة من المستخدم
const supabaseUrl = 'https://aojoauthvinrdqgakilf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvam9hdXRodmlucmRxZ2FraWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Nzc5OTMsImV4cCI6MjA4NTQ1Mzk5M30.bB1Ni9EbrvCIwAqhTEZwuj-SneTVMCtbAWOvpa97lcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL Schema for Reference (Run this in Supabase SQL Editor):
 * 
 * -- Patients
 * CREATE TABLE patients (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   national_id TEXT UNIQUE NOT NULL,
 *   phone TEXT,
 *   address TEXT,
 *   blood_type TEXT,
 *   funding_entity_id UUID,
 *   emergency_contact JSONB,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Sessions
 * CREATE TABLE dialysis_sessions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patient_id UUID REFERENCES patients(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   start_time TIME,
 *   end_time TIME,
 *   weight_before NUMERIC,
 *   weight_after NUMERIC,
 *   blood_pressure TEXT,
 *   room TEXT,
 *   machine_id TEXT,
 *   status TEXT DEFAULT 'WAITING',
 *   notes TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- Funding Entities
 * CREATE TABLE funding_entities (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL
 * );
 * 
 * -- Services
 * CREATE TABLE services (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   price NUMERIC DEFAULT 0,
 *   category TEXT
 * );
 * 
 * -- Invoices
 * CREATE TABLE invoices (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   patient_id UUID REFERENCES patients(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   total_amount NUMERIC DEFAULT 0,
 *   status TEXT,
 *   funding_entity_id UUID,
 *   room TEXT
 * );
 * 
 * -- Products (Inventory)
 * CREATE TABLE products (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   unit TEXT,
 *   min_stock NUMERIC DEFAULT 0,
 *   price NUMERIC DEFAULT 0
 * );
 * 
 * -- Employees
 * CREATE TABLE employees (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   code TEXT UNIQUE,
 *   name TEXT NOT NULL,
 *   bank_account TEXT,
 *   shift_price NUMERIC DEFAULT 0,
 *   type TEXT
 * );
 * 
 * -- Shifts
 * CREATE TABLE shifts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   employee_id UUID REFERENCES employees(id),
 *   date DATE DEFAULT CURRENT_DATE,
 *   count NUMERIC DEFAULT 1
 * );
 * 
 * -- Financial Accounts
 * CREATE TABLE financial_accounts (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   type TEXT,
 *   balance NUMERIC DEFAULT 0
 * );
 * 
 * -- Transactions
 * CREATE TABLE transactions (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   account_id UUID REFERENCES financial_accounts(id),
 *   amount NUMERIC NOT NULL,
 *   type TEXT,
 *   category TEXT,
 *   note TEXT,
 *   date DATE DEFAULT CURRENT_DATE
 * );
 * 
 * -- Users
 * CREATE TABLE system_users (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   name TEXT NOT NULL,
 *   username TEXT UNIQUE NOT NULL,
 *   permissions TEXT[]
 * );
 */
