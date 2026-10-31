-- ==============================================================================
-- Migration: Add missing 'notes' column to clinic_appointments
-- File: supabase/migrations/20261031_add_clinic_appointments_notes.sql
-- Description:
--   Adds the 'notes' column expected by QuickClinicBookingModal.tsx and types.ts
--   to the clinic_appointments table and reloads the PostgREST schema cache.
-- ==============================================================================

ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS notes TEXT NULL;

NOTIFY pgrst, 'reload schema';
