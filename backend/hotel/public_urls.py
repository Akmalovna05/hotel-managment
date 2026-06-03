from django.urls import path

from .public_views import (
    PublicBookingConfirmationView,
    PublicBookingCreateView,
    PublicCheckoutView,
    PublicInvoiceDownloadView,
    PublicPayView,
    PublicPaymentHistoryView,
    PublicReceiptDownloadView,
    PublicRoomDetailView,
    PublicRoomListView,
)

urlpatterns = [
    path("rooms/", PublicRoomListView.as_view(), name="public-rooms"),
    path("rooms/<int:pk>/", PublicRoomDetailView.as_view(), name="public-room-detail"),
    path("bookings/", PublicBookingCreateView.as_view(), name="public-booking-create"),
    path("checkout/<uuid:reference>/", PublicCheckoutView.as_view(), name="public-checkout"),
    path("pay/", PublicPayView.as_view(), name="public-pay"),
    path(
        "confirmation/<uuid:reference>/",
        PublicBookingConfirmationView.as_view(),
        name="public-confirmation",
    ),
    path(
        "history/<uuid:reference>/",
        PublicPaymentHistoryView.as_view(),
        name="public-payment-history",
    ),
    path(
        "receipt/<uuid:reference>/",
        PublicReceiptDownloadView.as_view(),
        name="public-receipt",
    ),
    path(
        "invoice/<uuid:reference>/",
        PublicInvoiceDownloadView.as_view(),
        name="public-invoice",
    ),
]
