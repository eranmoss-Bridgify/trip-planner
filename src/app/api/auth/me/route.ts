import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ user: null });
    const user = await getSessionUser(token);
    return NextResponse.json({ user: user ?? null });
}
