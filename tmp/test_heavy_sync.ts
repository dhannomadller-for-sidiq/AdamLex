
import axios from 'axios';
import * as cheerio from 'cheerio';

const searchUrl = 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1';

async function testHeavySync(name: string) {
    console.log(`🔎 Testing Sync for: ${name}`);

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const encodedName = Buffer.from(encodeURIComponent(name)).toString('base64');
    const payload = new URLSearchParams();
    payload.append('advocate_name', encodedName);
    payload.append('from_date', dateStr);
    payload.append('adv_cd', '');

    try {
        const start = Date.now();
        const response = await axios.post(searchUrl, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://hckinfo.keralacourts.in/digicourt/Casedetailssearch/Advocatesearch',
                'Origin': 'https://hckinfo.keralacourts.in',
            }
        });
        const duration = Date.now() - start;

        const html = response.data;
        const $ = cheerio.load(html);
        const count = $('table.table tbody tr').length;

        console.log(`✅ Results for ${name}: ${count} rows (Took ${duration}ms)`);
    } catch (e: any) {
        console.error(`❌ Sync for ${name} failed:`, e.message);
    }
}

async function run() {
    await testHeavySync('fais');
    await testHeavySync('SIDDIQUE C.(K/00000147/2023)');
}

run();
