"""
API views for secure dispute evidence file management
"""
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import Http404, HttpResponse
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from disputes.models import DisputeEvidence, Dispute
from disputes.services.evidence_security_service import (
    EvidenceAccessService, 
    EvidenceFileValidator,
    EvidenceRetentionService
)
from disputes.serializers import DisputeEvidenceSerializer
from accounts.models import AuditLog


class EvidenceUploadView(APIView):
    """Secure evidence file upload with enhanced validation"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, dispute_id):
        """Upload evidence file with security validation"""
        try:
            # Get the dispute
            dispute = get_object_or_404(Dispute, id=dispute_id)
            
            # Check if user can add evidence to this dispute
            if not self._can_add_evidence(request.user, dispute):
                return Response(
                    {'error': 'You do not have permission to add evidence to this dispute'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if dispute allows new evidence
            if not self._dispute_accepts_evidence(dispute):
                return Response(
                    {'error': 'This dispute no longer accepts new evidence'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate required fields
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            title = request.data.get('title', '').strip()
            if not title:
                return Response(
                    {'error': 'Evidence title is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            file = request.FILES['file']
            description = request.data.get('description', '').strip()
            
            # Pre-validate file before creating model instance
            try:
                validation_result = EvidenceFileValidator.validate_evidence_file(file, dispute_id)
            except ValidationError as e:
                return Response(
                    {'error': f'File validation failed: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create evidence record with transaction
            with transaction.atomic():
                evidence = DisputeEvidence.objects.create(
                    dispute=dispute,
                    uploaded_by=request.user,
                    title=title,
                    description=description,
                    file=file
                )
                
                # Log the upload
                AuditLog.objects.create(
                    user=request.user,
                    action='evidence_uploaded',
                    resource_type='DisputeEvidence',
                    resource_id=str(evidence.id),
                    request_data={
                        'dispute_id': str(dispute.dispute_id),
                        'evidence_title': title,
                        'file_type': validation_result['mime_type'],
                        'file_size': validation_result['file_size'],
                        'file_hash': validation_result['sha256_hash'],
                        'upload_timestamp': timezone.now().isoformat(),
                        'ip_address': self._get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown')
                    }
                )
            
            # Serialize and return the created evidence
            serializer = DisputeEvidenceSerializer(evidence)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=request.user,
                action='evidence_upload_error',
                resource_type='Dispute',
                resource_id=str(dispute_id),
                request_data={
                    'error': str(e),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response(
                {'error': 'An error occurred while uploading evidence'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _can_add_evidence(self, user, dispute):
        """Check if user can add evidence to the dispute"""
        # Dispute submitter can add evidence
        if dispute.submitted_by_id == user.id:
            return True
        
        # Assigned dispute handler can add evidence
        if dispute.assigned_to_id == user.id:
            return True
        
        # Admin users can add evidence
        if user.is_staff or user.admin:
            return True
        
        # Publishers can add evidence for disputes involving their artists
        if user.user_type == 'Publisher' and dispute.related_track:
            from publishers.models import PublisherArtistRelationship
            try:
                PublisherArtistRelationship.objects.get(
                    publisher__user=user,
                    artist=dispute.related_track.artist,
                    status='active'
                )
                return True
            except PublisherArtistRelationship.DoesNotExist:
                pass
        
        # Station owners can add evidence for disputes involving their station
        if user.user_type == 'Station' and dispute.related_station:
            if dispute.related_station.user_id == user.id:
                return True
        
        return False
    
    def _dispute_accepts_evidence(self, dispute):
        """Check if dispute status allows new evidence"""
        from disputes.models import DisputeStatus
        
        accepting_statuses = [
            DisputeStatus.SUBMITTED,
            DisputeStatus.UNDER_REVIEW,
            DisputeStatus.EVIDENCE_REQUIRED,
            DisputeStatus.MEDIATION
        ]
        
        return dispute.status in accepting_statuses
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EvidenceDownloadView(APIView):
    """Secure evidence file download with access controls"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, evidence_id):
        """Download evidence file with security checks"""
        try:
            # Get token from query parameters
            token = request.GET.get('token')
            
            # Set user context for audit logging
            request.user.ip_address = self._get_client_ip(request)
            request.user.user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
            
            # Serve the file using the security service
            response = EvidenceAccessService.serve_evidence_file(
                user=request.user,
                evidence_id=evidence_id,
                token=token
            )
            
            # Increment access count
            try:
                evidence = DisputeEvidence.objects.get(id=evidence_id)
                evidence.increment_access_count()
            except DisputeEvidence.DoesNotExist:
                pass
            
            return response
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Http404 as e:
            return Response(
                {'error': 'Evidence file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred while downloading the file'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EvidenceSecureUrlView(APIView):
    """Generate secure URLs for evidence files"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, evidence_id):
        """Generate secure URL with token for evidence file"""
        try:
            # Check if evidence exists and user has access
            if not EvidenceAccessService.check_evidence_access_permission(request.user, evidence_id):
                return Response(
                    {'error': 'You do not have permission to access this evidence'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Generate secure URL
            url_data = EvidenceAccessService.get_secure_evidence_url(request.user, evidence_id)
            
            # Log URL generation
            AuditLog.objects.create(
                user=request.user,
                action='evidence_url_generated',
                resource_type='DisputeEvidence',
                resource_id=str(evidence_id),
                request_data={
                    'url_expires_in': url_data['expires_in'],
                    'timestamp': timezone.now().isoformat(),
                    'ip_address': self._get_client_ip(request)
                }
            )
            
            return Response(url_data, status=status.HTTP_200_OK)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': 'An error occurred while generating secure URL'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class EvidenceListView(APIView):
    """List evidence files for a dispute with access controls"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, dispute_id):
        """Get list of evidence files for a dispute"""
        try:
            # Get the dispute
            dispute = get_object_or_404(Dispute, id=dispute_id)
            
            # Check if user can view evidence for this dispute
            if not self._can_view_dispute_evidence(request.user, dispute):
                return Response(
                    {'error': 'You do not have permission to view evidence for this dispute'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get evidence files (exclude quarantined files for non-admin users)
            evidence_queryset = dispute.evidence.all()
            
            if not (request.user.is_staff or request.user.admin):
                evidence_queryset = evidence_queryset.filter(is_quarantined=False)
            
            # Serialize evidence
            serializer = DisputeEvidenceSerializer(evidence_queryset, many=True)
            
            # Log evidence list access
            AuditLog.objects.create(
                user=request.user,
                action='evidence_list_accessed',
                resource_type='Dispute',
                resource_id=str(dispute_id),
                request_data={
                    'dispute_id': str(dispute.dispute_id),
                    'evidence_count': evidence_queryset.count(),
                    'timestamp': timezone.now().isoformat(),
                    'ip_address': self._get_client_ip(request)
                }
            )
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'An error occurred while retrieving evidence list'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _can_view_dispute_evidence(self, user, dispute):
        """Check if user can view evidence for the dispute"""
        # Admin users can view all evidence
        if user.is_staff or user.admin:
            return True
        
        # Dispute submitter can view evidence
        if dispute.submitted_by_id == user.id:
            return True
        
        # Assigned dispute handler can view evidence
        if dispute.assigned_to_id == user.id:
            return True
        
        # Publishers can view evidence for disputes involving their artists
        if user.user_type == 'Publisher' and dispute.related_track:
            from publishers.models import PublisherArtistRelationship
            try:
                PublisherArtistRelationship.objects.get(
                    publisher__user=user,
                    artist=dispute.related_track.artist,
                    status='active'
                )
                return True
            except PublisherArtistRelationship.DoesNotExist:
                pass
        
        # Station owners can view evidence for disputes involving their station
        if user.user_type == 'Station' and dispute.related_station:
            if dispute.related_station.user_id == user.id:
                return True
        
        return False
    
    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def quarantine_evidence(request, evidence_id):
    """Quarantine an evidence file (admin only)"""
    try:
        evidence = get_object_or_404(DisputeEvidence, id=evidence_id)
        reason = request.data.get('reason', 'Administrative action')
        
        evidence.quarantine_file(reason)
        
        # Log quarantine action
        AuditLog.objects.create(
            user=request.user,
            action='evidence_quarantined',
            resource_type='DisputeEvidence',
            resource_id=str(evidence_id),
            request_data={
                'dispute_id': str(evidence.dispute.dispute_id),
                'quarantine_reason': reason,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return Response(
            {'message': 'Evidence file has been quarantined'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while quarantining the evidence'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def unquarantine_evidence(request, evidence_id):
    """Remove quarantine from an evidence file (admin only)"""
    try:
        evidence = get_object_or_404(DisputeEvidence, id=evidence_id)
        
        evidence.unquarantine_file()
        
        # Log unquarantine action
        AuditLog.objects.create(
            user=request.user,
            action='evidence_unquarantined',
            resource_type='DisputeEvidence',
            resource_id=str(evidence_id),
            request_data={
                'dispute_id': str(evidence.dispute.dispute_id),
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return Response(
            {'message': 'Evidence file quarantine has been removed'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while removing quarantine'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def evidence_retention_report(request):
    """Get evidence files eligible for deletion based on retention policy"""
    try:
        eligible_files = EvidenceRetentionService.get_evidence_files_for_deletion()
        
        # Log retention report access
        AuditLog.objects.create(
            user=request.user,
            action='evidence_retention_report_accessed',
            resource_type='System',
            resource_id='retention_policy',
            request_data={
                'eligible_files_count': len(eligible_files),
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return Response(
            {'eligible_files': eligible_files},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while generating retention report'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([permissions.IsAdminUser])
def delete_evidence_file(request, evidence_id):
    """Delete an evidence file with audit logging (admin only)"""
    try:
        reason = request.data.get('reason', 'Administrative deletion')
        
        success = EvidenceRetentionService.delete_evidence_file(
            evidence_id=evidence_id,
            reason=reason,
            deleted_by=request.user
        )
        
        if success:
            return Response(
                {'message': 'Evidence file has been deleted'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Evidence file not found or could not be deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while deleting the evidence file'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )