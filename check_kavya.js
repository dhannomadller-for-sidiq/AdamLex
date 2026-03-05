require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking profiles...");
    const { data: profiles, error: err1 } = await supabase.from('profiles').select('*');
    if (err1) console.error(err1);
    else console.table(profiles);

    console.log("\nChecking Auth users...");
    const { data: auth, error: err2 } = await supabase.auth.admin.listUsers();
    if (err2) console.error(err2);
    else {
        auth.users.forEach(u => console.log(`${u.id} - ${u.email}`));
    }
}
check();
