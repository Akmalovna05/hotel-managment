from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityLogViewSet,
    BookingViewSet,
    DashboardView,
    GuestViewSet,
    HousekeepingTaskViewSet,
    MaintenanceRequestViewSet,
    NotificationViewSet,
    RoomViewSet,
    StaffViewSet,
    UserManagementViewSet,
)

router = DefaultRouter()
router.register("staff", StaffViewSet, basename="staff")
router.register("guests", GuestViewSet, basename="guests")
router.register("rooms", RoomViewSet, basename="rooms")
router.register("bookings", BookingViewSet, basename="bookings")
router.register("housekeeping", HousekeepingTaskViewSet, basename="housekeeping")
router.register("maintenance", MaintenanceRequestViewSet, basename="maintenance")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("activities", ActivityLogViewSet, basename="activities")
router.register("users", UserManagementViewSet, basename="users")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("", include(router.urls)),
]
