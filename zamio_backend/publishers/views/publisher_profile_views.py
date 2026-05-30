from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication
from publishers.models import PublisherProfile, PublisherAccountSettings
from publishers.serializers import (
    PublisherAccountSettingsSerializer,
    PublisherProfileDetailSerializer,
)


def _coerce_boolean(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'true', '1', 'yes', 'on'}
    if value in (None, '', 0):
        return False
    return bool(value)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_publisher_profile_view(request):
    payload, errors = {}, {}

    publisher_id = request.query_params.get('publisher_id')
    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        publisher = (
            PublisherProfile.objects
            .select_related('user')
            .prefetch_related(
                'artist_relationships__artist__user',
                'artist_relationships__artist__track_set',
            )
            .get(publisher_id=publisher_id, user=request.user)
        )
    except PublisherProfile.DoesNotExist:
        payload['message'] = 'Errors'
        payload['errors'] = {'publisher_id': ['Publisher not found or access denied.']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    serializer = PublisherProfileDetailSerializer(publisher)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def update_publisher_account_settings_view(request):
    payload, errors = {}, {}

    publisher_id = request.data.get('publisher_id')
    if not publisher_id:
        errors['publisher_id'] = ['Publisher ID is required.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        publisher = PublisherProfile.objects.get(publisher_id=publisher_id, user=request.user)
    except PublisherProfile.DoesNotExist:
        payload['message'] = 'Errors'
        payload['errors'] = {'publisher_id': ['Publisher not found or access denied.']}
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    settings, _ = PublisherAccountSettings.objects.get_or_create(publisher=publisher)

    if 'email_notifications' in request.data:
        settings.email_notifications = _coerce_boolean(request.data.get('email_notifications'))
    if 'royalty_alerts' in request.data:
        settings.royalty_alerts = _coerce_boolean(request.data.get('royalty_alerts'))
    if 'weekly_reports' in request.data:
        settings.weekly_reports = _coerce_boolean(request.data.get('weekly_reports'))
    if 'two_factor_auth' in request.data:
        settings.two_factor_auth = _coerce_boolean(request.data.get('two_factor_auth'))
    if 'language' in request.data or 'preferred_language' in request.data:
        settings.preferred_language = (
            request.data.get('language')
            or request.data.get('preferred_language')
            or settings.preferred_language
        )
    if 'timezone' in request.data:
        settings.timezone = request.data.get('timezone') or settings.timezone
    if 'currency' in request.data:
        settings.currency = request.data.get('currency') or settings.currency

    settings.save()

    serializer = PublisherAccountSettingsSerializer(settings)
    payload['message'] = 'Successful'
    payload['data'] = {
        'accountSettings': serializer.data,
        'publisherId': str(publisher.publisher_id),
    }
    return Response(payload, status=status.HTTP_200_OK)
