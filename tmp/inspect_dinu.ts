
import axios from 'axios';
import * as cheerio from 'cheerio';

const searchUrl = 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1';

async function inspectDinu() {
    console.log(`🔎 Inspecting DINU for tomorrow...`);

    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const encodedName = Buffer.from(encodeURIComponent('DINU')).toString('base64');
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

        console.log('Results:');
        $('table.table tbody tr').each((i, row) => {
            const cells = $(row).find('td');
            console.log(`- Row ${i + 1}: ${cells.eq(5).text().trim()} (${cells.eq(4).text().trim()})`);
        });

    } catch (e: any) {
        console.error(`❌ Sync for DINU failed:`, e.message);
    }
}

inspectDinu();
