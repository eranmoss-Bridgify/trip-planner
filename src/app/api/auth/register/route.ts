import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateOtp, saveOtp, sessionCookieOptions, createSession } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const existing = await db.query('SELECT id FROM trip_planner.users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const password_hash = await hashPassword(password);
    const { rows } = await db.query(
        'INSERT INTO trip_planner.users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), name ?? null, password_hash]
    );
    const user = rows[0];

    const otp = generateOtp();
    await saveOtp(user.id, otp);
    await sendOtpEmail(user.email, otp);

    return NextResponse.json({ userId: user.id, step: 'verify-otp' });
}
