import { NextRequest, NextResponse } from 'next/server';
import { bridgifyFetch } from '../../token';

// Catch-all proxy for all Bridgify cart endpoints.
// Maps /api/bridgify/cart/[...path] → /attractions/booking/cart/[...path]
//
// Supported paths:
//   POST  /api/bridgify/cart/                                    → create cart
//   POST  /api/bridgify/cart/items/                              → add item to cart
//   GET   /api/bridgify/cart/items/{itemUuid}/required-fields/   → step order
//   GET   /api/bridgify/cart/items/{itemUuid}/dates/             → available dates
//   PATCH /api/bridgify/cart/items/{itemUuid}/dates/             → select date
//   GET   /api/bridgify/cart/items/{itemUuid}/options/           → ticket tiers
//   PATCH /api/bridgify/cart/items/{itemUuid}/options/           → select option
//   GET   /api/bridgify/cart/items/{itemUuid}/timeslots/         → available times
//   GET   /api/bridgify/cart/items/{itemUuid}/tickets/           → ticket types
//   GET   /api/bridgify/cart/items/{itemUuid}/languages/         → audio guides
//   PATCH /api/bridgify/cart/{cartUuid}/customer-info/           → customer details

async function proxyRequest(req: NextRequest, paramsPromise: Promise<{ path?: string[] }>) {
    const { path } = await paramsPromise;
    const pathSegments = (path ?? []).filter(Boolean);
    // Always append trailing slash — Bridgify requires it
    const fullPath = `/attractions/booking/cart/${pathSegments.length > 0 ? pathSegments.join('/') + '/' : ''}`;

    const method = req.method;
    let body: string | undefined;
    if (method === 'POST' || method === 'PATCH') {
        body = await req.text();
    }

    console.log(`[cart-proxy] ${method} ${fullPath}`, body ? body.slice(0, 200) : '');

    try {
        const res = await bridgifyFetch(fullPath, {
            method,
            ...(body ? {
                body,
                headers: { 'Content-Type': 'application/json' },
            } : {}),
        });

        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        console.log(`[cart-proxy] → ${res.status}`, JSON.stringify(data).slice(0, 200));
        return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 502 });
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(req, params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(req, params);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    return proxyRequest(req, params);
}
