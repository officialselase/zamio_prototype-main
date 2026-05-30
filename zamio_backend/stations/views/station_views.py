from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from rest_framework.authentication import TokenAuthentication
from accounts.api.custom_jwt import CustomJWTAuthentication

from stations.serializers import AllStationSerializer, StationDetailsSerializer


from ..models import Station, User
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_station(request):
    payload = {}
    data = {}
    errors = {}

    name = request.data.get('name', '')
    location = request.data.get('location', '')
    photo = request.data.get('photo', '')
    phone = request.data.get('phone', '')
    country = request.data.get('country', '')
    about = request.data.get('about', '')

    if not name:
        errors['name'] = ['Station name is required.']
    if not location:
        errors['location'] = ['Location is required.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    station = Station.objects.create(
        user=request.user,
        name=name,
        location=location,
        phone=phone,
        photo=photo,
        country=country,
        about=about,
        active=True
    )

    serializer = StationDetailsSerializer(station)
    data = serializer.data

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_all_stations_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = 10

    all_stations = Station.objects.filter(is_archived=False)

    if search_query:
        all_stations = all_stations.filter(
            Q(name__icontains=search_query) |
            Q(location__icontains=search_query) |
            Q(phone__icontains=search_query) |
            Q(country__icontains=search_query)
        )

    paginator = Paginator(all_stations, page_size)

    try:
        paginated = paginator.page(page_number)
    except PageNotAnInteger:
        paginated = paginator.page(1)
    except EmptyPage:
        paginated = paginator.page(paginator.num_pages)

    serializer = AllStationSerializer(paginated, many=True)
    data['stations'] = serializer.data
    data['pagination'] = {
        'page_number': paginated.number,
        'total_pages': paginator.num_pages,
        'next': paginated.next_page_number() if paginated.has_next() else None,
        'previous': paginated.previous_page_number() if paginated.has_previous() else None,
    }

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_details_view(request):
    payload = {}
    errors = {}

    station_id = request.query_params.get('station_id')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    serializer = StationDetailsSerializer(station)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def edit_station(request):
    payload = {}
    data = {}
    errors = {}

    station_id = request.data.get('station_id', '')
    name = request.data.get('name', '')
    phone = request.data.get('phone', '')
    city = request.data.get('city', '')
    region = request.data.get('region', '')
    country = request.data.get('country', '')
    photo = request.data.get('photo', '')
    about = request.data.get('about', '')
    stream_url = request.data.get('stream_url', '').strip() if request.data.get('stream_url') is not None else None

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    station.name = name or station.name
    station.phone = phone or station.phone
    station.city = city or station.city
    station.region = region or station.region
    station.country = country or station.country
    station.photo = photo or station.photo
    station.about = about or station.about
    
    # Handle stream URL update if provided
    if stream_url is not None:
        if stream_url:
            try:
                # Validate stream URL format using model validation
                from stations.models import validate_stream_url
                validate_stream_url(stream_url)
                station.stream_url = stream_url
                
                # Test the stream URL and update status
                station.stream_status = 'testing'
                is_accessible, message = station.test_stream_url()
                
                # If stream is accessible, trigger a test scan using Celery
                if is_accessible:
                    try:
                        from music_monitor.tasks import scan_single_station_stream
                        # Trigger async test scan (non-blocking)
                        scan_single_station_stream.delay(station.id, stream_url, 10)
                    except Exception:
                        # Don't fail the edit if scan fails
                        pass
                
            except Exception as e:
                errors['stream_url'] = [str(e)]
                payload['message'] = 'Errors'
                payload['errors'] = errors
                return Response(payload, status=status.HTTP_400_BAD_REQUEST)
        else:  # Empty string means clear the stream URL
            station.stream_url = None
            station.stream_status = 'inactive'
            station.stream_validation_errors = None

    station.save()

    serializer = StationDetailsSerializer(station)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data

    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def archive_station(request):
    payload = {}
    errors = {}

    station_id = request.data.get('station_id')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    station.is_archived = True
    station.save()

    payload['message'] = 'Successful'
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def unarchive_station(request):
    payload = {}
    errors = {}

    station_id = request.data.get('station_id')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    station.is_archived = False
    station.save()

    payload['message'] = 'Successful'
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def delete_station(request):
    payload = {}
    errors = {}

    station_id = request.data.get('station_id')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    try:
        station = Station.objects.get(id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    station.delete()

    payload['message'] = 'Successful'
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_archived_stations_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = 10

    all_stations = Station.objects.filter(is_archived=True)

    if search_query:
        all_stations = all_stations.filter(
            Q(name__icontains=search_query) |
            Q(location__icontains=search_query) |
            Q(phone__icontains=search_query) |
            Q(country__icontains=search_query)
        )

    paginator = Paginator(all_stations, page_size)

    try:
        paginated = paginator.page(page_number)
    except PageNotAnInteger:
        paginated = paginator.page(1)
    except EmptyPage:
        paginated = paginator.page(paginator.num_pages)

    serializer = AllStationSerializer(paginated, many=True)
    data['stations'] = serializer.data
    data['pagination'] = {
        'page_number': paginated.number,
        'total_pages': paginator.num_pages,
        'next': paginated.next_page_number() if paginated.has_next() else None,
        'previous': paginated.previous_page_number() if paginated.has_previous() else None,
    }

    payload['message'] = 'Successful'
    payload['data'] = data

    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def update_station_stream_url(request):
    """Update station stream URL and validate it"""
    payload = {}
    errors = {}

    station_id = request.data.get('station_id', '')
    stream_url = request.data.get('stream_url', '').strip()

    if not station_id:
        errors['station_id'] = ['Station ID is required.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Update stream URL
    station.stream_url = stream_url if stream_url else None
    
    # Test the stream URL if provided
    if stream_url:
        station.stream_status = 'testing'
        station.save()
        
        # Test connectivity
        is_accessible, message = station.test_stream_url()
        station.save()
        
        payload['message'] = 'Stream URL updated and tested'
        payload['data'] = {
            'stream_url': station.stream_url,
            'stream_status': station.stream_status,
            'stream_accessible': is_accessible,
            'test_message': message,
            'last_monitored': station.last_monitored.isoformat() if station.last_monitored else None
        }
    else:
        station.stream_status = 'inactive'
        station.stream_validation_errors = None
        station.save()
        
        payload['message'] = 'Stream URL removed'
        payload['data'] = {
            'stream_url': None,
            'stream_status': 'inactive'
        }

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def test_station_stream_url(request):
    """Test station stream URL connectivity"""
    payload = {}
    errors = {}

    station_id = request.data.get('station_id', '')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if not station.stream_url:
        errors['stream_url'] = ['No stream URL configured for this station.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Test the stream URL
    station.stream_status = 'testing'
    station.save()
    
    is_accessible, message = station.test_stream_url()
    station.save()

    payload['message'] = 'Stream URL test completed'
    payload['data'] = {
        'stream_url': station.stream_url,
        'stream_status': station.stream_status,
        'stream_accessible': is_accessible,
        'test_message': message,
        'last_monitored': station.last_monitored.isoformat() if station.last_monitored else None,
        'validation_errors': station.stream_validation_errors
    }

    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_station_stream_status(request):
    """Get station stream URL status"""
    payload = {}
    errors = {}

    station_id = request.query_params.get('station_id', '')

    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        station = Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    payload['message'] = 'Successful'
    payload['data'] = {
        'stream_url': station.stream_url,
        'stream_status': station.stream_status,
        'last_monitored': station.last_monitored.isoformat() if station.last_monitored else None,
        'validation_errors': station.stream_validation_errors
    }

    return Response(payload, status=status.HTTP_200_OK)
