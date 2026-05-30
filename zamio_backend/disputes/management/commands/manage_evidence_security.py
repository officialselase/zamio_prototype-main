"""
Management command for comprehensive evidence file security operations
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from disputes.models import DisputeEvidence, Dispute
from disputes.services.evidence_security_service import (
    EvidenceFileValidator, 
    EvidenceAccessService,
    EvidenceRetentionService
)
from acco