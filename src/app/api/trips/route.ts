import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/auth';

async function requireUser(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return getSessionUser(token);
}

function addDays(dateStr: string, n: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d) + n * 86400000;
    const dt = new Date(ms);
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// GET — list user's trips with full leg + activity data for TripContext hydration
export async function GET(req: NextRequest) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows: tripRows } = await db.query(
        `SELECT t.id, t.local_id, t.name, t.destination, t.vibes, t.passengers,
                t.start_date, t.end_date, t.image, tm.role
         FROM trip_planner.trips t
         JOIN trip_planner.trip_members tm ON tm.trip_id = t.id AND tm.user_id = $1
         ORDER BY t.updated_at DESC`,
        [user.id]
    );

    if (!tripRows.length) return NextResponse.json({ trips: [] });

    const tripIds = tripRows.map(r => r.id);

    const { rows: legRows } = await db.query(
        `SELECT id, trip_id, local_id, title, location, start_date, end_date, sort_order
         FROM trip_planner.trip_legs
         WHERE trip_id = ANY($1)
         ORDER BY trip_id, sort_order`,
        [tripIds]
    );

    const legIds = legRows.map(r => r.id);

    const actRows = legIds.length ? (await db.query(
        `SELECT id, leg_id, day_date, external_id, name, category, image_url, price, currency,
                duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data, sort_order
         FROM trip_planner.activities
         WHERE leg_id = ANY($1)
         ORDER BY leg_id, day_date, sort_order`,
        [legIds]
    )).rows : [];

    const trips = tripRows.map(t => {
        const legs = legRows
            .filter(l => l.trip_id === t.id)
            .map(l => {
                const legActs = actRows.filter(a => a.leg_id === l.id);

                // Group activities by day
                const dayMap = new Map<string, any[]>();
                for (const act of legActs) {
                    const date = act.day_date instanceof Date
                        ? act.day_date.toISOString().slice(0, 10)
                        : String(act.day_date).slice(0, 10);
                    if (!dayMap.has(date)) dayMap.set(date, []);
                    // Restore full activity from raw_data, overlay live booking state
                    const raw = act.raw_data ?? {};
                    dayMap.get(date)!.push({
                        ...raw,
                        id: raw.id ?? act.external_id,
                        name: act.name,
                        bookingStatus: act.booking_status ?? 'none',
                        bookingRef: act.booking_ref ?? null,
                    });
                }

                const start = l.start_date instanceof Date
                    ? l.start_date.toISOString().slice(0, 10)
                    : String(l.start_date).slice(0, 10);
                const end = l.end_date instanceof Date
                    ? l.end_date.toISOString().slice(0, 10)
                    : String(l.end_date).slice(0, 10);

                const days = [];
                for (let cur = start; cur <= end; cur = addDays(cur, 1)) {
                    days.push({
                        date: cur,
                        location: l.location,
                        activities: dayMap.get(cur) ?? [],
                    });
                }

                return {
                    id: l.local_id ?? l.id,
                    title: l.title,
                    location: l.location,
                    startDate: start,
                    endDate: end,
                    hotels: [],
                    arrivalTransfer: null,
                    days,
                };
            });

        const startDate = legs[0]?.startDate ?? (t.start_date instanceof Date ? t.start_date.toISOString().slice(0, 10) : String(t.start_date ?? '').slice(0, 10));
        const endDate = legs[legs.length - 1]?.endDate ?? (t.end_date instanceof Date ? t.end_date.toISOString().slice(0, 10) : String(t.end_date ?? '').slice(0, 10));

        return {
            id: t.local_id ?? t.id,
            name: t.name,
            destination: t.destination ?? '',
            vibes: t.vibes ?? [],
            passengers: t.passengers ?? { adults: 1, children: 0 },
            startDate,
            endDate,
            attachedFlights: [],
            unscheduled: [],
            notes: [],
            documents: [],
            collaborators: [],
            image: t.image ?? undefined,
            legs,
        };
    });

    return NextResponse.json({ trips });
}

// POST — full upsert of trip batch from localStorage
export async function POST(req: NextRequest) {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { trips } = await req.json() as { trips: any[] };
    if (!Array.isArray(trips) || !trips.length) {
        return NextResponse.json({ error: 'No trips provided' }, { status: 400 });
    }

    const saved: string[] = [];

    for (const trip of trips) {
        // Full upsert — update all fields on conflict
        const { rows: [t] } = await db.query(
            `INSERT INTO trip_planner.trips (user_id, local_id, name, destination, vibes, passengers, start_date, end_date, image)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (user_id, local_id) DO UPDATE SET
                 name = EXCLUDED.name,
                 destination = EXCLUDED.destination,
                 vibes = EXCLUDED.vibes,
                 passengers = EXCLUDED.passengers,
                 start_date = EXCLUDED.start_date,
                 end_date = EXCLUDED.end_date,
                 image = EXCLUDED.image,
                 updated_at = NOW()
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
                trip.image ?? null,
            ]
        );

        const tripDbId = t?.id;
        if (!tripDbId) continue;
        saved.push(tripDbId);

        // Ensure owner membership
        await db.query(
            `INSERT INTO trip_planner.trip_members (trip_id, user_id, role)
             VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
            [tripDbId, user.id]
        );

        // Replace all legs + activities (cascade delete clears activities)
        await db.query('DELETE FROM trip_planner.trip_legs WHERE trip_id = $1', [tripDbId]);

        for (let li = 0; li < (trip.legs ?? []).length; li++) {
            const leg = trip.legs[li];
            const { rows: [l] } = await db.query(
                `INSERT INTO trip_planner.trip_legs (trip_id, local_id, title, location, start_date, end_date, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 RETURNING id`,
                [tripDbId, leg.id, leg.title, leg.location, leg.startDate?.slice(0, 10), leg.endDate?.slice(0, 10), li]
            );

            const legDbId = l?.id;
            if (!legDbId) continue;

            let actOrder = 0;
            for (const day of (leg.days ?? [])) {
                for (const act of (day.activities ?? [])) {
                    await db.query(
                        `INSERT INTO trip_planner.activities
                         (leg_id, day_date, external_id, name, category, image_url, price, currency,
                          duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data, sort_order)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
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
