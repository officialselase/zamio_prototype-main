from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

STATUS_CHOICES = [
    ('Summary', 'Summary'),
    ('Compliance', 'Compliance'),
    ('Update', 'Update'),
    ('Pending', 'Pending'),
    ('system', 'System Alert'),
    ('performance', 'Performance'),
    ('content', 'Content'),
    ('compliance', 'Compliance Alert'),
    ('financial', 'Financial'),
    ('social', 'Social'),
    ('technical', 'Technical'),
]

PRIORITY_CHOICES = [
    ('low', 'Low'),
    ('medium', 'Medium'),
    ('high', 'High'),
]


class Notification(models.Model):
    title = models.CharField(max_length=1000, null=True, blank=True)
    type = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending')

    message = models.TextField(null=True, blank=True)
    read = models.BooleanField(default=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')

    station = models.ForeignKey(
        'stations.Station',
        on_delete=models.CASCADE,
        related_name='station_notifications',
        null=True,
        blank=True,
    )
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    action_required = models.BooleanField(default=False)
    action_label = models.CharField(max_length=200, null=True, blank=True)
    action_type = models.CharField(max_length=200, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    is_archived = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)



