
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
    console.log('--- Checking for ANEESABI ---');

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

    const aneesabi = leads?.filter((l: any) => l.client_name.toUpperCase().includes('ANEESABI'));

    if (aneesabi && aneesabi.length > 0) {
        console.log(`Found ${aneesabi.length} ANEESABI leads:`);
        aneesabi.forEach(l => {
            console.log(JSON.stringify(l, null, 2));
        });
    } else {
        console.log('❌ ANEESABI STILL NOT FOUND');
    }
}

checkLeads();
