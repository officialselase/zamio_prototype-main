
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db.models import Q
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.artist_views import is_valid_email, check_email_exist
from artists.models import Album, Artist

User = get_user_model()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def add_album(request):
    payload = {}
    data = {}
    errors = {}

    title = request.data.get('title', "")
    artist_id = request.data.get('artist_id', "")
    release_date = request.data.get('release_date', "").strip()

    if not title:
        errors['title'] = ['Album title is required.']
    if not artist_id:
        errors['artist_id'] = ['Artist ID is required.']


    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    album = Album.objects.create(
        title=title,
        artist=artist,
        release_date=release_date or None,
        active=True
    )

    data['album_id'] = album.id
    data['title'] = album.title
    data['upc_code'] = album.upc_code

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_albums_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = 10

    albums = Album.objects.filter(is_archived=False)

    if search_query:
        albums = albums.filter(
            Q(title__icontains=search_query) |
            Q(upc_code__icontains=search_query) |
            Q(artist__name__icontains=search_query) |
            Q(artist__stage_name__icontains=search_query)
        )

    paginator = Paginator(albums, page_size)
    try:
        paginated_albums = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_albums = paginator.page(1)
    except EmptyPage:
        paginated_albums = paginator.page(paginator.num_pages)

    from ..serializers import AlbumSerializer
    serializer = AlbumSerializer(paginated_albums, many=True)

    data['albums'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_albums.number,
        'total_pages': paginator.num_pages,
        'next': paginated_albums.next_page_number() if paginated_albums.has_next() else None,
        'previous': paginated_albums.previous_page_number() if paginated_albums.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)









@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_album_details_view(request):
    payload = {}
    data = {}
    errors = {}

    album_id = request.query_params.get('album_id', None)

    if not album_id:
        errors['album_id'] = ["Album ID is required."]

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album_id'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    from ..serializers import AlbumSerializer
    serializer = AlbumSerializer(album, many=False)

    payload['message'] = "Successful"
    payload['data'] = serializer.data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_edit_album_support_data_view(request):
    payload = {}
    data = {}
    errors = {}

    artist_id = request.query_params.get('artist_id', "")
    album_id = request.query_params.get('album_id', "")

    try:
        artist = Artist.objects.get(artist_id=artist_id)
    except Artist.DoesNotExist:
        errors['artist'] = ['Artist not found.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    from ..serializers import AlbumDetailsSerializer
    album_serializer = AlbumDetailsSerializer(album, many=False)
    data['album_details'] = album_serializer.data

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)





@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def edit_album(request):
    payload = {}
    data = {}
    errors = {}

    album_id = request.data.get('album_id', "")
    title = request.data.get('title', "")
    artist_id = request.data.get('artist_id', "")
    release_date = request.data.get('release_date', "")
    upc_code = request.data.get('upc_code', "")
    cover_art = request.FILES.get('cover_art', None)

    if not album_id:
        errors['album_id'] = ['Album ID is required.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    # Store original values for audit logging
    original_values = {
        'title': album.title,
        'release_date': str(album.release_date) if album.release_date else None,
        'upc_code': album.upc_code,
        'artist_id': album.artist.artist_id if album.artist else None,
    }

    updated_fields = {}

    if title and title != album.title:
        album.title = title
        updated_fields['title'] = title
    
    if release_date and release_date != str(album.release_date):
        album.release_date = release_date
        updated_fields['release_date'] = release_date
    
    if cover_art:
        album.cover_art = cover_art
        updated_fields['cover_art'] = 'Updated'
    
    if upc_code and upc_code != album.upc_code:
        if Album.objects.filter(upc_code=upc_code).exclude(id=album.id).exists():
            errors['upc_code'] = ['UPC already exists.']
        else:
            album.upc_code = upc_code
            updated_fields['upc_code'] = upc_code
    
    if artist_id and artist_id != original_values['artist_id']:
        try:
            artist = Artist.objects.get(artist_id=artist_id)
            album.artist = artist
            updated_fields['artist_id'] = artist_id
        except Artist.DoesNotExist:
            errors['artist'] = ['Artist not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    album.save()

    # Get client IP for audit logging
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    # Log album edit for audit trail
    from accounts.models import AuditLog
    AuditLog.objects.create(
        user=request.user,
        action='album_edited',
        resource_type='album',
        resource_id=str(album.id),
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        request_data={
            'album_id': album_id,
            'updated_fields': list(updated_fields.keys()),
            'original_values': original_values,
            'new_values': updated_fields
        },
        response_data={
            'success': True,
            'album_id': album.id,
            'title': album.title,
            'updated_fields_count': len(updated_fields)
        },
        status_code=200
    )

    # Create edit history record for version tracking
    if updated_fields:
        from artists.models import AlbumEditHistory
        AlbumEditHistory.objects.create(
            album=album,
            user=request.user,
            changed_fields=list(updated_fields.keys()),
            old_values=original_values,
            new_values=updated_fields,
            edit_reason=request.data.get('edit_reason', ''),
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

    data['album_id'] = album.id
    data['title'] = album.title
    data['upc_code'] = album.upc_code
    data['updated_fields'] = updated_fields

    payload['message'] = "Album updated successfully"
    payload['data'] = data
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_album_edit_history_view(request):
    payload = {}
    data = {}
    errors = {}

    album_id = request.query_params.get('album_id')

    if not album_id:
        errors['album_id'] = ['Album ID is required.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    from artists.models import AlbumEditHistory
    edit_history = AlbumEditHistory.objects.filter(album=album).select_related('user')[:20]  # Last 20 edits

    history_data = []
    for edit in edit_history:
        user_name = f"{edit.user.first_name} {edit.user.last_name}".strip() if edit.user else "Unknown User"
        if not user_name or user_name == "Unknown User":
            user_name = edit.user.email if edit.user else "System"
        
        history_data.append({
            'id': edit.id,
            'user_name': user_name,
            'changed_fields': edit.changed_fields,
            'old_values': edit.old_values,
            'new_values': edit.new_values,
            'edit_reason': edit.edit_reason,
            'created_at': edit.created_at.isoformat(),
        })

    data['edit_history'] = history_data
    data['album_title'] = album.title

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)




@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def archive_album(request):
    payload = {}
    errors = {}

    album_id = request.data.get('album_id', "")

    if not album_id:
        errors['album_id'] = ['Album ID is required.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    album.is_archived = True
    album.save()

    payload['message'] = "Successful"
    return Response(payload)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def unarchive_album(request):
    payload = {}
    errors = {}

    album_id = request.data.get('album_id', "")

    if not album_id:
        errors['album_id'] = ['Album ID is required.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    album.is_archived = False
    album.save()

    payload['message'] = "Successful"
    return Response(payload)



def delete_album(request):
    payload = {}
    errors = {}

    album_id = request.data.get('album_id', "")

    if not album_id:
        errors['album_id'] = ['Album ID is required.']

    try:
        album = Album.objects.get(id=album_id)
    except Album.DoesNotExist:
        errors['album'] = ['Album not found.']

    if errors:
        payload['message'] = "Errors"
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    album.delete()

    payload['message'] = "Deleted successfully"
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication])
def get_all_archived_albums_view(request):
    payload = {}
    data = {}
    errors = {}

    search_query = request.query_params.get('search', '')
    page_number = request.query_params.get('page', 1)
    page_size = 10

    albums = Album.objects.filter(is_archived=True)

    if search_query:
        albums = albums.filter(
            Q(title__icontains=search_query) |
            Q(upc_code__icontains=search_query) |
            Q(artist__name__icontains=search_query)
        )

    paginator = Paginator(albums, page_size)
    try:
        paginated_albums = paginator.page(page_number)
    except PageNotAnInteger:
        paginated_albums = paginator.page(1)
    except EmptyPage:
        paginated_albums = paginator.page(paginator.num_pages)

    from ..serializers import AlbumSerializer
    serializer = AlbumSerializer(paginated_albums, many=True)

    data['albums'] = serializer.data
    data['pagination'] = {
        'page_number': paginated_albums.number,
        'total_pages': paginator.num_pages,
        'next': paginated_albums.next_page_number() if paginated_albums.has_next() else None,
        'previous': paginated_albums.previous_page_number() if paginated_albums.has_previous() else None,
    }

    payload['message'] = "Successful"
    payload['data'] = data
    return Response(payload)
