import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Configuration
const CONFIG = {
    searchUrl: 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

async function syncAdvocateCases() {
    console.log('🚀 Starting High Court Advocate Case Sync (HTTP Mode)...');

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
        console.error('❌ Supabase credentials missing.');
        return;
    }

    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

    try {
        // 1. Fetch advocate names from profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .in('role', ['lawyer', 'associate']);

        if (profileError) throw profileError;

        const advocateNames = [...new Set(profiles?.map(p => p.full_name).filter(Boolean))];
        console.log(`🔍 Found ${advocateNames.length} unique advocates to sync.`);

        // Target tomorrow's date (e.g., on the 15th, sync for the 16th)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        console.log(`📅 Syncing for target date: ${dateStr}`);

        for (const name of advocateNames) {
            console.log(`🔎 Searching for: ${name}`);
            await scrapeForAdvocate(name, dateStr, supabase);
        }

    } catch (error) {
        console.error('❌ Sync error:', error);
    } finally {
        console.log('🏁 Sync finished.');
    }
}

async function scrapeForAdvocate(name: string, date: string, supabase: any) {
    try {
        // Advocate name must be Base64 encoded for this specific API
        // Raw -> URL Encoded -> Base64
        const encodedName = Buffer.from(encodeURIComponent(name)).toString('base64');

        const payload = new URLSearchParams();
        payload.append('advocate_name', encodedName);
        payload.append('from_date', date);
        payload.append('adv_cd', '');

        const response = await axios.post(CONFIG.searchUrl, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://hckinfo.keralacourts.in/digicourt/Casedetailssearch/Advocatesearch',
                'Origin': 'https://hckinfo.keralacourts.in',
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const cases: any[] = [];

        $('table.table tbody tr').each((_, row) => {
            const cells = $(row).find('td');
            const caseNumber = cells.eq(4).text().trim();
            if (caseNumber) {
                cases.push({
                    itemNo: cells.eq(0).text().trim(),
                    courtHall: cells.eq(1).text().trim(),
                    bench: cells.eq(2).text().trim(),
                    listType: cells.eq(3).text().trim(),
                    caseNumber: caseNumber,
                    parties: cells.eq(5).text().trim(),
                });
            }
        });

        console.log(`✅ Found ${cases.length} cases for ${name}.`);

        // Sync to Supabase
        for (const c of cases) {
            const { error: syncError } = await supabase
                .from('court_cases')
                .upsert({
                    case_number: c.caseNumber,
                    petitioner: c.parties.split('Vs')[0]?.trim(),
                    respondent: c.parties.split('Vs')[1]?.trim(),
                    bench: c.bench,
                    court_hall: c.courtHall,
                    last_synced_at: new Date().toISOString(),
                }, { onConflict: 'case_number' });

            if (syncError) console.error(`❌ Error syncing case ${c.caseNumber}:`, syncError);
        }

    } catch (error) {
        console.error(`❌ Error scraping for ${name}:`, error);
    }
}

export { syncAdvocateCases };
