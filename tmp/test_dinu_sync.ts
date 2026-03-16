
import axios from 'axios';
import * as cheerio from 'cheerio';

const searchUrl = 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1';

async function testDinuSync() {
    console.log(`🔎 Testing Sync for: DINU`);

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Test both DINU and kavy (since they have cases)
    const names = ['DINU', 'kavya'];

    for (const name of names) {
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
            const count = $('table.table tbody tr').length;

            console.log(`✅ Results for ${name}: ${count} rows`);
        } catch (e: any) {
            console.error(`❌ Sync for ${name} failed:`, e.message);
        }
    }
}

testDinuSync();
