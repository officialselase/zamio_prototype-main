"""
Celery tasks for automated file security scanning
"""
import os
import logging
from typing import Dict, Any, Optional
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from accounts.models import AuditLog
from core.services.unified_file_security import UnifiedFileSecurityService
from core.services.file_security_monitor import FileSecurityMonitor

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def scan_uploaded_file(self, file_path: str, file_metadata: Dict[str, Any]):
    """
    Asynchronously scan an uploaded file for security threats
    
    Args:
        file_path: Path to the uploaded file
        file_metadata: Metadata about the file (hash, user_id, category, etc.)
    """
    try:
        # Verify file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found for scanning: {file_path}")
            return {'status': 'error', 'message': 'File not found'}
        
        # Perform security scan
        scan_result = UnifiedFileSecurityService.scan_file_for_threats(file_path)
        
        # Log scan results
        AuditLog.objects.create(
            user_id=file_metadata.get('user_id'),
            action='automated_file_scan_completed',
            resource_type='FileUpload',
            resource_id=file_metadata.get('file_hash', '')[:16],
            request_data={
                'file_path': file_path,
                'file_metadata': file_metadata,
                'scan_result': scan_result,
                'scan_timestamp': timezone.now().isoformat()
            }
        )
        
        # If threats detected, take action
        if not scan_result['is_safe']:
            handle_security_threat.delay(file_path, file_metadata, scan_result)
        
        return {
            'status': 'completed',
            'is_safe': scan_result['is_safe'],
            'threats_found': len(scan_result['threats_found']),
            'scan_time': scan_result['scan_time']
        }
        
    except Exception as e:
        logger.error(f"File security scan failed for {file_path}: {str(e)}")
        raise self.retry(countdown=60 * (self.request.retries + 1))  # Exponential backoff


@shared_task(bind=True, max_retries=2)
def handle_security_threat(self, file_path: str, file_metadata: Dict[str, Any], scan_result: Dict[str, Any]):
    """
    Handle detected security threats in uploaded files
    
    Args:
        file_path: Path to the threatening file
        file_metadata: Metadata about the file
        scan_result: Results from security scan
    """
    try:
        threat_id = f"threat_{file_metadata.get('file_hash', 'unknown')[:16]}"
        
        # Log security threat
        AuditLog.objects.create(
            user_id=file_metadata.get('user_id'),
            action='security_threat_handled',
            resource_type='SecurityThreat',
            resource_id=threat_id,
            request_data={
                'file_path': file_path,
                'file_metadata': file_metadata,
                'scan_result': scan_result,
                'action_taken': 'quarantine_and_alert',
                'handled_at': timezone.now().isoformat()
            }
        )
        
        # Quarantine the file (move to secure location)
        quarantine_result = quarantine_threatening_file.delay(file_path, threat_id)
        
        # Send immediate alert to administrators
        send_security_threat_alert.delay(file_metadata, scan_result, threat_id)
        
        # Update user's security status if needed
        update_user_security_status.delay(
            file_metadata.get('user_id'), 
            'threat_detected',
            {
                'threat_id': threat_id,
                'threats': scan_result['threats_found'],
                'file_category': file_metadata.get('category')
            }
        )
        
        return {
            'status': 'threat_handled',
            'threat_id': threat_id,
            'quarantine_task': quarantine_result.id if quarantine_result else None,
            'handled_at': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to handle security threat for {file_path}: {str(e)}")
        raise self.retry(countdown=300)  # Retry after 5 minutes


@shared_task(bind=True)
def quarantine_threatening_file(self, file_path: str, threat_id: str):
    """
    Quarantine a file that contains security threats
    
    Args:
        file_path: Path to the file to quarantine
        threat_id: Unique identifier for the threat
    """
    try:
        # Create quarantine directory
        quarantine_dir = os.path.join(settings.MEDIA_ROOT, 'quarantine', timezone.now().strftime('%Y/%m/%d'))
        os.makedirs(quarantine_dir, exist_ok=True)
        
        # Generate quarantine filename
        original_filename = os.path.basename(file_path)
        quarantine_filename = f"{threat_id}_{original_filename}"
        quarantine_path = os.path.join(quarantine_dir, quarantine_filename)
        
        # Move file to quarantine
        if os.path.exists(file_path):
            os.rename(file_path, quarantine_path)
            
            # Set restrictive permissions
            os.chmod(quarantine_path, 0o600)
            
            # Log quarantine action
            AuditLog.objects.create(
                user=None,  # System action
                action='file_quarantined',
                resource_type='SecurityThreat',
                resource_id=threat_id,
                request_data={
                    'original_path': file_path,
                    'quarantine_path': quarantine_path,
                    'quarantined_at': timezone.now().isoformat()
                }
            )
            
            logger.info(f"File quarantined: {file_path} -> {quarantine_path}")
            
            return {
                'status': 'quarantined',
                'quarantine_path': quarantine_path,
                'threat_id': threat_id
            }
        else:
            logger.warning(f"File not found for quarantine: {file_path}")
            return {
                'status': 'file_not_found',
                'original_path': file_path
            }
            
    except Exception as e:
        logger.error(f"Failed to quarantine file {file_path}: {str(e)}")
        return {
            'status': 'quarantine_failed',
            'error': str(e)
        }


@shared_task(bind=True)
def send_security_threat_alert(self, file_metadata: Dict[str, Any], scan_result: Dict[str, Any], threat_id: str):
    """
    Send immediate security threat alert to administrators
    
    Args:
        file_metadata: Metadata about the threatening file
        scan_result: Results from security scan
        threat_id: Unique identifier for the threat
    """
    try:
        from django.core.mail import send_mail
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        
        User = get_user_model()
        
        # Get admin emails
        admin_emails = list(
            User.objects.filter(
                Q(admin=True) | Q(user_type='Admin')
            ).values_list('email', flat=True)
        )
        
        if not admin_emails:
            logger.warning("No admin emails found for security threat alert")
            return {'status': 'no_recipients'}
        
        # Get user information
        user_info = "Unknown"
        if file_metadata.get('user_id'):
            try:
                user = User.objects.get(id=file_metadata['user_id'])
                user_info = f"{user.email} (ID: {user.id}, Type: {user.user_type})"
            except User.DoesNotExist:
                user_info = f"User ID: {file_metadata['user_id']} (Not found)"
        
        # Prepare email content
        subject = f"URGENT: Security Threat Detected - {threat_id}"
        
        message_lines = [
            "URGENT SECURITY ALERT",
            "=" * 25,
            "",
            f"Threat ID: {threat_id}",
            f"Detection Time: {scan_result.get('scan_time', 'Unknown')}",
            f"User: {user_info}",
            f"Filename: {file_metadata.get('filename', 'Unknown')}",
            f"File Category: {file_metadata.get('category', 'Unknown')}",
            f"File Size: {file_metadata.get('file_size', 0)} bytes",
            "",
            "Threats Detected:",
            "-" * 18
        ]
        
        for i, threat in enumerate(scan_result.get('threats_found', [])[:10], 1):
            message_lines.append(f"{i}. {threat}")
        
        if len(scan_result.get('threats_found', [])) > 10:
            message_lines.append(f"... and {len(scan_result['threats_found']) - 10} more threats")
        
        message_lines.extend([
            "",
            "Actions Taken:",
            "- File has been quarantined",
            "- User activity is being monitored",
            "- Incident has been logged",
            "",
            "Please review the threat immediately and take appropriate action.",
            "",
            "This is an automated alert from ZamIO Security System."
        ])
        
        message = "\n".join(message_lines)
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False
        )
        
        logger.info(f"Security threat alert sent for {threat_id} to {len(admin_emails)} administrators")
        
        return {
            'status': 'alert_sent',
            'recipients': len(admin_emails),
            'threat_id': threat_id
        }
        
    except Exception as e:
        logger.error(f"Failed to send security threat alert for {threat_id}: {str(e)}")
        return {
            'status': 'alert_failed',
            'error': str(e)
        }


@shared_task(bind=True)
def update_user_security_status(self, user_id: int, status: str, details: Dict[str, Any]):
    """
    Update user's security status based on detected threats
    
    Args:
        user_id: ID of the user
        status: Security status ('threat_detected', 'suspicious_activity', etc.)
        details: Additional details about the security event
    """
    try:
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.warning(f"User not found for security status update: {user_id}")
            return {'status': 'user_not_found'}
        
        # Log security status update
        AuditLog.objects.create(
            user=user,
            action='user_security_status_updated',
            resource_type='UserSecurity',
            resource_id=str(user_id),
            request_data={
                'security_status': status,
                'details': details,
                'updated_at': timezone.now().isoformat()
            }
        )
        
        # Check if user has multiple security incidents
        recent_threats = AuditLog.objects.filter(
            user=user,
            action__in=['security_threat_handled', 'file_security_threat_detected'],
            timestamp__gte=timezone.now() - timezone.timedelta(hours=24)
        ).count()
        
        # If user has multiple threats, consider additional actions
        if recent_threats >= 3:
            # Log suspicious user activity
            AuditLog.objects.create(
                user=user,
                action='suspicious_user_activity_detected',
                resource_type='UserSecurity',
                resource_id=str(user_id),
                request_data={
                    'recent_threats_count': recent_threats,
                    'status': 'multiple_threats_detected',
                    'recommendation': 'review_user_account',
                    'detected_at': timezone.now().isoformat()
                }
            )
            
            # Send alert about suspicious user
            send_suspicious_user_alert.delay(user_id, recent_threats)
        
        return {
            'status': 'updated',
            'user_id': user_id,
            'security_status': status,
            'recent_threats': recent_threats
        }
        
    except Exception as e:
        logger.error(f"Failed to update user security status for user {user_id}: {str(e)}")
        return {
            'status': 'update_failed',
            'error': str(e)
        }


@shared_task(bind=True)
def send_suspicious_user_alert(self, user_id: int, threat_count: int):
    """
    Send alert about suspicious user activity
    
    Args:
        user_id: ID of the suspicious user
        threat_count: Number of recent threats from this user
    """
    try:
        from django.core.mail import send_mail
        from django.contrib.auth import get_user_model
        from django.db.models import Q
        
        User = get_user_model()
        
        # Get user information
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            logger.warning(f"User not found for suspicious activity alert: {user_id}")
            return {'status': 'user_not_found'}
        
        # Get admin emails
        admin_emails = list(
            User.objects.filter(
                Q(admin=True) | Q(user_type='Admin')
            ).values_list('email', flat=True)
        )
        
        if not admin_emails:
            return {'status': 'no_recipients'}
        
        # Prepare email content
        subject = f"Suspicious User Activity Alert - {user.email}"
        
        message_lines = [
            "SUSPICIOUS USER ACTIVITY ALERT",
            "=" * 32,
            "",
            f"User: {user.email}",
            f"User ID: {user.id}",
            f"User Type: {user.user_type}",
            f"Account Created: {user.timestamp.strftime('%Y-%m-%d %H:%M:%S') if hasattr(user, 'timestamp') else 'Unknown'}",
            "",
            f"Recent Security Threats: {threat_count} in the last 24 hours",
            "",
            "Recommended Actions:",
            "- Review user's recent file uploads",
            "- Check user's account activity",
            "- Consider temporary restrictions if necessary",
            "- Investigate potential account compromise",
            "",
            "Please review this user's activity immediately.",
            "",
            "This is an automated alert from ZamIO Security System."
        ]
        
        message = "\n".join(message_lines)
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False
        )
        
        logger.info(f"Suspicious user alert sent for user {user_id} to {len(admin_emails)} administrators")
        
        return {
            'status': 'alert_sent',
            'user_id': user_id,
            'recipients': len(admin_emails)
        }
        
    except Exception as e:
        logger.error(f"Failed to send suspicious user alert for user {user_id}: {str(e)}")
        return {
            'status': 'alert_failed',
            'error': str(e)
        }


@shared_task(bind=True)
def cleanup_quarantined_files(self, days_old: int = 30):
    """
    Clean up quarantined files older than specified days
    
    Args:
        days_old: Number of days after which to delete quarantined files
    """
    try:
        quarantine_base = os.path.join(settings.MEDIA_ROOT, 'quarantine')
        
        if not os.path.exists(quarantine_base):
            return {'status': 'no_quarantine_directory'}
        
        cutoff_time = timezone.now() - timezone.timedelta(days=days_old)
        deleted_count = 0
        total_size_freed = 0
        
        # Walk through quarantine directory
        for root, dirs, files in os.walk(quarantine_base):
            for file in files:
                file_path = os.path.join(root, file)
                
                try:
                    # Check file modification time
                    file_mtime = timezone.datetime.fromtimestamp(
                        os.path.getmtime(file_path),
                        tz=timezone.get_current_timezone()
                    )
                    
                    if file_mtime < cutoff_time:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        deleted_count += 1
                        total_size_freed += file_size
                        
                        logger.info(f"Deleted old quarantined file: {file_path}")
                
                except Exception as e:
                    logger.error(f"Failed to delete quarantined file {file_path}: {str(e)}")
        
        # Log cleanup activity
        AuditLog.objects.create(
            user=None,  # System task
            action='quarantine_cleanup_completed',
            resource_type='System',
            resource_id='quarantine_cleanup',
            request_data={
                'files_deleted': deleted_count,
                'size_freed_bytes': total_size_freed,
                'days_old_threshold': days_old,
                'cleanup_time': timezone.now().isoformat()
            }
        )
        
        return {
            'status': 'completed',
            'files_deleted': deleted_count,
            'size_freed_mb': round(total_size_freed / (1024 * 1024), 2),
            'days_old': days_old
        }
        
    except Exception as e:
        logger.error(f"Quarantine cleanup failed: {str(e)}")
        return {
            'status': 'cleanup_failed',
            'error': str(e)
        }


@shared_task(bind=True)
def batch_scan_existing_files(self, file_category: Optional[str] = None, limit: int = 100):
    """
    Batch scan existing files for security threats
    
    Args:
        file_category: Specific category to scan (optional)
        limit: Maximum number of files to scan in this batch
    """
    try:
        from django.apps import apps
        
        scanned_count = 0
        threats_found = 0
        
        # Get file models to scan based on category
        models_to_scan = []
        
        if not file_category or file_category == 'image':
            # Scan station photos
            Station = apps.get_model('stations', 'Station')
            stations_with_photos = Station.objects.filter(
                photo__isnull=False
            ).exclude(photo='')[:limit//4 if not file_category else limit]
            
            for station in stations_with_photos:
                if station.photo and hasattr(station.photo, 'path'):
                    scan_result = scan_uploaded_file.delay(
                        station.photo.path,
                        {
                            'user_id': station.user_id,
                            'category': 'image',
                            'entity_type': 'Station',
                            'entity_id': str(station.id),
                            'filename': os.path.basename(station.photo.name),
                            'file_size': station.photo.size if hasattr(station.photo, 'size') else 0
                        }
                    )
                    scanned_count += 1
        
        if not file_category or file_category == 'audio':
            # Scan audio match clips
            AudioMatch = apps.get_model('streamer', 'AudioMatch')
            audio_matches_with_clips = AudioMatch.objects.filter(
                clip_file__isnull=False
            ).exclude(clip_file='')[:limit//4 if not file_category else limit]
            
            for match in audio_matches_with_clips:
                if match.clip_file and hasattr(match.clip_file, 'path'):
                    scan_result = scan_uploaded_file.delay(
                        match.clip_file.path,
                        {
                            'user_id': None,  # System generated
                            'category': 'audio',
                            'entity_type': 'AudioMatch',
                            'entity_id': str(match.id),
                            'filename': os.path.basename(match.clip_file.name),
                            'file_size': match.clip_file.size if hasattr(match.clip_file, 'size') else 0
                        }
                    )
                    scanned_count += 1
        
        # Log batch scan activity
        AuditLog.objects.create(
            user=None,  # System task
            action='batch_file_scan_initiated',
            resource_type='System',
            resource_id='batch_scanner',
            request_data={
                'file_category': file_category,
                'files_queued_for_scan': scanned_count,
                'scan_limit': limit,
                'initiated_at': timezone.now().isoformat()
            }
        )
        
        return {
            'status': 'batch_scan_initiated',
            'files_queued': scanned_count,
            'category': file_category,
            'limit': limit
        }
        
    except Exception as e:
        logger.error(f"Batch file scan failed: {str(e)}")
        return {
            'status': 'batch_scan_failed',
            'error': str(e)
        }