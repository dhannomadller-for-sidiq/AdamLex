
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
    console.log('Inspecting exact schema for court_cases...');
    const { data, error } = await supabase.from('court_cases').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Actual Columns:', Object.keys(data[0] || {}));
    }
}

inspectSchema();
