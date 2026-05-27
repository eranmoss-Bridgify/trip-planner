import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

// POST /api/trips/join — add logged-in user as editor via share token
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await getSessionUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { shareToken } = await req.json() as { shareToken: string };
        if (!shareToken) return NextResponse.json({ error: 'shareToken required' }, { status: 400 });

        // Find the trip by share token
        const { rows: trips } = await db.query(
            `SELECT t.id, t.local_id, t.name, t.destination, t.vibes, t.start_date, t.end_date
             FROM trip_planner.trips t WHERE t.share_token = $1`,
            [shareToken]
        );
        if (!trips.length) return NextResponse.json({ error: 'Invalid share link' }, { status: 404 });

        const trip = trips[0];

        // Check if already a member
        const { rows: existing } = await db.query(
            'SELECT role FROM trip_planner.trip_members WHERE trip_id = $1 AND user_id = $2',
            [trip.id, user.id]
        );

        if (!existing.length) {
            await db.query(
                `INSERT INTO trip_planner.trip_members (trip_id, user_id, role)
                 VALUES ($1, $2, 'editor')`,
                [trip.id, user.id]
            );
        }

        const role = existing[0]?.role ?? 'editor';

        // Return full trip data so the client can load it
        const { rows: legs } = await db.query(
            `SELECT id, local_id, title, location, start_date, end_date, sort_order
             FROM trip_planner.trip_legs WHERE trip_id = $1 ORDER BY sort_order`,
            [trip.id]
        );

        const legsWithDays = await Promise.all(legs.map(async (leg: any) => {
            const { rows: activities } = await db.query(
                `SELECT name, category, image_url AS image, price, currency, duration,
                        location, rating, day_date, is_best_seller, external_id, booking_status, booking_ref, raw_data
                 FROM trip_planner.activities WHERE leg_id = $1 ORDER BY day_date, sort_order`,
                [leg.id]
            );

            // Group by day
            const byDay: Record<string, any[]> = {};
            for (const a of activities) {
                const d = a.day_date?.toISOString?.()?.slice(0, 10) ?? 'unscheduled';
                (byDay[d] ??= []).push({
                    id: a.external_id ?? crypto.randomUUID(),
                    name: a.name,
                    category: a.category,
                    image: a.image,
                    price: Number(a.price),
                    currency: a.currency,
                    duration: a.duration,
                    location: a.location,
                    rating: Number(a.rating),
                    isBestSeller: a.is_best_seller,
                    bookingStatus: a.booking_status,
                    bookingRef: a.booking_ref,
                });
            }

            return {
                id: leg.local_id ?? leg.id,
                dbId: leg.id,
                title: leg.title,
                location: leg.location,
                startDate: leg.start_date,
                endDate: leg.end_date,
                days: Object.entries(byDay).map(([date, acts]) => ({ date, activities: acts })),
            };
        }));

        return NextResponse.json({
            role,
            trip: {
                id: trip.local_id ?? trip.id,
                dbId: trip.id,
                name: trip.name,
                destination: trip.destination,
                vibes: trip.vibes ?? [],
                legs: legsWithDays,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
    }
}
