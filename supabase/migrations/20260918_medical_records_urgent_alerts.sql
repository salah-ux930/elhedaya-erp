-- ==============================================================================
-- Migration: 20260918_medical_records_urgent_alerts.sql
-- Description: Provision and enhance notifications schema for real-time urgent lab results
--              and critical vital signs changes alerting in Medical Records module.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ensure notifications table exists with clinical alert fields
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'error', -- error, warning, info, success
  category TEXT DEFAULT 'CLINICAL_ALERT', -- URGENT_LAB, CRITICAL_VITALS, CLINICAL_ALERT
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'CRITICAL', -- CRITICAL, WARNING, INFO
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add any missing columns if notifications table existed previously
DO $$
BEGIN
  -- Ensure category exists (fixes ERROR: 42703: column "category" does not exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category') THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'CLINICAL_ALERT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title') THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message') THEN
    ALTER TABLE public.notifications ADD COLUMN message TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'error';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'patient_id') THEN
    ALTER TABLE public.notifications ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'severity') THEN
    ALTER TABLE public.notifications ADD COLUMN severity TEXT DEFAULT 'CRITICAL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'acknowledged_at') THEN
    ALTER TABLE public.notifications ADD COLUMN acknowledged_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'acknowledged_by') THEN
    ALTER TABLE public.notifications ADD COLUMN acknowledged_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at') THEN
    ALTER TABLE public.notifications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Indexes for lightning fast alert queries
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON public.notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS (authenticated ONLY, Rule 2 compliant)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "authenticated_notifications_policy" ON public.notifications;
CREATE POLICY "authenticated_notifications_policy" 
  ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime Replication on alert-producing tables
DO $$
BEGIN
  -- Check if supabase_realtime publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add tables to realtime publication safely
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_tests;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dialysis_vital_signs_ews;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dialysis_sessions;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
