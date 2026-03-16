
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    console.log('--- ALL LEADS ---');
    const { data: leads } = await supabase.from('leads').select('client_name, status, admin_approved');
    leads?.forEach(l => console.log(`- '${l.client_name}' (Status: ${l.status}, Approved: ${l.admin_approved})`));

    console.log('\n--- ALL HEARINGS ---');
    const { data: hearings } = await supabase.from('court_hearings').select('hearing_date, next_hearing_date, what_happened');
    hearings?.forEach(h => console.log(`- Date: ${h.hearing_date}, What: ${h.what_happened}`));
}

listAll();
