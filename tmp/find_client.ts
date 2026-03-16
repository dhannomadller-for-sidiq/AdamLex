
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchClient() {
    console.log('--- Searching for Lead: ANEESABI ---');
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .ilike('client_name', '%ANEESABI%');

    if (error) console.error(error);
    console.log(`Found: ${data?.length || 0}`);
    data?.forEach(l => console.log(`- ${l.client_name} (Status: ${l.status}, Approved: ${l.admin_approved})`));
}

searchClient();
