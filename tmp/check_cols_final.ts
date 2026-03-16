
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase.from('court_cases').select('*').limit(1);
    if (error) console.error(error);
    const cols = Object.keys(data?.[0] || {});
    console.log('Current Court Cases Columns:', cols);

    const hasPetitioner = cols.includes('petitioner');
    const hasRespondent = cols.includes('respondent');
    console.log(`Has petitioner: ${hasPetitioner}, Has respondent: ${hasRespondent}`);
}

checkColumns();
