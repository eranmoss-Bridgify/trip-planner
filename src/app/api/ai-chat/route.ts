import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { bridgifyFetch } from '../bridgify/token';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Maps user intent keywords → Bridgify category search terms.
// Bridgify search is keyword-based (title/description match), so these
// category strings are the exact vocabulary that appears in product content.
const INTENT_MAP: { pattern: RegExp; terms: string[] }[] = [
    { pattern: /nightlife|bar|club|drinks|party|night out/i,        terms: ['Nightlife', 'Music'] },
    { pattern: /outdoor|nature|hike|hiking|trek/i,                  terms: ['Outdoor Activities', 'Nature', 'Walking & Biking'] },
    { pattern: /walk|walking|bike|biking|cycling/i,                 terms: ['Walking & Biking', 'Guided Tours'] },
    { pattern: /food|eat|restaurant|dinner|lunch|cuisine/i,         terms: ['Culinary Experiences', 'Street Food'] },
    { pattern: /cook|cooking|class|workshop|lesson/i,               terms: ['Classes & Workshops', 'Culinary Experiences'] },
    { pattern: /history|historic|ancient|heritage/i,                terms: ['Historic Sites', 'Culture', 'Museums'] },
    { pattern: /museum|gallery|exhibit/i,                           terms: ['Museums', 'Art'] },
    { pattern: /culture|cultural/i,                                 terms: ['Culture', 'Historic Sites', 'Art'] },
    { pattern: /art|artwork/i,                                      terms: ['Art', 'Architecture'] },
    { pattern: /architect|building|design/i,                        terms: ['Architecture', 'Art'] },
    { pattern: /show|concert|perform|live music|theatre|theater/i,  terms: ['Shows & Performances', 'Music', 'Festivals'] },
    { pattern: /music|festival/i,                                   terms: ['Music', 'Shows & Performances', 'Festivals'] },
    { pattern: /family|kids|children|child/i,                       terms: ['Family Friendly', 'Amusements'] },
    { pattern: /beach|sea|ocean|swim|snorkel/i,                     terms: ['Beach', 'Watersports'] },
    { pattern: /water|surf|dive|kayak|boat/i,                       terms: ['Watersports', 'Outdoor Activities'] },
    { pattern: /wellness|spa|relax|yoga|meditation/i,               terms: ['Wellness & Wellbeing'] },
    { pattern: /local|authentic|hidden gem|off the beaten/i,        terms: ['Hidden Gems', 'Local Markets', 'Street Food'] },
    { pattern: /market|shopping|souvenir|shop/i,                    terms: ['Local Markets', 'Shopping'] },
    { pattern: /tour|guide|sightseeing|sight|visit/i,              terms: ['Guided Tours', 'Must See', 'Popular'] },
    { pattern: /must.?see|popular|top|best|highlight/i,             terms: ['Must See', 'Popular', 'Guided Tours'] },
    { pattern: /sport|game|match|stadium/i,                         terms: ['Sporting Events', 'Outdoor Activities'] },
    { pattern: /religion|church|mosque|temple|cathedral/i,          terms: ['Religion', 'Historic Sites'] },
    { pattern: /park|garden|green/i,                                terms: ['Urban Parks', 'Nature'] },
    { pattern: /lgbt|gay|pride/i,                                   terms: ['LGBT'] },
];

function classifyIntent(query: string): string[] {
    const terms: string[] = [];
    for (const { pattern, terms: t } of INTENT_MAP) {
        if (pattern.test(query)) terms.push(...t);
        if (terms.length >= 4) break;
    }
    // Deduplicate, keep top 3
    const unique = [...new Set(terms)].slice(0, 3);
    // Fallback when nothing matches
    return unique.length > 0 ? unique : ['Popular', 'Must See', 'Guided Tours'];
}

async function searchBridgify(destination: string, term: string, limit = 6): Promise<any[]> {
    try {
        const normTerm = term.normalize('NFD').replace(/\p{Diacritic}/gu, '');
        const qs = new URLSearchParams({
            city_name: destination,
            text_search: normTerm,
            page: '1',
            page_size: String(Math.min(limit, 10)),
        });
        const res = await bridgifyFetch(`/attractions/products/?${qs}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.attractions ?? []).map((a: any) => ({
            external_id: a.external_id,
            uuid: a.uuid ?? '',
            name: a.title,
            category: a.category ?? term,
            price: typeof a.price === 'number' ? a.price : (a.price?.amount ?? 0),
            currency: typeof a.price === 'object' ? (a.price?.currency ?? 'USD') : 'USD',
            duration: a.duration_minutes ? fmtDuration(a.duration_minutes) : '',
            rating: a.rating ?? 0,
            review_count: a.review_count ?? 0,
            location: a.location ? [a.location.city, a.location.country].filter(Boolean).join(', ') : '',
            image_url: a.main_photo_url ?? '',
            description: (a.description ?? '').slice(0, 150),
            is_best_seller: a.additional_info?.external_exclusive_fields?.best_seller ?? false,
        }));
    } catch {
        return [];
    }
}

const tools: Anthropic.Tool[] = [
    {
        name: 'propose_add_activity',
        description: 'Propose adding a specific activity to a day in the trip. Call this for 2–3 of the best matches from the available activities list.',
        input_schema: {
            type: 'object' as const,
            properties: {
                external_id: { type: 'string', description: 'external_id of the activity from the available list' },
                uuid: { type: 'string', description: 'Bridgify internal uuid of the activity (from the available list)' },
                name: { type: 'string', description: 'Activity name' },
                category: { type: 'string', description: 'Activity category' },
                price: { type: 'number', description: 'Price per person' },
                currency: { type: 'string', description: 'Currency code' },
                duration: { type: 'string', description: 'Duration string e.g. "3 hours"' },
                image_url: { type: 'string', description: 'Main photo URL' },
                rating: { type: 'number', description: 'Rating 0-5' },
                location: { type: 'string', description: 'Location string' },
                description: { type: 'string', description: 'Short description' },
                leg_id: { type: 'string', description: 'Trip leg ID to add to' },
                day_date: { type: 'string', description: 'Date YYYY-MM-DD' },
                reason: { type: 'string', description: 'Why this is a good fit' },
            },
            required: ['external_id', 'name', 'leg_id', 'day_date', 'reason'],
        },
    },
    {
        name: 'propose_remove_activity',
        description: 'Propose removing an activity from the trip that the user wants to drop.',
        input_schema: {
            type: 'object' as const,
            properties: {
                activity_id: { type: 'string', description: 'Activity ID to remove' },
                activity_name: { type: 'string', description: 'Activity name for display' },
                leg_id: { type: 'string', description: 'Leg ID containing the activity' },
                day_date: { type: 'string', description: 'Day date YYYY-MM-DD' },
                day_index: { type: 'number', description: 'Day index within the leg' },
                activity_index: { type: 'number', description: 'Activity index within the day' },
                reason: { type: 'string', description: 'Why removing is recommended' },
            },
            required: ['activity_id', 'activity_name', 'leg_id', 'reason'],
        },
    },
];

interface Proposal {
    type: 'add' | 'remove';
    activity?: {
        id: string;
        uuid?: string;
        name: string;
        category?: string;
        price?: number;
        currency?: string;
        duration?: string;
        image?: string;
        rating?: number;
        location?: string;
        description?: string;
    };
    legId: string;
    dayDate?: string;
    activityId?: string;
    activityName?: string;
    dayIndex?: number;
    activityIndex?: number;
    reason: string;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, trip } = await req.json();
        const lastUserMessage: string = [...messages].reverse().find((m: any) => m.role === 'user')?.content ?? '';
        console.log('[ai-chat] incoming — msgs:', messages?.length, 'trip:', trip?.name, 'query:', lastUserMessage.slice(0, 80));

        const tripContext = trip ? buildTripContext(trip) : 'No trip loaded.';
        const destination = trip?.legs?.[0]?.location || trip?.destination || '';

        // Detect if this is a general question (no activity search needed)
        const isGeneralQuestion = /\b(when|how|what time|weather|transport|tip|advice|recommend|tell me|explain|why|where to stay|currency|language|visa)\b/i.test(lastUserMessage)
            && !/\b(activity|activities|tour|show|museum|experience|attraction|do|visit|find|suggest|add)\b/i.test(lastUserMessage);

        // Pre-fetch Bridgify results in parallel based on classified intent
        let activityContext = '';
        if (!isGeneralQuestion && destination) {
            const categoryTerms = classifyIntent(lastUserMessage);
            console.log('[ai-chat] classified intent:', categoryTerms, 'for:', lastUserMessage.slice(0, 60));

            const results = await Promise.all(
                categoryTerms.map(term => searchBridgify(destination, term, 6))
            );

            // Merge and deduplicate by external_id, best sellers first
            const seen = new Set<string>();
            const activities = results
                .flat()
                .filter(a => { if (seen.has(a.external_id)) return false; seen.add(a.external_id); return true; })
                .sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0))
                .slice(0, 15);

            console.log('[ai-chat] pre-fetched:', activities.length, 'activities from categories:', categoryTerms);

            if (activities.length > 0) {
                activityContext = `\n\n## Available Activities (pre-fetched from Bridgify for: ${categoryTerms.join(', ')})\n` +
                    `Pick the 2–3 best matches and call propose_add_activity for each.\n\n` +
                    activities.map((a, i) =>
                        `${i + 1}. [${a.external_id}] ${a.name} | ${a.category} | ${a.price ? `$${a.price}` : 'free'} | ${a.rating ? `★${a.rating}` : ''} | ${a.duration} | ${a.location}\n   ${a.description}`
                    ).join('\n\n');
            } else {
                activityContext = `\n\n## Available Activities\nNo results found for: ${categoryTerms.join(', ')}. Let the user know nothing matched and suggest alternatives.`;
            }
        }

        const system = `You are a smart, friendly trip planning assistant inside WanderVault, a travel app.

${tripContext}${activityContext}

## Your job
- If available activities are listed above: call propose_add_activity for 2–3 of the best matches, then write 1–2 short sentences. Do NOT describe the activities in text — the cards show all the details.
- If no activities are listed (general question): answer directly in text without tools.

## Rules
1. **propose_add_activity is mandatory** when activities are listed above. The user sees NO cards if you skip it.
2. **Use real dates** — set day_date to an actual date from the trip schedule.
3. **Never say "I've added"** — the user confirms each card manually.
4. **Never list activity names/prices in your text** — that belongs on the cards.`;

        const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content as string,
        }));

        const proposals: Proposal[] = [];
        let turns = 0;

        // If activities were pre-fetched, force Claude to use a tool immediately
        const hasActivities = activityContext.includes('external_id');

        let response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system,
            tools,
            ...(hasActivities ? { tool_choice: { type: 'any' as const } } : {}),
            messages: anthropicMessages,
        });

        while (response.stop_reason === 'tool_use' && turns < 5) {
            turns++;
            const toolUseBlocks = response.content.filter(b => b.type === 'tool_use') as Anthropic.ToolUseBlock[];
            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUseBlocks) {
                let result: string;

                if (toolUse.name === 'propose_add_activity') {
                    const input = toolUse.input as any;
                    proposals.push({
                        type: 'add',
                        activity: {
                            id: input.external_id,
                            uuid: input.uuid,
                            name: input.name,
                            category: input.category,
                            price: input.price,
                            currency: input.currency,
                            duration: input.duration,
                            image: input.image_url,
                            rating: input.rating,
                            location: input.location,
                            description: input.description,
                        },
                        legId: input.leg_id,
                        dayDate: input.day_date,
                        reason: input.reason,
                    });
                    result = JSON.stringify({ status: 'ok', message: `"${input.name}" proposed for ${input.day_date}` });
                } else if (toolUse.name === 'propose_remove_activity') {
                    const input = toolUse.input as any;
                    proposals.push({
                        type: 'remove',
                        activityId: input.activity_id,
                        activityName: input.activity_name,
                        legId: input.leg_id,
                        dayDate: input.day_date,
                        dayIndex: input.day_index,
                        activityIndex: input.activity_index,
                        reason: input.reason,
                    });
                    result = JSON.stringify({ status: 'ok', message: `Removal of "${input.activity_name}" proposed` });
                } else {
                    result = JSON.stringify({ error: 'Unknown tool' });
                }

                toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
            }

            anthropicMessages.push({ role: 'assistant', content: response.content });
            anthropicMessages.push({ role: 'user', content: toolResults });

            response = await client.messages.create({
                model: 'claude-sonnet-4-6',
                max_tokens: 4096,
                system,
                tools,
                messages: anthropicMessages,
            });
        }

        const text = response.content
            .filter(b => b.type === 'text')
            .map(b => (b as Anthropic.TextBlock).text)
            .join('\n');

        console.log('[ai-chat] done — stop_reason:', response.stop_reason, 'turns:', turns, 'proposals:', proposals.length, 'text_len:', text.length);

        return NextResponse.json({ text, proposals });
    } catch (err: any) {
        console.error('[ai-chat] ERROR:', err?.message, err?.status, JSON.stringify(err?.error ?? ''));
        return NextResponse.json({ error: err.message ?? 'AI error' }, { status: 500 });
    }
}

function buildTripContext(trip: any): string {
    const lines = [
        `## Trip: "${trip.name}"`,
        `Destination: ${trip.destination || 'unknown'}`,
        `Dates: ${trip.startDate || trip.start_date || '?'} → ${trip.endDate || trip.end_date || '?'}`,
        `Vibes: ${(trip.vibes ?? []).join(', ') || 'none'}`,
        '',
        '## Schedule:',
    ];
    for (const leg of trip.legs ?? []) {
        lines.push(`\n### ${leg.title || leg.location} | ID: ${leg.id} | ${leg.startDate || '?'} – ${leg.endDate || '?'}`);
        for (const day of leg.days ?? []) {
            const acts = day.activities ?? [];
            lines.push(`  ${day.date}: ${acts.length ? acts.map((a: any) => `${a.name} [id:${a.id}]`).join(', ') : '(empty)'}`);
        }
    }
    return lines.join('\n');
}

function fmtDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}
