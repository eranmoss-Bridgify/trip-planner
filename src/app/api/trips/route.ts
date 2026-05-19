import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

async function requireUser(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return getSessionUser(token);
}

// GET — list user's saved trips
export async function GET(req: NextRequest) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows: trips } = await db.query(
        `SELECT id, local_id, name, destination, vibes, passengers, start_date, end_date, created_at, updated_at
         FROM trip_planner.trips WHERE user_id = $1 ORDER BY updated_at DESC`,
        [user.id]
    );
    return NextResponse.json({ trips });
}

// POST — save/migrate trips from localStorage (upsert by local_id)
export async function POST(req: NextRequest) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { trips } = await req.json() as { trips: any[] };
    if (!Array.isArray(trips) || !trips.length) {
        return NextResponse.json({ error: 'No trips provided' }, { status: 400 });
    }

    const saved: string[] = [];

    for (const trip of trips) {
        // Upsert trip
        const { rows: [t] } = await db.query(
            `INSERT INTO trip_planner.trips (user_id, local_id, name, destination, vibes, passengers, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [
                user.id,
                trip.id,
                trip.name ?? 'My Trip',
                trip.destination ?? trip.legs?.[0]?.location ?? null,
                trip.vibes ?? [],
                JSON.stringify(trip.passengers ?? {}),
                trip.legs?.[0]?.startDate?.slice(0, 10) ?? null,
                trip.legs?.[trip.legs.length - 1]?.endDate?.slice(0, 10) ?? null,
            ]
        );

        // If already exists, find its DB id
        const tripDbId = t?.id ?? (await db.query(
            'SELECT id FROM trip_planner.trips WHERE user_id = $1 AND local_id = $2',
            [user.id, trip.id]
        )).rows[0]?.id;

        if (!tripDbId) continue;
        saved.push(tripDbId);

        // Save legs
        for (let li = 0; li < (trip.legs ?? []).length; li++) {
            const leg = trip.legs[li];
            const { rows: [l] } = await db.query(
                `INSERT INTO trip_planner.trip_legs (trip_id, local_id, title, location, start_date, end_date, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT DO NOTHING
                 RETURNING id`,
                [tripDbId, leg.id, leg.title, leg.location, leg.startDate?.slice(0, 10), leg.endDate?.slice(0, 10), li]
            );

            const legDbId = l?.id ?? (await db.query(
                'SELECT id FROM trip_planner.trip_legs WHERE trip_id = $1 AND local_id = $2',
                [tripDbId, leg.id]
            )).rows[0]?.id;

            if (!legDbId) continue;

            // Save activities across all days
            let actOrder = 0;
            for (const day of (leg.days ?? [])) {
                for (const act of (day.activities ?? [])) {
                    await db.query(
                        `INSERT INTO trip_planner.activities
                         (leg_id, day_date, external_id, name, category, image_url, price, currency,
                          duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data, sort_order)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
                         ON CONFLICT DO NOTHING`,
                        [
                            legDbId,
                            day.date?.slice(0, 10),
                            act.availabilityUuid ?? act.id,
                            act.name,
                            act.category ?? null,
                            act.image ?? null,
                            act.price ?? 0,
                            act.currency ?? 'USD',
                            act.duration ?? null,
                            act.location ?? null,
                            act.rating ?? null,
                            act.bookingStatus ?? 'none',
                            act.bookingRef ?? null,
                            act.isBestSeller ?? false,
                            JSON.stringify(act),
                            actOrder++,
                        ]
                    );
                }
            }
        }
    }

    return NextResponse.json({ saved });
}
