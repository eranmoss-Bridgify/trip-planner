import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateOtp, saveOtp } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const { rows } = await db.query(
        'SELECT id, email, name, password_hash FROM trip_planner.users WHERE email = $1',
        [email.toLowerCase()]
    );
    if (!rows.length) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const user = rows[0];
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    const otp = generateOtp();
    await saveOtp(user.id, otp);
    await sendOtpEmail(user.email, otp);

    return NextResponse.json({ userId: user.id, step: 'verify-otp' });
}
