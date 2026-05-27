import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/trips/share/[token] — public, no auth required
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const { rows: trips } = await db.query(
        `SELECT t.id, t.name, t.destination, t.vibes, t.passengers, t.start_date, t.end_date,
                u.name AS owner_name
         FROM trip_planner.trips t
         JOIN trip_planner.users u ON u.id = t.user_id
         WHERE t.share_token = $1`,
        [token]
    );
    if (!trips.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const trip = trips[0];

    const { rows: legs } = await db.query(
        `SELECT id, title, location, start_date, end_date, sort_order
         FROM trip_planner.trip_legs WHERE trip_id = $1 ORDER BY sort_order`,
        [trip.id]
    );

    const legsWithActivities = await Promise.all(legs.map(async (leg: any) => {
        const { rows: activities } = await db.query(
            `SELECT name, category, image_url, price, currency, duration, location, rating, day_date, is_best_seller
             FROM trip_planner.activities WHERE leg_id = $1 ORDER BY day_date, sort_order`,
            [leg.id]
        );
        return { ...leg, activities };
    }));

    return NextResponse.json({ trip: { ...trip, legs: legsWithActivities } });
}
