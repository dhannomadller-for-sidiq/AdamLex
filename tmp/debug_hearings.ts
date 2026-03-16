
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- Debugging Hearing Data ---');

    // 1. Check for tomorrow's date string
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split('T')[0];
    console.log(`Searching for hearings on: ${tomorrow}`);

    const { data: hearings, error: hearErr } = await supabase
        .from('court_hearings')
        .select(`
            *,
            leads(client_name)
        `)
        .eq('next_hearing_date', tomorrow);

    if (hearErr) console.error('Error fetching hearings:', hearErr);
    console.log(`Found ${hearings?.length || 0} hearings for tomorrow.`);
    if (hearings && hearings.length > 0) {
        console.log('Sample Hearing:', hearings[0]);
    }

    // 2. Check for cases and their lead_ids
    const { data: cases, error: caseErr } = await supabase
        .from('court_cases')
        .select('*')
        .order('last_synced_at', { ascending: false })
        .limit(5);

    console.log('Recent synced cases:', cases?.length || 0);
    cases?.forEach(c => {
        console.log(`- Case: ${c.case_number}, Lead ID: ${c.lead_id}, Synced: ${c.last_synced_at}`);
    });

    // 3. Check profiles
    const { data: profiles } = await supabase.from('profiles').select('full_name, role').in('role', ['lawyer', 'associate']);
    console.log('Advocates in system:', profiles?.map(p => `${p.full_name} (${p.role})`));
}

debugData();
