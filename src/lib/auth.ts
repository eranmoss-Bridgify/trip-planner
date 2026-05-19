import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { db } from './db';

const SESSION_COOKIE = 'wv_session';
const SESSION_DAYS = 7;

function jwtSecret() {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET not set');
    return new TextEncoder().encode(s);
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveOtp(userId: string, otp: string) {
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await db.query(
        `INSERT INTO trip_planner.otp_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [userId, otp, expires]
    );
}

export async function verifyOtp(userId: string, otp: string): Promise<boolean> {
    const { rows } = await db.query(
        `SELECT id FROM trip_planner.otp_tokens
         WHERE user_id = $1 AND token = $2 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, otp]
    );
    if (!rows.length) return false;
    await db.query(`UPDATE trip_planner.otp_tokens SET used = true WHERE id = $1`, [rows[0].id]);
    return true;
}

export async function createSession(userId: string): Promise<string> {
    const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
    const token = await new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(jwtSecret());
    await db.query(
        `INSERT INTO trip_planner.sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [userId, token, expires]
    );
    return token;
}

export async function getSessionUser(token: string) {
    try {
        const { payload } = await jwtVerify(token, jwtSecret());
        const userId = payload.sub as string;
        const { rows } = await db.query(
            `SELECT id, email, name FROM trip_planner.users WHERE id = $1`,
            [userId]
        );
        return rows[0] ?? null;
    } catch {
        return null;
    }
}

export async function deleteSession(token: string) {
    await db.query(`DELETE FROM trip_planner.sessions WHERE token = $1`, [token]);
}

export async function getSessionFromCookies() {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return getSessionUser(token);
}

export function sessionCookieOptions(token: string) {
    return {
        name: SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: SESSION_DAYS * 86400,
        path: '/',
    };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
