-- Create the Followups table
CREATE TABLE public.followups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  lawyer_id UUID REFERENCES public.profiles(id) DEFAULT NULL,
  status_at_time TEXT NOT NULL,
  summary_text TEXT,
  next_followup_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage followups" ON public.followups FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Lawyers can view followups for their assigned leads
CREATE POLICY "Lawyers can view followups for their leads" ON public.followups FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));

-- Lawyers can insert followups for their assigned leads
CREATE POLICY "Lawyers can insert followups for their leads" ON public.followups FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_id AND leads.assigned_to = auth.uid()));
