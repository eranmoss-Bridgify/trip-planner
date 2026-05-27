import { NextResponse } from 'next/server';
import { bridgifyFetch } from '../token';

// In-memory cache — categories are stable, refresh every 24h
let cache: { data: any; fetchedAt: number } | null = null;
const TTL = 24 * 60 * 60 * 1000;

export async function GET() {
    if (cache && Date.now() - cache.fetchedAt < TTL) {
        return NextResponse.json(cache.data);
    }
    try {
        const res = await bridgifyFetch('/attractions/categories/');
        if (!res.ok) return NextResponse.json({ error: `Bridgify ${res.status}` }, { status: res.status });
        const data = await res.json();
        cache = { data, fetchedAt: Date.now() };
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
}
