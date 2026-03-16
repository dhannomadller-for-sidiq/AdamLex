-- SQL Migration to create court tracking tables if they don't exist

-- 1. Create court_cases table
CREATE TABLE IF NOT EXISTS public.court_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Made optional for scraped cases
  case_number TEXT UNIQUE NOT NULL,
  petitioner TEXT,
  respondent TEXT,
  bench TEXT,
  court_hall TEXT,
  court_name TEXT,
  case_type TEXT,
  filing_date DATE,
  current_stage INT DEFAULT 1,
  notes TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create court_hearings table
CREATE TABLE IF NOT EXISTS public.court_hearings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  court_case_id UUID REFERENCES public.court_cases(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Made optional
  hearing_date DATE NOT NULL,
  what_happened TEXT,
  result TEXT,
  next_hearing_date DATE,
  next_hearing_notes TEXT,
  recorded_by UUID REFERENCES public.profiles(id),
  voice_note_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create court_stages table (for milestones)
CREATE TABLE IF NOT EXISTS public.court_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  court_case_id UUID REFERENCES public.court_cases(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE, -- Made optional
  stage_number INT NOT NULL,
  stage_name TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Done', 'Adjourned', 'Skipped')),
  notes TEXT,
  stage_date DATE,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.court_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_hearings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_stages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Admins can do everything, Lawyers can see/edit their assigned leads' court cases)

-- court_cases
CREATE POLICY "Admins can manage all court cases" ON public.court_cases FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can view their assigned court cases" ON public.court_cases FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));

-- court_hearings
CREATE POLICY "Admins can manage all court hearings" ON public.court_hearings FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can view their assigned court hearings" ON public.court_hearings FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));

CREATE POLICY "Lawyers can insert their assigned court hearings" ON public.court_hearings FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));

-- court_stages
CREATE POLICY "Admins can manage all court stages" ON public.court_stages FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Lawyers can view their assigned court stages" ON public.court_stages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));

CREATE POLICY "Lawyers can manage their assigned court stages" ON public.court_stages FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));
