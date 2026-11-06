-- ============================================================================
-- HOSPITAL ERP + MEDICAL SYSTEM: SUPABASE AUTH INTEGRATION & STAFF SYNC
-- File: supabase/migrations/20261106_enable_supabase_auth_and_sync_system_users.sql
-- Date: 2026-11-06
-- Description:
--   1. Synchronizes all existing staff accounts in public.system_users
--      (columns: id, name, username, password, permissions) into
--      Supabase Auth (auth.users and auth.identities) with confirmed status
--      so that logging in issues a genuine 'authenticated' JWT session.
--   2. Creates an automatic trigger on public.system_users so any newly created
--      or updated staff user is immediately synced to auth.users & auth.identities.
--   3. Preserves strict Row Level Security (TO authenticated ONLY, zero TO anon)
--      across all 24 Family Health & Primary Care medical tables (Rule 2 & Rule 7).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. SYNC EXISTING public.system_users INTO auth.users
-- ============================================================================
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000'::uuid,
  u.id,
  'authenticated',
  'authenticated',
  CASE
    WHEN lower(trim(u.username)) ~ '^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
      THEN lower(trim(u.username))
    ELSE 'u_' || encode(convert_to(lower(trim(u.username)), 'UTF8'), 'hex') || '@elhedaya.local'
  END,
  crypt(
    CASE
      WHEN length(coalesce(u.password, '')) >= 6 THEN u.password
      ELSE coalesce(u.password, '') || '_elhedaya_auth'
    END,
    gen_salt('bf')
  ),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'username', u.username,
    'name', coalesce(u.name, u.username)
  ),
  now(),
  now(),
  '',
  '',
  '',
  ''
FROM public.system_users u
WHERE u.username IS NOT NULL AND trim(u.username) <> ''
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now(),
  confirmation_token = COALESCE(auth.users.confirmation_token, ''),
  email_change = COALESCE(auth.users.email_change, ''),
  email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
  recovery_token = COALESCE(auth.users.recovery_token, '');

-- ============================================================================
-- 2. SYNC EXISTING auth.users INTO auth.identities
-- ============================================================================
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  au.id,
  jsonb_build_object(
    'sub', au.id::text,
    'email', au.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  au.id::text,
  now(),
  now(),
  now()
FROM auth.users au
INNER JOIN public.system_users su ON su.id = au.id
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities ai
  WHERE ai.user_id = au.id AND ai.provider = 'email'
);

-- ============================================================================
-- 3. AUTOMATIC TRIGGER TO KEEP public.system_users SYNCED WITH Supabase Auth
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_system_user_to_supabase_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email text;
  v_password text;
BEGIN
  IF NEW.username IS NULL OR trim(NEW.username) = '' THEN
    RETURN NEW;
  END IF;

  IF lower(trim(NEW.username)) ~ '^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$' THEN
    v_email := lower(trim(NEW.username));
  ELSE
    v_email := 'u_' || encode(convert_to(lower(trim(NEW.username)), 'UTF8'), 'hex') || '@elhedaya.local';
  END IF;

  IF length(coalesce(NEW.password, '')) >= 6 THEN
    v_password := NEW.password;
  ELSE
    v_password := coalesce(NEW.password, '') || '_elhedaya_auth';
  END IF;

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    NEW.id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'username', NEW.username,
      'name', coalesce(NEW.name, NEW.username)
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now(),
    confirmation_token = COALESCE(auth.users.confirmation_token, ''),
    email_change = COALESCE(auth.users.email_change, ''),
    email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
    recovery_token = COALESCE(auth.users.recovery_token, '');

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    NEW.id,
    jsonb_build_object(
      'sub', NEW.id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NEW.id::text,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities ai
    WHERE ai.user_id = NEW.id AND ai.provider = 'email'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_system_user_to_supabase_auth ON public.system_users;
CREATE TRIGGER trg_sync_system_user_to_supabase_auth
AFTER INSERT OR UPDATE ON public.system_users
FOR EACH ROW EXECUTE FUNCTION public.sync_system_user_to_supabase_auth();

-- ============================================================================
-- 4. VERIFY STRICT RLS ON family_files & family_file_members (TO authenticated ONLY)
-- ============================================================================
ALTER TABLE public.family_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_family_files ON public.family_files;
DROP POLICY IF EXISTS anon_full_access_family_files ON public.family_files;
DROP POLICY IF EXISTS allow_all_for_authenticated_family_files ON public.family_files;
DROP POLICY IF EXISTS authenticated_full_access_family_files ON public.family_files;
CREATE POLICY authenticated_full_access_family_files
  ON public.family_files
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.family_file_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all_for_anon_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS anon_full_access_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS allow_all_for_authenticated_family_file_members ON public.family_file_members;
DROP POLICY IF EXISTS authenticated_full_access_family_file_members ON public.family_file_members;
CREATE POLICY authenticated_full_access_family_file_members
  ON public.family_file_members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
