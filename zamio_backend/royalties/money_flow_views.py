"""
API views for money flow operations
Handles withdrawal approval, station charging, and balance queries
"""
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

from accounts.api.custom_jwt import CustomJWTAuthentication
from royalties.models import RoyaltyWithdrawal
from bank_account.services import MoneyFlowService
from accounts.models import AuditLog


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def approve_withdrawal_request(request, withdrawal_id):
    """
    Approve and process a withdrawal request
    Admin only - transfers money from central pool to user account
    """
    try:
        withdrawal = RoyaltyWithdrawal.objects.get(withdrawal_id=withdrawal_id)
    except RoyaltyWithdrawal.DoesNotExist:
        return Response(
            {'detail': 'Withdrawal request not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if already processed
    if withdrawal.status in ['processed', 'rejected', 'cancelled']:
        return Response(
            {'detail': f'Withdrawal already {withdrawal.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Process the withdrawal using money flow service
        result = MoneyFlowService.process_withdrawal_payout(
            withdrawal_request=withdrawal,
            admin_user=request.user
        )
        
        # Log the approval
        AuditLog.objects.create(
            user=request.user,
            action='royalty_withdrawal_approved',
            resource_type='RoyaltyWithdrawal',
            resource_id=str(withdrawal.withdrawal_id),
            request_data={
                'amount': str(withdrawal.amount),
                'recipient': result['recipient'],
                'recipient_type': result['recipient_type'],
                'platform_balance': str(result['platform_balance'])
            }
        )
        
        return Response({
            'message': 'Withdrawal approved and processed successfully',
            'data': result
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'detail': f'Failed to process withdrawal: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def reject_withdrawal_request(request, withdrawal_id):
    """
    Reject a withdrawal request
    Admin only
    """
    try:
        withdrawal = RoyaltyWithdrawal.objects.get(withdrawal_id=withdrawal_id)
    except RoyaltyWithdrawal.DoesNotExist:
        return Response(
            {'detail': 'Withdrawal request not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if already processed
    if withdrawal.status in ['processed', 'rejected', 'cancelled']:
        return Response(
            {'detail': f'Withdrawal already {withdrawal.status}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get rejection reason from request
    rejection_reason = request.data.get('rejection_reason', 'No reason provided')
    
    # Update withdrawal status
    withdrawal.status = 'rejected'
    withdrawal.rejection_reason = rejection_reason
    withdrawal.processed_by = request.user
    withdrawal.save()
    
    # Log the rejection
    AuditLog.objects.create(
        user=request.user,
        action='royalty_withdrawal_rejected',
        resource_type='RoyaltyWithdrawal',
        resource_id=str(withdrawal.withdrawal_id),
        request_data={
            'amount': str(withdrawal.amount),
            'rejection_reason': rejection_reason
        }
    )
    
    return Response({
        'message': 'Withdrawal request rejected',
        'withdrawal_id': str(withdrawal.withdrawal_id),
        'status': withdrawal.status
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_platform_balance(request):
    """
    Get central platform pool balance
    Admin only
    """
    try:
        balance_info = MoneyFlowService.get_platform_balance()
        return Response({
            'message': 'Platform balance retrieved successfully',
            'data': balance_info
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'detail': f'Failed to get platform balance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_station_balance(request, station_id):
    """
    Get station account balance
    Station users and admins only
    Accepts either integer ID or UUID station_id
    """
    from stations.models import Station
    
    try:
        # Try to get station by UUID first, then by integer ID
        try:
            station = Station.objects.get(station_id=station_id)
        except (Station.DoesNotExist, ValueError):
            # If UUID lookup fails, try integer ID
            station = Station.objects.get(id=station_id)
    except Station.DoesNotExist:
        return Response(
            {'detail': 'Station not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check permissions - only station owner or admin
    if not request.user.is_staff and station.user != request.user:
        return Response(
            {'detail': 'You do not have permission to view this station balance'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        balance_info = MoneyFlowService.get_station_balance(station)
        if balance_info is None:
            return Response(
                {'detail': 'Station account not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'message': 'Station balance retrieved successfully',
            'station': station.name,
            'data': balance_info
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'detail': f'Failed to get station balance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def station_add_funds(request, station_id):
    """
    Add funds to station account
    Admin only
    """
    from stations.models import Station
    
    try:
        station = Station.objects.get(id=station_id)
    except Station.DoesNotExist:
        return Response(
            {'detail': 'Station not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get amount from request
    amount = request.data.get('amount')
    description = request.data.get('description', 'Admin top-up')
    
    if not amount:
        return Response(
            {'detail': 'Amount is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        amount = float(amount)
        if amount <= 0:
            return Response(
                {'detail': 'Amount must be greater than zero'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Invalid amount format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        result = MoneyFlowService.station_add_funds(
            station=station,
            amount=amount,
            description=description
        )
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='station_funds_added',
            resource_type='StationAccount',
            resource_id=str(station.id),
            request_data={
                'amount': str(amount),
                'new_balance': str(result['new_balance']),
                'description': description
            }
        )
        
        return Response({
            'message': 'Funds added successfully',
            'data': result
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'detail': f'Failed to add funds: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_user_balance(request):
    """
    Get current user's bank account balance
    """
    try:
        balance_info = MoneyFlowService.get_user_balance(request.user)
        if balance_info is None:
            return Response(
                {'detail': 'Bank account not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'message': 'Balance retrieved successfully',
            'data': balance_info
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'detail': f'Failed to get balance: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_pending_withdrawals(request):
    """
    List all pending withdrawal requests
    Admin only
    """
    from royalties.serializers import RoyaltyWithdrawalSerializer
    
    try:
        pending_withdrawals = RoyaltyWithdrawal.objects.filter(
            status='pending'
        ).select_related('requester', 'artist', 'publisher').order_by('-requested_at')
        
        serializer = RoyaltyWithdrawalSerializer(pending_withdrawals, many=True)
        
        return Response({
            'message': 'Pending withdrawals retrieved successfully',
            'count': pending_withdrawals.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'detail': f'Failed to list pending withdrawals: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
