from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class DisputeType(models.TextChoices):
    DETECTION_ACCURACY = 'detection_accuracy', 'Detection Accuracy'
    ROYALTY_CALCULATION = 'royalty_calculation', 'Royalty Calculation'
    OWNERSHIP_CLAIM = 'ownership_claim', 'Ownership Claim'
    PAYMENT_ISSUE = 'payment_issue', 'Payment Issue'
    METADATA_ERROR = 'metadata_error', 'Metadata Error'
    OTHER = 'other', 'Other'


class DisputeStatus(models.TextChoices):
    SUBMITTED = 'submitted', 'Submitted'
    UNDER_REVIEW = 'under_review', 'Under Review'
    EVIDENCE_REQUIRED = 'evidence_required', 'Evidence Required'
    MEDIATION = 'mediation', 'Mediation'
    ESCALATED = 'escalated', 'Escalated'
    RESOLVED = 'resolved', 'Resolved'
    REJECTED = 'rejected', 'Rejected'
    EXTERNAL_ARBITRATION = 'external_arbitration', 'External Arbitration'


class DisputePriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'


class Dispute(models.Model):
    """
    Main dispute model representing a formal dispute case
    """
    dispute_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField()
    dispute_type = models.CharField(max_length=50, choices=DisputeType.choices)
    status = models.CharField(max_length=50, choices=DisputeStatus.choices, default=DisputeStatus.SUBMITTED)
    priority = models.CharField(max_length=20, choices=DisputePriority.choices, default=DisputePriority.MEDIUM)
    
    # Parties involved
    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_disputes')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_disputes')
    
    # Related objects (optional - depends on dispute type)
    related_track = models.ForeignKey('artists.Track', on_delete=models.SET_NULL, null=True, blank=True)
    related_detection = models.ForeignKey('music_monitor.AudioDetection', on_delete=models.SET_NULL, null=True, blank=True)
    related_royalty = models.ForeignKey('music_monitor.RoyaltyDistribution', on_delete=models.SET_NULL, null=True, blank=True)
    related_station = models.ForeignKey('stations.Station', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Resolution details
    resolution_summary = models.TextField(blank=True)
    resolution_action_taken = models.TextField(blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['dispute_type', 'created_at']),
            models.Index(fields=['submitted_by', 'status']),
        ]
    
    def __str__(self):
        return f"Dispute {self.dispute_id}: {self.title}"
    
    def save(self, *args, **kwargs):
        if self.status == DisputeStatus.RESOLVED and not self.resolved_at:
            self.resolved_at = timezone.now()
        super().save(*args, **kwargs)


def secure_evidence_upload_path(instance, filename):
    """Generate secure file upload path for dispute evidence with user isolation"""
    from django.utils import timezone
    import uuid
    import os
    
    # Sanitize filename
    name, ext = os.path.splitext(filename)
    safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
    
    # Generate unique filename with timestamp
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    final_filename = f"{safe_name}_{timestamp}_{unique_id}{ext}"
    
    # Create secure path with dispute and user isolation
    dispute_id = instance.dispute.id
    user_id = instance.uploaded_by.id
    return f"dispute_evidence/{dispute_id}/{user_id}/{final_filename}"


def validate_evidence_file(file):
    """Validate evidence file using the security service"""
    from disputes.services.evidence_security_service import EvidenceFileValidator
    
    # Get dispute_id from the instance (will be set during model save)
    dispute_id = getattr(file, 'dispute_id', 0)
    
    try:
        validation_result = EvidenceFileValidator.validate_evidence_file(file, dispute_id)
        return validation_result
    except Exception as e:
        from django.core.exceptions import ValidationError
        raise ValidationError(f"File validation failed: {str(e)}")


class DisputeEvidence(models.Model):
    """
    Evidence and documentation attached to disputes with enhanced security
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='evidence')
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Enhanced file attachments with security
    file = models.FileField(
        upload_to=secure_evidence_upload_path, 
        null=True, 
        blank=True,
        validators=[validate_evidence_file]
    )
    file_type = models.CharField(max_length=100, blank=True)  # MIME type
    file_size = models.PositiveIntegerField(null=True, blank=True)
    file_hash = models.CharField(max_length=64, blank=True)  # SHA-256 hash for integrity
    file_category = models.CharField(
        max_length=20, 
        choices=[
            ('document', 'Document'),
            ('image', 'Image'),
            ('audio', 'Audio'),
            ('video', 'Video'),
        ],
        blank=True
    )
    
    # Security and access tracking
    access_count = models.PositiveIntegerField(default=0)
    last_accessed = models.DateTimeField(null=True, blank=True)
    is_quarantined = models.BooleanField(default=False)
    quarantine_reason = models.TextField(blank=True)
    
    # Text evidence
    text_content = models.TextField(blank=True)
    
    # External references
    external_url = models.URLField(blank=True)
    
    # Retention policy tracking
    retention_policy = models.CharField(max_length=50, blank=True)
    delete_after = models.DateTimeField(null=True, blank=True)
    
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['dispute', 'uploaded_at']),
            models.Index(fields=['uploaded_by', 'uploaded_at']),
            models.Index(fields=['file_hash']),
            models.Index(fields=['is_quarantined']),
            models.Index(fields=['delete_after']),
        ]
    
    def __str__(self):
        return f"Evidence: {self.title} for {self.dispute.dispute_id}"
    
    def save(self, *args, **kwargs):
        # Set dispute_id for file validation
        if self.file and hasattr(self.file, 'file'):
            self.file.file.dispute_id = self.dispute_id if self.dispute_id else 0
        
        # Validate and process file if it's new or changed
        if self.file and (not self.pk or 'file' in kwargs.get('update_fields', [])):
            self._process_file_upload()
        
        # Update retention policy
        self._update_retention_policy()
        
        super().save(*args, **kwargs)
    
    def _process_file_upload(self):
        """Process file upload with security validation"""
        from disputes.services.evidence_security_service import EvidenceFileValidator
        
        try:
            # Validate file
            validation_result = EvidenceFileValidator.validate_evidence_file(
                self.file, 
                self.dispute_id if self.dispute_id else 0
            )
            
            # Store validation results
            self.file_type = validation_result['mime_type']
            self.file_size = validation_result['file_size']
            self.file_hash = validation_result['sha256_hash']
            self.file_category = validation_result['file_category']
            
        except Exception as e:
            # If validation fails, quarantine the file
            self.is_quarantined = True
            self.quarantine_reason = f"File validation failed: {str(e)}"
    
    def _update_retention_policy(self):
        """Update retention policy based on dispute status"""
        from disputes.services.evidence_security_service import EvidenceRetentionService
        
        if self.dispute:
            policy = EvidenceRetentionService.get_retention_policy(
                self.dispute.status,
                self.dispute.resolved_at
            )
            self.retention_policy = policy['policy']
            self.delete_after = policy['delete_after']
    
    def verify_file_integrity(self) -> bool:
        """Verify file integrity using stored hash"""
        if not self.file or not self.file_hash:
            return True  # No file or hash to verify
        
        try:
            import hashlib
            self.file.seek(0)
            content = self.file.read()
            self.file.seek(0)
            
            current_hash = hashlib.sha256(content).hexdigest()
            return current_hash == self.file_hash
            
        except Exception:
            return False
    
    def increment_access_count(self):
        """Increment access count and update last accessed time"""
        from django.utils import timezone
        self.access_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['access_count', 'last_accessed'])
    
    def quarantine_file(self, reason: str):
        """Quarantine the evidence file"""
        self.is_quarantined = True
        self.quarantine_reason = reason
        self.save(update_fields=['is_quarantined', 'quarantine_reason'])
    
    def unquarantine_file(self):
        """Remove quarantine from the evidence file"""
        self.is_quarantined = False
        self.quarantine_reason = ''
        self.save(update_fields=['is_quarantined', 'quarantine_reason'])


class DisputeAuditLog(models.Model):
    """
    Comprehensive audit trail for all dispute-related actions
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='audit_logs')
    actor = models.ForeignKey(User, on_delete=models.CASCADE)
    
    action = models.CharField(max_length=100)  # state_change, evidence_added, comment_added, etc.
    description = models.TextField()
    
    # State transition tracking
    previous_state = models.CharField(max_length=50, blank=True)
    new_state = models.CharField(max_length=50, blank=True)
    
    # Additional context
    evidence = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['dispute', 'timestamp']),
            models.Index(fields=['actor', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Audit: {self.action} on {self.dispute.dispute_id} by {self.actor.username}"


class DisputeComment(models.Model):
    """
    Comments and communication within disputes
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    
    content = models.TextField()
    is_internal = models.BooleanField(default=False)  # Internal admin notes vs public comments
    
    # Reply functionality
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.author.username} on {self.dispute.dispute_id}"


class DisputeWorkflowRule(models.Model):
    """
    Configurable workflow rules for dispute state transitions
    """
    from_status = models.CharField(max_length=50, choices=DisputeStatus.choices)
    to_status = models.CharField(max_length=50, choices=DisputeStatus.choices)
    
    # Conditions
    required_role = models.CharField(max_length=50, blank=True)  # admin, mediator, etc.
    requires_evidence = models.BooleanField(default=False)
    auto_transition = models.BooleanField(default=False)
    
    # Notifications
    notify_submitter = models.BooleanField(default=True)
    notify_assigned = models.BooleanField(default=True)
    notify_stakeholders = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['from_status', 'to_status']
    
    def __str__(self):
        return f"Rule: {self.from_status} -> {self.to_status}"


class DisputeNotification(models.Model):
    """
    Notifications related to dispute status changes and updates
    """
    dispute = models.ForeignKey(Dispute, on_delete=models.CASCADE, related_name='notifications')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE)
    
    notification_type = models.CharField(max_length=50)  # status_change, evidence_added, comment_added, etc.
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Delivery tracking
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    email_sent = models.BooleanField(default=False)
    sms_sent = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-sent_at']
        indexes = [
            models.Index(fields=['recipient', 'read_at']),
            models.Index(fields=['dispute', 'sent_at']),
        ]
    
    def __str__(self):
        return f"Notification: {self.title} to {self.recipient.username}"
    
    def mark_as_read(self):
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])