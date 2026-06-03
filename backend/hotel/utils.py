from .models import ActivityLog


def log_activity(user, action, entity_type, entity_id=None, description=""):
    ActivityLog.objects.create(
        user=user,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description or f"{action} {entity_type}",
    )
