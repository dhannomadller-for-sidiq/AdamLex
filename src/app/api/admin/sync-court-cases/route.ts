import { NextResponse } from 'next/server';
import { syncAdvocateCases } from '@/../scraper/high_court_bot';

export const maxDuration = 60; // Set timeout to 60 seconds for scraping

export async function POST() {
    try {
        console.log('--- Manual Sync Triggered via API ---');
        const summary = await syncAdvocateCases();
        return NextResponse.json({
            success: true,
            message: `Sync completed: Found ${summary.cases} cases and ${summary.hearings} match your leads.`
        });
    } catch (error: any) {
        console.error('API Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
