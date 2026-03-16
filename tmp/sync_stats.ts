
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSyncStats() {
    console.log('--- Sync Stats ---');

    // 1. Check recent cases
    const { data: cases } = await supabase
        .from('court_cases')
        .select('*')
        .order('last_synced_at', { ascending: false })
        .limit(10);

    console.log(`Recent cases in DB: ${cases?.length || 0}`);
    cases?.forEach(c => {
        console.log(`- Case: ${c.case_number}, Lead ID: ${c.lead_id}, Sync Time: ${c.last_synced_at}`);
        console.log(`  Petitioner: ${c.petitioner}, Respondent: ${c.respondent}`);
    });

    // 2. Check assignments for Siddhique
    const { data: siddhique } = await supabase.from('profiles').select('id').ilike('full_name', '%SIDDIQUE%').single();
    if (siddhique) {
        const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).or(`assigned_to.eq.${siddhique.id},associate_id.eq.${siddhique.id}`);
        console.log(`\nLeads assigned to Siddhique: ${count || 0}`);
    }
}

checkSyncStats();
