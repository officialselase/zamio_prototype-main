"""
System-wide file security monitoring and alerting service
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Q
from django.core.mail import send_mail
from celery import shared_task
from accounts.models import AuditLog, User

logger = logging.getLogger(__name__)


class FileSecurityMonitor:
    """Monitor file security events and generate alerts"""
    
    # Alert thresholds
    ALERT_THRESHOLDS = {
        'threat_detection_rate': 5,  # 5 threats per hour
        'validation_failure_rate': 20,  # 20 validation failures per hour
        'large_file_uploads': 10,  # 10 files > 50MB per hour
        'suspicious_user_activity': 15,  # 15 failed uploads per user per hour
        'unusual_file_types': 5,  # 5 unusual file type attempts per hour
    }
    
    # Time windows for monitoring
    MONITORING_WINDOWS = {
        'short': timedelta(hours=1),
        'medium': timedelta(hours=6),
        'long': timedelta(hours=24)
    }
    
    @classmethod
    def check_security_alerts(cls) -> Dict[str, Any]:
        """Check for security alerts and return summary"""
        now = timezone.now()
        alerts = {
            'timestamp': now.isoformat(),
            'alerts_triggered': [],
            'summary': {
                'total_alerts': 0,
                'critical_alerts': 0,
                'warning_alerts': 0
            }
        }
        
        # Check each alert type
        for alert_type in cls.ALERT_THRESHOLDS.keys():
            alert_result = cls._check_specific_alert(alert_type, now)
            if alert_result['triggered']:
                alerts['alerts_triggered'].append(alert_result)
                alerts['summary']['total_alerts'] += 1
                if alert_result['severity'] == 'critical':
                    alerts['summary']['critical_alerts'] += 1
                else:
                    alerts['summary']['warning_alerts'] += 1
        
        return alerts
    
    @classmethod
    def _check_specific_alert(cls, alert_type: str, now: datetime) -> Dict[str, Any]:
        """Check a specific alert type"""
        window = cls.MONITORING_WINDOWS['short']  # Default to 1 hour
        threshold = cls.ALERT_THRESHOLDS[alert_type]
        
        alert_result = {
            'alert_type': alert_type,
            'triggered': False,
            'severity': 'warning',
            'count': 0,
            'threshold': threshold,
            'window_hours': window.total_seconds() / 3600,
            'details': {}
        }
        
        if alert_type == 'threat_detection_rate':
            count = AuditLog.objects.filter(
                action='file_security_threat_detected',
                timestamp__gte=now - window
            ).count()
            
            alert_result['count'] = count
            if count >= threshold:
                alert_result['triggered'] = True
                alert_result['severity'] = 'critical'
                alert_result['details'] = cls._get_threat_details(now - window, now)
        
        elif alert_type == 'validation_failure_rate':
            count = AuditLog.objects.filter(
                action='file_validation_failed',
                timestamp__gte=now - window
            ).count()
            
            alert_result['count'] = count
            if count >= threshold:
                alert_result['triggered'] = True
                alert_result['details'] = cls._get_validation_failure_details(now - window, now)
        
        elif alert_type == 'large_file_uploads':
            # Check for files larger than 50MB
            large_file_logs = AuditLog.objects.filter(
                action__in=['file_upload_processed_securely', 'file_validation_success'],
                timestamp__gte=now - window,
                request_data__file_size__gt=50 * 1024 * 1024  # 50MB
            )
            
            count = large_file_logs.count()
            alert_result['count'] = count
            if count >= threshold:
                alert_result['triggered'] = True
                alert_result['details'] = cls._get_large_file_details(large_file_logs)
        
        elif alert_type == 'suspicious_user_activity':
            # Check for users with many failed uploads
            suspicious_users = AuditLog.objects.filter(
                action='file_validation_failed',
                timestamp__gte=now - window
            ).values('user').annotate(
                failure_count=Count('id')
            ).filter(failure_count__gte=threshold)
            
            count = suspicious_users.count()
            alert_result['count'] = count
            if count > 0:
                alert_result['triggered'] = True
                alert_result['severity'] = 'critical'
                alert_result['details'] = cls._get_suspicious_user_details(suspicious_users)
        
        elif alert_type == 'unusual_file_types':
            # Check for attempts to upload unusual file types
            unusual_attempts = AuditLog.objects.filter(
                action='file_validation_failed',
                timestamp__gte=now - window,
                request_data__errors__icontains='not allowed'
            )
            
            count = unusual_attempts.count()
            alert_result['count'] = count
            if count >= threshold:
                alert_result['triggered'] = True
                alert_result['details'] = cls._get_unusual_file_type_details(unusual_attempts)
        
        return alert_result
    
    @classmethod
    def _get_threat_details(cls, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get details about detected threats"""
        threat_logs = AuditLog.objects.filter(
            action='file_security_threat_detected',
            timestamp__gte=start_time,
            timestamp__lt=end_time
        ).order_by('-timestamp')[:10]  # Get latest 10
        
        threats_by_type = {}
        affected_users = set()
        
        for log in threat_logs:
            threats = log.request_data.get('threats', [])
            user_id = log.user_id
            if user_id:
                affected_users.add(user_id)
            
            for threat in threats:
                threat_type = threat.split(':')[0] if ':' in threat else threat
                threats_by_type[threat_type] = threats_by_type.get(threat_type, 0) + 1
        
        return {
            'threats_by_type': threats_by_type,
            'affected_users_count': len(affected_users),
            'recent_threats': [
                {
                    'timestamp': log.timestamp.isoformat(),
                    'user_id': log.user_id,
                    'filename': log.request_data.get('filename'),
                    'threats': log.request_data.get('threats', [])[:3]  # First 3 threats
                }
                for log in threat_logs[:5]  # Latest 5
            ]
        }
    
    @classmethod
    def _get_validation_failure_details(cls, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Get details about validation failures"""
        failure_logs = AuditLog.objects.filter(
            action='file_validation_failed',
            timestamp__gte=start_time,
            timestamp__lt=end_time
        ).order_by('-timestamp')[:20]
        
        errors_by_type = {}
        categories_affected = {}
        
        for log in failure_logs:
            errors = log.request_data.get('errors', [])
            category = log.request_data.get('category', 'unknown')
            
            categories_affected[category] = categories_affected.get(category, 0) + 1
            
            for error in errors:
                error_type = error.split(' ')[0] if ' ' in error else error
                errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
        
        return {
            'errors_by_type': errors_by_type,
            'categories_affected': categories_affected,
            'recent_failures': [
                {
                    'timestamp': log.timestamp.isoformat(),
                    'user_id': log.user_id,
                    'filename': log.request_data.get('filename'),
                    'category': log.request_data.get('category'),
                    'errors': log.request_data.get('errors', [])[:2]  # First 2 errors
                }
                for log in failure_logs[:5]
            ]
        }
    
    @classmethod
    def _get_large_file_details(cls, large_file_logs) -> Dict[str, Any]:
        """Get details about large file uploads"""
        files_by_category = {}
        total_size = 0
        
        for log in large_file_logs:
            category = log.request_data.get('category', 'unknown')
            file_size = log.request_data.get('file_size', 0)
            
            files_by_category[category] = files_by_category.get(category, 0) + 1
            total_size += file_size
        
        return {
            'files_by_category': files_by_category,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'average_size_mb': round((total_size / len(large_file_logs)) / (1024 * 1024), 2) if large_file_logs else 0
        }
    
    @classmethod
    def _get_suspicious_user_details(cls, suspicious_users) -> Dict[str, Any]:
        """Get details about suspicious user activity"""
        user_details = []
        
        for user_data in suspicious_users:
            user_id = user_data['user']
            failure_count = user_data['failure_count']
            
            try:
                user = User.objects.get(id=user_id)
                user_details.append({
                    'user_id': user_id,
                    'email': user.email,
                    'failure_count': failure_count,
                    'user_type': user.user_type
                })
            except User.DoesNotExist:
                user_details.append({
                    'user_id': user_id,
                    'email': 'Unknown',
                    'failure_count': failure_count,
                    'user_type': 'Unknown'
                })
        
        return {
            'suspicious_users': user_details,
            'total_suspicious_users': len(user_details)
        }
    
    @classmethod
    def _get_unusual_file_type_details(cls, unusual_attempts) -> Dict[str, Any]:
        """Get details about unusual file type attempts"""
        file_types_attempted = {}
        users_affected = set()
        
        for log in unusual_attempts:
            filename = log.request_data.get('filename', '')
            user_id = log.user_id
            
            if user_id:
                users_affected.add(user_id)
            
            # Extract file extension
            if '.' in filename:
                ext = filename.split('.')[-1].lower()
                file_types_attempted[ext] = file_types_attempted.get(ext, 0) + 1
        
        return {
            'file_types_attempted': file_types_attempted,
            'users_affected_count': len(users_affected),
            'most_common_attempts': sorted(
                file_types_attempted.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
        }
    
    @classmethod
    def generate_security_report(cls, hours: int = 24) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        end_time = timezone.now()
        start_time = end_time - timedelta(hours=hours)
        
        # Get all security-related logs
        security_logs = AuditLog.objects.filter(
            action__in=[
                'file_security_threat_detected',
                'file_validation_failed',
                'file_validation_success',
                'file_upload_processed_securely'
            ],
            timestamp__gte=start_time
        )
        
        # Calculate statistics
        total_uploads = security_logs.filter(
            action__in=['file_validation_success', 'file_upload_processed_securely']
        ).count()
        
        total_failures = security_logs.filter(action='file_validation_failed').count()
        total_threats = security_logs.filter(action='file_security_threat_detected').count()
        
        success_rate = (total_uploads / (total_uploads + total_failures)) * 100 if (total_uploads + total_failures) > 0 else 0
        
        # Get category breakdown
        category_stats = {}
        for log in security_logs:
            category = log.request_data.get('category', 'unknown')
            if category not in category_stats:
                category_stats[category] = {
                    'uploads': 0,
                    'failures': 0,
                    'threats': 0
                }
            
            if log.action in ['file_validation_success', 'file_upload_processed_securely']:
                category_stats[category]['uploads'] += 1
            elif log.action == 'file_validation_failed':
                category_stats[category]['failures'] += 1
            elif log.action == 'file_security_threat_detected':
                category_stats[category]['threats'] += 1
        
        return {
            'report_period': {
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'hours': hours
            },
            'summary': {
                'total_uploads': total_uploads,
                'total_failures': total_failures,
                'total_threats': total_threats,
                'success_rate': round(success_rate, 2)
            },
            'category_breakdown': category_stats,
            'alerts': cls.check_security_alerts()
        }
    
    @classmethod
    def send_security_alert_email(cls, alert_data: Dict[str, Any]):
        """Send security alert email to administrators"""
        if not alert_data['alerts_triggered']:
            return
        
        # Get admin emails
        admin_emails = list(
            User.objects.filter(
                Q(admin=True) | Q(user_type='Admin')
            ).values_list('email', flat=True)
        )
        
        if not admin_emails:
            logger.warning("No admin emails found for security alerts")
            return
        
        # Prepare email content
        subject = f"ZamIO Security Alert - {alert_data['summary']['total_alerts']} alerts triggered"
        
        message_lines = [
            "ZamIO File Security Alert",
            "=" * 30,
            f"Timestamp: {alert_data['timestamp']}",
            f"Total Alerts: {alert_data['summary']['total_alerts']}",
            f"Critical Alerts: {alert_data['summary']['critical_alerts']}",
            f"Warning Alerts: {alert_data['summary']['warning_alerts']}",
            "",
            "Alert Details:",
            "-" * 15
        ]
        
        for alert in alert_data['alerts_triggered']:
            message_lines.extend([
                f"Alert Type: {alert['alert_type']}",
                f"Severity: {alert['severity']}",
                f"Count: {alert['count']} (threshold: {alert['threshold']})",
                f"Time Window: {alert['window_hours']} hours",
                ""
            ])
        
        message_lines.extend([
            "",
            "Please review the system logs and take appropriate action.",
            "",
            "This is an automated alert from ZamIO File Security Monitor."
        ])
        
        message = "\n".join(message_lines)
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=admin_emails,
                fail_silently=False
            )
            logger.info(f"Security alert email sent to {len(admin_emails)} administrators")
        except Exception as e:
            logger.error(f"Failed to send security alert email: {str(e)}")


@shared_task(bind=True)
def monitor_file_security(self):
    """Celery task to monitor file security and send alerts"""
    try:
        # Check for security alerts
        alert_data = FileSecurityMonitor.check_security_alerts()
        
        # Log monitoring activity
        AuditLog.objects.create(
            user=None,  # System task
            action='file_security_monitoring',
            resource_type='System',
            resource_id='file_security_monitor',
            request_data={
                'alerts_checked': True,
                'alerts_triggered': len(alert_data['alerts_triggered']),
                'summary': alert_data['summary']
            }
        )
        
        # Send alerts if any were triggered
        if alert_data['alerts_triggered']:
            FileSecurityMonitor.send_security_alert_email(alert_data)
        
        return {
            'status': 'completed',
            'alerts_triggered': len(alert_data['alerts_triggered']),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"File security monitoring task failed: {str(e)}")
        raise self.retry(countdown=300, max_retries=3)  # Retry after 5 minutes


@shared_task(bind=True)
def generate_daily_security_report(self):
    """Generate daily security report"""
    try:
        # Generate 24-hour security report
        report = FileSecurityMonitor.generate_security_report(hours=24)
        
        # Log report generation
        AuditLog.objects.create(
            user=None,  # System task
            action='daily_security_report_generated',
            resource_type='System',
            resource_id='security_report',
            request_data=report
        )
        
        # Send report to administrators if there are significant events
        if (report['summary']['total_threats'] > 0 or 
            report['summary']['success_rate'] < 95 or 
            report['summary']['total_failures'] > 50):
            
            # Send detailed report email
            admin_emails = list(
                User.objects.filter(
                    Q(admin=True) | Q(user_type='Admin')
                ).values_list('email', flat=True)
            )
            
            if admin_emails:
                subject = f"ZamIO Daily Security Report - {report['report_period']['start_time'][:10]}"
                
                message_lines = [
                    "ZamIO Daily File Security Report",
                    "=" * 35,
                    f"Report Period: {report['report_period']['start_time'][:19]} to {report['report_period']['end_time'][:19]}",
                    "",
                    "Summary:",
                    f"- Total Uploads: {report['summary']['total_uploads']}",
                    f"- Total Failures: {report['summary']['total_failures']}",
                    f"- Total Threats: {report['summary']['total_threats']}",
                    f"- Success Rate: {report['summary']['success_rate']}%",
                    "",
                    "Category Breakdown:",
                ]
                
                for category, stats in report['category_breakdown'].items():
                    message_lines.append(f"- {category}: {stats['uploads']} uploads, {stats['failures']} failures, {stats['threats']} threats")
                
                message_lines.extend([
                    "",
                    "For detailed analysis, please check the admin dashboard.",
                    "",
                    "This is an automated report from ZamIO File Security Monitor."
                ])
                
                message = "\n".join(message_lines)
                
                try:
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=admin_emails,
                        fail_silently=False
                    )
                except Exception as e:
                    logger.error(f"Failed to send daily security report: {str(e)}")
        
        return {
            'status': 'completed',
            'report_generated': True,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Daily security report generation failed: {str(e)}")
        raise self.retry(countdown=3600, max_retries=2)  # Retry after 1 hour