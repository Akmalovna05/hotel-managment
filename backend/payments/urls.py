from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BookingPaymentStatusView,
    InvoiceViewSet,
    PaymentAnalyticsView,
    PaymentViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register("invoices", InvoiceViewSet, basename="invoices")
router.register("transactions", TransactionViewSet, basename="transactions")
router.register("records", PaymentViewSet, basename="payment-records")

urlpatterns = [
    path("analytics/", PaymentAnalyticsView.as_view(), name="payment-analytics"),
    path(
        "booking-status/<int:booking_id>/",
        BookingPaymentStatusView.as_view(),
        name="booking-payment-status",
    ),
    path("", include(router.urls)),
]
