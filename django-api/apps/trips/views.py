import json
import os
import secrets
from datetime import date, timedelta
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from apps.common import db, auth_utils


def _add_days(d: str, n: int) -> str:
    dt = date.fromisoformat(d) + timedelta(days=n)
    return dt.isoformat()


def _to_str(val) -> str:
    if val is None:
        return ''
    if hasattr(val, 'isoformat'):
        return val.isoformat()
    return str(val)[:10]


def _reconstruct_trips(trip_rows, leg_rows, act_rows) -> list:
    trips = []
    for t in trip_rows:
        legs = []
        for l in [r for r in leg_rows if str(r['trip_id']) == str(t['id'])]:
            leg_acts = [a for a in act_rows if str(a['leg_id']) == str(l['id'])]

            # Group activities by day
            day_map: dict[str, list] = {}
            for act in leg_acts:
                d = _to_str(act['day_date'])
                if d not in day_map:
                    day_map[d] = []
                raw = act.get('raw_data') or {}
                if isinstance(raw, str):
                    try:
                        raw = json.loads(raw)
                    except Exception:
                        raw = {}
                day_map[d].append({
                    **raw,
                    'id': raw.get('id') or act.get('external_id'),
                    'name': act['name'],
                    'bookingStatus': act.get('booking_status', 'none'),
                    'bookingRef': act.get('booking_ref'),
                })

            start = _to_str(l['start_date'])
            end = _to_str(l['end_date'])
            days = []
            cur = start
            while cur <= end:
                days.append({'date': cur, 'location': l['location'], 'activities': day_map.get(cur, [])})
                cur = _add_days(cur, 1)

            legs.append({
                'id': l.get('local_id') or str(l['id']),
                'title': l['title'],
                'location': l['location'],
                'startDate': start,
                'endDate': end,
                'hotels': [],
                'arrivalTransfer': None,
                'days': days,
            })

        start_date = legs[0]['startDate'] if legs else _to_str(t.get('start_date'))
        end_date = legs[-1]['endDate'] if legs else _to_str(t.get('end_date'))

        trips.append({
            'id': t.get('local_id') or str(t['id']),
            'name': t['name'],
            'destination': t.get('destination') or '',
            'vibes': t.get('vibes') or [],
            'passengers': t.get('passengers') or {'adults': 1, 'children': 0},
            'startDate': start_date,
            'endDate': end_date,
            'image': t.get('image'),
            'attachedFlights': [],
            'unscheduled': [],
            'notes': [],
            'documents': [],
            'collaborators': [],
            'legs': legs,
        })
    return trips


@method_decorator(csrf_exempt, name='dispatch')
class TripsView(View):
    def get(self, request):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        trip_rows = db.query(
            '''SELECT t.id, t.local_id, t.name, t.destination, t.vibes, t.passengers,
                      t.start_date, t.end_date, t.image, tm.role
               FROM trip_planner.trips t
               JOIN trip_planner.trip_members tm ON tm.trip_id = t.id AND tm.user_id = %s
               ORDER BY t.updated_at DESC''',
            [user['id']],
        )
        if not trip_rows:
            return JsonResponse({'trips': []})

        trip_ids = [str(r['id']) for r in trip_rows]
        leg_rows = db.query(
            '''SELECT id, trip_id, local_id, title, location, start_date, end_date, sort_order
               FROM trip_planner.trip_legs WHERE trip_id = ANY(%s::uuid[]) ORDER BY trip_id, sort_order''',
            [trip_ids],
        )
        leg_ids = [str(r['id']) for r in leg_rows]
        act_rows = db.query(
            '''SELECT id, leg_id, day_date, external_id, name, category, image_url, price, currency,
                      duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data, sort_order
               FROM trip_planner.activities
               WHERE leg_id = ANY(%s::uuid[]) ORDER BY leg_id, day_date, sort_order''',
            [leg_ids],
        ) if leg_ids else []

        trips = _reconstruct_trips(trip_rows, leg_rows, act_rows)
        return JsonResponse({'trips': trips})

    def post(self, request):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)

        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        trips = body.get('trips', [])
        if not isinstance(trips, list) or not trips:
            return JsonResponse({'error': 'No trips provided'}, status=400)

        saved = []
        for trip in trips:
            legs = trip.get('legs') or []
            rows = db.query(
                '''INSERT INTO trip_planner.trips
                   (user_id, local_id, name, destination, vibes, passengers, start_date, end_date, image)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                   ON CONFLICT (user_id, local_id) DO UPDATE SET
                       name = EXCLUDED.name,
                       destination = EXCLUDED.destination,
                       vibes = EXCLUDED.vibes,
                       passengers = EXCLUDED.passengers,
                       start_date = EXCLUDED.start_date,
                       end_date = EXCLUDED.end_date,
                       image = EXCLUDED.image,
                       updated_at = NOW()
                   RETURNING id''',
                [
                    user['id'],
                    trip.get('id'),
                    trip.get('name') or 'My Trip',
                    trip.get('destination') or (legs[0].get('location') if legs else None),
                    trip.get('vibes') or [],
                    json.dumps(trip.get('passengers') or {}),
                    (legs[0].get('startDate') or '')[:10] or None if legs else None,
                    (legs[-1].get('endDate') or '')[:10] if legs else None,
                    trip.get('image'),
                ],
            )
            if not rows:
                continue
            trip_db_id = str(rows[0]['id'])
            saved.append(trip_db_id)

            db.query(
                '''INSERT INTO trip_planner.trip_members (trip_id, user_id, role)
                   VALUES (%s, %s, 'owner') ON CONFLICT DO NOTHING''',
                [trip_db_id, user['id']],
            )

            # Replace legs + activities
            db.query('DELETE FROM trip_planner.trip_legs WHERE trip_id = %s', [trip_db_id])
            for li, leg in enumerate(legs):
                leg_rows = db.query(
                    '''INSERT INTO trip_planner.trip_legs
                       (trip_id, local_id, title, location, start_date, end_date, sort_order)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id''',
                    [trip_db_id, leg.get('id'), leg.get('title'), leg.get('location'),
                     (leg.get('startDate') or '')[:10] or None,
                     (leg.get('endDate') or '')[:10] or None, li],
                )
                if not leg_rows:
                    continue
                leg_db_id = str(leg_rows[0]['id'])

                act_order = 0
                for day in (leg.get('days') or []):
                    for act in (day.get('activities') or []):
                        db.query(
                            '''INSERT INTO trip_planner.activities
                               (leg_id, day_date, external_id, name, category, image_url, price, currency,
                                duration, location, rating, booking_status, booking_ref,
                                is_best_seller, raw_data, sort_order)
                               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
                            [
                                leg_db_id,
                                (day.get('date') or '')[:10] or None,
                                act.get('availabilityUuid') or act.get('id'),
                                act.get('name'),
                                act.get('category'),
                                act.get('image'),
                                act.get('price') or 0,
                                act.get('currency') or 'USD',
                                act.get('duration'),
                                act.get('location'),
                                act.get('rating'),
                                act.get('bookingStatus') or 'none',
                                act.get('bookingRef'),
                                bool(act.get('isBestSeller')),
                                json.dumps(act),
                                act_order,
                            ],
                        )
                        act_order += 1

        return JsonResponse({'saved': saved})


@method_decorator(csrf_exempt, name='dispatch')
class TripDetailView(View):
    def put(self, request, trip_id):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        db.query(
            'UPDATE trip_planner.trips SET name=%s, destination=%s, updated_at=NOW() WHERE id=%s AND user_id=%s',
            [body.get('name'), body.get('destination'), trip_id, user['id']],
        )
        return JsonResponse({'ok': True})

    def delete(self, request, trip_id):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        db.query(
            'DELETE FROM trip_planner.trips WHERE id=%s AND user_id=%s', [trip_id, user['id']]
        )
        return JsonResponse({'ok': True})


@method_decorator(csrf_exempt, name='dispatch')
class ShareView(View):
    def post(self, request):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        trip_id = body.get('tripId')
        if not trip_id:
            return JsonResponse({'error': 'tripId required'}, status=400)

        rows = db.query(
            'SELECT id, share_token FROM trip_planner.trips WHERE (id::text=%s OR local_id=%s) AND user_id=%s',
            [trip_id, trip_id, user['id']],
        )
        if not rows:
            return JsonResponse({'error': 'Trip not saved yet'}, status=404)

        db_id = str(rows[0]['id'])
        share_token = rows[0].get('share_token')
        if not share_token:
            share_token = secrets.token_hex(20)
            db.query('UPDATE trip_planner.trips SET share_token=%s WHERE id=%s', [share_token, db_id])

        base_url = os.getenv('APP_URL', 'http://localhost:3001')
        return JsonResponse({'shareUrl': f'{base_url}/trip/share/{share_token}'})


class SharePublicView(View):
    def get(self, request, token):
        rows = db.query(
            '''SELECT t.id, t.local_id, t.name, t.destination, t.vibes, t.start_date, t.end_date
               FROM trip_planner.trips t WHERE t.share_token=%s''',
            [token],
        )
        if not rows:
            return JsonResponse({'error': 'Not found'}, status=404)
        trip = rows[0]

        legs = db.query(
            'SELECT id, local_id, title, location, start_date, end_date, sort_order FROM trip_planner.trip_legs WHERE trip_id=%s ORDER BY sort_order',
            [trip['id']],
        )
        leg_ids = [str(l['id']) for l in legs]
        acts = db.query(
            '''SELECT leg_id, day_date, external_id, name, category, image_url AS image, price,
                      currency, duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data
               FROM trip_planner.activities WHERE leg_id=ANY(%s::uuid[]) ORDER BY day_date, sort_order''',
            [leg_ids],
        ) if leg_ids else []

        act_rows = [dict(a) for a in acts]
        reconstructed = _reconstruct_trips([trip], legs, act_rows)
        return JsonResponse({'trip': reconstructed[0] if reconstructed else None})


@method_decorator(csrf_exempt, name='dispatch')
class JoinView(View):
    def post(self, request):
        user = auth_utils.require_user(request)
        if not user:
            return JsonResponse({'error': 'Unauthorized'}, status=401)
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        share_token = body.get('shareToken')
        if not share_token:
            return JsonResponse({'error': 'shareToken required'}, status=400)

        trips = db.query(
            'SELECT id, local_id, name, destination, vibes FROM trip_planner.trips WHERE share_token=%s',
            [share_token],
        )
        if not trips:
            return JsonResponse({'error': 'Invalid share link'}, status=404)

        trip = trips[0]
        existing = db.query(
            'SELECT role FROM trip_planner.trip_members WHERE trip_id=%s AND user_id=%s',
            [trip['id'], user['id']],
        )
        if not existing:
            db.query(
                "INSERT INTO trip_planner.trip_members (trip_id, user_id, role) VALUES (%s,%s,'editor')",
                [trip['id'], user['id']],
            )

        role = existing[0]['role'] if existing else 'editor'
        legs = db.query(
            'SELECT id, local_id, title, location, start_date, end_date FROM trip_planner.trip_legs WHERE trip_id=%s ORDER BY sort_order',
            [trip['id']],
        )
        leg_ids = [str(l['id']) for l in legs]
        acts = db.query(
            'SELECT leg_id, day_date, external_id, name, category, image_url AS image, price, currency, duration, location, rating, booking_status, booking_ref, is_best_seller, raw_data FROM trip_planner.activities WHERE leg_id=ANY(%s::uuid[]) ORDER BY day_date, sort_order',
            [leg_ids],
        ) if leg_ids else []

        reconstructed = _reconstruct_trips([trip], legs, list(acts))
        return JsonResponse({'role': role, 'trip': reconstructed[0] if reconstructed else None})
