"""
Generic Celery tasks for core functionality
"""
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def send_generic_email(self, subject, message, recipient_list, from_email=None):
    """
    Generic email sending task
    
    Args:
        subject: Email subject
        message: Email message body
        recipient_list: List of recipient email addresses
        from_email: From email address (optional)
    """
    try:
        from_email = from_email or settings.DEFAULT_FROM_EMAIL
        
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False
        )
        
        logger.info(f"Email sent successfully to {len(recipient_list)} recipients")
        
        return {
            'status': 'sent',
            'recipients': len(recipient_list),
            'subject': subject
        }
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise self.retry(countdown=60 * (self.request.retries + 1))  # Exponential backoff