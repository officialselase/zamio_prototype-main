import json

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.api.custom_jwt import CustomJWTAuthentication

from ..models import Station, StationStaff
from ..serializers import StationStaffDetailsSerializer, StationStaffManagementSerializer


ROLE_DEFINITIONS = [
    {
        'id': 'admin',
        'label': 'Administrator',
        'description': 'Full access to all station features and settings.',
    },
    {
        'id': 'manager',
        'label': 'Manager',
        'description': 'Manage reports, monitoring, and staff oversight.',
    },
    {
        'id': 'reporter',
        'label': 'Reporter',
        'description': 'Access to reports and monitoring summaries.',
    },
]


PERMISSION_DEFINITIONS = [
    {
        'id': 'reports',
        'label': 'View Reports',
        'description': 'Access to airplay and royalty reports.',
    },
    {
        'id': 'monitoring',
        'label': 'Monitor Streams',
        'description': 'Real-time stream monitoring access.',
    },
    {
        'id': 'staff',
        'label': 'Manage Staff',
        'description': 'Add or remove team members and roles.',
    },
    {
        'id': 'settings',
        'label': 'Manage Settings',
        'description': 'Modify station configuration and preferences.',
    },
    {
        'id': 'payments',
        'label': 'Manage Payments',
        'description': 'Access to payment and billing features.',
    },
    {
        'id': 'compliance',
        'label': 'Compliance Tools',
        'description': 'Handle regulatory compliance workflows.',
    },
]


STATUS_OPTIONS = [
    {'id': 'active', 'label': 'Active'},
    {'id': 'inactive', 'label': 'Inactive'},
]


def _parse_positive_int(value, default):
    try:
        parsed = int(value)
        if parsed > 0:
            return parsed
    except (TypeError, ValueError):
        pass
    return default


def _parse_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'true', '1', 'yes', 'y', 'on'}
    return default


def _normalize_permissions(raw_permissions):
    if raw_permissions is None:
        return []

    if isinstance(raw_permissions, (list, tuple, set)):
        candidates = raw_permissions
    elif isinstance(raw_permissions, str):
        candidate_str = raw_permissions.strip()
        if not candidate_str:
            return []
        try:
            parsed = json.loads(candidate_str)
            if isinstance(parsed, (list, tuple, set)):
                candidates = parsed
            else:
                candidates = [candidate_str]
        except json.JSONDecodeError:
            candidates = [part for part in candidate_str.split(',') if part]
    else:
        candidates = [raw_permissions]

    normalized = []
    for item in candidates:
        if isinstance(item, str):
            key = item.strip().lower()
            if key and key not in normalized:
                normalized.append(key)
    return normalized


def _apply_permissions_to_staff(staff: StationStaff, permissions: list[str]):
    defaults = StationStaff.role_defaults()
    role_key = StationStaff.resolve_role_key(staff.permission_level)
    if role_key == 'admin':
        permissions = defaults['admin']
    elif not permissions:
        permissions = defaults.get(role_key, [])

    staff.apply_permissions(permissions)


def _extract_name_parts(payload):
    first_name = (payload.get('first_name') or payload.get('firstName') or '').strip()
    last_name = (payload.get('last_name') or payload.get('lastName') or '').strip()
    return first_name, last_name


def _parse_iso_date(value):
    if not value:
        return None
    if isinstance(value, str):
        parsed = parse_date(value.strip())
        return parsed
    return value


def _build_pagination(page_obj, paginator):
    if not paginator.count:
        return {
            'count': 0,
            'page_number': 1,
            'page_size': paginator.per_page,
            'total_pages': 0,
            'next': None,
            'previous': None,
            'has_next': False,
            'has_previous': False,
        }

    return {
        'count': paginator.count,
        'page_number': page_obj.number,
        'page_size': paginator.per_page,
        'total_pages': paginator.num_pages,
        'next': page_obj.next_page_number() if page_obj.has_next() else None,
        'previous': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    }


def _station_or_error(station_id, errors):
    if not station_id:
        errors['station_id'] = ['Station ID is required.']
        return None
    try:
        return Station.objects.get(station_id=station_id)
    except Station.DoesNotExist:
        errors['station_id'] = ['Station does not exist.']
        return None


def _build_staff_summary(station: Station):
    base_qs = StationStaff.objects.filter(station=station, is_archived=False)
    return {
        'totalStaff': base_qs.count(),
        'activeStaff': base_qs.filter(active=True).count(),
        'inactiveStaff': base_qs.filter(active=False).count(),
        'adminCount': base_qs.filter(permission_level='admin').count(),
        'managerCount': base_qs.filter(permission_level='edit').count(),
        'reporterCount': base_qs.filter(permission_level='view').count(),
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def add_station_staff(request):
    payload = {}
    errors = {}

    station_id = (request.data.get('station_id') or '').strip()
    station = _station_or_error(station_id, errors)

    first_name, last_name = _extract_name_parts(request.data)
    email = (request.data.get('email') or '').strip()
    phone = (request.data.get('phone') or '').strip()
    role_key = (request.data.get('role') or 'reporter').strip().lower()
    permissions = _normalize_permissions(request.data.get('permissions'))
    department = (request.data.get('department') or '').strip()
    emergency_contact = (request.data.get('emergency_contact') or request.data.get('emergencyContact') or '').strip()
    emergency_phone = (request.data.get('emergency_phone') or request.data.get('emergencyPhone') or '').strip()
    employee_id = (request.data.get('employee_id') or request.data.get('employeeId') or '').strip()
    hire_date = _parse_iso_date(request.data.get('hire_date') or request.data.get('hireDate'))

    if not first_name:
        errors['first_name'] = ['First name is required.']
    if not last_name:
        errors['last_name'] = ['Last name is required.']
    if not email:
        errors['email'] = ['Email is required.']

    if station and email:
        exists = StationStaff.objects.filter(
            station=station,
            email__iexact=email,
            is_archived=False,
        ).exists()
        if exists:
            errors['email'] = ['A staff member with this email already exists for this station.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    permission_level = StationStaff.resolve_permission_level(role_key)

    staff = StationStaff(
        station=station,
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone or None,
        role=role_key if role_key in dict(StationStaff.STAFF_ROLES) else 'presenter',
        permission_level=permission_level,
        department=department or None,
        emergency_contact=emergency_contact or None,
        emergency_phone=emergency_phone or None,
        employee_id=employee_id or None,
        hire_date=hire_date,
        active=True,
    )
    _apply_permissions_to_staff(staff, permissions)
    staff.save()

    serializer = StationStaffDetailsSerializer(staff)
    payload['message'] = 'Staff member added successfully'
    payload['data'] = serializer.data
    return Response(payload, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_staff_list(request):
    payload = {}
    data = {}
    errors = {}

    station_id = (request.query_params.get('station_id') or '').strip()
    station = _station_or_error(station_id, errors)

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    search_query = (request.query_params.get('search') or '').strip()
    role_filter = (request.query_params.get('role') or '').strip().lower()
    status_filter = (request.query_params.get('status') or '').strip().lower()
    page_number = _parse_positive_int(request.query_params.get('page'), 1)
    page_size = _parse_positive_int(request.query_params.get('page_size'), 10)

    staff_qs = StationStaff.objects.filter(station=station, is_archived=False)

    if search_query:
        staff_qs = staff_qs.filter(
            Q(name__icontains=search_query)
            | Q(first_name__icontains=search_query)
            | Q(last_name__icontains=search_query)
            | Q(email__icontains=search_query)
            | Q(phone__icontains=search_query)
            | Q(department__icontains=search_query)
            | Q(employee_id__icontains=search_query)
        )

    if role_filter in {'admin', 'manager', 'reporter'}:
        permission_level = StationStaff.resolve_permission_level(role_filter)
        staff_qs = staff_qs.filter(permission_level=permission_level)

    if status_filter in {'active', 'inactive'}:
        staff_qs = staff_qs.filter(active=(status_filter == 'active'))

    staff_qs = staff_qs.order_by('-active', '-created_at')

    paginator = Paginator(staff_qs, page_size)
    try:
        page_obj = paginator.page(page_number)
    except PageNotAnInteger:
        page_obj = paginator.page(1)
    except EmptyPage:
        page_obj = paginator.page(paginator.num_pages)

    serializer = StationStaffManagementSerializer(page_obj, many=True)

    data['staff'] = {
        'results': serializer.data,
        'pagination': _build_pagination(page_obj, paginator),
    }
    data['summary'] = _build_staff_summary(station)
    data['filters'] = {
        'roles': ROLE_DEFINITIONS,
        'permissions': PERMISSION_DEFINITIONS,
        'statuses': STATUS_OPTIONS,
        'roleDefaults': StationStaff.role_defaults(),
    }

    payload['message'] = 'Successful'
    payload['data'] = data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_staff_details(request):
    payload = {}
    errors = {}

    staff_id = request.query_params.get('staff_id')
    if not staff_id:
        errors['staff_id'] = ['Staff ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        staff = StationStaff.objects.get(id=staff_id, is_archived=False)
    except StationStaff.DoesNotExist:
        errors['staff_id'] = ['Staff member does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    serializer = StationStaffDetailsSerializer(staff)
    payload['message'] = 'Successful'
    payload['data'] = serializer.data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def edit_station_staff(request):
    payload = {}
    errors = {}

    staff_id = request.data.get('staff_id')
    if not staff_id:
        errors['staff_id'] = ['Staff ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        staff = StationStaff.objects.get(id=staff_id, is_archived=False)
    except StationStaff.DoesNotExist:
        errors['staff_id'] = ['Staff member does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    station_id = (request.data.get('station_id') or '').strip()
    if station_id and staff.station.station_id != station_id:
        errors['station_id'] = ['Staff member does not belong to this station.']

    first_name, last_name = _extract_name_parts(request.data)
    email = (request.data.get('email') or '').strip()
    phone = request.data.get('phone')
    role_key = (request.data.get('role') or '').strip().lower()
    permissions = request.data.get('permissions')
    department = request.data.get('department')
    emergency_contact = request.data.get('emergency_contact') or request.data.get('emergencyContact')
    emergency_phone = request.data.get('emergency_phone') or request.data.get('emergencyPhone')
    employee_id = request.data.get('employee_id') or request.data.get('employeeId')
    hire_date = _parse_iso_date(request.data.get('hire_date') or request.data.get('hireDate'))
    active = request.data.get('active')

    if email and StationStaff.objects.filter(
        station=staff.station,
        email__iexact=email,
        is_archived=False,
    ).exclude(id=staff.id).exists():
        errors['email'] = ['Another staff member with this email already exists for this station.']

    if errors:
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    if first_name:
        staff.first_name = first_name
    if last_name:
        staff.last_name = last_name
    if email:
        staff.email = email
    if phone is not None:
        staff.phone = phone or None
    if department is not None:
        staff.department = department or None
    if emergency_contact is not None:
        staff.emergency_contact = (emergency_contact or '').strip() or None
    if emergency_phone is not None:
        staff.emergency_phone = (emergency_phone or '').strip() or None
    if employee_id is not None:
        staff.employee_id = (employee_id or '').strip() or None
    if hire_date is not None:
        staff.hire_date = hire_date
    if active is not None:
        staff.active = _parse_bool(active, default=staff.active)

    if role_key in {'admin', 'manager', 'reporter'}:
        staff.permission_level = StationStaff.resolve_permission_level(role_key)
        staff.role = role_key

    if permissions is not None:
        normalized_permissions = _normalize_permissions(permissions)
        _apply_permissions_to_staff(staff, normalized_permissions)

    staff.save()

    serializer = StationStaffDetailsSerializer(staff)
    payload['message'] = 'Staff member updated successfully'
    payload['data'] = serializer.data
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def archive_station_staff(request):
    payload = {}
    errors = {}

    staff_id = request.data.get('staff_id')
    if not staff_id:
        errors['staff_id'] = ['Staff ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        staff = StationStaff.objects.get(id=staff_id)
    except StationStaff.DoesNotExist:
        errors['staff_id'] = ['Staff member does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    staff.is_archived = True
    staff.active = False
    staff.save(update_fields=['is_archived', 'active', 'updated_at'])

    payload['message'] = 'Staff member archived successfully'
    return Response(payload, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def activate_station_staff(request):
    payload = {}
    errors = {}

    staff_id = request.data.get('staff_id')
    if not staff_id:
        errors['staff_id'] = ['Staff ID is required.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_400_BAD_REQUEST)

    try:
        staff = StationStaff.objects.get(id=staff_id, is_archived=False)
    except StationStaff.DoesNotExist:
        errors['staff_id'] = ['Staff member does not exist.']
        payload['message'] = 'Errors'
        payload['errors'] = errors
        return Response(payload, status=status.HTTP_404_NOT_FOUND)

    active = _parse_bool(request.data.get('active'), default=True)
    staff.active = active
    staff.save(update_fields=['active', 'updated_at'])

    action = 'activated' if active else 'deactivated'
    payload['message'] = f'Staff member {action} successfully'
    payload['data'] = StationStaffDetailsSerializer(staff).data
    return Response(payload, status=status.HTTP_200_OK)
