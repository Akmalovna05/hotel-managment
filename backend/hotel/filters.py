import django_filters

from .models import Booking, Guest, HousekeepingTask, MaintenanceRequest, Room


class RoomFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    room_type = django_filters.CharFilter(lookup_expr="icontains")
    floor = django_filters.NumberFilter()
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")

    class Meta:
        model = Room
        fields = ["status", "room_type", "floor"]


class GuestFilter(django_filters.FilterSet):
    nationality = django_filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Guest
        fields = ["nationality"]


class BookingFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    payment_status = django_filters.CharFilter()
    check_in_from = django_filters.DateFilter(field_name="check_in", lookup_expr="gte")
    check_in_to = django_filters.DateFilter(field_name="check_in", lookup_expr="lte")
    guest = django_filters.NumberFilter()
    room = django_filters.NumberFilter()

    class Meta:
        model = Booking
        fields = ["status", "payment_status", "guest", "room"]


class HousekeepingFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    room = django_filters.NumberFilter()
    assigned_to = django_filters.NumberFilter()

    class Meta:
        model = HousekeepingTask
        fields = ["status", "room", "assigned_to"]


class MaintenanceFilter(django_filters.FilterSet):
    status = django_filters.CharFilter()
    priority = django_filters.CharFilter()
    room = django_filters.NumberFilter()

    class Meta:
        model = MaintenanceRequest
        fields = ["status", "priority", "room"]
