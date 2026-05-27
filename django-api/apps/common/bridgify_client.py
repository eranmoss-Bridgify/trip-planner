import os
import time
import unicodedata
import requests

BRIDGIFY_BASE = os.getenv('BRIDGIFY_BASE_URL', 'https://api.bridgify.io')

_token_cache = {'token': None, 'expires_at': 0}


def get_token() -> str:
    if _token_cache['token'] and time.time() < _token_cache['expires_at']:
        return _token_cache['token']

    res = requests.post(
        f'{BRIDGIFY_BASE}/accounts/token/',
        data={
            'client_id': os.environ['BRIDGIFY_CLIENT_ID'],
            'client_secret': os.environ['BRIDGIFY_SECRET'],
            'grant_type': 'client_credentials',
            'scope': 'read write',
        },
        timeout=10,
    )
    res.raise_for_status()
    data = res.json()
    _token_cache['token'] = data['access_token']
    _token_cache['expires_at'] = time.time() + data.get('expires_in', 3600) - 60
    return _token_cache['token']


def bridgify_fetch(path: str, method: str = 'GET', **kwargs) -> requests.Response:
    token = get_token()
    headers = {'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
    extra = kwargs.pop('headers', None)
    if extra:
        headers.update(extra)
    return requests.request(
        method,
        f'{BRIDGIFY_BASE}{path}',
        headers=headers,
        timeout=10,
        **kwargs,
    )


def strip_diacritics(text: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )
