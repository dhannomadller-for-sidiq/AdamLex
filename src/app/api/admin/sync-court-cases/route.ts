import { NextResponse } from 'next/server';
import { syncAdvocateCases } from '@/../scraper/high_court_bot';

export const maxDuration = 60; // Set timeout to 60 seconds for scraping

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name') || undefined;
        const dateStr = searchParams.get('date');
        const targetDate = dateStr ? new Date(dateStr) : undefined;

        console.log(`--- Sync Triggered via API [Name: ${name || 'All'}, Date: ${targetDate?.toDateString() || 'Today'}] ---`);

        const summary = await syncAdvocateCases(name, targetDate);
        return NextResponse.json({
            success: true,
            summary,
            message: `Sync completed: Found ${summary.cases} cases and ${summary.hearings} match your leads.`
        });
    } catch (error: any) {
        console.error('API Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
