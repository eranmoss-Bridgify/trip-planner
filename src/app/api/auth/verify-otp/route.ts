import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyOtp, createSession, sessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const { userId, otp } = await req.json();
    if (!userId || !otp) return NextResponse.json({ error: 'userId and otp required' }, { status: 400 });

    const valid = await verifyOtp(userId, otp);
    if (!valid) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });

    const { rows } = await db.query(
        'SELECT id, email, name FROM trip_planner.users WHERE id = $1',
        [userId]
    );
    const user = rows[0];

    const token = await createSession(userId);
    const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    res.cookies.set(sessionCookieOptions(token));
    return res;
}
