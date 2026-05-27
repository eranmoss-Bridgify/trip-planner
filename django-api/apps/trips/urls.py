from django.urls import path
from . import views

urlpatterns = [
    path('', views.TripsView.as_view()),
    path('share/create', views.ShareView.as_view()),
    path('share/<str:token>', views.SharePublicView.as_view()),
    path('join', views.JoinView.as_view()),
    path('<str:trip_id>', views.TripDetailView.as_view()),
]
