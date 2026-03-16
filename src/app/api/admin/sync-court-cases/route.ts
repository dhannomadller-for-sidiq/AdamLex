
import { NextResponse } from 'next/server';
import { syncAdvocateCases } from '@/../scraper/high_court_bot';

export async function POST() {
    try {
        console.log('--- Manual Sync Triggered via API ---');
        await syncAdvocateCases();
        return NextResponse.json({ success: true, message: 'Sync completed successfully' });
    } catch (error: any) {
        console.error('API Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
