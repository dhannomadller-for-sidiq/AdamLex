
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log('--- Checking Active Lead Assignments ---');

    const { data: leads, error } = await supabase
        .from('leads')
        .select(`
            id, 
            client_name, 
            status, 
            admin_approved, 
            assigned_to:profiles!leads_assigned_to_fkey(full_name), 
            associate_id:profiles!leads_associate_id_fkey(full_name)
        `);

    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }

    const filtered = leads?.filter((l: any) => l.status === 'Confirmed' && l.admin_approved);

    console.log(`Leads in DB: ${leads?.length || 0}`);
    console.log(`Confirmed & Approved: ${filtered?.length || 0}`);

    filtered?.forEach((l: any) => {
        console.log(`- Lead: '${l.client_name}'`);
        console.log(`  Assigned To: ${l.assigned_to?.full_name || 'None'}`);
        console.log(`  Associate: ${l.associate_id?.full_name || 'None'}`);
    });

    const aneesabi = leads?.find((l: any) => l.client_name.toUpperCase().includes('ANEESABI'));
    if (aneesabi) {
        console.log('\n✅ FOUND ANEESABI:');
        console.log(JSON.stringify(aneesabi, null, 2));
    } else {
        console.log('\n❌ ANEESABI NOT FOUND IN LEADS');
    }
}

checkLeads();
