from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta
import logging

from .models import Dispute, DisputeStatus, DisputeNotification
from .workflow import DisputeWorkflow

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def auto_escalate_old_disputes():
    """
    Automatically escalate disputes that have been open too long
    """
    # Find disputes older than 30 days in review status
    cutoff_date = timezone.now() - timedelta(days=30)
    
    old_disputes = Dispute.objects.filter(
        status__in=[DisputeStatus.UNDER_REVIEW, DisputeStatus.EVIDENCE_REQUIRED],
        created_at__lt=cutoff_date
    )
    
    escalated_count = 0
    workflow = DisputeWorkflow()
    
    for dispute in old_disputes:
        try:
            # Create a system user for automated actions
            system_user, _ = User.objects.get_or_create(
                username='system',
                defaults={
                    'email': 'system@zamio.com',
                    'user_type': 'Admin',
                    'is_active': False
                }
            )
            
            workflow.transition_state(
                dispute=dispute,
                new_status=DisputeStatus.ESCALATED,
                actor=system_user,
                reason='Automatically escalated due to extended resolution time (30+ days)',
                notify=True
            )
            
            escalated_count += 1
            logger.info(f"Auto-escalated dispute {dispute.dispute_id}")
            
        except Exception as e:
            logger.error(f"Failed to auto-escalate dispute {dispute.dispute_id}: {str(e)}")
    
    return f"Auto-escalated {escalated_count} disputes"


@shared_task
def send_dispute_reminders():
    """
    Send reminders for disputes requiring attention
    """
    # Find disputes assigned but not updated in 7 days
    reminder_date = timezone.now() - timedelta(days=7)
    
    stale_disputes = Dispute.objects.filter(
        status__in=[
            DisputeStatus.UNDER_REVIEW,
            DisputeStatus.EVIDENCE_REQUIRED,
            DisputeStatus.MEDIATION
        ],
        assigned_to__isnull=False,
        updated_at__lt=reminder_date
    )
    
    reminder_count = 0
    
    for dispute in stale_disputes:
        try:
            # Send reminder to assigned user
            DisputeNotification.objects.create(
                dispute=dispute,
                recipient=dispute.assigned_to,
                notification_type='reminder',
                title=f'Dispute Reminder: {dispute.title}',
                message=f'This dispute has been assigned to you for {(timezone.now() - dispute.updated_at).days} days '
                       f'without updates. Please review and take action.'
            )
            
            reminder_count += 1
            logger.info(f"Sent reminder for dispute {dispute.dispute_id}")
            
        except Exception as e:
            logger.error(f"Failed to send reminder for dispute {dispute.dispute_id}: {str(e)}")
    
    return f"Sent {reminder_count} dispute reminders"


@shared_task
def cleanup_old_notifications():
    """
    Clean up old read notifications to prevent database bloat
    """
    # Delete read notifications older than 90 days
    cutoff_date = timezone.now() - timedelta(days=90)
    
    old_notifications = DisputeNotification.objects.filter(
        read_at__isnull=False,
        read_at__lt=cutoff_date
    )
    
    deleted_count = old_notifications.count()
    old_notifications.delete()
    
    logger.info(f"Cleaned up {deleted_count} old notifications")
    return f"Cleaned up {deleted_count} old notifications"


@shared_task
def generate_dispute_analytics():
    """
    Generate and cache dispute analytics data
    """
    from django.core.cache import cache
    from django.db.models import Count, Avg
    
    try:
        # Calculate various metrics
        total_disputes = Dispute.objects.count()
        
        # Status distribution
        status_distribution = dict(
            Dispute.objects.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        # Type distribution
        type_distribution = dict(
            Dispute.objects.values('dispute_type')
            .annotate(count=Count('id'))
            .values_list('dispute_type', 'count')
        )
        
        # Average resolution time for resolved disputes
        resolved_disputes = Dispute.objects.filter(
            status=DisputeStatus.RESOLVED,
            resolved_at__isnull=False
        )
        
        avg_resolution_time = 0
        if resolved_disputes.exists():
            resolution_times = []
            for dispute in resolved_disputes:
                delta = dispute.resolved_at - dispute.created_at
                resolution_times.append(delta.total_seconds() / 86400)  # Convert to days
            
            avg_resolution_time = sum(resolution_times) / len(resolution_times)
        
        # Monthly trends (last 12 months)
        monthly_trends = []
        for i in range(12):
            month_start = timezone.now().replace(day=1) - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=30)
            
            monthly_count = Dispute.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).count()
            
            monthly_trends.append({
                'month': month_start.strftime('%Y-%m'),
                'count': monthly_count
            })
        
        # Cache the analytics data
        analytics_data = {
            'total_disputes': total_disputes,
            'status_distribution': status_distribution,
            'type_distribution': type_distribution,
            'avg_resolution_time': round(avg_resolution_time, 2),
            'monthly_trends': list(reversed(monthly_trends)),
            'generated_at': timezone.now().isoformat()
        }
        
        cache.set('dispute_analytics', analytics_data, timeout=3600)  # Cache for 1 hour
        
        logger.info("Generated dispute analytics data")
        return "Analytics data generated and cached"
        
    except Exception as e:
        logger.error(f"Failed to generate dispute analytics: {str(e)}")
        return f"Failed to generate analytics: {str(e)}"


@shared_task
def send_email_notifications():
    """
    Send email notifications for disputes that haven't been sent yet
    """
    # Find notifications that need email sending
    pending_notifications = DisputeNotification.objects.filter(
        email_sent=False,
        recipient__email__isnull=False
    ).select_related('dispute', 'recipient')
    
    sent_count = 0
    
    for notification in pending_notifications:
        try:
            # Import here to avoid circular imports
            from django.core.mail import send_mail
            from django.conf import settings
            
            subject = f"[ZamIO Disputes] {notification.title}"
            message = f"""
            Dear {notification.recipient.first_name or notification.recipient.username},
            
            {notification.message}
            
            Dispute ID: {notification.dispute.dispute_id}
            Dispute Title: {notification.dispute.title}
            Status: {notification.dispute.get_status_display()}
            
            Please log in to the ZamIO platform to view more details.
            
            Best regards,
            ZamIO Dispute Resolution Team
            """
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.recipient.email],
                fail_silently=False
            )
            
            # Mark as sent
            notification.email_sent = True
            notification.save(update_fields=['email_sent'])
            
            sent_count += 1
            logger.info(f"Sent email notification to {notification.recipient.email}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification {notification.id}: {str(e)}")
    
    return f"Sent {sent_count} email notifications"


@shared_task
def auto_assign_disputes():
    """
    Automatically assign unassigned disputes to available mediators
    """
    # Find unassigned disputes older than 24 hours
    assignment_date = timezone.now() - timedelta(hours=24)
    
    unassigned_disputes = Dispute.objects.filter(
        assigned_to__isnull=True,
        status=DisputeStatus.UNDER_REVIEW,
        created_at__lt=assignment_date
    )
    
    # Get available mediators (users with Mediator role)
    available_mediators = User.objects.filter(
        user_type='Mediator',
        is_active=True
    )
    
    if not available_mediators.exists():
        return "No available mediators for auto-assignment"
    
    assigned_count = 0
    workflow = DisputeWorkflow()
    
    for dispute in unassigned_disputes:
        try:
            # Simple round-robin assignment
            # In a more sophisticated system, this could consider workload, expertise, etc.
            mediator_index = assigned_count % available_mediators.count()
            mediator = available_mediators[mediator_index]
            
            workflow.assign_dispute(
                dispute=dispute,
                assignee=mediator,
                actor=mediator,  # System assignment
                reason='Automatically assigned due to no manual assignment within 24 hours',
                notify=True
            )
            
            assigned_count += 1
            logger.info(f"Auto-assigned dispute {dispute.dispute_id} to {mediator.username}")
            
        except Exception as e:
            logger.error(f"Failed to auto-assign dispute {dispute.dispute_id}: {str(e)}")
    
    return f"Auto-assigned {assigned_count} disputes"


@shared_task
def verify_evidence_file_integrity():
    """
    Verify integrity of evidence files using stored hashes
    """
    from .models import DisputeEvidence
    from accounts.models import AuditLog
    
    # Get evidence files that have hashes and haven't been checked recently
    check_date = timezone.now() - timedelta(days=7)  # Check weekly
    
    evidence_files = DisputeEvidence.objects.filter(
        file__isnull=False,
        file_hash__isnull=False,
        is_quarantined=False,
        updated_at__lt=check_date
    )[:100]  # Limit to 100 files per run
    
    verified_count = 0
    corrupted_count = 0
    error_count = 0
    
    # Get system user for audit logging
    system_user, _ = User.objects.get_or_create(
        username='system',
        defaults={
            'email': 'system@zamio.com',
            'user_type': 'Admin',
            'is_active': False
        }
    )
    
    for evidence in evidence_files:
        try:
            is_valid = evidence.verify_file_integrity()
            
            if is_valid:
                verified_count += 1
                # Update the updated_at field to mark as recently checked
                evidence.save(update_fields=['updated_at'])
                
            else:
                corrupted_count += 1
                # Quarantine corrupted file
                evidence.quarantine_file("File integrity check failed - file may be corrupted")
                
                # Log corruption
                AuditLog.objects.create(
                    user=system_user,
                    action='evidence_integrity_failure',
                    resource_type='DisputeEvidence',
                    resource_id=str(evidence.id),
                    request_data={
                        'dispute_id': str(evidence.dispute.dispute_id),
                        'file_path': evidence.file.name,
                        'stored_hash': evidence.file_hash,
                        'check_timestamp': timezone.now().isoformat(),
                        'action_taken': 'quarantined'
                    }
                )
                
                logger.warning(f"Evidence file {evidence.id} failed integrity check and was quarantined")
                
        except Exception as e:
            error_count += 1
            logger.error(f"Error checking integrity of evidence {evidence.id}: {str(e)}")
    
    # Log summary
    AuditLog.objects.create(
        user=system_user,
        action='evidence_integrity_check_completed',
        resource_type='System',
        resource_id='integrity_check',
        request_data={
            'files_checked': len(evidence_files),
            'verified': verified_count,
            'corrupted': corrupted_count,
            'errors': error_count,
            'timestamp': timezone.now().isoformat()
        }
    )
    
    return f"Integrity check completed: {verified_count} verified, {corrupted_count} corrupted, {error_count} errors"


@shared_task
def cleanup_expired_evidence_files():
    """
    Clean up evidence files that have exceeded their retention period
    """
    from .services.evidence_security_service import EvidenceRetentionService
    from accounts.models import AuditLog
    
    # Get system user for audit logging
    system_user, _ = User.objects.get_or_create(
        username='system',
        defaults={
            'email': 'system@zamio.com',
            'user_type': 'Admin',
            'is_active': False
        }
    )
    
    try:
        # Get files eligible for deletion
        eligible_files = EvidenceRetentionService.get_evidence_files_for_deletion()
        
        if not eligible_files:
            return "No evidence files are eligible for deletion"
        
        # Limit to 50 files per run to avoid overwhelming the system
        files_to_delete = eligible_files[:50]
        
        deleted_count = 0
        error_count = 0
        
        for file_info in files_to_delete:
            evidence_id = file_info['evidence_id']
            reason = f"Retention policy: {file_info['reason']}"
            
            try:
                success = EvidenceRetentionService.delete_evidence_file(
                    evidence_id=evidence_id,
                    reason=reason,
                    deleted_by=system_user
                )
                
                if success:
                    deleted_count += 1
                    logger.info(f"Deleted evidence {evidence_id} due to retention policy")
                else:
                    error_count += 1
                    logger.error(f"Failed to delete evidence {evidence_id}")
                    
            except Exception as e:
                error_count += 1
                logger.error(f"Error deleting evidence {evidence_id}: {str(e)}")
        
        # Log cleanup summary
        AuditLog.objects.create(
            user=system_user,
            action='evidence_retention_cleanup',
            resource_type='System',
            resource_id='retention_cleanup',
            request_data={
                'total_eligible': len(eligible_files),
                'processed': len(files_to_delete),
                'deleted': deleted_count,
                'errors': error_count,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return f"Retention cleanup completed: {deleted_count} files deleted, {error_count} errors"
        
    except Exception as e:
        logger.error(f"Evidence retention cleanup failed: {str(e)}")
        return f"Retention cleanup failed: {str(e)}"


@shared_task
def update_evidence_retention_policies():
    """
    Update retention policies for evidence files based on current dispute status
    """
    from .models import DisputeEvidence
    from .services.evidence_security_service import EvidenceRetentionService
    from accounts.models import AuditLog
    
    # Get system user for audit logging
    system_user, _ = User.objects.get_or_create(
        username='system',
        defaults={
            'email': 'system@zamio.com',
            'user_type': 'Admin',
            'is_active': False
        }
    )
    
    try:
        # Get evidence files that need policy updates
        evidence_files = DisputeEvidence.objects.select_related('dispute').filter(
            dispute__updated_at__gte=timezone.now() - timedelta(days=1)  # Updated in last day
        )
        
        updated_count = 0
        
        for evidence in evidence_files:
            try:
                # Get current retention policy
                policy = EvidenceRetentionService.get_retention_policy(
                    evidence.dispute.status,
                    evidence.dispute.resolved_at
                )
                
                # Update if policy has changed
                if (evidence.retention_policy != policy['policy'] or 
                    evidence.delete_after != policy['delete_after']):
                    
                    evidence.retention_policy = policy['policy']
                    evidence.delete_after = policy['delete_after']
                    evidence.save(update_fields=['retention_policy', 'delete_after'])
                    
                    updated_count += 1
                    
            except Exception as e:
                logger.error(f"Error updating retention policy for evidence {evidence.id}: {str(e)}")
        
        # Log update summary
        AuditLog.objects.create(
            user=system_user,
            action='evidence_retention_policies_updated',
            resource_type='System',
            resource_id='retention_update',
            request_data={
                'files_processed': len(evidence_files),
                'policies_updated': updated_count,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return f"Retention policy update completed: {updated_count} policies updated"
        
    except Exception as e:
        logger.error(f"Evidence retention policy update failed: {str(e)}")
        return f"Retention policy update failed: {str(e)}"