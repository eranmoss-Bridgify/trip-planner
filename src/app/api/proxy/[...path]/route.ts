import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL!;

async function proxy(request: NextRequest, params: { path: string[] }) {
    const path = (await params).path ?? [];
    const url = `${DJANGO_API_URL}/api/${path.join('/')}${request.nextUrl.search}`;
    console.log('[proxy] →', request.method, url);

    try {
        const headers = new Headers(request.headers);
        headers.delete('host');

        const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            init.body = request.body;
            (init as any).duplex = 'half';
        }

        const res = await fetch(url, init);
        console.log('[proxy] ←', res.status);
        return new NextResponse(res.body, { status: res.status, headers: res.headers });
    } catch (err: any) {
        console.error('[proxy] ERROR', err?.message);
        return new NextResponse(JSON.stringify({ error: err?.message }), { status: 502 });
    }
}

export const GET    = (req: NextRequest, { params }: any) => proxy(req, params);
export const POST   = (req: NextRequest, { params }: any) => proxy(req, params);
export const PUT    = (req: NextRequest, { params }: any) => proxy(req, params);
export const PATCH  = (req: NextRequest, { params }: any) => proxy(req, params);
export const DELETE = (req: NextRequest, { params }: any) => proxy(req, params);
