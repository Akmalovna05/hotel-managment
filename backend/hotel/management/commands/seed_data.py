from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from hotel.models import (
    ActivityLog,
    Booking,
    Guest,
    HousekeepingTask,
    MaintenanceRequest,
    Room,
    Staff,
)
from payments.models import Invoice, Payment, Transaction
from payments.services import get_or_create_invoice, record_manual_payment, sync_booking_payment_status

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo data for Hotel Management System"

    def handle(self, *args, **options):
        if User.objects.filter(username="admin").exists():
            self.stdout.write("Data already seeded. Skipping.")
            return

        admin = User.objects.create_superuser(
            username="admin",
            email="admin@hotel.com",
            password="admin123",
            first_name="System",
            last_name="Admin",
            role=User.Role.ADMIN,
        )
        manager = User.objects.create_user(
            username="manager",
            email="manager@hotel.com",
            password="manager123",
            first_name="Sarah",
            last_name="Mitchell",
            role=User.Role.MANAGER,
        )
        reception = User.objects.create_user(
            username="reception",
            email="reception@hotel.com",
            password="reception123",
            first_name="James",
            last_name="Cooper",
            role=User.Role.RECEPTIONIST,
        )
        User.objects.create_user(
            username="housekeeping",
            email="hk@hotel.com",
            password="hk123",
            first_name="Maria",
            last_name="Garcia",
            role=User.Role.HOUSEKEEPING,
        )
        User.objects.create_user(
            username="maintenance",
            email="maint@hotel.com",
            password="maint123",
            first_name="David",
            last_name="Chen",
            role=User.Role.MAINTENANCE,
        )

        for u, salary, shift in [
            (manager, 5500, Staff.Shift.MORNING),
            (reception, 4200, Staff.Shift.AFTERNOON),
        ]:
            Staff.objects.create(user=u, salary=salary, shift=shift)

        rooms_data = [
            ("101", "Standard", 120, 1, 2, ["WiFi", "TV", "AC"]),
            ("102", "Standard", 120, 1, 2, ["WiFi", "TV", "AC"]),
            ("201", "Deluxe", 180, 2, 3, ["WiFi", "TV", "AC", "Mini Bar"]),
            ("301", "Suite", 320, 3, 4, ["WiFi", "TV", "AC", "Mini Bar", "Jacuzzi"]),
        ]
        rooms = []
        for num, rtype, price, floor, cap, amenities in rooms_data:
            rooms.append(
                Room.objects.create(
                    room_number=num,
                    room_type=rtype,
                    price=price,
                    floor=floor,
                    capacity=cap,
                    amenities=amenities,
                )
            )

        guests = []
        for fn, ln, email, phone, nat in [
            ("John", "Smith", "john@email.com", "+1-555-0101", "USA"),
            ("Emma", "Wilson", "emma@email.com", "+1-555-0102", "UK"),
        ]:
            guests.append(
                Guest.objects.create(
                    first_name=fn,
                    last_name=ln,
                    email=email,
                    phone=phone,
                    nationality=nat,
                )
            )

        today = date.today()
        b1 = Booking.objects.create(
            guest=guests[0],
            room=rooms[2],
            check_in=today - timedelta(days=1),
            check_out=today + timedelta(days=2),
            status=Booking.Status.CHECKED_IN,
            payment_status=Booking.PaymentStatus.PENDING,
            total_amount=Decimal("540"),
            created_by=reception,
        )
        rooms[2].status = Room.Status.OCCUPIED
        rooms[2].save()

        b2 = Booking.objects.create(
            guest=guests[1],
            room=rooms[3],
            check_in=today + timedelta(days=1),
            check_out=today + timedelta(days=4),
            status=Booking.Status.CONFIRMED,
            payment_status=Booking.PaymentStatus.PENDING,
            total_amount=Decimal("960"),
            created_by=reception,
        )
        rooms[3].status = Room.Status.RESERVED
        rooms[3].save()

        inv1 = get_or_create_invoice(b1)
        payment1 = record_manual_payment(
            b1,
            inv1.total,
            Payment.PaymentMethod.VISA,
            user=admin,
            notes="Seed Visa payment",
        )
        payment1.card_last_four = "4242"
        payment1.save(update_fields=["card_last_four"])

        get_or_create_invoice(b2)

        HousekeepingTask.objects.create(room=rooms[0], status=HousekeepingTask.Status.PENDING)
        MaintenanceRequest.objects.create(
            room=rooms[1],
            title="AC issue",
            description="Needs service",
            priority=MaintenanceRequest.Priority.HIGH,
        )

        ActivityLog.objects.create(
            user=admin,
            action="seed",
            entity_type="system",
            description="Demo data with payments module initialized",
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded! Login: admin / admin123"))
