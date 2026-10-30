-- ==============================================================================
-- Migration: 20260918_fix_notifications_category_and_rls.sql
-- Description: Fix missing 'category' and other clinical columns in public.notifications
--              table if it was created prior to the clinical alerts migration.
--              Enforce Rule 2 & Rule 7 (authenticated ONLY, DROP dev/anon policy).
-- ==============================================================================

-- 1. Ensure table exists with base schema
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  type TEXT DEFAULT 'error',
  category TEXT DEFAULT 'CLINICAL_ALERT',
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'CRITICAL',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add any missing columns safely if notifications was created in an older schema
DO $$
BEGIN
  -- category (Addresses ERROR: 42703: column "category" does not exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'CLINICAL_ALERT';
  END IF;

  -- title
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN title TEXT DEFAULT '';
  END IF;

  -- message
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN message TEXT DEFAULT '';
  END IF;

  -- type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN type TEXT DEFAULT 'error';
  END IF;

  -- patient_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;
  END IF;

  -- severity
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'severity'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN severity TEXT DEFAULT 'CRITICAL';
  END IF;

  -- metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- is_read
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;

  -- acknowledged_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'acknowledged_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN acknowledged_at TIMESTAMPTZ;
  END IF;

  -- acknowledged_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'acknowledged_by'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN acknowledged_by TEXT;
  END IF;

  -- created_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- 3. Create indexes for fast lookup (NOW safe because columns are guaranteed to exist)
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON public.notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 4. Enforce Row Level Security (RLS) - Rule 2: authenticated ONLY, NO anon
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop insecure dev policy if exists
DROP POLICY IF EXISTS "dev_notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "authenticated_notifications_policy" ON public.notifications;

-- Create policy for authenticated users only
CREATE POLICY "authenticated_notifications_policy" 
  ON public.notifications 
  FOR ALL 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- 5. Enable Realtime publication safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_tests') THEN
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_tests;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dialysis_vital_signs_ews') THEN
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dialysis_vital_signs_ews;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dialysis_sessions') THEN
      BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dialysis_sessions;
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$;

-- 6. Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
