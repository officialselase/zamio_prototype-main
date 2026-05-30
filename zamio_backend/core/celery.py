import os
from celery import Celery
from celery.schedules import crontab
from kombu import Queue

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
app = Celery('core')
app.config_from_object('django.conf:settings', namespace='CELERY')

# Task discovery and registration
# Celery will automatically discover tasks from all installed Django apps
# This prevents circular import issues during Django startup
app.autodiscover_tasks()

# Function to ensure critical tasks are registered
@app.on_after_configure.connect
def ensure_task_registration(sender, **kwargs):
    """Ensure critical tasks are properly registered after Celery configuration."""
    try:
        # Import tasks to ensure they're registered
        from music_monitor.tasks import run_matchcache_to_playlog
        from accounts.tasks import (
            send_email_verification_task,
            send_password_reset_email_task,
            send_user_invitation_email_task,
            send_notification_email_task,
            send_bulk_notification_email_task
        )
        # Import enhanced tasks
        from core.enhanced_tasks import (
            warm_cache_task,
            enhanced_audio_detection_task,
            batch_fingerprint_tracks_task,
            calculate_royalty_distributions_task,
            generate_analytics_report_task,
            cleanup_old_data_task
        )
        # Import media processing tasks
        from artists.services.media_file_service import (
            process_track_media,
            scan_media_files_for_malware
        )
        # Import dispute evidence tasks
        from disputes.tasks import (
            verify_evidence_file_integrity,
            cleanup_expired_evidence_files,
            update_evidence_retention_policies,
            auto_escalate_old_disputes,
            send_dispute_reminders,
            cleanup_old_notifications,
            generate_dispute_analytics,
            send_email_notifications,
            auto_assign_disputes
        )
        # Import file security tasks
        from core.tasks.file_security_tasks import (
            scan_uploaded_file,
            handle_security_threat,
            quarantine_threatening_file,
            send_security_threat_alert,
            update_user_security_status,
            send_suspicious_user_alert,
            cleanup_quarantined_files,
            batch_scan_existing_files
        )
        # Import file security monitoring tasks
        from core.services.file_security_monitor import (
            monitor_file_security,
            generate_daily_security_report
        )
        # Import station complaint tasks
        from stations.tasks import (
            send_complaint_notification,
            auto_escalate_old_complaints,
            send_complaint_reminders,
            cleanup_old_complaint_updates,
            generate_complaint_analytics,
            auto_assign_complaints
        )
    except ImportError as e:
        # Log import errors but don't fail startup
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not import some tasks during registration check: {e}")

# Enhanced Celery configuration for performance optimization
app.conf.update(
    # Task routing and queues
    task_routes={
        'core.enhanced_tasks.enhanced_audio_detection_task': {'queue': 'critical'},
        'core.enhanced_tasks.batch_fingerprint_tracks_task': {'queue': 'high'},
        'core.enhanced_tasks.calculate_royalty_distributions_task': {'queue': 'normal'},
        'core.enhanced_tasks.generate_analytics_report_task': {'queue': 'analytics'},
        'core.enhanced_tasks.cleanup_old_data_task': {'queue': 'low'},
        'core.enhanced_tasks.warm_cache_task': {'queue': 'low'},
        'music_monitor.tasks.*': {'queue': 'normal'},
        'royalties.tasks.*': {'queue': 'normal'},
        # Email tasks routing
        'accounts.tasks.send_email_verification_task': {'queue': 'high'},
        'accounts.tasks.send_password_reset_email_task': {'queue': 'high'},
        'accounts.tasks.send_user_invitation_email_task': {'queue': 'normal'},
        'accounts.tasks.send_notification_email_task': {'queue': 'normal'},
        'accounts.tasks.send_bulk_notification_email_task': {'queue': 'low'},
        # Media processing tasks routing
        'artists.services.media_file_service.process_track_media': {'queue': 'high'},
        'artists.services.media_file_service.scan_media_files_for_malware': {'queue': 'normal'},
        'artists.tasks.verify_media_file_integrity': {'queue': 'normal'},
        'artists.tasks.cleanup_failed_uploads': {'queue': 'low'},
        # Dispute evidence tasks routing
        'disputes.tasks.verify_evidence_file_integrity': {'queue': 'normal'},
        'disputes.tasks.cleanup_expired_evidence_files': {'queue': 'low'},
        'disputes.tasks.update_evidence_retention_policies': {'queue': 'normal'},
        'disputes.tasks.auto_escalate_old_disputes': {'queue': 'normal'},
        'disputes.tasks.send_dispute_reminders': {'queue': 'normal'},
        'disputes.tasks.cleanup_old_notifications': {'queue': 'low'},
        'disputes.tasks.generate_dispute_analytics': {'queue': 'analytics'},
        'disputes.tasks.send_email_notifications': {'queue': 'high'},
        'disputes.tasks.auto_assign_disputes': {'queue': 'normal'},
        # File security tasks routing
        'core.tasks.file_security_tasks.scan_uploaded_file': {'queue': 'high'},
        'core.tasks.file_security_tasks.handle_security_threat': {'queue': 'critical'},
        'core.tasks.file_security_tasks.quarantine_threatening_file': {'queue': 'critical'},
        'core.tasks.file_security_tasks.send_security_threat_alert': {'queue': 'critical'},
        'core.tasks.file_security_tasks.update_user_security_status': {'queue': 'normal'},
        'core.tasks.file_security_tasks.send_suspicious_user_alert': {'queue': 'high'},
        'core.tasks.file_security_tasks.cleanup_quarantined_files': {'queue': 'low'},
        'core.tasks.file_security_tasks.batch_scan_existing_files': {'queue': 'normal'},
        # Station complaint tasks routing
        'stations.tasks.send_complaint_notification': {'queue': 'high'},
        'stations.tasks.auto_escalate_old_complaints': {'queue': 'normal'},
        'stations.tasks.send_complaint_reminders': {'queue': 'normal'},
        'stations.tasks.cleanup_old_complaint_updates': {'queue': 'low'},
        'stations.tasks.generate_complaint_analytics': {'queue': 'analytics'},
        'stations.tasks.auto_assign_complaints': {'queue': 'normal'},
    },
    
    # Queue definitions with priorities
    task_queues=(
        Queue('critical', routing_key='critical', priority=10),
        Queue('high', routing_key='high', priority=8),
        Queue('normal', routing_key='normal', priority=5),
        Queue('analytics', routing_key='analytics', priority=3),
        Queue('low', routing_key='low', priority=1),
    ),
    
    # Performance optimizations
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
    
    # Result backend configuration
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Task execution settings
    task_soft_time_limit=300,  # 5 minutes
    task_time_limit=600,       # 10 minutes
    
    # Monitoring and logging
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='UTC',
    enable_utc=True,
)

# Enhanced beat schedule with performance monitoring
CELERY_BEAT_SCHEDULE = {
    # Existing tasks
    'convert-matches-every-2-minutes': {
        'task': 'music_monitor.tasks.run_matchcache_to_playlog',
        'schedule': crontab(minute='*/2'),
        'options': {'queue': 'normal'}
    },
    'scan-station-streams-every-2-minutes': {
        'task': 'music_monitor.scan_station_streams',
        'schedule': crontab(minute='*/2'),
        'options': {'queue': 'normal'}
    },
    
    # New enhanced tasks
    'auto-fingerprint-new-tracks': {
        'task': 'music_monitor.auto_fingerprint_new_tracks',
        'schedule': crontab(minute='*/10'),  # every 10 minutes
        'options': {'queue': 'high'}
    },
    'cleanup-old-fingerprints': {
        'task': 'music_monitor.cleanup_old_fingerprints',
        'schedule': crontab(hour=2, minute=0),  # daily at 2 AM
        'options': {'queue': 'low'}
    },
    'update-pro-mappings': {
        'task': 'music_monitor.batch_update_pro_mappings',
        'schedule': crontab(hour=1, minute=0),  # daily at 1 AM
        'options': {'queue': 'normal'}
    },
    'warm-cache-hourly': {
        'task': 'core.enhanced_tasks.warm_cache_task',
        'schedule': crontab(minute=0),  # every hour at minute 0
        'options': {'queue': 'low'}
    },
    # Media security tasks
    'scan-media-files-for-malware': {
        'task': 'artists.services.media_file_service.scan_media_files_for_malware',
        'schedule': crontab(hour=3, minute=0),  # daily at 3 AM
        'options': {'queue': 'normal'}
    },
    'verify-media-file-integrity': {
        'task': 'artists.tasks.verify_media_file_integrity',
        'schedule': crontab(hour=4, minute=0),  # daily at 4 AM
        'options': {'queue': 'normal'}
    },
    'cleanup-failed-uploads': {
        'task': 'artists.tasks.cleanup_failed_uploads',
        'schedule': crontab(hour=5, minute=0),  # daily at 5 AM
        'options': {'queue': 'low'}
    },
    
    # Dispute evidence security tasks
    'verify-evidence-file-integrity': {
        'task': 'disputes.tasks.verify_evidence_file_integrity',
        'schedule': crontab(hour=6, minute=0),  # daily at 6 AM
        'options': {'queue': 'normal'}
    },
    'cleanup-expired-evidence-files': {
        'task': 'disputes.tasks.cleanup_expired_evidence_files',
        'schedule': crontab(hour=7, minute=0),  # daily at 7 AM
        'options': {'queue': 'low'}
    },
    'update-evidence-retention-policies': {
        'task': 'disputes.tasks.update_evidence_retention_policies',
        'schedule': crontab(hour=8, minute=0),  # daily at 8 AM
        'options': {'queue': 'normal'}
    },
    'auto-escalate-old-disputes': {
        'task': 'disputes.tasks.auto_escalate_old_disputes',
        'schedule': crontab(hour=9, minute=0),  # daily at 9 AM
        'options': {'queue': 'normal'}
    },
    'send-dispute-reminders': {
        'task': 'disputes.tasks.send_dispute_reminders',
        'schedule': crontab(hour=10, minute=0),  # daily at 10 AM
        'options': {'queue': 'normal'}
    },
    'cleanup-old-notifications': {
        'task': 'disputes.tasks.cleanup_old_notifications',
        'schedule': crontab(hour=11, minute=0),  # daily at 11 AM
        'options': {'queue': 'low'}
    },
    'generate-dispute-analytics': {
        'task': 'disputes.tasks.generate_dispute_analytics',
        'schedule': crontab(hour=12, minute=0),  # daily at 12 PM
        'options': {'queue': 'analytics'}
    },
    'send-email-notifications': {
        'task': 'disputes.tasks.send_email_notifications',
        'schedule': crontab(minute='*/15'),  # every 15 minutes
        'options': {'queue': 'high'}
    },
    'auto-assign-disputes': {
        'task': 'disputes.tasks.auto_assign_disputes',
        'schedule': crontab(hour='*/2', minute=0),  # every 2 hours
        'options': {'queue': 'normal'}
    },
    
    # File security monitoring tasks
    'monitor-file-security': {
        'task': 'core.services.file_security_monitor.monitor_file_security',
        'schedule': crontab(minute='*/30'),  # every 30 minutes
        'options': {'queue': 'normal'}
    },
    'generate-daily-security-report': {
        'task': 'core.services.file_security_monitor.generate_daily_security_report',
        'schedule': crontab(hour=1, minute=30),  # daily at 1:30 AM
        'options': {'queue': 'analytics'}
    },
    'cleanup-quarantined-files': {
        'task': 'core.tasks.file_security_tasks.cleanup_quarantined_files',
        'schedule': crontab(hour=2, minute=30),  # daily at 2:30 AM
        'options': {'queue': 'low'}
    },
    'batch-scan-existing-files': {
        'task': 'core.tasks.file_security_tasks.batch_scan_existing_files',
        'schedule': crontab(hour=3, minute=30),  # daily at 3:30 AM
        'options': {'queue': 'normal'}
    },
    
    # Station complaint management tasks
    'auto-escalate-old-complaints': {
        'task': 'stations.tasks.auto_escalate_old_complaints',
        'schedule': crontab(hour=8, minute=30),  # daily at 8:30 AM
        'options': {'queue': 'normal'}
    },
    'send-complaint-reminders': {
        'task': 'stations.tasks.send_complaint_reminders',
        'schedule': crontab(hour=14, minute=0),  # daily at 2 PM
        'options': {'queue': 'normal'}
    },
    'cleanup-old-complaint-updates': {
        'task': 'stations.tasks.cleanup_old_complaint_updates',
        'schedule': crontab(hour=1, minute=45, day_of_week=0),  # weekly on Sunday at 1:45 AM
        'options': {'queue': 'low'}
    },
    'generate-complaint-analytics': {
        'task': 'stations.tasks.generate_complaint_analytics',
        'schedule': crontab(hour=13, minute=0),  # daily at 1 PM
        'options': {'queue': 'analytics'}
    },
    'auto-assign-complaints': {
        'task': 'stations.tasks.auto_assign_complaints',
        'schedule': crontab(hour='*/4', minute=0),  # every 4 hours
        'options': {'queue': 'normal'}
    },
}

app.conf.beat_schedule = CELERY_BEAT_SCHEDULE
