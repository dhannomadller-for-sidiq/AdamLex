
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLinkages() {
    console.log('Checking for leads vs court_cases...');

    const { data: cases, error } = await supabase.from('court_cases').select('id, lead_id, case_number, petitioner, respondent');

    if (error) {
        console.error('Error fetching cases:', error);
        return;
    }

    const linked = cases.filter(c => c.lead_id).length;
    const unlinked = cases.filter(c => !c.lead_id).length;

    console.log(`Total Cases: ${cases.length}`);
    console.log(`Linked to Lead: ${linked}`);
    console.log(`Unlinked: ${unlinked}`);

    if (unlinked > 0) {
        console.log('Sample Unlinked Case:', cases.find(c => !c.lead_id));
    }
}

checkLinkages();
