
import { syncAdvocateCases } from '../scraper/high_court_bot';

console.log('--- Triggering Manual Sync ---');
syncAdvocateCases().then(() => {
    console.log('Sync complete.');
    process.exit(0);
}).catch(err => {
    console.error('Sync failed:', err);
    process.exit(1);
});
