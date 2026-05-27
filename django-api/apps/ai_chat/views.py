import json
import os
import re
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import anthropic
from apps.common.bridgify_client import bridgify_fetch, strip_diacritics

_client = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY', ''))

INTENT_MAP = [
    (re.compile(r'nightlife|bar|club|drinks|party|night out', re.I),      ['Nightlife', 'Music']),
    (re.compile(r'outdoor|nature|hike|hiking|trek', re.I),                ['Outdoor Activities', 'Nature', 'Walking & Biking']),
    (re.compile(r'walk|walking|bike|biking|cycling', re.I),               ['Walking & Biking', 'Guided Tours']),
    (re.compile(r'food|eat|restaurant|dinner|lunch|cuisine', re.I),       ['Culinary Experiences', 'Street Food']),
    (re.compile(r'cook|cooking|class|workshop|lesson', re.I),             ['Classes & Workshops', 'Culinary Experiences']),
    (re.compile(r'history|historic|ancient|heritage', re.I),              ['Historic Sites', 'Culture', 'Museums']),
    (re.compile(r'museum|gallery|exhibit', re.I),                         ['Museums', 'Art']),
    (re.compile(r'culture|cultural', re.I),                               ['Culture', 'Historic Sites', 'Art']),
    (re.compile(r'art|artwork', re.I),                                    ['Art', 'Architecture']),
    (re.compile(r'architect|building|design', re.I),                      ['Architecture', 'Art']),
    (re.compile(r'show|concert|perform|live music|theatre|theater', re.I), ['Shows & Performances', 'Music', 'Festivals']),
    (re.compile(r'music|festival', re.I),                                 ['Music', 'Shows & Performances', 'Festivals']),
    (re.compile(r'family|kids|children|child', re.I),                     ['Family Friendly', 'Amusements']),
    (re.compile(r'beach|sea|ocean|swim|snorkel', re.I),                   ['Beach', 'Watersports']),
    (re.compile(r'water|surf|dive|kayak|boat', re.I),                     ['Watersports', 'Outdoor Activities']),
    (re.compile(r'wellness|spa|relax|yoga|meditation', re.I),             ['Wellness & Wellbeing']),
    (re.compile(r'local|authentic|hidden gem|off the beaten', re.I),      ['Hidden Gems', 'Local Markets', 'Street Food']),
    (re.compile(r'market|shopping|souvenir|shop', re.I),                  ['Local Markets', 'Shopping']),
    (re.compile(r'tour|guide|sightseeing|sight|visit', re.I),             ['Guided Tours', 'Must See', 'Popular']),
    (re.compile(r'must.?see|popular|top|best|highlight', re.I),           ['Must See', 'Popular', 'Guided Tours']),
    (re.compile(r'sport|game|match|stadium', re.I),                       ['Sporting Events', 'Outdoor Activities']),
    (re.compile(r'religion|church|mosque|temple|cathedral', re.I),        ['Religion', 'Historic Sites']),
    (re.compile(r'park|garden|green', re.I),                              ['Urban Parks', 'Nature']),
    (re.compile(r'lgbt|gay|pride', re.I),                                 ['LGBT']),
]


def _classify_intent(query: str) -> list[str]:
    terms: list[str] = []
    for pattern, t in INTENT_MAP:
        if pattern.search(query):
            terms.extend(t)
        if len(terms) >= 4:
            break
    unique = list(dict.fromkeys(terms))[:3]
    return unique if unique else ['Popular', 'Must See', 'Guided Tours']


def _fmt_duration(minutes: int) -> str:
    if minutes < 60:
        return f'{minutes} min'
    h, m = divmod(minutes, 60)
    return f'{h}h {m}m' if m else f'{h}h'


def _search_bridgify(destination: str, term: str, limit: int = 6) -> list:
    try:
        norm = strip_diacritics(term)
        qs = f'city_name={destination}&text_search={norm}&page=1&page_size={min(limit, 10)}'
        res = bridgify_fetch(f'/attractions/products/?{qs}')
        if not res.ok:
            return []
        data = res.json()
        results = []
        for a in (data.get('attractions') or []):
            price = a.get('price')
            price_val = price if isinstance(price, (int, float)) else (price.get('amount') if isinstance(price, dict) else 0)
            currency = 'USD' if isinstance(price, (int, float)) else (price.get('currency', 'USD') if isinstance(price, dict) else 'USD')
            dur = a.get('duration_minutes')
            loc = a.get('location') or {}
            results.append({
                'external_id': a.get('external_id', ''),
                'uuid': a.get('uuid', ''),
                'name': a.get('title', ''),
                'category': a.get('category') or term,
                'price': price_val or 0,
                'currency': currency,
                'duration': _fmt_duration(dur) if dur else '',
                'rating': a.get('rating') or 0,
                'review_count': a.get('review_count') or 0,
                'location': ', '.join(filter(None, [loc.get('city'), loc.get('country')])) if isinstance(loc, dict) else '',
                'image_url': a.get('main_photo_url', ''),
                'description': (a.get('description') or '')[:150],
                'is_best_seller': (a.get('additional_info') or {}).get('external_exclusive_fields', {}).get('best_seller', False),
            })
        return results
    except Exception:
        return []


TOOLS = [
    {
        'name': 'propose_add_activity',
        'description': 'Propose adding a specific activity to a day in the trip. Call this for 2–3 of the best matches from the available activities list.',
        'input_schema': {
            'type': 'object',
            'properties': {
                'external_id': {'type': 'string'},
                'uuid': {'type': 'string'},
                'name': {'type': 'string'},
                'category': {'type': 'string'},
                'price': {'type': 'number'},
                'currency': {'type': 'string'},
                'duration': {'type': 'string'},
                'image_url': {'type': 'string'},
                'rating': {'type': 'number'},
                'location': {'type': 'string'},
                'description': {'type': 'string'},
                'leg_id': {'type': 'string'},
                'day_date': {'type': 'string'},
                'reason': {'type': 'string'},
            },
            'required': ['external_id', 'name', 'leg_id', 'day_date', 'reason'],
        },
    },
    {
        'name': 'propose_remove_activity',
        'description': 'Propose removing an activity from the trip.',
        'input_schema': {
            'type': 'object',
            'properties': {
                'activity_id': {'type': 'string'},
                'activity_name': {'type': 'string'},
                'leg_id': {'type': 'string'},
                'day_date': {'type': 'string'},
                'day_index': {'type': 'number'},
                'activity_index': {'type': 'number'},
                'reason': {'type': 'string'},
            },
            'required': ['activity_id', 'activity_name', 'leg_id', 'reason'],
        },
    },
]


def _build_trip_context(trip: dict) -> str:
    lines = [
        f'## Trip: "{trip.get("name", "")}"',
        f'Destination: {trip.get("destination") or "unknown"}',
        f'Dates: {trip.get("startDate") or trip.get("start_date") or "?"} → {trip.get("endDate") or trip.get("end_date") or "?"}',
        f'Vibes: {", ".join(trip.get("vibes") or []) or "none"}',
        '',
        '## Schedule:',
    ]
    for leg in trip.get('legs') or []:
        lines.append(f'\n### {leg.get("title") or leg.get("location")} | ID: {leg.get("id")} | {leg.get("startDate") or "?"} – {leg.get("endDate") or "?"}')
        for day in leg.get('days') or []:
            acts = day.get('activities') or []
            act_str = ', '.join(f'{a.get("name")} [id:{a.get("id")}]' for a in acts) if acts else '(empty)'
            lines.append(f'  {day.get("date")}: {act_str}')
    return '\n'.join(lines)


@method_decorator(csrf_exempt, name='dispatch')
class AiChatView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        messages = body.get('messages') or []
        trip = body.get('trip')

        last_user = next((m['content'] for m in reversed(messages) if m.get('role') == 'user'), '')
        destination = (trip.get('legs') or [{}])[0].get('location', '') or trip.get('destination', '') if trip else ''

        is_general = bool(
            re.search(r'\b(when|how|what time|weather|transport|tip|advice|recommend|tell me|explain|why|where to stay|currency|language|visa)\b', last_user, re.I)
        ) and not bool(
            re.search(r'\b(activity|activities|tour|show|museum|experience|attraction|do|visit|find|suggest|add)\b', last_user, re.I)
        )

        trip_context = _build_trip_context(trip) if trip else 'No trip loaded.'
        activity_context = ''

        if not is_general and destination:
            category_terms = _classify_intent(last_user)
            all_results = []
            for term in category_terms:
                all_results.extend(_search_bridgify(destination, term, 6))

            seen: set = set()
            activities = []
            for a in all_results:
                eid = a['external_id']
                if eid in seen:
                    continue
                seen.add(eid)
                activities.append(a)
            activities.sort(key=lambda a: a['is_best_seller'], reverse=True)
            activities = activities[:15]

            if activities:
                activity_context = (
                    f'\n\n## Available Activities (pre-fetched from Bridgify for: {", ".join(category_terms)})\n'
                    'Pick the 2–3 best matches and call propose_add_activity for each.\n\n' +
                    '\n\n'.join(
                        f'{i+1}. [{a["external_id"]}] {a["name"]} | {a["category"]} | '
                        f'{"$" + str(a["price"]) if a["price"] else "free"} | '
                        f'{"★" + str(a["rating"]) if a["rating"] else ""} | {a["duration"]} | {a["location"]}\n   {a["description"]}'
                        for i, a in enumerate(activities)
                    )
                )
            else:
                activity_context = f'\n\n## Available Activities\nNo results found for: {", ".join(category_terms)}. Let the user know nothing matched and suggest alternatives.'

        system = (
            f'You are a smart, friendly trip planning assistant inside WanderVault, a travel app.\n\n'
            f'{trip_context}{activity_context}\n\n'
            '## Your job\n'
            '- If available activities are listed above: call propose_add_activity for 2–3 of the best matches, then write 1–2 short sentences. Do NOT describe the activities in text — the cards show all the details.\n'
            '- If no activities are listed (general question): answer directly in text without tools.\n\n'
            '## Rules\n'
            '1. **propose_add_activity is mandatory** when activities are listed above.\n'
            '2. **Use real dates** — set day_date to an actual date from the trip schedule.\n'
            '3. **Never say "I\'ve added"** — the user confirms each card manually.\n'
            '4. **Never list activity names/prices in your text** — that belongs on the cards.'
        )

        anthropic_messages = [{'role': m['role'], 'content': m['content']} for m in messages]
        has_activities = 'external_id' in activity_context
        proposals = []
        turns = 0

        kwargs: dict = {
            'model': 'claude-sonnet-4-6',
            'max_tokens': 4096,
            'system': system,
            'tools': TOOLS,
            'messages': anthropic_messages,
        }
        if has_activities:
            kwargs['tool_choice'] = {'type': 'any'}

        response = _client.messages.create(**kwargs)

        while response.stop_reason == 'tool_use' and turns < 5:
            turns += 1
            tool_use_blocks = [b for b in response.content if b.type == 'tool_use']
            tool_results = []

            for tu in tool_use_blocks:
                inp = tu.input
                if tu.name == 'propose_add_activity':
                    proposals.append({
                        'type': 'add',
                        'activity': {
                            'id': inp.get('external_id'),
                            'uuid': inp.get('uuid', ''),
                            'name': inp.get('name'),
                            'category': inp.get('category'),
                            'price': inp.get('price'),
                            'currency': inp.get('currency'),
                            'duration': inp.get('duration'),
                            'image': inp.get('image_url'),
                            'rating': inp.get('rating'),
                            'location': inp.get('location'),
                            'description': inp.get('description'),
                        },
                        'legId': inp.get('leg_id'),
                        'dayDate': inp.get('day_date'),
                        'reason': inp.get('reason'),
                    })
                    result = json.dumps({'status': 'ok', 'message': f'"{inp.get("name")}" proposed for {inp.get("day_date")}'})
                elif tu.name == 'propose_remove_activity':
                    proposals.append({
                        'type': 'remove',
                        'activityId': inp.get('activity_id'),
                        'activityName': inp.get('activity_name'),
                        'legId': inp.get('leg_id'),
                        'dayDate': inp.get('day_date'),
                        'dayIndex': inp.get('day_index'),
                        'activityIndex': inp.get('activity_index'),
                        'reason': inp.get('reason'),
                    })
                    result = json.dumps({'status': 'ok', 'message': f'Removal of "{inp.get("activity_name")}" proposed'})
                else:
                    result = json.dumps({'error': 'Unknown tool'})

                tool_results.append({'type': 'tool_result', 'tool_use_id': tu.id, 'content': result})

            anthropic_messages.append({'role': 'assistant', 'content': response.content})
            anthropic_messages.append({'role': 'user', 'content': tool_results})

            response = _client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=4096,
                system=system,
                tools=TOOLS,
                messages=anthropic_messages,
            )

        text = '\n'.join(b.text for b in response.content if b.type == 'text')
        return JsonResponse({'text': text, 'proposals': proposals})


@method_decorator(csrf_exempt, name='dispatch')
class DayTitleView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'title': None})

        activities = body.get('activities') or []
        destination = body.get('destination', '')
        day_index = body.get('dayIndex', 0)

        if not activities:
            return JsonResponse({'title': None})

        activity_list = ', '.join(a.get('name', '') for a in activities)
        response = _client.messages.create(
            model='claude-opus-4-6',
            max_tokens=60,
            messages=[{
                'role': 'user',
                'content': (
                    f'Generate a short, funny, punny title for Day {day_index + 1} of a trip to {destination}.\n'
                    f'Planned activities: {activity_list}\n\n'
                    'Rules:\n'
                    '- Max 6 words\n'
                    '- Witty and playful — use wordplay, alliteration, or travel puns based on the actual activities\n'
                    '- No quotes, no "Day X:" prefix, just the raw title\n'
                    '- Examples of the tone: "Churros, Chaos & Cathedral Vibes", "Sangria O\'Clock: Tour Edition", "Feet Don\'t Fail Me Now"\n\n'
                    'Reply with ONLY the title, nothing else.'
                ),
            }],
        )
        title = response.content[0].text.strip()
        return JsonResponse({'title': title})
