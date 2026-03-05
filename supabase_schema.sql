-- Supabase Schema for Law Firm Lead Tracker

-- 1. Create custom enum types for status (optional, using text with constraints is easier for iteration)
-- We will use TEXT for simplicity and flexibility

-- 2. Create the Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('admin', 'lawyer')) DEFAULT 'lawyer',
  full_name TEXT NOT NULL,
  phone_number TEXT,
  total_leads_managing INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Leads table
CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) DEFAULT NULL,
  status TEXT DEFAULT 'New',
  case_mode TEXT,
  case_summary TEXT,
  next_followup_date TIMESTAMP WITH TIME ZONE,
  is_confirmed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create the Payments table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  total_payment NUMERIC DEFAULT 0,
  advance_payment NUMERIC DEFAULT 0,
  payment_id TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Leads Policies
-- Admin can view/edit all leads. Lawyers can only view/edit leads assigned to them.
CREATE POLICY "Admins can view all leads" ON public.leads FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can view their assigned leads" ON public.leads FOR SELECT 
  USING (assigned_to = auth.uid());

CREATE POLICY "Admins can manage all leads" ON public.leads FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can update their assigned leads" ON public.leads FOR UPDATE 
  USING (assigned_to = auth.uid());

-- Payments Policies
-- Only Admin can view/edit all payments. Lawyers can create a payment when confirming a lead.
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can insert payments for their leads" ON public.payments FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));


-- 7. Insert Initial Mock Dashboard Data (For previewing)
-- WARNING: Only run this if you want some test data in your live database!

-- Assuming you have created users via Supabase Auth, you would insert profiles like this:
-- INSERT INTO public.profiles (id, role, full_name, phone_number, total_leads_managing) VALUES ('your-auth-uuid-here', 'admin', 'Lead Admin', 'etc');
