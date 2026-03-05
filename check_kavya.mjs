import fs from 'fs';

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        env[key.trim()] = values.join('=').trim();
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
    console.log("Checking profiles...");
    const res = await fetch(`${url}/rest/v1/profiles?select=*`, {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    });
    const profiles = await res.json();
    console.table(profiles);

    console.log("\nChecking Auth users...");
    // The admin auth endpoint is not standard REST, but let's just see profiles first.
}
check();
