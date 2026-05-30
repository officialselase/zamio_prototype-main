"""
Signals for music monitor app
Handles automatic station charging when play logs are created
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
import logging

from music_monitor.models import PlayLog
from bank_account.services import MoneyFlowService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=PlayLog)
def charge_station_for_play(sender, instance, created, **kwargs):
    """
    Automatically charge station when a new play log is created
    Transfers money from station account to central pool
    """
    # Only charge for newly created play logs
    if not created:
        return
    
    # Skip if no station
    if not instance.station:
        logger.warning(f"PlayLog {instance.id} has no station - skipping charge")
        return
    
    # Skip if no royalty amount calculated
    if not instance.royalty_amount or instance.royalty_amount <= 0:
        logger.warning(f"PlayLog {instance.id} has no royalty amount - skipping charge")
        return
    
    try:
        # Charge the station using money flow service
        result = MoneyFlowService.charge_station_for_play(
            play_log=instance,
            royalty_amount=instance.royalty_amount
        )
        
        logger.info(
            f"Station charged successfully: {result['station']} - "
            f"{result['amount']} GHS for PlayLog {instance.id}"
        )
        
        # Mark play log as successfully charged
        from django.utils import timezone
        PlayLog.objects.filter(id=instance.id).update(
            payment_status='charged',
            charged_at=timezone.now()
        )
        
    except ValidationError as e:
        # Log the error but don't fail the play log creation
        # Station might have insufficient funds
        logger.error(
            f"Failed to charge station for PlayLog {instance.id}: {str(e)}"
        )
        
        # Mark play log as having payment issues
        PlayLog.objects.filter(id=instance.id).update(
            payment_status='failed',
            payment_error=str(e)
        )
        
    except Exception as e:
        # Unexpected error
        logger.exception(
            f"Unexpected error charging station for PlayLog {instance.id}: {str(e)}"
        )
        
        # Mark as failed
        PlayLog.objects.filter(id=instance.id).update(
            payment_status='failed',
            payment_error=f"Unexpected error: {str(e)}"
        )
