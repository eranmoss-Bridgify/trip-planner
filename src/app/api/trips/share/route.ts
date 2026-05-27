import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';
import crypto from 'crypto';

// POST /api/trips/share — generate (or return existing) share token for a trip
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await getSessionUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { tripId } = await req.json() as { tripId: string };
        if (!tripId) return NextResponse.json({ error: 'tripId required' }, { status: 400 });

        // Verify ownership — match by DB id or local_id
        const { rows } = await db.query(
            'SELECT id, share_token FROM trip_planner.trips WHERE (id::text = $1 OR local_id = $1) AND user_id = $2',
            [tripId, user.id]
        );
        if (!rows.length) return NextResponse.json({ error: 'Trip not saved yet' }, { status: 404 });

        const dbId = rows[0].id;
        let shareToken = rows[0].share_token;
        if (!shareToken) {
            shareToken = crypto.randomBytes(20).toString('hex');
            await db.query(
                'UPDATE trip_planner.trips SET share_token = $1 WHERE id = $2',
                [shareToken, dbId]
            );
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
        return NextResponse.json({ shareUrl: `${baseUrl}/trip/share/${shareToken}` });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
    }
}
