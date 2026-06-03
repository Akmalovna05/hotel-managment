from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        RECEPTIONIST = "receptionist", "Receptionist"
        MANAGER = "manager", "Manager"
        HOUSEKEEPING = "housekeeping", "Housekeeping Staff"
        MAINTENANCE = "maintenance", "Maintenance Staff"

    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.RECEPTIONIST
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    theme = models.CharField(max_length=10, default="light")

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"
