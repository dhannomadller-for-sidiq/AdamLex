import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Configuration
const CONFIG = {
    searchUrl: 'https://hckinfo.keralacourts.in/digicourt/index.php/Casedetailssearch/Casebyadv1',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

async function syncAdvocateCases(targetName?: string) {
    console.log('🚀 Starting High Court Advocate Case Sync (HTTP Mode)...');
    const summary = { advocates: 0, cases: 0, hearings: 0 };

    if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
        console.error('❌ Supabase credentials missing.');
        return summary;
    }

    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);

    try {
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, professional_name')
            .in('role', ['lawyer', 'associate']);

        if (profileError) throw profileError;

        // Build sync targets: prioritize professional_name
        let syncTargets = (profiles || []).map(p => ({
            id: p.id,
            fullName: p.full_name,
            searchTerm: p.professional_name // Managed by Admin
        }));

        if (targetName) {
            // One-off sync for a specific name provided manually
            syncTargets = syncTargets.filter(t => t.fullName === targetName || t.searchTerm === targetName);
            // If targetName wasn't in the DB, we can still allow the one-off sync if we want, 
            // but the current structure expects the profile to exist.
            if (syncTargets.length === 0) {
                // Fallback: search for this name literally if no profile found (matching existing behavior)
                syncTargets = [{ id: '', fullName: targetName, searchTerm: targetName }];
            }
        } else {
            // Bulk sync (Daily/Manual): ONLY sync those with a professional_name set (Opt-in)
            syncTargets = syncTargets.filter(t => t.searchTerm && t.searchTerm.trim() !== '');
        }

        console.log(`🔍 Found ${syncTargets.length} opt-in advocates to sync.`);
        summary.advocates = syncTargets.length;

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 1);
        const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
        console.log(`📅 Syncing for target date: ${dateStr}`);

        // Sync targets sequentially
        for (const target of syncTargets) {
            const nameToSearch = target.searchTerm || target.fullName;
            console.log(`🔎 Searching for: ${nameToSearch} (${target.fullName})`);
            const result = await scrapeForAdvocate(nameToSearch, target.id, dateStr, supabase);
            if (result) {
                summary.cases += result.cases;
                summary.hearings += result.hearings;
            }
        }

    } catch (error) {
        console.error('❌ Sync error:', error);
    } finally {
        console.log('🏁 Sync finished.', summary);
        return summary;
    }
}

async function scrapeForAdvocate(searchTerm: string, profileId: string, date: string, supabase: any) {
    try {
        // 1. Fetch leads associated with this advocate ID
        const { data: leads } = await supabase
            .from('leads')
            .select('id, client_name, assigned_to, associate_id')
            .or(`assigned_to.eq.${profileId},associate_id.eq.${profileId}`)
            .eq('status', 'Confirmed')
            .eq('admin_approved', true);

        console.log(`📋 Found ${leads?.length || 0} active leads for advocate ID ${profileId}.`);

        // Advocate name must be Base64 encoded for this specific API
        const encodedName = Buffer.from(encodeURIComponent(searchTerm)).toString('base64');
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
                const partiesRaw = cells.eq(5).text().trim();
                const pet = partiesRaw.split('Vs')[0]?.trim();
                const resp = partiesRaw.split('Vs')[1]?.trim();

                // Find matching lead
                // Simple strategy: check if client name is in parties
                const matchingLead = leads?.find((l: any) =>
                    pet?.toLowerCase().includes(l.client_name.toLowerCase()) ||
                    resp?.toLowerCase().includes(l.client_name.toLowerCase()) ||
                    l.client_name.toLowerCase().includes(pet?.toLowerCase() || '')
                );

                cases.push({
                    itemNo: cells.eq(0).text().trim(),
                    courtHall: cells.eq(1).text().trim(),
                    bench: cells.eq(2).text().trim(),
                    listType: cells.eq(3).text().trim(),
                    caseNumber: caseNumber,
                    petitioner: pet,
                    respondent: resp,
                    lead_id: matchingLead?.id || null
                });
            }
        });

        console.log(`✅ Scraped ${cases.length} cases using term: ${searchTerm}.`);
        if (cases.length === 0) return { cases: 0, hearings: 0 };

        // 1. Bulk Upsert Cases
        const caseUpserts = cases.map(c => ({
            case_number: c.caseNumber,
            petitioner: c.petitioner,
            respondent: c.respondent,
            bench: c.bench,
            court_hall: c.courtHall,
            item_no: c.itemNo,
            list_type: c.listType,
            lead_id: c.lead_id,
            advocate_id: profileId, // Store which advocate this case belongs to
            last_synced_at: new Date().toISOString(),
        }));

        const { data: savedCases, error: caseError } = await supabase
            .from('court_cases')
            .upsert(caseUpserts, { onConflict: 'case_number' })
            .select('id, case_number');

        if (caseError) {
            console.error('❌ Bulk Case Upsert Error:', caseError);
            return { cases: 0, hearings: 0 };
        }

        // 2. Bulk Upsert Hearings (only for those with lead_id)
        const hearingsToUpsert = [];
        for (const c of cases) {
            if (c.lead_id) {
                const savedCase = savedCases?.find((sc: any) => sc.case_number === c.caseNumber);
                if (savedCase) {
                    hearingsToUpsert.push({
                        lead_id: c.lead_id,
                        court_case_id: savedCase.id,
                        hearing_date: date,
                        next_hearing_date: date,
                        what_happened: `Automated Sync: ${c.listType || 'Court Listing'}`,
                        recorded_by: profileId
                    });
                }
            }
        }

        if (hearingsToUpsert.length > 0) {
            const { error: hearError } = await supabase
                .from('court_hearings')
                .upsert(hearingsToUpsert, { onConflict: 'lead_id,hearing_date' });

            if (hearError) console.error('❌ Bulk Hearing Upsert Error:', hearError);
        }

        return { cases: cases.length, hearings: hearingsToUpsert.length };

    } catch (error) {
        console.error(`❌ Error scraping for ${name}:`, error);
        return { cases: 0, hearings: 0 };
    }
}

export { syncAdvocateCases };
