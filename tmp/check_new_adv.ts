
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNewAdvocate() {
    console.log('--- Checking for New Advocate & Leads ---');

    // 1. Get profiles
    const { data: profiles } = await supabase.from('profiles').select('*').in('role', ['lawyer', 'associate']);
    console.log('Advocates found:');
    profiles?.forEach(p => console.log(`- ${p.full_name} (${p.role})`));

    // 2. Get leads
    const { data: leads } = await supabase
        .from('leads')
        .select(`
            client_name,
            assigned_to,
            associate_id
        `)
        .eq('status', 'Confirmed')
        .eq('admin_approved', true);

    console.log(`\nActive Leads: ${leads?.length || 0}`);
    leads?.forEach(l => {
        const lawyer = profiles?.find((p: any) => p.id === l.assigned_to)?.full_name || 'None';
        const associate = profiles?.find((p: any) => p.id === l.associate_id)?.full_name || 'None';
        console.log(`- Client: ${l.client_name} (Lawyer: ${lawyer}, Associate: ${associate})`);
    });
}

checkNewAdvocate();
