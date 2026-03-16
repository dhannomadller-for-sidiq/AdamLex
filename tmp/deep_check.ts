
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepCheck() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split('T')[0];
    console.log(`--- Deep Check for: ${tomorrow} ---`);

    // 1. Check all leads
    const { data: leads } = await supabase
        .from('leads')
        .select('*');

    console.log(`Total leads in DB: ${leads?.length || 0}`);
    const approved = leads?.filter(l => l.status === 'Confirmed' && l.admin_approved);
    console.log(`Confirmed & Approved leads: ${approved?.length || 0}`);
    approved?.forEach(l => console.log(`- ${l.client_name}`));

    // 2. Check for hearings on tomorrow
    const { data: hearings } = await supabase
        .from('court_hearings')
        .select('*, leads(client_name, status, admin_approved)')
        .eq('next_hearing_date', tomorrow);

    console.log(`\nHearings found for ${tomorrow}: ${hearings?.length || 0}`);
    hearings?.forEach(h => {
        console.log(`- Client: ${h.leads?.client_name}, Status: ${h.leads?.status}, Approved: ${h.leads?.admin_approved}`);
        console.log(`  Hearing Date: ${h.hearing_date}, Next: ${h.next_hearing_date}`);
    });

    // 3. Date format check in code vs DB
    console.log(`\nDiagnostic: Code will seek '${tomorrow}'`);
}

deepCheck();
