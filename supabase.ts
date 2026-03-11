
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aojoauthvinrdqgakilf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvam9hdXRodmlucmRxZ2FraWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Nzc5OTMsImV4cCI6MjA4NTQ1Mzk5M30.bB1Ni9EbrvCIwAqhTEZwuj-SneTVMCtbAWOvpa97lcA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 🛠️ تحديث قاعدة البيانات (SQL Schema):
 * -------------------------------------------
 * يرجى تشغيل الكود التالي لإضافة جدول الإشعارات وحل مشكلة الجداول المفقودة:
 * 
 * -- 1. جدول الإشعارات
 * CREATE TABLE IF NOT EXISTS notifications (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   title TEXT NOT NULL,
 *   message TEXT NOT NULL,
 *   type TEXT DEFAULT 'info', -- info, warning, error, success
 *   category TEXT,
 *   is_read BOOLEAN DEFAULT false,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 * 
 * -- 2. تفعيل الامتداد الخاص بالـ UUID
 * CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
 * 
 * -- 3. التأكد من وجود جداول المخازن والطلبات
 * CREATE TABLE IF NOT EXISTS stores (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, is_main BOOLEAN DEFAULT false);
 * CREATE TABLE IF NOT EXISTS products (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, unit TEXT, min_stock NUMERIC DEFAULT 0, price NUMERIC DEFAULT 0);
 * CREATE TABLE IF NOT EXISTS transfer_requests (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   from_store_id UUID REFERENCES stores(id),
 *   to_store_id UUID REFERENCES stores(id),
 *   items JSONB NOT NULL,
 *   status TEXT DEFAULT 'PENDING',
 *   requested_by TEXT,
 *   date DATE DEFAULT CURRENT_DATE
 * );
 * 
 * NOTIFY pgrst, 'reload schema';
 */
