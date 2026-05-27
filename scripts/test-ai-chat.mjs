/**
 * Test the AI chat endpoint directly
 * Run: node scripts/test-ai-chat.mjs
 */

const res = await fetch('http://localhost:3001/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        messages: [{ role: 'user', content: 'Find me some walking tours' }],
        trip: {
            id: 'trip-1',
            name: 'Barcelona Trip',
            destination: 'Barcelona',
            startDate: '2026-06-15',
            endDate: '2026-06-20',
            vibes: ['culture', 'food'],
            legs: [{
                id: 'leg-1',
                title: 'Barcelona',
                location: 'Barcelona',
                startDate: '2026-06-15',
                endDate: '2026-06-20',
                days: [
                    { date: '2026-06-15', activities: [] },
                    { date: '2026-06-16', activities: [] },
                    { date: '2026-06-17', activities: [] },
                ],
            }],
        },
    }),
});

const data = await res.json();
console.log('\n── TEXT ──');
console.log(data.text);
console.log('\n── PROPOSALS ──');
console.log(`Count: ${data.proposals?.length ?? 0}`);
if (data.proposals?.length) {
    data.proposals.forEach((p, i) => {
        console.log(`\n[${i+1}] type:${p.type} legId:${p.legId} dayDate:${p.dayDate}`);
        console.log(`  activity: ${JSON.stringify(p.activity)?.slice(0, 150)}`);
        console.log(`  reason: ${p.reason?.slice(0, 100)}`);
    });
} else {
    console.log('⚠️  proposals is empty — Claude did not call propose_add_activity');
}

if (data.error) console.log('\nERROR:', data.error);
