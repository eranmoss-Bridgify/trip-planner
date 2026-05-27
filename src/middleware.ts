import { NextRequest, NextResponse } from 'next/server';

const DJANGO_API_URL = process.env.DJANGO_API_URL;

export function middleware(request: NextRequest) {
    console.log('[middleware] hit', request.nextUrl.pathname);

    if (!DJANGO_API_URL) return NextResponse.next();
    if (request.nextUrl.pathname.startsWith('/api/proxy/')) return NextResponse.next();

    const proxied = request.nextUrl.clone();
    proxied.pathname = '/api/proxy' + request.nextUrl.pathname.slice(4);
    console.log('[middleware] rewriting to', proxied.pathname);
    return NextResponse.rewrite(proxied);
}

export const config = {
    matcher: '/api/:path*',
};
