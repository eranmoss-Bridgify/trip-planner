import os
from django.core.wsgi import get_wsgi_application
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trip_planner_api.settings')
application = get_wsgi_application()
