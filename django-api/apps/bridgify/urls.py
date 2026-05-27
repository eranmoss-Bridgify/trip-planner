from django.urls import path
from . import views

urlpatterns = [
    path('search', views.SearchView.as_view()),
    path('categories', views.CategoriesView.as_view()),
    path('bookings', views.BookingsView.as_view()),
    path('cart', views.CartView.as_view(), {'path': ''}),
    path('cart/<path:path>', views.CartView.as_view()),
    path('<str:product_id>/availability', views.AvailabilityView.as_view()),
    path('<str:product_id>/photos', views.ProductPhotosView.as_view()),
    path('<str:product_id>', views.ProductDetailView.as_view()),
]
