from django.contrib import admin

from .models import (
    ActivityLog,
    Booking,
    Guest,
    HousekeepingTask,
    MaintenanceRequest,
    Notification,
    Room,
    Staff,
)


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ("user", "shift", "salary", "is_active", "hired_at")
    list_filter = ("shift", "is_active")


@admin.register(Guest)
class GuestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone", "nationality", "created_at")
    search_fields = ("first_name", "last_name", "email", "phone")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("room_number", "room_type", "floor", "price", "status", "capacity")
    list_filter = ("status", "room_type", "floor")
    search_fields = ("room_number",)


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "guest",
        "room",
        "check_in",
        "check_out",
        "status",
        "payment_status",
        "total_amount",
    )
    list_filter = ("status", "payment_status")
    search_fields = ("guest__first_name", "guest__last_name", "room__room_number")


@admin.register(HousekeepingTask)
class HousekeepingAdmin(admin.ModelAdmin):
    list_display = ("room", "assigned_to", "status", "scheduled_at", "completed_at")
    list_filter = ("status",)


@admin.register(MaintenanceRequest)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ("title", "room", "priority", "status", "assigned_to", "created_at")
    list_filter = ("priority", "status")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "title", "is_read", "created_at")
    list_filter = ("is_read",)


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("action", "entity_type", "user", "created_at")
    list_filter = ("entity_type", "action")
