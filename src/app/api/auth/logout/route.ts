import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) await deleteSession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
}
