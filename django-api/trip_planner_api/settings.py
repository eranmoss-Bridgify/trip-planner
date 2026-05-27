import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
APPEND_SLASH = False

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'apps.auth_app',
    'apps.trips',
    'apps.bridgify',
    'apps.ai_chat',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'trip_planner_api.urls'
WSGI_APPLICATION = 'trip_planner_api.wsgi.application'

# Database — raw psycopg2 used in apps/common/db.py; Django doesn't manage trip_planner tables
import urllib.parse as _up
_db = _up.urlparse(os.environ['DATABASE_URL'])
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': _db.path.lstrip('/'),
        'USER': _db.username,
        'PASSWORD': _db.password,
        'HOST': _db.hostname,
        'PORT': str(_db.port or 5432),
    }
}

# No Django migrations for trip_planner — tables already exist
MIGRATION_MODULES = {
    'auth_app': None,
    'trips': None,
    'bridgify': None,
    'ai_chat': None,
}

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'UNAUTHENTICATED_USER': None,
}

# CORS — allow the Next.js frontend to send cookies
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3001').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['content-type', 'accept', 'cookie']

STATIC_URL = '/static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
