from django.urls import path
from . import views

urlpatterns = [
    path('chat', views.AiChatView.as_view()),
    path('day-title', views.DayTitleView.as_view()),
]
