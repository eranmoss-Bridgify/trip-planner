from django.urls import path, include
from django.http import JsonResponse
from apps.ai_chat import views as ai_views


def ping(request):
    return JsonResponse({'pong': True})


urlpatterns = [
    path('ping', ping),
    path('api/auth/', include('apps.auth_app.urls')),
    # Both with and without trailing slash — frontend sends no slash, Django default expects one
    path('api/trips/', include('apps.trips.urls')),
    path('api/trips', include('apps.trips.urls')),
    path('api/bridgify/', include('apps.bridgify.urls')),
    path('api/ai/', include('apps.ai_chat.urls')),
    # Flat aliases — Next.js exposes these without /ai/ prefix
    path('api/day-title', ai_views.DayTitleView.as_view()),
    path('api/chat', ai_views.AiChatView.as_view()),
    path('api/ai-chat', ai_views.AiChatView.as_view()),
]
