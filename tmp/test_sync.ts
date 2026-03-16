
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSync() {
    console.log('--- Database Sync Check ---');

    // 1. Check cases
    const { data: cases, error: caseErr } = await supabase.from('court_cases').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('Recent Court Cases:', cases?.length || 0);
    if (cases && cases.length > 0) {
        console.log('Sample Case:', {
            id: cases[0].id,
            case_number: cases[0].case_number,
            cnr_number: cases[0].cnr_number, // checking old col
            last_synced_at: cases[0].last_synced_at
        });
    }

    // 2. Check hearings
    const { data: hearings, error: hearErr } = await supabase.from('court_hearings').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('Recent Court Hearings:', hearings?.length || 0);
    if (hearings && hearings.length > 0) {
        console.log('Sample Hearing:', hearings[0]);
    }
}

checkSync();
