-- ==============================================================================
-- Migration: 20260918_add_dialysis_disconnection_time.sql
-- Description: إضافة عمود "وقت فك الوصلة" (disconnection_time) لجدول جلسات الغسيل الكلوي (dialysis_sessions)
--              لتوثيق وقت فصل المريض وإزالة الإبر أو قسطرة الغسيل وبدء الضغط.
-- Compliance: Strictly follows Project Rules (Rule 2 & Rule 7: TO authenticated ONLY. NO anon access).
-- ==============================================================================

-- 1. إضافة عمود disconnection_time إلى جدول dialysis_sessions بأمان
ALTER TABLE public.dialysis_sessions 
ADD COLUMN IF NOT EXISTS disconnection_time TEXT;

-- 2. توثيق العمود في قاموس بيانات النظام
COMMENT ON COLUMN public.dialysis_sessions.disconnection_time IS 'وقت فك وصلة الغسيل الكلوي وإزالة الإبر/القسطرة وبدء إجراءات وقف النزيف (Access Disconnection Time)';

-- 3. تحديث كاش PostgREST لإتاحة الحقل فوراً لجميع الاستعلامات
NOTIFY pgrst, 'reload schema';
