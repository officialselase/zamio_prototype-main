from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('artists', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='track',
            name='bpm',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='track',
            name='musical_key',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='track',
            name='mood',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='track',
            name='language',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='track',
            name='is_featured',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='track',
            name='distribution_platforms',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='track',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='track',
            name='collaborators',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='track',
            name='catalog_notes',
            field=models.TextField(blank=True, null=True),
        ),
    ]
