
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log('--- Checking Profiles & Lead Data ---');

    // 1. Get profiles
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
    if (profErr) console.error('Error profiles:', profErr);
    console.log('--- PROFILES ---');
    profiles?.forEach(p => console.log(`- ${p.full_name} (${p.role})`));

    // 2. Get confirmed leads
    const { data: leads, error: leadErr } = await supabase
        .from('leads')
        .select(`
            id,
            client_name,
            assigned_to,
            associate_id
        `)
        .eq('status', 'Confirmed')
        .eq('admin_approved', true);

    if (leadErr) console.error('Error leads:', leadErr);

    console.log(`--- ACTIVE LEADS (${leads?.length || 0}) ---`);
    leads?.forEach(l => {
        const lawyer = profiles?.find((p: any) => p.id === l.assigned_to)?.full_name || 'None';
        const associate = profiles?.find((p: any) => p.id === l.associate_id)?.full_name || 'None';
        console.log(`- Lead: ${l.client_name} (Lawyer: ${lawyer}, Associate: ${associate})`);
    });

}

checkLeads();
