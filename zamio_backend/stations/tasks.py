from celery import shared_task
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
import logging

from .models import Complaint, ComplaintUpdate
from notifications.models import Notification

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task
def send_complaint_notification(complaint_id, notification_type, recipient_type='all'):
    """
    Send notifications for complaint events
    
    Args:
        complaint_id: ID of the complaint
        notification_type: Type of notification (created, updated, assigned, resolved, etc.)
        recipient_type: Who should receive the notification (complainant, assignee, admin, all)
    """
    try:
        complaint = Complaint.objects.select_related(
            'station', 'complainant', 'assigned_to', 'resolved_by'
        ).get(id=complaint_id)
    except Complaint.DoesNotExist:
        logger.error(f"Complaint {complaint_id} not found for notification")
        return f"Complaint {complaint_id} not found"

    recipients = []
    
    # Determine recipients based on type
    if recipient_type in ['complainant', 'all']:
        recipients.append(complaint.complainant)
    
    if recipient_type in ['assignee', 'all'] and complaint.assigned_to:
        recipients.append(complaint.assigned_to)
    
    if recipient_type in ['admin', 'all']:
        # Get admin users
        admin_users = User.objects.filter(
            user_type__in=['Admin', 'SuperAdmin'],
            is_active=True
        )
        recipients.extend(admin_users)
    
    # Remove duplicates
    recipients = list(set(recipients))
    
    # Generate notification content
    notification_content = _generate_notification_content(complaint, notification_type)
    
    notifications_created = 0
    emails_sent = 0
    
    for recipient in recipients:
        try:
            # Create in-app notification
            Notification.objects.create(
                user=recipient,
                title=notification_content['title'],
                message=notification_content['message'],
                type='Compliance',  # Using existing notification type
                read=False,
                active=True
            )
            notifications_created += 1
            
            # Send email notification if recipient has email
            if recipient.email and notification_content.get('send_email', True):
                try:
                    send_mail(
                        subject=f"[ZamIO Complaints] {notification_content['title']}",
                        message=notification_content['email_message'],
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[recipient.email],
                        fail_silently=False
                    )
                    emails_sent += 1
                    logger.info(f"Sent complaint notification email to {recipient.email}")
                except Exception as e:
                    logger.error(f"Failed to send email to {recipient.email}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Failed to create notification for user {recipient.id}: {str(e)}")
    
    logger.info(f"Complaint {complaint.complaint_id}: Created {notifications_created} notifications, sent {emails_sent} emails")
    return f"Created {notifications_created} notifications, sent {emails_sent} emails"


def _generate_notification_content(complaint, notification_type):
    """Generate notification content based on complaint and notification type"""
    
    base_info = {
        'complaint_id': complaint.complaint_id,
        'subject': complaint.subject,
        'station_name': complaint.station.name,
        'status': complaint.get_status_display(),
        'priority': complaint.get_priority_display(),
    }
    
    content_map = {
        'created': {
            'title': f'New Complaint Filed: {complaint.complaint_id}',
            'message': f'A new complaint has been filed for station {complaint.station.name}: {complaint.subject}',
            'email_message': f'''
A new complaint has been filed in the ZamIO platform.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- Priority: {complaint.get_priority_display()}
- Filed by: {complaint.complainant.username}
- Filed on: {complaint.created_at.strftime('%Y-%m-%d %H:%M:%S')}

Description:
{complaint.description}

Please log in to the ZamIO platform to review and take action on this complaint.
            ''',
            'send_email': True
        },
        'status_updated': {
            'title': f'Complaint Status Updated: {complaint.complaint_id}',
            'message': f'Complaint {complaint.complaint_id} status has been updated to {complaint.get_status_display()}',
            'email_message': f'''
The status of complaint {complaint.complaint_id} has been updated.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- New Status: {complaint.get_status_display()}
- Updated on: {complaint.updated_at.strftime('%Y-%m-%d %H:%M:%S')}

{f"Resolution Notes: {complaint.resolution_notes}" if complaint.resolution_notes else ""}

Please log in to the ZamIO platform to view the full details.
            ''',
            'send_email': True
        },
        'assigned': {
            'title': f'Complaint Assigned: {complaint.complaint_id}',
            'message': f'Complaint {complaint.complaint_id} has been assigned to {complaint.assigned_to.username if complaint.assigned_to else "you"}',
            'email_message': f'''
A complaint has been assigned to you in the ZamIO platform.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- Priority: {complaint.get_priority_display()}
- Status: {complaint.get_status_display()}
- Assigned on: {complaint.updated_at.strftime('%Y-%m-%d %H:%M:%S')}

Description:
{complaint.description}

Please log in to the ZamIO platform to review and take action on this complaint.
            ''',
            'send_email': True
        },
        'updated': {
            'title': f'Complaint Updated: {complaint.complaint_id}',
            'message': f'New update added to complaint {complaint.complaint_id}',
            'email_message': f'''
A new update has been added to complaint {complaint.complaint_id}.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- Status: {complaint.get_status_display()}
- Updated on: {complaint.updated_at.strftime('%Y-%m-%d %H:%M:%S')}

Please log in to the ZamIO platform to view the latest updates.
            ''',
            'send_email': False  # Don't send email for general updates to avoid spam
        },
        'resolved': {
            'title': f'Complaint Resolved: {complaint.complaint_id}',
            'message': f'Complaint {complaint.complaint_id} has been resolved',
            'email_message': f'''
Your complaint has been resolved.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- Resolved by: {complaint.resolved_by.username if complaint.resolved_by else 'System'}
- Resolved on: {complaint.resolved_at.strftime('%Y-%m-%d %H:%M:%S') if complaint.resolved_at else 'N/A'}

{f"Resolution Notes: {complaint.resolution_notes}" if complaint.resolution_notes else ""}

Thank you for using the ZamIO complaint system.
            ''',
            'send_email': True
        }
    }
    
    return content_map.get(notification_type, {
        'title': f'Complaint Notification: {complaint.complaint_id}',
        'message': f'There has been an update to complaint {complaint.complaint_id}',
        'email_message': f'Please check the ZamIO platform for updates to complaint {complaint.complaint_id}.',
        'send_email': False
    })


@shared_task
def auto_escalate_old_complaints():
    """
    Automatically escalate complaints that have been open too long
    """
    # Find complaints older than 7 days in open status
    cutoff_date = timezone.now() - timedelta(days=7)
    
    old_complaints = Complaint.objects.filter(
        status='open',
        created_at__lt=cutoff_date,
        is_archived=False
    )
    
    escalated_count = 0
    
    # Get system user for automated actions
    system_user, _ = User.objects.get_or_create(
        username='system',
        defaults={
            'email': 'system@zamio.com',
            'user_type': 'Admin',
            'is_active': False
        }
    )
    
    for complaint in old_complaints:
        try:
            # Update priority to high if not already urgent
            if complaint.priority not in ['high', 'urgent']:
                old_priority = complaint.priority
                complaint.priority = 'high'
                complaint.save()
                
                # Create update record
                ComplaintUpdate.objects.create(
                    complaint=complaint,
                    user=system_user,
                    update_type='comment',
                    message=f'Priority automatically escalated from {old_priority} to high due to extended open time (7+ days)'
                )
                
                # Send notification
                send_complaint_notification.delay(
                    complaint_id=complaint.id,
                    notification_type='updated',
                    recipient_type='admin'
                )
                
                escalated_count += 1
                logger.info(f"Auto-escalated complaint {complaint.complaint_id}")
            
        except Exception as e:
            logger.error(f"Failed to auto-escalate complaint {complaint.complaint_id}: {str(e)}")
    
    return f"Auto-escalated {escalated_count} complaints"


@shared_task
def send_complaint_reminders():
    """
    Send reminders for complaints requiring attention
    """
    # Find complaints assigned but not updated in 3 days
    reminder_date = timezone.now() - timedelta(days=3)
    
    stale_complaints = Complaint.objects.filter(
        status__in=['open', 'investigating'],
        assigned_to__isnull=False,
        updated_at__lt=reminder_date,
        is_archived=False
    ).select_related('assigned_to', 'station')
    
    reminder_count = 0
    
    for complaint in stale_complaints:
        try:
            # Create reminder notification
            Notification.objects.create(
                user=complaint.assigned_to,
                title=f'Complaint Reminder: {complaint.complaint_id}',
                message=f'Complaint {complaint.complaint_id} for {complaint.station.name} has been assigned to you for {(timezone.now() - complaint.updated_at).days} days without updates.',
                type='Compliance',
                read=False,
                active=True
            )
            
            # Send email reminder
            if complaint.assigned_to.email:
                try:
                    send_mail(
                        subject=f"[ZamIO Complaints] Reminder: {complaint.complaint_id}",
                        message=f'''
This is a reminder about a complaint assigned to you.

Complaint Details:
- ID: {complaint.complaint_id}
- Station: {complaint.station.name}
- Subject: {complaint.subject}
- Status: {complaint.get_status_display()}
- Priority: {complaint.get_priority_display()}
- Days since last update: {(timezone.now() - complaint.updated_at).days}

Please log in to the ZamIO platform to review and update this complaint.
                        ''',
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[complaint.assigned_to.email],
                        fail_silently=False
                    )
                except Exception as e:
                    logger.error(f"Failed to send reminder email for complaint {complaint.complaint_id}: {str(e)}")
            
            reminder_count += 1
            logger.info(f"Sent reminder for complaint {complaint.complaint_id}")
            
        except Exception as e:
            logger.error(f"Failed to send reminder for complaint {complaint.complaint_id}: {str(e)}")
    
    return f"Sent {reminder_count} complaint reminders"


@shared_task
def cleanup_old_complaint_updates():
    """
    Clean up old complaint updates to prevent database bloat
    """
    # Keep only the last 50 updates per complaint and delete older ones
    cutoff_date = timezone.now() - timedelta(days=365)  # Keep updates for 1 year
    
    # Get complaints with many updates
    complaints_with_updates = Complaint.objects.filter(
        updates__created_at__lt=cutoff_date
    ).distinct()
    
    deleted_count = 0
    
    for complaint in complaints_with_updates:
        try:
            # Keep the 50 most recent updates
            updates_to_keep = ComplaintUpdate.objects.filter(
                complaint=complaint
            ).order_by('-created_at')[:50].values_list('id', flat=True)
            
            # Delete older updates
            old_updates = ComplaintUpdate.objects.filter(
                complaint=complaint,
                created_at__lt=cutoff_date
            ).exclude(id__in=updates_to_keep)
            
            count = old_updates.count()
            old_updates.delete()
            deleted_count += count
            
        except Exception as e:
            logger.error(f"Failed to cleanup updates for complaint {complaint.complaint_id}: {str(e)}")
    
    logger.info(f"Cleaned up {deleted_count} old complaint updates")
    return f"Cleaned up {deleted_count} old complaint updates"


@shared_task
def generate_complaint_analytics():
    """
    Generate and cache complaint analytics data
    """
    from django.core.cache import cache
    from django.db.models import Count, Avg
    
    try:
        # Calculate various metrics
        total_complaints = Complaint.objects.filter(is_archived=False).count()
        
        # Status distribution
        status_distribution = dict(
            Complaint.objects.filter(is_archived=False)
            .values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        
        # Type distribution
        type_distribution = dict(
            Complaint.objects.filter(is_archived=False)
            .values('complaint_type')
            .annotate(count=Count('id'))
            .values_list('complaint_type', 'count')
        )
        
        # Priority distribution
        priority_distribution = dict(
            Complaint.objects.filter(is_archived=False)
            .values('priority')
            .annotate(count=Count('id'))
            .values_list('priority', 'count')
        )
        
        # Average resolution time for resolved complaints
        resolved_complaints = Complaint.objects.filter(
            status='resolved',
            resolved_at__isnull=False,
            is_archived=False
        )
        
        avg_resolution_time = 0
        if resolved_complaints.exists():
            resolution_times = []
            for complaint in resolved_complaints:
                delta = complaint.resolved_at - complaint.created_at
                resolution_times.append(delta.total_seconds() / 86400)  # Convert to days
            
            avg_resolution_time = sum(resolution_times) / len(resolution_times)
        
        # Monthly trends (last 12 months)
        monthly_trends = []
        for i in range(12):
            month_start = timezone.now().replace(day=1) - timedelta(days=30 * i)
            month_end = month_start + timedelta(days=30)
            
            monthly_count = Complaint.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end,
                is_archived=False
            ).count()
            
            monthly_trends.append({
                'month': month_start.strftime('%Y-%m'),
                'count': monthly_count
            })
        
        # Station-wise complaint distribution (top 10)
        station_distribution = dict(
            Complaint.objects.filter(is_archived=False)
            .values('station__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
            .values_list('station__name', 'count')
        )
        
        # Cache the analytics data
        analytics_data = {
            'total_complaints': total_complaints,
            'status_distribution': status_distribution,
            'type_distribution': type_distribution,
            'priority_distribution': priority_distribution,
            'avg_resolution_time': round(avg_resolution_time, 2),
            'monthly_trends': list(reversed(monthly_trends)),
            'station_distribution': station_distribution,
            'generated_at': timezone.now().isoformat()
        }
        
        cache.set('complaint_analytics', analytics_data, timeout=3600)  # Cache for 1 hour
        
        logger.info("Generated complaint analytics data")
        return "Analytics data generated and cached"
        
    except Exception as e:
        logger.error(f"Failed to generate complaint analytics: {str(e)}")
        return f"Failed to generate analytics: {str(e)}"


@shared_task
def auto_assign_complaints():
    """
    Automatically assign unassigned complaints to available staff
    """
    # Find unassigned complaints older than 2 hours
    assignment_date = timezone.now() - timedelta(hours=2)
    
    unassigned_complaints = Complaint.objects.filter(
        assigned_to__isnull=True,
        status='open',
        created_at__lt=assignment_date,
        is_archived=False
    )
    
    # Get available staff (users with Admin or Mediator role)
    available_staff = User.objects.filter(
        user_type__in=['Admin', 'Mediator'],
        is_active=True
    )
    
    if not available_staff.exists():
        return "No available staff for auto-assignment"
    
    assigned_count = 0
    
    for complaint in unassigned_complaints:
        try:
            # Simple round-robin assignment
            staff_index = assigned_count % available_staff.count()
            staff_member = available_staff[staff_index]
            
            complaint.assigned_to = staff_member
            complaint.save()
            
            # Create assignment update
            ComplaintUpdate.objects.create(
                complaint=complaint,
                user=staff_member,  # System assignment
                update_type='assignment',
                message=f'Automatically assigned due to no manual assignment within 2 hours'
            )
            
            # Send notification
            send_complaint_notification.delay(
                complaint_id=complaint.id,
                notification_type='assigned',
                recipient_type='assignee'
            )
            
            assigned_count += 1
            logger.info(f"Auto-assigned complaint {complaint.complaint_id} to {staff_member.username}")
            
        except Exception as e:
            logger.error(f"Failed to auto-assign complaint {complaint.complaint_id}: {str(e)}")
    
    return f"Auto-assigned {assigned_count} complaints"