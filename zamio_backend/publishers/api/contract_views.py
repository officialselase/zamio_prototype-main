"""
API views for secure publisher contract file management
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

from publishers.models import PublisherArtistRelationship, PublishingAgreement
from publishers.services.contract_security_service import (
    ContractAccessService, 
    ContractFileValidator,
    ContractRetentionService
)
from accounts.models import AuditLog


class ContractUploadView(APIView):
    """Secure contract file upload with enhanced validation"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_type, contract_id):
        """Upload contract file with security validation"""
        try:
            # Validate contract type
            if contract_type not in ['relationship', 'agreement']:
                return Response(
                    {'error': 'Invalid contract type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the contract
            if contract_type == 'relationship':
                contract = get_object_or_404(PublisherArtistRelationship, id=contract_id)
            else:
                contract = get_object_or_404(PublishingAgreement, id=contract_id)
            
            # Check if user can upload contract files
            if not self._can_upload_contract(request.user, contract, contract_type):
                return Response(
                    {'error': 'You do not have permission to upload contract files'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validate required fields
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            file = request.FILES['file']
            create_new_version = request.data.get('create_new_version', 'false').lower() == 'true'
            
            # Pre-validate file before creating model instance
            try:
                publisher_id = contract.publisher.id if hasattr(contract, 'publisher') else 0
                validation_result = ContractFileValidator.validate_contract_file(file, publisher_id)
            except ValidationError as e:
                return Response(
                    {'error': f'File validation failed: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Handle file upload with transaction
            with transaction.atomic():
                if create_new_version and contract.contract_file:
                    # Create new version
                    new_contract = contract.create_new_version(file, request.user)
                    contract_to_return = new_contract
                    action = 'contract_new_version_uploaded'
                else:
                    # Update existing contract
                    contract.contract_file = file
                    contract.save()
                    contract_to_return = contract
                    action = 'contract_file_uploaded'
                
                # Log the upload
                AuditLog.objects.create(
                    user=request.user,
                    action=action,
                    resource_type='Contract',
                    resource_id=str(contract_to_return.id),
                    request_data={
                        'contract_type': contract_type,
                        'file_type': validation_result['mime_type'],
                        'file_size': validation_result['file_size'],
                        'file_hash': validation_result['sha256_hash'],
                        'upload_timestamp': timezone.now().isoformat(),
                        'ip_address': self._get_client_ip(request),
                        'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown'),
                        'version': contract_to_return.version
                    }
                )
            
            return Response({
                'message': 'Contract file uploaded successfully',
                'contract_id': contract_to_return.id,
                'version': contract_to_return.version,
                'file_hash': contract_to_return.file_hash
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log the error
            AuditLog.objects.create(
                user=request.user,
                action='contract_upload_error',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'error': str(e),
                    'contract_type': contract_type,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response(
                {'error': 'An error occurred while uploading contract file'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _can_upload_contract(self, user, contract, contract_type):
        """Check if user can upload contract files"""
        # Admin users can upload any contract
        if user.is_staff or user.admin:
            return True
        
        if contract_type == 'relationship':
            # Publisher can upload their own contracts
            if contract.publisher.user_id == user.id:
                return True
            
            # Contract creator can upload
            if contract.created_by_id == user.id:
                return True
            
        elif contract_type == 'agreement':
            # Publisher can upload their own agreements
            if contract.publisher.user_id == user.id:
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


class ContractDownloadView(APIView):
    """Secure contract file download with access controls"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, contract_id):
        """Download contract file with security checks"""
        try:
            # Get token from query parameters
            token = request.GET.get('token')
            
            # Set user context for audit logging
            request.user.ip_address = self._get_client_ip(request)
            request.user.user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
            
            # Serve the file using the security service
            response = ContractAccessService.serve_contract_file(
                user=request.user,
                contract_id=contract_id,
                token=token
            )
            
            # Increment access count
            try:
                # Try both contract types
                contract = None
                try:
                    contract = PublisherArtistRelationship.objects.get(id=contract_id)
                except PublisherArtistRelationship.DoesNotExist:
                    contract = PublishingAgreement.objects.get(id=contract_id)
                
                if contract:
                    contract.increment_access_count()
            except:
                pass
            
            return response
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Http404 as e:
            return Response(
                {'error': 'Contract file not found'},
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


class ContractSecureUrlView(APIView):
    """Generate secure URLs for contract files"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, contract_id):
        """Generate secure URL with token for contract file"""
        try:
            # Check if contract exists and user has access
            if not ContractAccessService.check_contract_access_permission(request.user, contract_id):
                return Response(
                    {'error': 'You do not have permission to access this contract'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Generate secure URL
            url_data = ContractAccessService.get_secure_contract_url(request.user, contract_id)
            
            # Log URL generation
            AuditLog.objects.create(
                user=request.user,
                action='contract_url_generated',
                resource_type='Contract',
                resource_id=str(contract_id),
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


class ContractVersionHistoryView(APIView):
    """Get version history for a contract"""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, contract_type, contract_id):
        """Get version history for a contract"""
        try:
            # Validate contract type
            if contract_type not in ['relationship', 'agreement']:
                return Response(
                    {'error': 'Invalid contract type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the contract
            if contract_type == 'relationship':
                contract = get_object_or_404(PublisherArtistRelationship, id=contract_id)
            else:
                contract = get_object_or_404(PublishingAgreement, id=contract_id)
            
            # Check access permission
            if not ContractAccessService.check_contract_access_permission(request.user, contract_id):
                return Response(
                    {'error': 'You do not have permission to view this contract'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get version history
            versions = contract.get_version_history()
            
            version_data = []
            for version in versions:
                version_info = {
                    'id': version.id,
                    'version': version.version,
                    'created_at': version.created_at,
                    'updated_at': version.updated_at,
                    'status': version.status,
                    'has_file': bool(version.contract_file),
                    'file_size': version.file_size,
                    'access_count': version.access_count,
                    'last_accessed': version.last_accessed,
                    'is_quarantined': version.is_quarantined
                }
                
                if contract_type == 'relationship':
                    version_info.update({
                        'created_by': version.created_by.username if version.created_by else None,
                        'approved_by_admin': version.approved_by_admin,
                        'approved_by_artist': version.approved_by_artist
                    })
                else:
                    version_info.update({
                        'verified_by_admin': version.verified_by_admin
                    })
                
                version_data.append(version_info)
            
            # Log version history access
            AuditLog.objects.create(
                user=request.user,
                action='contract_version_history_accessed',
                resource_type='Contract',
                resource_id=str(contract_id),
                request_data={
                    'contract_type': contract_type,
                    'versions_count': len(version_data),
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            return Response({
                'contract_id': contract_id,
                'contract_type': contract_type,
                'versions': version_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'An error occurred while retrieving version history'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def quarantine_contract(request, contract_id):
    """Quarantine a contract file (admin only)"""
    try:
        reason = request.data.get('reason', 'Administrative action')
        contract_type = request.data.get('contract_type', 'relationship')
        
        # Get the contract
        if contract_type == 'relationship':
            contract = get_object_or_404(PublisherArtistRelationship, id=contract_id)
        else:
            contract = get_object_or_404(PublishingAgreement, id=contract_id)
        
        contract.quarantine_file(reason, request.user)
        
        # Log quarantine action
        AuditLog.objects.create(
            user=request.user,
            action='contract_quarantined',
            resource_type='Contract',
            resource_id=str(contract_id),
            request_data={
                'contract_type': contract_type,
                'quarantine_reason': reason,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return Response(
            {'message': 'Contract file has been quarantined'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while quarantining the contract'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def unquarantine_contract(request, contract_id):
    """Remove quarantine from a contract file (admin only)"""
    try:
        contract_type = request.data.get('contract_type', 'relationship')
        
        # Get the contract
        if contract_type == 'relationship':
            contract = get_object_or_404(PublisherArtistRelationship, id=contract_id)
        else:
            contract = get_object_or_404(PublishingAgreement, id=contract_id)
        
        contract.unquarantine_file()
        
        # Log unquarantine action
        AuditLog.objects.create(
            user=request.user,
            action='contract_unquarantined',
            resource_type='Contract',
            resource_id=str(contract_id),
            request_data={
                'contract_type': contract_type,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        return Response(
            {'message': 'Contract file quarantine has been removed'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while removing quarantine'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def contract_retention_report(request):
    """Get contract files eligible for deletion based on retention policy"""
    try:
        eligible_files = ContractRetentionService.get_contracts_for_deletion()
        
        # Log retention report access
        AuditLog.objects.create(
            user=request.user,
            action='contract_retention_report_accessed',
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
def delete_contract_file(request, contract_id):
    """Delete a contract file with audit logging (admin only)"""
    try:
        reason = request.data.get('reason', 'Administrative deletion')
        contract_type = request.data.get('contract_type', 'relationship')
        
        success = ContractRetentionService.delete_contract_file(
            contract_id=contract_id,
            contract_type=contract_type,
            reason=reason,
            deleted_by=request.user
        )
        
        if success:
            return Response(
                {'message': 'Contract file has been deleted'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Contract file not found or could not be deleted'},
                status=status.HTTP_404_NOT_FOUND
            )
        
    except Exception as e:
        return Response(
            {'error': 'An error occurred while deleting the contract file'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )