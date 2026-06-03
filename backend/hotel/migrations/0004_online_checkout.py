import uuid

from django.db import migrations, models


def populate_checkout_references(apps, schema_editor):
    Booking = apps.get_model("hotel", "Booking")
    for booking in Booking.objects.all():
        booking.checkout_reference = uuid.uuid4()
        booking.save(update_fields=["checkout_reference"])


class Migration(migrations.Migration):

    dependencies = [
        ("hotel", "0003_delete_payment"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="checkout_reference",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="is_online_booking",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(populate_checkout_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="booking",
            name="checkout_reference",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
