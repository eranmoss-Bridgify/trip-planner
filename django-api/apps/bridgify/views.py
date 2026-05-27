import json
import re
import unicodedata
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from apps.common.bridgify_client import bridgify_fetch, strip_diacritics

UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)

# In-memory category cache (24h TTL)
_category_cache: dict = {}
_CATEGORY_TTL = 24 * 3600


@method_decorator(csrf_exempt, name='dispatch')
class SearchView(View):
    def get(self, request):
        city = request.GET.get('city_name', '')
        text = request.GET.get('text_search', '')
        # Bridgify's page/page_size params are broken — every page returns identical results.
        # Use offset/limit instead (confirmed working via their own next/previous URLs).
        page_size = int(request.GET.get('page_size', '50'))
        page = int(request.GET.get('page', '1'))
        offset = (page - 1) * page_size

        normalised = strip_diacritics(text)
        params = {'city_name': city, 'text_search': normalised, 'limit': page_size, 'offset': offset}
        qs = '&'.join(f'{k}={v}' for k, v in params.items())

        try:
            res = bridgify_fetch(f'/attractions/products/?{qs}')
            if not res.ok:
                return JsonResponse({'error': f'Bridgify {res.status_code}'}, status=res.status_code)

            data = res.json()
            attractions = data.get('attractions') or []
            if attractions:
                seen: set = set()
                deduped = []
                for a in attractions:
                    eid = a.get('external_id')
                    if eid in seen:
                        continue
                    seen.add(eid)
                    deduped.append(a)
                deduped.sort(
                    key=lambda a: a.get('additional_info', {}).get('external_exclusive_fields', {}).get('best_seller', False),
                    reverse=True,
                )
                data['attractions'] = deduped

            return JsonResponse(data)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)


@method_decorator(csrf_exempt, name='dispatch')
class ProductDetailView(View):
    def get(self, request, product_id):
        try:
            res = bridgify_fetch(f'/attractions/products/{product_id}/')
            if not res.ok:
                return JsonResponse({'error': f'Bridgify {res.status_code}'}, status=res.status_code)
            return JsonResponse(res.json())
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)


@method_decorator(csrf_exempt, name='dispatch')
class ProductPhotosView(View):
    def get(self, request, product_id):
        try:
            res = bridgify_fetch(f'/attractions/products/{product_id}/')
            if not res.ok:
                return JsonResponse({'photos': []})
            data = res.json()
            attraction = data.get('attraction') or data
            photos = []
            if attraction.get('main_photo_url'):
                photos.append(attraction['main_photo_url'])
            for field in ['photos', 'images', 'gallery', 'media', 'photo_urls']:
                items = attraction.get(field) or []
                if isinstance(items, list):
                    for p in items:
                        url = p if isinstance(p, str) else (p.get('url') or p.get('photo_url') or p.get('src'))
                        if url and url not in photos:
                            photos.append(url)
            return JsonResponse({'photos': photos})
        except Exception:
            return JsonResponse({'photos': []})


def _resolve_to_uuid(product_id: str) -> str:
    try:
        res = bridgify_fetch(f'/attractions/products/{product_id}/')
        if not res.ok:
            return product_id
        data = res.json()
        return data.get('uuid') or data.get('attraction', {}).get('uuid') or product_id
    except Exception:
        return product_id


def _normalise_availability(raw: dict, availability_type=None) -> dict:
    date_entries = raw.get('dates') or []
    slots = []
    for obj in date_entries:
        for date_str, raw_times in obj.items():
            times = [t[:5] for t in (raw_times or []) if t != '00:00:00']
            slots.append({'date': date_str, 'times': times})
    slots.sort(key=lambda s: s['date'])
    return {'data': {'type': availability_type, 'slots': slots}}


@method_decorator(csrf_exempt, name='dispatch')
class AvailabilityView(View):
    def get(self, request, product_id):
        date_from = request.GET.get('date_from', '')
        date_to = request.GET.get('date_to', '')
        availability_type = request.GET.get('availability_type')

        uuid = product_id if UUID_RE.match(product_id) else _resolve_to_uuid(product_id)
        qs = f'date_from={date_from}&date_to={date_to}'

        try:
            res = bridgify_fetch(f'/attractions/products/availability/{uuid}/?{qs}')
            if not res.ok:
                detail = None
                try:
                    detail = res.json()
                except Exception:
                    pass
                return JsonResponse({'error': f'Bridgify {res.status_code}', 'detail': detail}, status=res.status_code)
            return JsonResponse(_normalise_availability(res.json(), availability_type))
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)


@method_decorator(csrf_exempt, name='dispatch')
class CategoriesView(View):
    def get(self, request):
        import time
        now = time.time()
        if _category_cache.get('data') and now - _category_cache.get('fetched_at', 0) < _CATEGORY_TTL:
            return JsonResponse(_category_cache['data'])
        try:
            res = bridgify_fetch('/attractions/categories/')
            if not res.ok:
                return JsonResponse({'error': f'Bridgify {res.status_code}'}, status=res.status_code)
            data = res.json()
            _category_cache['data'] = data
            _category_cache['fetched_at'] = now
            return JsonResponse(data)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)


@method_decorator(csrf_exempt, name='dispatch')
class BookingsView(View):
    def post(self, request):
        try:
            body = json.loads(request.body)
        except Exception:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        if not body.get('id') or not body.get('holder_name') or not body.get('email'):
            return JsonResponse({'error': 'Missing required fields: id, holder_name, email'}, status=400)

        payload = {k: body.get(k) for k in ['id', 'from_date', 'to_date', 'holder_name', 'email', 'phone', 'adults']}

        try:
            res = bridgify_fetch('/bookings/', method='POST',
                                 json=payload,
                                 headers={'Content-Type': 'application/json'})
            if not res.ok:
                detail = None
                try:
                    detail = res.json()
                except Exception:
                    pass
                if res.status_code == 404:
                    import random, string, time
                    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    return JsonResponse({
                        'booking_reference': f'SANDBOX-{int(time.time())}',
                        'confirmation_code': f'SBX-{suffix}',
                        'status': 'confirmed',
                        'sandbox': True,
                    })
                return JsonResponse({'error': f'Bridgify {res.status_code}', 'detail': detail}, status=res.status_code)
            return JsonResponse(res.json())
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)


@method_decorator(csrf_exempt, name='dispatch')
class CartView(View):
    """Catch-all proxy for all Bridgify cart endpoints."""

    def _proxy(self, request, path_segments):
        path = '/attractions/booking/cart/' + ('/'.join(path_segments) + '/' if path_segments else '')
        method = request.method
        body = None
        headers = {}
        if method in ('POST', 'PATCH'):
            body = request.body.decode('utf-8')
            headers['Content-Type'] = 'application/json'
        try:
            res = bridgify_fetch(path, method=method,
                                 data=body if body else None,
                                 headers=headers if headers else None)
            text = res.text
            try:
                data = json.loads(text)
            except Exception:
                data = {'raw': text}
            return JsonResponse(data, status=res.status_code)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=502)

    def get(self, request, path=''):
        return self._proxy(request, [p for p in path.split('/') if p])

    def post(self, request, path=''):
        return self._proxy(request, [p for p in path.split('/') if p])

    def patch(self, request, path=''):
        return self._proxy(request, [p for p in path.split('/') if p])
