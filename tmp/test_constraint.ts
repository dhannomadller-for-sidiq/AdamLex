
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIndex() {
    // We can check indexes by trying to insert a duplicate or querying pg_indexes if we had better access
    // But let's try a dry run upsert and log the error
    const { error } = await supabase.from('court_cases').upsert({
        case_number: 'TEST-123'
    }, { onConflict: 'case_number' });

    if (error) {
        console.error('❌ Upsert Error (likely missing index):', error);
    } else {
        console.log('✅ Upsert test passed (index exists).');
        // cleanup
        await supabase.from('court_cases').delete().eq('case_number', 'TEST-123');
    }
}

checkIndex();
