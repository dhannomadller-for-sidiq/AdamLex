
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const supabaseUrl = 'https://bdqzepasexovnsrpjllr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcXplcGFzZXhvdm5zcnBqbGxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY1NTE1MSwiZXhwIjoyMDg4MjMxMTUxfQ.Q6yxFOT6pJKyICox75Egg1NFrt8DAm_ToSGxguo1bqE';
const supabase = createClient(supabaseUrl, supabaseKey);

const searchUrl = 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1';

async function testSyncForName(name: string) {
    console.log(`🔎 Testing Professional Sync for: ${name}`);

    // Target tomorrow
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const encodedName = Buffer.from(encodeURIComponent(name)).toString('base64');
    const payload = new URLSearchParams();
    payload.append('advocate_name', encodedName);
    payload.append('from_date', dateStr);
    payload.append('adv_cd', '');

    try {
        const response = await axios.post(searchUrl, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://hckinfo.keralacourts.in/digicourt/Casedetailssearch/Advocatesearch',
                'Origin': 'https://hckinfo.keralacourts.in',
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const results: any[] = [];

        $('table.table tbody tr').each((_, row) => {
            const cells = $(row).find('td');
            results.push({
                item: cells.eq(0).text().trim(),
                case: cells.eq(4).text().trim(),
                parties: cells.eq(5).text().trim()
            });
        });

        console.log(`✅ Results found: ${results.length}`);
        results.forEach(r => console.log(`- ${r.case}: ${r.parties}`));

    } catch (e) {
        console.error('Sync failed:', e);
    }
}

testSyncForName('SIDDIQUE C.(K/00000147/2023)');
