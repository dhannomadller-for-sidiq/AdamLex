
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fuzzySearch() {
    console.log('--- Fuzzy Search ---');
    const { data } = await supabase.from('leads').select('client_name');

    const targets = ['ANEESABI', 'THOMAS'];

    data?.forEach(l => {
        targets.forEach(t => {
            if (l.client_name.toLowerCase().includes(t.toLowerCase().substring(0, 4))) {
                console.log(`Potential Match: '${l.client_name}' for '${t}'`);
            }
        });
    });
}

fuzzySearch();
