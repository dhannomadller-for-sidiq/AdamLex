-- Migration Script for Associate Feature

-- 1. Update Profiles table
-- Add 'associate' to the role constraint and add new fields
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'lawyer', 'associate'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialization TEXT;

-- 2. Update Leads table
-- Add associate assignment and payment fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS associate_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS associate_payment NUMERIC DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS associate_advance_payment NUMERIC DEFAULT 0;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS associate_payment_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS associate_remarks TEXT;

-- 3. Update RLS Policies for Associates

-- Allow associates to view their assigned leads
CREATE POLICY "Associates can view their assigned leads" ON public.leads FOR SELECT 
  USING (associate_id = auth.uid());

-- Allow associates to update their assigned leads (if needed, e.g. for status updates)
CREATE POLICY "Associates can update their assigned leads" ON public.leads FOR UPDATE 
  USING (associate_id = auth.uid());

-- Ensure Admins have full access to associate-related fields (already covered by "Admins can view/update all leads" if role = 'admin')
-- Check existing policies in supabase_schema.sql:
-- CREATE POLICY "Admins can view all leads" ... USING ( profiles.role = 'admin')
-- It uses EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- This remains valid.

-- 4. Update Payments RLS (for associate-to-lead payments if we use a separate table, but here we added to leads)
-- If we add more complexity later, we might need a separate 'associate_payments' table.
