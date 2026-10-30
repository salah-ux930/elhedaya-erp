-- ==============================================================================
-- Migration: 20261024_pharmacy_batches_fefo_fifo.sql
-- Description: إنشاء جداول قسم الصيدلية ونظام إدارة الباتشات (التشغيلات) والصرف التلقائي
--              بنظام الأقرب انتهاء صلاحية أولاً ثم الأقدم توريداً (FEFO + FIFO)
--              وربطه بروشتات العيادات وجلسات الغسيل الكلوي والصرف المباشر للمرضى.
-- Security Compliance: Strictly adheres to Project Rules (Rule 2, Rule 3 & Rule 7:
--                      RLS enabled on all tables, TO authenticated ONLY, NO TO anon).
-- ==============================================================================

-- 1. جدول دليل الأدوية والمستلزمات الصيدلانية (pharmacy_items)
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE,
    trade_name TEXT NOT NULL,
    generic_name TEXT,
    dosage_form TEXT NOT NULL DEFAULT 'أقراص', -- أقراص، كبسولات، أمبول، فيال، شراب، محلول وريدي، مستلزم غسيل
    strength TEXT,                              -- مثال: 500mg, 4000 IU, 10mg/ml
    unit TEXT NOT NULL DEFAULT 'علبة',          -- علبة، شريط، أمبول، فيال، زجاجة، كيس
    min_stock_level NUMERIC NOT NULL DEFAULT 10,
    storage_conditions TEXT DEFAULT 'درجة حرارة الغرفة (أقل من 25°C)',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pharmacy_items IS 'دليل الأدوية والمستحضرات الصيدلانية بوحدة الصيدلية';

CREATE INDEX IF NOT EXISTS idx_pharmacy_items_trade_name ON public.pharmacy_items(trade_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_items_generic_name ON public.pharmacy_items(generic_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_items_code ON public.pharmacy_items(code);

-- 2. جدول الباتشات / التشغيلات الدوائية (pharmacy_batches)
CREATE TABLE IF NOT EXISTS public.pharmacy_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    production_date DATE,
    expiry_date DATE NOT NULL,                  -- المعيار الأول في الصرف (FEFO: الأقرب انتهاءً يصرف أولاً)
    received_date DATE NOT NULL DEFAULT CURRENT_DATE, -- المعيار الثاني في الصرف (FIFO: الأقدم توريداً يصرف أولاً)
    initial_quantity NUMERIC NOT NULL CHECK (initial_quantity > 0),
    remaining_quantity NUMERIC NOT NULL CHECK (remaining_quantity >= 0),
    supplier_name TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEPLETED', 'EXPIRED', 'QUARANTINED')),
    notes TEXT,
    received_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pharmacy_batches IS 'سجل التشغيلات (الباتشات) وتواريخ الصلاحية والتوريد للصرف بنظام FEFO/FIFO';

CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_item_id ON public.pharmacy_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_fefo_fifo ON public.pharmacy_batches(item_id, status, expiry_date ASC, received_date ASC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_batch_number ON public.pharmacy_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_pharmacy_batches_expiry_date ON public.pharmacy_batches(expiry_date);

-- 3. جدول أذونات وروشتات الصرف المنفذة (pharmacy_dispense_orders)
CREATE TABLE IF NOT EXISTS public.pharmacy_dispense_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'DIRECT' CHECK (source_type IN ('CLINIC_PRESCRIPTION', 'DIALYSIS_SESSION', 'DIRECT')),
    appointment_id UUID REFERENCES public.clinic_appointments(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.dialysis_sessions(id) ON DELETE SET NULL,
    prescribing_doctor TEXT,
    dispensed_by TEXT NOT NULL,
    dispensed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    diagnosis_or_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pharmacy_dispense_orders IS 'سجل أذونات صرف الأدوية للمرضى (روشتات العيادات، جلسات الغسيل الكلوي، والصرف المباشر)';

CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_orders_patient ON public.pharmacy_dispense_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_orders_source ON public.pharmacy_dispense_orders(source_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_orders_appointment ON public.pharmacy_dispense_orders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_orders_session ON public.pharmacy_dispense_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_orders_date ON public.pharmacy_dispense_orders(dispensed_at DESC);

-- 4. جدول تفاصيل الأصناف والباتشات المنصرفة (pharmacy_dispense_items)
CREATE TABLE IF NOT EXISTS public.pharmacy_dispense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispense_order_id UUID NOT NULL REFERENCES public.pharmacy_dispense_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.pharmacy_items(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.pharmacy_batches(id) ON DELETE RESTRICT,
    batch_number_snapshot TEXT NOT NULL,
    expiry_date_snapshot DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    dosage_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.pharmacy_dispense_items IS 'تفاصيل الباتشات المنصرفة فعلياً لكل دواء داخل إذن الصرف لضمان التتبع الدوائي الكامل (Batch Traceability)';

CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_items_order ON public.pharmacy_dispense_items(dispense_order_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_items_item ON public.pharmacy_dispense_items(item_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_items_batch ON public.pharmacy_dispense_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_dispense_items_batch_no ON public.pharmacy_dispense_items(batch_number_snapshot);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - RULE 2 & RULE 7: STRICTLY TO authenticated ONLY
-- Zero access for anon role.
-- ==============================================================================

ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispense_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_dispense_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to guarantee idempotency and zero anon exposure
DROP POLICY IF EXISTS "authenticated_only_pharmacy_items" ON public.pharmacy_items;
DROP POLICY IF EXISTS "anon_access_pharmacy_items" ON public.pharmacy_items;

DROP POLICY IF EXISTS "authenticated_only_pharmacy_batches" ON public.pharmacy_batches;
DROP POLICY IF EXISTS "anon_access_pharmacy_batches" ON public.pharmacy_batches;

DROP POLICY IF EXISTS "authenticated_only_pharmacy_dispense_orders" ON public.pharmacy_dispense_orders;
DROP POLICY IF EXISTS "anon_access_pharmacy_dispense_orders" ON public.pharmacy_dispense_orders;

DROP POLICY IF EXISTS "authenticated_only_pharmacy_dispense_items" ON public.pharmacy_dispense_items;
DROP POLICY IF EXISTS "anon_access_pharmacy_dispense_items" ON public.pharmacy_dispense_items;

-- Create strict authenticated-only policies
CREATE POLICY "authenticated_only_pharmacy_items"
    ON public.pharmacy_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_only_pharmacy_batches"
    ON public.pharmacy_batches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_only_pharmacy_dispense_orders"
    ON public.pharmacy_dispense_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated_only_pharmacy_dispense_items"
    ON public.pharmacy_dispense_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
