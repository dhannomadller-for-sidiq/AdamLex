
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    console.log('Inspecting court_cases columns...');
    const { data, error } = await supabase
        .from('court_cases')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error);
    } else {
        if (data && data.length > 0) {
            console.log('✅ Columns found:', Object.keys(data[0]));
        } else {
            console.log('✅ Table is empty, but query worked.');
            // Try to force an error to see columns
            const { error: err2 } = await supabase.from('court_cases').select('non_existent_column');
            console.log('Diagnostic error:', err2?.message);
        }
    }
}

testQuery();
