-- ==============================================================================
-- Migration: 20260918_dialysis_fall_risk_reviews.sql
-- Description: سجل المراجعة الدورية لإجراءات الوقاية من مخاطر السقوط كل ساعتين
--              أثناء جلسة الغسيل الكلوي وإرسال تنبيهات لتمريض الصالة.
-- Compliance: Strictly adheres to Project Rules (Rule 2 & Rule 7: TO authenticated ONLY. NO TO anon).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.dialysis_fall_risk_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.dialysis_sessions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    review_stage TEXT NOT NULL, -- '2_HOURS' | '4_HOURS' | 'EXTRA'
    review_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewer_name TEXT NOT NULL,
    risk_score INT DEFAULT 0,
    risk_level TEXT DEFAULT 'HIGH', -- 'LOW' | 'MEDIUM' | 'HIGH'
    
    -- إجراءات الوقاية المعتمدة من مخاطر السقوط (Accredited Fall Prevention Precautions):
    card_placed BOOLEAN DEFAULT true,              -- وضع وتثبيت بطاقة تعريف خطر السقوط
    bed_low_brakes_locked BOOLEAN DEFAULT true,    -- خفض السرير / الكرسي لأدنى مستوى وتأمين الفرامل
    side_rails_raised BOOLEAN DEFAULT true,        -- رفع الحواجز الجانبية للسرير وتأمينها
    call_bell_within_reach BOOLEAN DEFAULT true,   -- جرس / زر استدعاء التمريض في متناول يد المريض
    safe_environment_clear BOOLEAN DEFAULT true,   -- بيئة آمنة وخالية من العوائق والأسلاك والأنابيب
    assisted_ambulation_only BOOLEAN DEFAULT true, -- الحركة والقيام بمرافقة التمريض حصراً
    frequent_toilet_check BOOLEAN DEFAULT true,    -- المتابعة الدورية والمساعدة لدخول الحمام
    patient_relative_educated BOOLEAN DEFAULT true,-- توعية المريض والمرافق بمخاطر الوقوف المفاجئ
    non_slip_footwear BOOLEAN DEFAULT true,        -- ارتداء حذاء مانع للانزلاق عند الحركة
    
    clinical_notes TEXT,
    acknowledged_alert_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.dialysis_fall_risk_reviews IS 'سجل المراجعة الدورية لإجراءات الوقاية من مخاطر السقوط (مرتين بالجلسة كل ساعتين) لوحدة الغسيل الكلوي';

CREATE INDEX IF NOT EXISTS idx_fall_risk_reviews_session ON public.dialysis_fall_risk_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_fall_risk_reviews_patient ON public.dialysis_fall_risk_reviews(patient_id);
CREATE INDEX IF NOT EXISTS idx_fall_risk_reviews_stage ON public.dialysis_fall_risk_reviews(review_stage);
CREATE INDEX IF NOT EXISTS idx_fall_risk_reviews_time ON public.dialysis_fall_risk_reviews(review_time DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - RULE 2 & RULE 7: STRICTLY TO authenticated ONLY
-- ==============================================================================
ALTER TABLE public.dialysis_fall_risk_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only_dialysis_fall_risk_reviews" ON public.dialysis_fall_risk_reviews;
DROP POLICY IF EXISTS "anon_access_dialysis_fall_risk_reviews" ON public.dialysis_fall_risk_reviews;

CREATE POLICY "authenticated_only_dialysis_fall_risk_reviews"
    ON public.dialysis_fall_risk_reviews
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable Supabase Realtime broadcast for dialysis hall live nurse monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.dialysis_fall_risk_reviews;

NOTIFY pgrst, 'reload schema';
