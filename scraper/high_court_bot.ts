import { chromium, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Configuration
const CONFIG = {
    searchUrl: 'https://hckinfo.keralacourts.in/digicourt/Casedetailssearch/Advocatesearch',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

async function syncAdvocateCases() {
    console.log('🚀 Starting High Court Advocate Case Sync...');

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
        console.error('❌ Supabase credentials missing.');
        return;
    }

    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 1. Fetch advocate names from profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .in('role', ['lawyer', 'associate']);

        if (profileError) throw profileError;

        const advocateNames = [...new Set(profiles?.map(p => p.full_name).filter(Boolean))];
        console.log(`🔍 Found ${advocateNames.length} unique advocates to sync.`);

        // Today's date in dd/mm/yyyy format
        const today = new Date();
        const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        console.log(`📅 Syncing for date: ${dateStr}`);

        for (const name of advocateNames) {
            console.log(`🔎 Searching for: ${name}`);
            await scrapeForAdvocate(page, name, dateStr, supabase);
        }

    } catch (error) {
        console.error('❌ Sync error:', error);
    } finally {
        await browser.close();
        console.log('🏁 Sync finished.');
    }
}

async function scrapeForAdvocate(page: Page, name: string, date: string, supabase: any) {
    try {
        await page.goto(CONFIG.searchUrl, { waitUntil: 'networkidle' });

        // Enter Date
        await page.click('input[placeholder*="Date"]'); // Adjust based on exact selector
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.keyboard.type(date);

        // Enter Name and select from autocomplete if necessary
        await page.fill('input[placeholder*="Advocate"]', name);
        await page.waitForTimeout(1000); // Wait for autocomplete

        // Try to click the exact match in autocomplete if it appears
        const suggestion = page.locator(`.autocomplete-suggestions:has-text("${name}")`);
        if (await suggestion.isVisible()) {
            await suggestion.click();
        }

        await page.click('button:has-text("Search")');
        await page.waitForLoadState('networkidle');

        // Extract Data
        const cases = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table.table tbody tr'));
            return rows.map(row => {
                const cells = row.querySelectorAll('td');
                return {
                    itemNo: cells[0]?.innerText.trim(),
                    courtHall: cells[1]?.innerText.trim(),
                    bench: cells[2]?.innerText.trim(),
                    listType: cells[3]?.innerText.trim(),
                    caseNumber: cells[4]?.innerText.trim(),
                    parties: cells[5]?.innerText.trim(),
                };
            }).filter(c => c.caseNumber);
        });

        console.log(`✅ Found ${cases.length} cases for ${name}.`);

        // Sync to Supabase
        for (const c of cases) {
            const { error: syncError } = await supabase
                .from('court_cases')
                .upsert({
                    case_number: c.caseNumber,
                    parties: c.parties,
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
