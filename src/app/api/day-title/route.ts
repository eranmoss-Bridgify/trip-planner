import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
    const { activities, destination, dayIndex } = await request.json();

    if (!activities?.length) {
        return NextResponse.json({ title: null });
    }

    const activityList = activities
        .map((a: { name: string; category?: string }) => a.name)
        .join(', ');

    const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 60,
        messages: [{
            role: 'user',
            content: `Generate a short, funny, punny title for Day ${dayIndex + 1} of a trip to ${destination}.
Planned activities: ${activityList}

Rules:
- Max 6 words
- Witty and playful — use wordplay, alliteration, or travel puns based on the actual activities
- No quotes, no "Day X:" prefix, just the raw title
- Examples of the tone: "Churros, Chaos & Cathedral Vibes", "Sangria O'Clock: Tour Edition", "Feet Don't Fail Me Now"

Reply with ONLY the title, nothing else.`
        }]
    });

    const title = (message.content[0] as Anthropic.TextBlock).text.trim();
    return NextResponse.json({ title });
}
