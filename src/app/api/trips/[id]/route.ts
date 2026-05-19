import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

async function requireUser(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return getSessionUser(token);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    await db.query('DELETE FROM trip_planner.trips WHERE id = $1 AND user_id = $2', [id, user.id]);
    return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const { name, destination } = await req.json();
    await db.query(
        'UPDATE trip_planner.trips SET name = $1, destination = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4',
        [name, destination, id, user.id]
    );
    return NextResponse.json({ ok: true });
}
