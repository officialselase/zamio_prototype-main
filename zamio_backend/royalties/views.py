import csv
import hashlib
import os
from datetime import datetime

from django.conf import settings
from django.db import transaction, models
from django.utils.timezone import now
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal

from accounts.api.custom_jwt import CustomJWTAuthentication

from music_monitor.models import PlayLog
from .models import (
    PartnerPRO,
    ReciprocalAgreement,
    ExternalRecording,
    ExternalWork,
    UsageAttribution,
    RoyaltyCycle,
    RoyaltyLineItem,
    PartnerRemittance,
    PartnerReportExport,
    RoyaltyWithdrawal,
    RoyaltyCalculationAudit,
)
from .serializers import (
    PartnerPROSerializer,
    ReciprocalAgreementSerializer,
    RoyaltyCycleSerializer,
    RoyaltyLineItemSerializer,
    PartnerRemittanceSerializer,
    ImportRequestSerializer,
    UploadRepertoireSerializer,
    SecureFinancialFileUploadSerializer,
    FileIntegrityVerificationSerializer,
    RoyaltyWithdrawalSerializer,
    RoyaltyWithdrawalCreateSerializer,
    RoyaltyWithdrawalActionSerializer,
)


def _export_dir():
    base = getattr(settings, "PARTNER_EXPORT_DIR", None) or os.path.join(settings.BASE_DIR, "exports")
    os.makedirs(base, exist_ok=True)
    return base


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_partner(request):
    serializer = PartnerPROSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Ensure required PublisherProfile.user is set
    display_name = serializer.validated_data.get("display_name")
    company_name = serializer.validated_data.get("company_name") or display_name

    partner = PartnerPRO.objects.create(
        user=request.user,  # bind to the admin creating the partner
        company_name=company_name,
        display_name=display_name,
        country_code=serializer.validated_data.get("country_code"),
        contact_email=serializer.validated_data.get("contact_email"),
        reporting_standard=serializer.validated_data.get("reporting_standard", "CSV-Custom"),
        default_admin_fee_percent=serializer.validated_data.get("default_admin_fee_percent", 15.00),
        metadata=serializer.validated_data.get("metadata", {}),
        active=serializer.validated_data.get("active", True),
    )

    return Response(PartnerPROSerializer(partner).data, status=status.HTTP_201_CREATED)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_partner(request, partner_id: int):
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(PartnerPROSerializer(partner).data)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_partners(request):
    qs = PartnerPRO.objects.all().order_by("display_name", "company_name")
    return Response(PartnerPROSerializer(qs, many=True).data)


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_agreement(request, partner_id: int):
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner not found"}, status=status.HTTP_404_NOT_FOUND)
    payload = request.data.copy()
    payload["partner"] = partner.id
    serializer = ReciprocalAgreementSerializer(data=payload)
    if serializer.is_valid():
        agreement = serializer.save()
        return Response(ReciprocalAgreementSerializer(agreement).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_agreements(request, partner_id: int):
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner not found"}, status=status.HTTP_404_NOT_FOUND)
    qs = partner.agreements.all().order_by("-effective_date")
    return Response(ReciprocalAgreementSerializer(qs, many=True).data)


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def ingest_repertoire(request, partner_id: int):
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner not found"}, status=status.HTTP_404_NOT_FOUND)

    ser = ImportRequestSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    csv_path = ser.validated_data["csv_path"]
    dry_run = ser.validated_data["dry_run"]

    created = 0
    updated = 0
    skipped = 0
    try:
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                isrc = (row.get("isrc") or "").strip()
                title = (row.get("title") or "").strip()
                work_title = (row.get("work_title") or "").strip() or None
                duration = row.get("duration_seconds")
                duration = int(duration) if (duration and str(duration).isdigit()) else None

                if not isrc and not title:
                    skipped += 1
                    continue
                if dry_run:
                    continue
                work = None
                if work_title:
                    work, _ = ExternalWork.objects.get_or_create(
                        origin_partner=partner,
                        title=work_title,
                        defaults={"iswc": None},
                    )
                obj, created_flag = ExternalRecording.objects.update_or_create(
                    origin_partner=partner,
                    isrc=isrc or None,
                    defaults={
                        "title": title or (work_title or "Unknown"),
                        "work": work,
                        "duration": duration,
                    },
                )
                if created_flag:
                    created += 1
                else:
                    updated += 1
    except FileNotFoundError:
        return Response({"detail": f"CSV not found: {csv_path}"}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"created": created, "updated": updated, "skipped": skipped, "dry_run": dry_run})


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def ingest_repertoire_upload(request, partner_id: int):
    """Enhanced secure repertoire upload with comprehensive validation and malware scanning"""
    from .services.file_security_service import RoyaltyFileSecurityService
    from accounts.models import AuditLog
    
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner not found"}, status=status.HTTP_404_NOT_FOUND)

    ser = UploadRepertoireSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    upload = request.FILES.get("file")
    dry_run = ser.validated_data.get("dry_run", False)

    if not upload:
        return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Enhanced security validation and processing
        security_result = RoyaltyFileSecurityService.process_secure_financial_upload(
            user=request.user,
            partner_id=partner_id,
            file=upload,
            file_category='repertoire',
            encrypt_storage=True,
            process_async=False  # Process synchronously for immediate response
        )
        
        # If security processing successful, proceed with repertoire ingestion
        created = 0
        updated = 0
        skipped = 0

        try:
            import io, csv
            upload.seek(0)  # Reset file pointer after security processing
            content = upload.read().decode("utf-8", errors="ignore")
            reader = csv.DictReader(io.StringIO(content))
            
            # Validate required columns
            required_columns = ['isrc', 'title']
            if not all(col in reader.fieldnames for col in required_columns):
                missing = [col for col in required_columns if col not in reader.fieldnames]
                return Response(
                    {"detail": f"Missing required columns: {', '.join(missing)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            for row_num, row in enumerate(reader, 1):
                try:
                    isrc = (row.get("isrc") or "").strip()
                    title = (row.get("title") or "").strip()
                    work_title = (row.get("work_title") or "").strip() or None
                    duration = row.get("duration_seconds")
                    duration = int(duration) if (duration and str(duration).isdigit()) else None

                    if not isrc and not title:
                        skipped += 1
                        continue
                    if dry_run:
                        continue
                        
                    work = None
                    if work_title:
                        work, _ = ExternalWork.objects.get_or_create(
                            origin_partner=partner,
                            title=work_title,
                            defaults={"iswc": None},
                        )
                    obj, created_flag = ExternalRecording.objects.update_or_create(
                        origin_partner=partner,
                        isrc=isrc or None,
                        defaults={
                            "title": title or (work_title or "Unknown"),
                            "work": work,
                            "duration": duration,
                        },
                    )
                    if created_flag:
                        created += 1
                    else:
                        updated += 1
                        
                except Exception as row_error:
                    # Log row processing error but continue
                    AuditLog.objects.create(
                        user=request.user,
                        action='repertoire_row_processing_error',
                        resource_type='RepertoireUpload',
                        resource_id=security_result['upload_id'],
                        request_data={
                            'row_number': row_num,
                            'error': str(row_error),
                            'row_data': dict(row)
                        }
                    )
                    skipped += 1
                    
        except Exception as e:
            # Log processing error
            AuditLog.objects.create(
                user=request.user,
                action='repertoire_processing_error',
                resource_type='RepertoireUpload',
                resource_id=security_result['upload_id'],
                request_data={
                    'error': str(e),
                    'partner_id': partner_id,
                    'filename': upload.name
                }
            )
            return Response({"detail": f"Failed to parse CSV: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Log successful processing
        AuditLog.objects.create(
            user=request.user,
            action='repertoire_upload_completed',
            resource_type='RepertoireUpload',
            resource_id=security_result['upload_id'],
            request_data={
                'partner_id': partner_id,
                'filename': upload.name,
                'created': created,
                'updated': updated,
                'skipped': skipped,
                'dry_run': dry_run,
                'file_hash': security_result['file_hash']
            }
        )

        return Response({
            "created": created, 
            "updated": updated, 
            "skipped": skipped, 
            "dry_run": dry_run,
            "upload_id": security_result['upload_id'],
            "file_hash": security_result['file_hash'],
            "security_scan": {
                "threats_found": security_result['scan_result']['threats_count'],
                "is_safe": security_result['scan_result']['is_safe']
            }
        })
        
    except ValidationError as e:
        # Log security validation error
        AuditLog.objects.create(
            user=request.user,
            action='repertoire_upload_security_error',
            resource_type='RepertoireUpload',
            resource_id=f'partner_{partner_id}',
            request_data={
                'partner_id': partner_id,
                'filename': upload.name,
                'security_errors': e.messages if hasattr(e, 'messages') else [str(e)]
            }
        )
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Log unexpected error
        AuditLog.objects.create(
            user=request.user,
            action='repertoire_upload_unexpected_error',
            resource_type='RepertoireUpload',
            resource_id=f'partner_{partner_id}',
            request_data={
                'partner_id': partner_id,
                'filename': upload.name,
                'error': str(e)
            }
        )
        return Response({"detail": f"Upload processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_cycle(request):
    serializer = RoyaltyCycleSerializer(data=request.data)
    if serializer.is_valid():
        cycle = serializer.save()
        return Response(RoyaltyCycleSerializer(cycle).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_cycles(request):
    qs = RoyaltyCycle.objects.all().order_by("-period_start")
    return Response(RoyaltyCycleSerializer(qs, many=True).data)


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
@transaction.atomic
def close_cycle(request, cycle_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)

    # Aggregate UsageAttribution within period and territory
    atts = UsageAttribution.objects.select_related("play_log", "external_recording", "origin_partner").filter(
        territory=cycle.territory,
        played_at__date__gte=cycle.period_start,
        played_at__date__lte=cycle.period_end,
    )

    aggregates = {}
    for a in atts.iterator():
        key = (a.origin_partner_id, a.external_recording_id or 0)
        if key not in aggregates:
            aggregates[key] = {
                "partner_id": a.origin_partner_id,
                "external_recording_id": a.external_recording_id,
                "usage_count": 0,
                "total_duration_seconds": 0,
                "gross_amount": 0,
            }
        row = aggregates[key]
        row["usage_count"] += 1
        if a.duration_seconds:
            row["total_duration_seconds"] += a.duration_seconds
        # Use PlayLog.royalty_amount if available as gross component; else 0
        if a.play_log and a.play_log.royalty_amount:
            try:
                row["gross_amount"] += float(a.play_log.royalty_amount)
            except Exception:
                pass

    # Create line items
    created = 0
    for (partner_id, rec_id), row in aggregates.items():
        admin_percent = float(cycle.admin_fee_percent_default)
        gross = row["gross_amount"]
        admin_fee = round(gross * (admin_percent / 100.0), 2)
        net = round(gross - admin_fee, 2)

        RoyaltyLineItem.objects.create(
            royalty_cycle=cycle,
            partner_id=partner_id,
            external_recording_id=rec_id or None,
            usage_count=row["usage_count"],
            total_duration_seconds=row["total_duration_seconds"],
            gross_amount=gross,
            admin_fee_amount=admin_fee,
            net_amount=net,
            calculation_notes=f"Admin fee {admin_percent}%",
        )
        created += 1

    cycle.status = "Locked"
    cycle.save(update_fields=["status"])
    return Response({"line_items_created": created, "status": cycle.status})


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_cycle_line_items(request, cycle_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    items = cycle.line_items.select_related("partner", "external_recording").all()
    data = RoyaltyLineItemSerializer(items, many=True).data
    return Response(data)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_cycle_exports(request, cycle_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    qs = cycle.report_exports.select_related("partner").all().order_by("-generated_at")
    data = [
        {
            "id": e.id,
            "partner": e.partner_id,
            "format": e.format,
            "file": e.file,
            "checksum": e.checksum,
            "generated_at": e.generated_at,
        }
        for e in qs
    ]
    return Response(data)


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def export_partner_csv(request, cycle_id: int, partner_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
        partner = PartnerPRO.objects.get(id=partner_id)
    except (RoyaltyCycle.DoesNotExist, PartnerPRO.DoesNotExist):
        return Response({"detail": "Cycle or Partner not found"}, status=status.HTTP_404_NOT_FOUND)

    items = RoyaltyLineItem.objects.filter(royalty_cycle=cycle, partner=partner).select_related("external_recording")
    export_dir = _export_dir()
    folder = os.path.join(export_dir, f"partner_{partner.id}", cycle.name)
    os.makedirs(folder, exist_ok=True)
    out_path = os.path.join(folder, f"usage_{partner.id}_{cycle.id}.csv")

    checksum = hashlib.sha256()
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "station_id",
                "played_at_utc",
                "isrc",
                "recording_title",
                "duration_seconds",
                "confidence",
                "match_method",
                "attribution_source",
                "gross_amount",
                "admin_fee_amount",
                "net_amount",
                "currency",
                "cycle_name",
            ],
        )
        writer.writeheader()

        # Walk attributions per line item to reconstruct rows (simplified)
        for item in items:
            # For simplicity, summarize at line-item level as one row
            isrc = item.external_recording.isrc if item.external_recording else None
            title = item.external_recording.title if item.external_recording else None
            row = {
                "station_id": None,
                "played_at_utc": None,
                "isrc": isrc,
                "recording_title": title,
                "duration_seconds": item.total_duration_seconds,
                "confidence": None,
                "match_method": "metadata",
                "attribution_source": "Partner",
                "gross_amount": item.gross_amount,
                "admin_fee_amount": item.admin_fee_amount,
                "net_amount": item.net_amount,
                "currency": "GHS",
                "cycle_name": cycle.name,
            }
            writer.writerow(row)
            checksum.update(str(row).encode("utf-8"))

    pre = PartnerReportExport.objects.create(
        partner=partner,
        royalty_cycle=cycle,
        format="CSV",
        file=out_path,
        checksum=checksum.hexdigest(),
    )
    return Response({"file": out_path, "checksum": pre.checksum})


@api_view(["POST"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def create_remittance(request, cycle_id: int, partner_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
        partner = PartnerPRO.objects.get(id=partner_id)
    except (RoyaltyCycle.DoesNotExist, PartnerPRO.DoesNotExist):
        return Response({"detail": "Cycle or Partner not found"}, status=status.HTTP_404_NOT_FOUND)

    items = RoyaltyLineItem.objects.filter(royalty_cycle=cycle, partner=partner)
    gross = sum([float(i.gross_amount) for i in items])
    admin_fee = sum([float(i.admin_fee_amount) for i in items])
    net = sum([float(i.net_amount) for i in items])

    remit = PartnerRemittance.objects.create(
        partner=partner,
        royalty_cycle=cycle,
        currency="GHS",
        gross_amount=gross,
        admin_fee_amount=admin_fee,
        net_payable=net,
        status="Pending",
    )
    return Response(PartnerRemittanceSerializer(remit).data, status=status.HTTP_201_CREATED)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_remittance(request, remittance_id: int):
    try:
        remit = PartnerRemittance.objects.get(id=remittance_id)
    except PartnerRemittance.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(PartnerRemittanceSerializer(remit).data)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_cycle_remittances(request, cycle_id: int):
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    qs = cycle.remittances.select_related("partner").all().order_by("-created_at")
    return Response(PartnerRemittanceSerializer(qs, many=True).data)


@api_view(["GET"]) 
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def list_unmatched_usage(request):
    # PlayLogs with no UsageAttribution (recent 500)
    without = PlayLog.objects.exclude(usage_attributions__isnull=False).order_by("-created_at")[:500]
    data = [
        {
            "id": p.id,
            "track_id": p.track_id,
            "station_id": p.station_id,
            "played_at": p.played_at,
            "duration": p.duration.total_seconds() if p.duration else None,
        }
        for p in without
    ]
    return Response({"count": len(data), "items": data})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def calculate_play_log_royalties(request):
    """Calculate royalties for specific play logs"""
    from .calculator import RoyaltyCalculator
    from .serializers import RoyaltyCalculationResultSerializer
    
    play_log_ids = request.data.get('play_log_ids', [])
    if not play_log_ids:
        return Response({"detail": "play_log_ids required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        play_logs = PlayLog.objects.filter(
            id__in=play_log_ids,
            track__isnull=False
        ).select_related('track', 'station')
        
        if not play_logs.exists():
            return Response({"detail": "No valid play logs found"}, status=status.HTTP_404_NOT_FOUND)
        
        calculator = RoyaltyCalculator()
        results = calculator.batch_calculate_royalties(list(play_logs))
        
        # Create distribution records if not dry run
        dry_run = request.data.get('dry_run', False)
        if not dry_run:
            for result in results:
                if not result.errors:
                    calculator.create_royalty_distributions(result)
        
        # Prepare response data
        response_data = {
            'results': [
                {
                    'play_log_id': result.play_log.id,
                    'total_gross_amount': str(result.total_gross_amount),
                    'currency': result.currency,
                    'distributions_count': len(result.distributions),
                    'distributions': [
                        {
                            'recipient_id': dist.recipient_id,
                            'recipient_type': dist.recipient_type,
                            'gross_amount': str(dist.gross_amount),
                            'net_amount': str(dist.net_amount),
                            'percentage_split': str(dist.percentage_split),
                            'pro_share': str(dist.pro_share),
                        }
                        for dist in result.distributions
                    ],
                    'errors': result.errors,
                    'calculation_metadata': result.calculation_metadata
                }
                for result in results
            ],
            'summary': {
                'total_play_logs': len(results),
                'successful_calculations': len([r for r in results if not r.errors]),
                'total_amount': str(sum(r.total_gross_amount for r in results if not r.errors)),
                'currency': 'GHS',
                'dry_run': dry_run
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({"detail": f"Calculation error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_royalty_rates(request):
    """Get current royalty rate structures"""
    from .models import RoyaltyRateStructure
    
    territory = request.GET.get('territory', 'GH')
    
    rates = RoyaltyRateStructure.objects.filter(
        territory=territory,
        is_active=True,
        effective_date__lte=timezone.now().date()
    ).order_by('station_class', 'time_period')
    
    data = [
        {
            'id': rate.id,
            'name': rate.name,
            'station_class': rate.station_class,
            'station_class_display': rate.get_station_class_display(),
            'time_period': rate.time_period,
            'time_period_display': rate.get_time_period_display(),
            'base_rate_per_second': str(rate.base_rate_per_second),
            'multiplier': str(rate.multiplier),
            'effective_date': rate.effective_date,
            'currency': rate.currency,
        }
        for rate in rates
    ]
    
    return Response({'rates': data, 'territory': territory})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def update_royalty_rate(request, rate_id):
    """Update a royalty rate structure"""
    from .models import RoyaltyRateStructure
    
    try:
        rate = RoyaltyRateStructure.objects.get(id=rate_id)
    except RoyaltyRateStructure.DoesNotExist:
        return Response({"detail": "Rate structure not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Update allowed fields
    allowed_fields = ['base_rate_per_second', 'multiplier', 'notes']
    updated_fields = []
    
    for field in allowed_fields:
        if field in request.data:
            setattr(rate, field, request.data[field])
            updated_fields.append(field)
    
    if updated_fields:
        rate.save(update_fields=updated_fields + ['updated_at'])
        
        return Response({
            'id': rate.id,
            'updated_fields': updated_fields,
            'base_rate_per_second': str(rate.base_rate_per_second),
            'multiplier': str(rate.multiplier),
            'notes': rate.notes,
        })
    else:
        return Response({"detail": "No valid fields to update"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_exchange_rates(request):
    """Get current exchange rates"""
    from .models import CurrencyExchangeRate
    
    rates = CurrencyExchangeRate.objects.filter(
        is_active=True,
        effective_date__lte=timezone.now()
    ).order_by('from_currency', 'to_currency', '-effective_date')
    
    # Get latest rate for each currency pair
    latest_rates = {}
    for rate in rates:
        pair_key = f"{rate.from_currency}_{rate.to_currency}"
        if pair_key not in latest_rates:
            latest_rates[pair_key] = rate
    
    data = [
        {
            'id': rate.id,
            'from_currency': rate.from_currency,
            'to_currency': rate.to_currency,
            'rate': str(rate.rate),
            'effective_date': rate.effective_date,
            'source': rate.source,
        }
        for rate in latest_rates.values()
    ]
    
    return Response({'exchange_rates': data})


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_calculation_audit(request):
    """Get royalty calculation audit trail"""
    from .models import RoyaltyCalculationAudit
    from .serializers import RoyaltyCalculationAuditSerializer
    
    # Filter parameters
    calculation_type = request.GET.get('calculation_type')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    queryset = RoyaltyCalculationAudit.objects.select_related('calculated_by').all()
    
    if calculation_type:
        queryset = queryset.filter(calculation_type=calculation_type)
    
    if start_date:
        try:
            from datetime import datetime
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            queryset = queryset.filter(calculated_at__gte=start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            from datetime import datetime
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            queryset = queryset.filter(calculated_at__lte=end_dt)
        except ValueError:
            pass
    
    # Paginate results
    queryset = queryset.order_by('-calculated_at')[:100]
    
    serializer = RoyaltyCalculationAuditSerializer(queryset, many=True)
    return Response({
        'audit_records': serializer.data,
        'count': len(serializer.data)
    })


# Royalty Withdrawal Management API Endpoints

@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def create_withdrawal_request(request):
    """Create a new royalty withdrawal request"""
    from accounts.models import AuditLog
    
    serializer = RoyaltyWithdrawalCreateSerializer(data=request.data, context={'request': request})
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Create the withdrawal request
        withdrawal = serializer.save()
        
        # Validate publishing authority immediately
        is_valid, message = withdrawal.validate_publishing_authority()
        
        # Log the withdrawal request creation
        AuditLog.objects.create(
            user=request.user,
            action='royalty_withdrawal_requested',
            resource_type='RoyaltyWithdrawal',
            resource_id=str(withdrawal.withdrawal_id),
            request_data={
                'requester_type': withdrawal.requester_type,
                'amount': str(withdrawal.amount),
                'currency': withdrawal.currency,
                'artist_id': withdrawal.artist.id if withdrawal.artist else None,
                'publisher_id': withdrawal.publisher.id if withdrawal.publisher else None,
                'publishing_authority_valid': is_valid,
                'validation_message': message
            }
        )
        
        # Return the created withdrawal with validation status
        response_serializer = RoyaltyWithdrawalSerializer(withdrawal)
        response_data = response_serializer.data
        response_data['publishing_authority_check'] = {
            'is_valid': is_valid,
            'message': message
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"detail": f"Failed to create withdrawal request: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_withdrawal_requests(request):
    """List royalty withdrawal requests with filtering"""
    
    queryset = RoyaltyWithdrawal.objects.select_related(
        'requester', 'artist', 'publisher', 'processed_by'
    ).all()
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    # Filter by requester type
    requester_type = request.GET.get('requester_type')
    if requester_type:
        queryset = queryset.filter(requester_type=requester_type)
    
    # Filter by requester (for user's own requests)
    if not request.user.is_staff:
        queryset = queryset.filter(requester=request.user)
    
    # Filter by artist
    artist_id = request.GET.get('artist_id')
    if artist_id:
        queryset = queryset.filter(artist_id=artist_id)
    
    # Filter by publisher
    publisher_id = request.GET.get('publisher_id')
    if publisher_id:
        queryset = queryset.filter(publisher_id=publisher_id)
    
    # Order by most recent first
    queryset = queryset.order_by('-requested_at')
    
    # Paginate (simple limit for now)
    limit = min(int(request.GET.get('limit', 50)), 100)
    queryset = queryset[:limit]
    
    serializer = RoyaltyWithdrawalSerializer(queryset, many=True)
    
    return Response({
        'withdrawals': serializer.data,
        'count': len(serializer.data)
    })


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_withdrawal_request(request, withdrawal_id):
    """Get a specific withdrawal request"""
    
    try:
        withdrawal = RoyaltyWithdrawal.objects.select_related(
            'requester', 'artist', 'publisher', 'processed_by'
        ).get(withdrawal_id=withdrawal_id)
        
        # Check permissions - users can only see their own requests unless they're staff
        if not request.user.is_staff and withdrawal.requester != request.user:
            return Response(
                {"detail": "You don't have permission to view this withdrawal request"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = RoyaltyWithdrawalSerializer(withdrawal)
        response_data = serializer.data
        
        # Add current publishing authority validation
        is_valid, message = withdrawal.validate_publishing_authority()
        response_data['current_publishing_authority_check'] = {
            'is_valid': is_valid,
            'message': message
        }
        
        return Response(response_data)
        
    except RoyaltyWithdrawal.DoesNotExist:
        return Response(
            {"detail": "Withdrawal request not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def process_withdrawal_action(request, withdrawal_id):
    """Process actions on withdrawal requests (approve, reject, process, cancel)"""
    from accounts.models import AuditLog
    
    try:
        withdrawal = RoyaltyWithdrawal.objects.select_related(
            'requester', 'artist', 'publisher'
        ).get(withdrawal_id=withdrawal_id)
        
        # Validate action data
        action_serializer = RoyaltyWithdrawalActionSerializer(data=request.data)
        if not action_serializer.is_valid():
            return Response(action_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        action = action_serializer.validated_data['action']
        reason = action_serializer.validated_data.get('reason', '')
        admin_notes = action_serializer.validated_data.get('admin_notes', '')
        
        # Check permissions
        if action in ['approve', 'reject', 'process'] and not request.user.is_staff:
            return Response(
                {"detail": "Only staff members can approve, reject, or process withdrawals"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if action == 'cancel':
            # Users can cancel their own requests, staff can cancel any
            if withdrawal.requester != request.user and not request.user.is_staff:
                return Response(
                    {"detail": "You can only cancel your own withdrawal requests"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Process the action
        success = False
        message = ""
        
        if action == 'approve':
            success, message = withdrawal.approve_withdrawal(request.user)
        elif action == 'reject':
            withdrawal.reject_withdrawal(reason, request.user)
            success = True
            message = "Withdrawal rejected"
        elif action == 'process':
            success, message = withdrawal.process_withdrawal(request.user)
        elif action == 'cancel':
            success, message = withdrawal.cancel_withdrawal(request.user, reason)
        
        # Add admin notes if provided
        if admin_notes and success:
            withdrawal.admin_notes = f"{withdrawal.admin_notes}\n{admin_notes}" if withdrawal.admin_notes else admin_notes
            withdrawal.save(update_fields=['admin_notes'])
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action=f'royalty_withdrawal_{action}',
            resource_type='RoyaltyWithdrawal',
            resource_id=str(withdrawal.withdrawal_id),
            request_data={
                'action': action,
                'reason': reason,
                'admin_notes': admin_notes,
                'success': success,
                'message': message,
                'withdrawal_status': withdrawal.status
            }
        )
        
        if success:
            # Return updated withdrawal data
            serializer = RoyaltyWithdrawalSerializer(withdrawal)
            return Response({
                'withdrawal': serializer.data,
                'action': action,
                'success': True,
                'message': message
            })
        else:
            return Response({
                'action': action,
                'success': False,
                'message': message
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except RoyaltyWithdrawal.DoesNotExist:
        return Response(
            {"detail": "Withdrawal request not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to process withdrawal action: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_artist_withdrawal_eligibility(request, artist_id):
    """Check artist's withdrawal eligibility based on publishing status"""
    from artists.models import Artist
    
    try:
        artist = Artist.objects.select_related('publisher').get(id=artist_id)
        
        # Check if user has permission to view this artist's eligibility
        if not request.user.is_staff:
            # User must be the artist or associated with the artist's publisher
            user_is_artist = hasattr(request.user, 'artists') and request.user.artists.filter(id=artist_id).exists()
            user_is_publisher = (
                artist.publisher and 
                hasattr(request.user, 'publisher') and 
                request.user.publisher.filter(id=artist.publisher.id).exists()
            )
            
            if not (user_is_artist or user_is_publisher):
                return Response(
                    {"detail": "You don't have permission to view this artist's withdrawal eligibility"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Create a temporary withdrawal to test eligibility
        temp_withdrawal = RoyaltyWithdrawal(
            requester=request.user,
            requester_type='artist' if hasattr(request.user, 'artists') else 'publisher',
            artist=artist,
            publisher=artist.publisher if not artist.self_published else None,
            amount=1.00  # Dummy amount for validation
        )
        
        is_eligible, message = temp_withdrawal.validate_publishing_authority()
        
        # Get recent withdrawal history
        recent_withdrawals = RoyaltyWithdrawal.objects.filter(
            artist=artist,
            requested_at__gte=timezone.now() - timezone.timedelta(days=90)
        ).order_by('-requested_at')[:5]
        
        withdrawal_history = [
            {
                'withdrawal_id': str(w.withdrawal_id),
                'amount': str(w.amount),
                'currency': w.currency,
                'status': w.status,
                'requested_at': w.requested_at,
                'processed_at': w.processed_at
            }
            for w in recent_withdrawals
        ]
        
        return Response({
            'artist_id': artist.id,
            'artist_name': artist.stage_name,
            'eligibility': {
                'can_withdraw': is_eligible,
                'message': message,
                'publishing_status': {
                    'self_published': artist.self_published,
                    'publisher': artist.publisher.company_name if artist.publisher else None,
                    'relationship_status': artist.publisher_relationship_status,
                    'royalty_collection_method': artist.royalty_collection_method
                }
            },
            'recent_withdrawals': withdrawal_history
        })
        
    except Artist.DoesNotExist:
        return Response(
            {"detail": "Artist not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_publisher_withdrawal_summary(request, publisher_id):
    """Get withdrawal summary for a publisher's managed artists"""
    from publishers.models import PublisherProfile
    
    try:
        publisher = PublisherProfile.objects.get(id=publisher_id)
        
        # Check permissions
        if not request.user.is_staff and publisher.user != request.user:
            return Response(
                {"detail": "You don't have permission to view this publisher's withdrawal summary"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get managed artists
        managed_artists = publisher.artist_publishers.filter(
            publisher_relationship_status='signed',
            self_published=False
        ).select_related('user')
        
        # Get withdrawal requests for managed artists
        withdrawals = RoyaltyWithdrawal.objects.filter(
            publisher=publisher
        ).select_related('artist', 'requester').order_by('-requested_at')
        
        # Summarize by status
        status_summary = {}
        total_amount = Decimal('0')
        
        for withdrawal in withdrawals:
            status = withdrawal.status
            if status not in status_summary:
                status_summary[status] = {
                    'count': 0,
                    'total_amount': Decimal('0')
                }
            status_summary[status]['count'] += 1
            status_summary[status]['total_amount'] += withdrawal.amount
            total_amount += withdrawal.amount
        
        # Convert Decimal to string for JSON serialization
        for status_data in status_summary.values():
            status_data['total_amount'] = str(status_data['total_amount'])
        
        return Response({
            'publisher_id': publisher.id,
            'publisher_name': publisher.company_name,
            'managed_artists_count': managed_artists.count(),
            'withdrawal_summary': {
                'total_requests': withdrawals.count(),
                'total_amount': str(total_amount),
                'by_status': status_summary
            },
            'managed_artists': [
                {
                    'id': artist.id,
                    'stage_name': artist.stage_name,
                    'relationship_status': artist.publisher_relationship_status,
                    'can_withdraw': not artist.self_published and artist.publisher == publisher
                }
                for artist in managed_artists
            ]
        })
        
    except PublisherProfile.DoesNotExist:
        return Response(
            {"detail": "Publisher not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_calculation_audit(request):
    """Get royalty calculation audit trail"""
    from .models import RoyaltyCalculationAudit
    
    calculation_type = request.GET.get('type')
    limit = int(request.GET.get('limit', 50))
    
    queryset = RoyaltyCalculationAudit.objects.all()
    
    if calculation_type:
        queryset = queryset.filter(calculation_type=calculation_type)
    
    audits = queryset.order_by('-calculated_at')[:limit]
    
    data = [
        {
            'id': audit.id,
            'calculation_id': str(audit.calculation_id),
            'calculation_type': audit.calculation_type,
            'total_amount': str(audit.total_amount),
            'currency': audit.currency,
            'distributions_count': audit.distributions_count,
            'calculated_at': audit.calculated_at,
            'calculated_by': audit.calculated_by.email if audit.calculated_by else 'System',
            'errors_count': len(audit.errors) if audit.errors else 0,
            'has_errors': bool(audit.errors),
        }
        for audit in audits
    ]
    
    return Response({
        'audits': data,
        'total_count': queryset.count(),
        'limit': limit
    })


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def process_reciprocal_cycle(request, cycle_id):
    """Process reciprocal agreements for a royalty cycle"""
    from .pro_integration import ReciprocalAgreementProcessor
    
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if cycle.status != 'Locked':
        return Response(
            {"detail": "Cycle must be locked before processing reciprocal agreements"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        processor = ReciprocalAgreementProcessor()
        result = processor.process_reciprocal_cycle(cycle)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {"detail": f"Error processing reciprocal cycle: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def generate_pro_report(request):
    """Generate PRO compliance report"""
    from .pro_integration import PROReportGenerator, PROReportData
    from decimal import Decimal
    
    # Validate request data
    partner_id = request.data.get('partner_id')
    cycle_id = request.data.get('cycle_id')
    report_format = request.data.get('format', 'CSV')
    
    if not partner_id:
        return Response({"detail": "partner_id required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        partner = PartnerPRO.objects.get(id=partner_id, is_active=True)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner PRO not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Get cycle or use date range
    if cycle_id:
        try:
            cycle = RoyaltyCycle.objects.get(id=cycle_id)
            period_start = cycle.period_start
            period_end = cycle.period_end
        except RoyaltyCycle.DoesNotExist:
            return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Use date range from request
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        cycle = None
        
        if not period_start or not period_end:
            return Response(
                {"detail": "Either cycle_id or period_start/period_end required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        # Get usage attributions for this partner
        attributions = UsageAttribution.objects.filter(
            origin_partner=partner,
            played_at__date__gte=period_start,
            played_at__date__lte=period_end
        ).select_related('play_log', 'external_recording', 'external_work', 'play_log__station')
        
        if not attributions.exists():
            return Response(
                {"detail": "No usage data found for the specified period"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare usage data
        usage_data = []
        total_amount = Decimal('0')
        
        for attr in attributions:
            play_log = attr.play_log
            recording = attr.external_recording
            work = attr.external_work
            
            gross_amount = Decimal(str(play_log.royalty_amount)) if play_log and play_log.royalty_amount else Decimal('0')
            admin_fee = gross_amount * Decimal('0.15')  # 15% admin fee
            net_amount = gross_amount - admin_fee
            
            total_amount += net_amount
            
            usage_data.append({
                'station_id': play_log.station.id if play_log and play_log.station else None,
                'station_name': play_log.station.name if play_log and play_log.station else None,
                'played_at_utc': play_log.played_at.isoformat() if play_log and play_log.played_at else None,
                'isrc': recording.isrc if recording else None,
                'iswc': work.iswc if work else None,
                'work_title': work.title if work else None,
                'recording_title': recording.title if recording else None,
                'duration_seconds': attr.duration_seconds,
                'confidence_score': str(attr.confidence_score),
                'detection_source': attr.match_method,
                'pro_affiliation': partner.pro_code,
                'gross_amount': str(gross_amount),
                'admin_fee_amount': str(admin_fee),
                'net_amount': str(net_amount)
            })
        
        # Create report data
        report_data = PROReportData(
            partner_pro=partner,
            royalty_cycle=cycle,
            usage_data=usage_data,
            total_amount=total_amount,
            currency='GHS',
            report_period_start=period_start,
            report_period_end=period_end,
            metadata={
                'generated_by': request.user.email,
                'generated_at': timezone.now().isoformat(),
                'format': report_format
            }
        )
        
        # Generate report
        generator = PROReportGenerator()
        
        if report_format == 'CSV':
            report_path = generator.generate_csv_report(report_data)
        elif report_format == 'CWR':
            report_path = generator.generate_cwr_report(report_data)
        elif report_format == 'DDEX-DSR':
            report_path = generator.generate_ddex_dsr_report(report_data)
        elif report_format == 'JSON':
            report_path = generator.generate_json_report(report_data)
        else:
            return Response(
                {"detail": f"Unsupported format: {report_format}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create export record
        export_record = PartnerReportExport.objects.create(
            partner=partner,
            royalty_cycle=cycle,
            format=report_format,
            file=report_path,
            checksum=hashlib.sha256(open(report_path, 'rb').read()).hexdigest()
        )
        
        return Response({
            'export_id': export_record.id,
            'partner': partner.pro_code,
            'format': report_format,
            'file_path': report_path,
            'usage_count': len(usage_data),
            'total_amount': str(total_amount),
            'currency': 'GHS',
            'generated_at': export_record.generated_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"detail": f"Error generating report: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_reciprocal_payments_summary(request, cycle_id):
    """Get summary of reciprocal payments for a cycle"""
    try:
        cycle = RoyaltyCycle.objects.get(id=cycle_id)
    except RoyaltyCycle.DoesNotExist:
        return Response({"detail": "Cycle not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Get remittances for this cycle
    remittances = PartnerRemittance.objects.filter(
        royalty_cycle=cycle
    ).select_related('partner')
    
    # Get usage attributions summary
    attributions_summary = UsageAttribution.objects.filter(
        played_at__date__gte=cycle.period_start,
        played_at__date__lte=cycle.period_end
    ).values('origin_partner__pro_code', 'origin_partner__display_name').annotate(
        usage_count=models.Count('id'),
        total_duration=models.Sum('duration_seconds')
    )
    
    # Prepare response data
    payments_data = []
    total_payable = Decimal('0')
    
    for remittance in remittances:
        # Find corresponding attribution summary
        attr_summary = next(
            (a for a in attributions_summary if a['origin_partner__pro_code'] == remittance.partner.pro_code),
            {'usage_count': 0, 'total_duration': 0}
        )
        
        payments_data.append({
            'partner_pro': remittance.partner.pro_code,
            'partner_name': remittance.partner.display_name,
            'gross_amount': str(remittance.gross_amount),
            'admin_fee_amount': str(remittance.admin_fee_amount),
            'net_payable': str(remittance.net_payable),
            'currency': remittance.currency,
            'status': remittance.status,
            'usage_count': attr_summary['usage_count'],
            'total_duration_seconds': attr_summary['total_duration'] or 0,
            'created_at': remittance.created_at.isoformat()
        })
        
        total_payable += remittance.net_payable
    
    return Response({
        'cycle': {
            'id': cycle.id,
            'name': cycle.name,
            'period_start': cycle.period_start,
            'period_end': cycle.period_end,
            'status': cycle.status
        },
        'payments': payments_data,
        'summary': {
            'total_partners': len(payments_data),
            'total_payable': str(total_payable),
            'currency': 'GHS',
            'total_usages': sum(p['usage_count'] for p in payments_data)
        }
    })


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_secure_financial_file(request, partner_id: int):
    """
    Secure upload endpoint for financial data files with enhanced validation and malware scanning
    """
    from .services.file_security_service import RoyaltyFileSecurityService
    from accounts.models import AuditLog
    
    try:
        partner = PartnerPRO.objects.get(id=partner_id)
    except PartnerPRO.DoesNotExist:
        return Response({"detail": "Partner not found"}, status=status.HTTP_404_NOT_FOUND)
    
    upload = request.FILES.get("file")
    if not upload:
        return Response({"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)
    
    file_category = request.data.get("file_category", "auto")
    encrypt_storage = request.data.get("encrypt_storage", True)
    process_async = request.data.get("process_async", True)
    
    try:
        # Process secure financial upload
        result = RoyaltyFileSecurityService.process_secure_financial_upload(
            user=request.user,
            partner_id=partner_id,
            file=upload,
            file_category=file_category,
            encrypt_storage=encrypt_storage,
            process_async=process_async
        )
        
        return Response({
            "upload_id": result['upload_id'],
            "partner_id": partner_id,
            "filename": result['filename'],
            "file_category": result['file_category'],
            "processing_status": result['processing_status'],
            "file_hash": result['file_hash'],
            "encrypted": result['encrypted'],
            "security_scan": result['scan_result'],
            "validation_passed": result['validation_result']['valid'],
            "uploaded_at": timezone.now().isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except ValidationError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Log unexpected error
        AuditLog.objects.create(
            user=request.user,
            action='financial_file_upload_error',
            resource_type='FinancialFile',
            resource_id=f'partner_{partner_id}',
            request_data={
                'partner_id': partner_id,
                'filename': upload.name,
                'error': str(e)
            }
        )
        return Response({"detail": f"Upload failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_financial_file_status(request, upload_id: str):
    """
    Get processing status of a financial file upload
    """
    from accounts.models import AuditLog
    
    # Find the upload record in audit logs
    upload_log = AuditLog.objects.filter(
        action='financial_file_uploaded',
        resource_id=upload_id
    ).first()
    
    if not upload_log:
        return Response({"detail": "Upload not found"}, status=status.HTTP_404_NOT_FOUND)
    
    # Find processing status
    processing_log = AuditLog.objects.filter(
        action__in=['financial_file_processed', 'financial_file_processing_failed'],
        resource_id=upload_id
    ).order_by('-created_at').first()
    
    status_info = {
        'upload_id': upload_id,
        'filename': upload_log.request_data.get('filename'),
        'partner_id': upload_log.request_data.get('partner_id'),
        'file_category': upload_log.request_data.get('file_category'),
        'uploaded_at': upload_log.created_at.isoformat(),
        'uploaded_by': upload_log.user.email if upload_log.user else 'System',
        'processing_status': upload_log.request_data.get('processing_status', 'unknown')
    }
    
    if processing_log:
        status_info.update({
            'processing_status': processing_log.request_data.get('processing_result', 'unknown'),
            'processed_at': processing_log.created_at.isoformat(),
            'processing_error': processing_log.request_data.get('error')
        })
    
    return Response(status_info)


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_financial_file_audit_trail(request):
    """
    Get audit trail for financial file operations
    """
    from accounts.models import AuditLog
    
    partner_id = request.GET.get('partner_id')
    file_category = request.GET.get('file_category')
    limit = int(request.GET.get('limit', 50))
    
    # Build query
    queryset = AuditLog.objects.filter(
        action__in=[
            'financial_file_uploaded',
            'financial_file_processed',
            'financial_file_processing_failed',
            'financial_file_threat_detected',
            'repertoire_upload_completed'
        ]
    )
    
    if partner_id:
        queryset = queryset.filter(
            models.Q(request_data__partner_id=int(partner_id)) |
            models.Q(resource_id__contains=f'partner_{partner_id}')
        )
    
    if file_category:
        queryset = queryset.filter(request_data__file_category=file_category)
    
    audit_logs = queryset.order_by('-created_at')[:limit]
    
    audit_data = []
    for log in audit_logs:
        audit_data.append({
            'id': log.id,
            'action': log.action,
            'resource_id': log.resource_id,
            'user': log.user.email if log.user else 'System',
            'timestamp': log.created_at.isoformat(),
            'details': {
                'partner_id': log.request_data.get('partner_id'),
                'filename': log.request_data.get('filename'),
                'file_category': log.request_data.get('file_category'),
                'processing_status': log.request_data.get('processing_status'),
                'threats_found': log.request_data.get('threats', []),
                'error': log.request_data.get('error')
            }
        })
    
    return Response({
        'audit_trail': audit_data,
        'total_count': queryset.count(),
        'limit': limit,
        'filters': {
            'partner_id': partner_id,
            'file_category': file_category
        }
    })


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def verify_financial_file_integrity(request):
    """
    Verify integrity of stored financial files
    """
    from .services.file_security_service import RoyaltyFileSecurityService
    from .services.encryption_service import RoyaltyFileEncryption
    from accounts.models import AuditLog
    
    upload_ids = request.data.get('upload_ids', [])
    if not upload_ids:
        return Response({"detail": "upload_ids required"}, status=status.HTTP_400_BAD_REQUEST)
    
    verification_results = []
    
    for upload_id in upload_ids:
        # Find the upload record
        upload_log = AuditLog.objects.filter(
            action='financial_file_uploaded',
            resource_id=upload_id
        ).first()
        
        if not upload_log:
            verification_results.append({
                'upload_id': upload_id,
                'status': 'not_found',
                'error': 'Upload record not found'
            })
            continue
        
        try:
            stored_path = upload_log.request_data.get('stored_path')
            expected_hash = upload_log.request_data.get('file_hash')
            encrypted = upload_log.request_data.get('encrypted', False)
            
            if not stored_path or not os.path.exists(stored_path):
                verification_results.append({
                    'upload_id': upload_id,
                    'status': 'file_missing',
                    'error': 'Stored file not found'
                })
                continue
            
            # Verify file integrity
            if encrypted:
                # For encrypted files, we need to decrypt temporarily to verify
                temp_path = stored_path.replace('.enc', '.verify_tmp')
                if RoyaltyFileEncryption.decrypt_file(stored_path, temp_path):
                    integrity_ok = RoyaltyFileEncryption.verify_file_integrity(temp_path, expected_hash)
                    os.unlink(temp_path)  # Clean up
                else:
                    integrity_ok = False
            else:
                integrity_ok = RoyaltyFileEncryption.verify_file_integrity(stored_path, expected_hash)
            
            verification_results.append({
                'upload_id': upload_id,
                'status': 'verified' if integrity_ok else 'integrity_failed',
                'filename': upload_log.request_data.get('filename'),
                'encrypted': encrypted,
                'file_exists': True,
                'integrity_check': integrity_ok,
                'verified_at': timezone.now().isoformat()
            })
            
        except Exception as e:
            verification_results.append({
                'upload_id': upload_id,
                'status': 'verification_error',
                'error': str(e)
            })
    
    # Log verification activity
    AuditLog.objects.create(
        user=request.user,
        action='financial_files_integrity_verified',
        resource_type='FinancialFile',
        resource_id='batch_verification',
        request_data={
            'upload_ids': upload_ids,
            'results_summary': {
                'total_checked': len(verification_results),
                'verified': len([r for r in verification_results if r['status'] == 'verified']),
                'failed': len([r for r in verification_results if r['status'] != 'verified'])
            }
        }
    )
    
    return Response({
        'verification_results': verification_results,
        'summary': {
            'total_checked': len(verification_results),
            'verified': len([r for r in verification_results if r['status'] == 'verified']),
            'failed': len([r for r in verification_results if r['status'] != 'verified']),
            'verified_at': timezone.now().isoformat()
        }
    })


# Money Flow Integration API Endpoints

@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def approve_withdrawal_with_payment(request, withdrawal_id):
    """
    Approve withdrawal and process actual money transfer
    Integrates with the money flow system
    """
    from royalties.services import RoyaltyPaymentService
    from accounts.models import AuditLog
    
    # Only staff can approve
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can approve withdrawals"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Use the service to approve and process payment
        withdrawal = RoyaltyPaymentService.approve_and_process_withdrawal(
            withdrawal_id=withdrawal_id,
            admin_user=request.user
        )
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='royalty_withdrawal_approved_with_payment',
            resource_type='RoyaltyWithdrawal',
            resource_id=str(withdrawal.withdrawal_id),
            request_data={
                'amount': str(withdrawal.amount),
                'currency': withdrawal.currency,
                'requester_type': withdrawal.requester_type,
                'status': withdrawal.status
            }
        )
        
        # Return updated withdrawal
        serializer = RoyaltyWithdrawalSerializer(withdrawal)
        return Response({
            'success': True,
            'message': 'Withdrawal approved and payment processed successfully',
            'withdrawal': serializer.data
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            {"detail": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to approve withdrawal: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def reject_withdrawal_with_reason(request, withdrawal_id):
    """
    Reject a withdrawal request with reason
    """
    from royalties.services import RoyaltyPaymentService
    from accounts.models import AuditLog
    
    # Only staff can reject
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can reject withdrawals"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    rejection_reason = request.data.get('rejection_reason', '')
    if not rejection_reason:
        return Response(
            {"detail": "Rejection reason is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Use the service to reject
        withdrawal = RoyaltyPaymentService.reject_withdrawal(
            withdrawal_id=withdrawal_id,
            admin_user=request.user,
            rejection_reason=rejection_reason
        )
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='royalty_withdrawal_rejected',
            resource_type='RoyaltyWithdrawal',
            resource_id=str(withdrawal.withdrawal_id),
            request_data={
                'rejection_reason': rejection_reason,
                'status': withdrawal.status
            }
        )
        
        # Return updated withdrawal
        serializer = RoyaltyWithdrawalSerializer(withdrawal)
        return Response({
            'success': True,
            'message': 'Withdrawal rejected successfully',
            'withdrawal': serializer.data
        }, status=status.HTTP_200_OK)
        
    except ValidationError as e:
        return Response(
            {"detail": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to reject withdrawal: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def get_platform_balance(request):
    """
    Get central platform pool balance (admin only)
    """
    from bank_account.models import PlatformAccount
    
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can view platform balance"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    central_pool = PlatformAccount.get_central_pool()
    
    return Response({
        'account_id': central_pool.account_id,
        'balance': str(central_pool.balance),
        'currency': central_pool.currency,
        'total_received': str(central_pool.total_received),
        'total_paid_out': str(central_pool.total_paid_out),
        'updated_at': central_pool.updated_at.isoformat()
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def get_station_balance(request, station_id):
    """
    Get station account balance
    Accepts either integer ID or UUID station_id
    """
    from bank_account.models import StationAccount
    from stations.models import Station
    
    try:
        # Try to get station by UUID first, then by integer ID
        try:
            station = Station.objects.get(station_id=station_id)
        except (Station.DoesNotExist, ValueError):
            # If UUID lookup fails, try integer ID
            station = Station.objects.get(id=station_id)
        
        # Check permissions
        if not request.user.is_staff:
            # User must be associated with the station
            if not hasattr(request.user, 'station_user') or not request.user.station_user.filter(id=station.id).exists():
                return Response(
                    {"detail": "You don't have permission to view this station's balance"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get or create station account
        account, created = StationAccount.objects.get_or_create(
            station=station,
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'GHS'
            }
        )
        
        return Response({
            'station_id': station.id,
            'station_name': station.name,
            'account_id': account.account_id,
            'balance': str(account.balance),
            'currency': account.currency,
            'total_spent': str(account.total_spent),
            'total_plays': account.total_plays,
            'allow_negative_balance': account.allow_negative_balance,
            'credit_limit': str(account.credit_limit),
            'updated_at': account.updated_at.isoformat()
        })
        
    except Station.DoesNotExist:
        return Response(
            {"detail": "Station not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
def add_station_funds(request, station_id):
    """
    Add funds to a station account (admin only)
    """
    from bank_account.models import StationAccount
    from stations.models import Station
    
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can add funds to station accounts"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        station = Station.objects.get(id=station_id)
        amount = Decimal(str(request.data.get('amount', 0)))
        description = request.data.get('description', 'Funds added by admin')
        
        if amount <= 0:
            return Response(
                {"detail": "Amount must be greater than zero"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create station account
        account, created = StationAccount.objects.get_or_create(
            station=station,
            defaults={
                'balance': Decimal('0.00'),
                'currency': 'GHS'
            }
        )
        
        # Add funds
        account.add_funds(amount, description)
        
        return Response({
            'success': True,
            'message': f'Added {amount} GHS to {station.name}',
            'new_balance': str(account.balance)
        })
        
    except Station.DoesNotExist:
        return Response(
            {"detail": "Station not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to add funds: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Station Deposit Management API Endpoints

@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def station_request_deposit(request, station_id):
    """
    Station requests to deposit funds into their account
    Accepts either integer ID or UUID station_id
    """
    from bank_account.models import StationDepositRequest
    from stations.models import Station
    
    try:
        # Try to get station by UUID first, then by integer ID
        try:
            station = Station.objects.get(station_id=station_id)
        except (Station.DoesNotExist, ValueError):
            # If UUID lookup fails, try integer ID
            station = Station.objects.get(id=station_id)
        
        # Check permissions - user must be associated with the station
        if not request.user.is_staff:
            # Check if user is associated with this station
            if not hasattr(request.user, 'station_user') or not request.user.station_user.filter(id=station.id).exists():
                return Response(
                    {"detail": "You don't have permission to deposit for this station"}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Validate request data
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        reference = request.data.get('reference', '')
        notes = request.data.get('notes', '')
        
        if not amount or not payment_method:
            return Response(
                {"detail": "Amount and payment method are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        amount = Decimal(str(amount))
        if amount <= 0:
            return Response(
                {"detail": "Amount must be greater than zero"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create deposit request
        deposit_request = StationDepositRequest.objects.create(
            station=station,
            amount=amount,
            currency='GHS',
            payment_method=payment_method,
            reference=reference,
            notes=notes,
            status='pending'
        )
        
        return Response({
            'success': True,
            'message': 'Deposit request submitted successfully. It will be processed once payment is verified.',
            'deposit_id': deposit_request.id,
            'amount': str(deposit_request.amount),
            'status': deposit_request.status,
            'requested_at': deposit_request.requested_at.isoformat()
        }, status=status.HTTP_201_CREATED)
        
    except Station.DoesNotExist:
        return Response(
            {"detail": "Station not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to create deposit request: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def list_station_deposit_requests(request):
    """
    List deposit requests for stations
    """
    from bank_account.models import StationDepositRequest
    
    queryset = StationDepositRequest.objects.select_related('station', 'processed_by').all()
    
    # Filter by status
    status_filter = request.GET.get('status')
    if status_filter:
        queryset = queryset.filter(status=status_filter)
    
    # Filter by station (for station users)
    if not request.user.is_staff:
        # Get stations owned by this user
        user_stations = request.user.station_user.all()
        if user_stations.exists():
            queryset = queryset.filter(station__in=user_stations)
        else:
            queryset = queryset.none()
    
    station_id = request.GET.get('station_id')
    if station_id:
        # Try to filter by UUID first, then by integer ID
        from stations.models import Station
        try:
            station = Station.objects.get(station_id=station_id)
            queryset = queryset.filter(station=station)
        except (Station.DoesNotExist, ValueError):
            # If UUID lookup fails, try integer ID
            try:
                queryset = queryset.filter(station_id=int(station_id))
            except (ValueError, TypeError):
                queryset = queryset.none()
    
    # Order by most recent first
    queryset = queryset.order_by('-requested_at')
    
    # Limit results
    limit = min(int(request.GET.get('limit', 50)), 100)
    queryset = queryset[:limit]
    
    # Serialize
    deposits = []
    for deposit in queryset:
        deposits.append({
            'id': deposit.id,
            'station': deposit.station.id,
            'station_name': deposit.station.name,
            'amount': str(deposit.amount),
            'currency': deposit.currency,
            'payment_method': deposit.payment_method,
            'reference': deposit.reference,
            'notes': deposit.notes,
            'status': deposit.status,
            'requested_at': deposit.requested_at.isoformat(),
            'processed_at': deposit.processed_at.isoformat() if deposit.processed_at else None,
            'processed_by': deposit.processed_by.id if deposit.processed_by else None,
            'rejection_reason': deposit.rejection_reason
        })
    
    return Response({
        'deposits': deposits,
        'count': len(deposits)
    })


@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def approve_station_deposit(request, deposit_id):
    """
    Approve a station deposit request (admin only)
    """
    from bank_account.models import StationDepositRequest
    from accounts.models import AuditLog
    
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can approve deposits"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        deposit = StationDepositRequest.objects.get(id=deposit_id)
        
        # Approve and process
        deposit.approve_and_process(request.user)
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='station_deposit_approved',
            resource_type='StationDepositRequest',
            resource_id=str(deposit.id),
            request_data={
                'station_id': deposit.station.id,
                'station_name': deposit.station.name,
                'amount': str(deposit.amount),
                'payment_method': deposit.payment_method
            }
        )
        
        return Response({
            'success': True,
            'message': f'Deposit approved and {deposit.amount} {deposit.currency} added to station account',
            'deposit_id': deposit.id,
            'status': deposit.status
        })
        
    except StationDepositRequest.DoesNotExist:
        return Response(
            {"detail": "Deposit request not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except ValidationError as e:
        return Response(
            {"detail": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to approve deposit: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@authentication_classes([TokenAuthentication, CustomJWTAuthentication])
@permission_classes([IsAuthenticated])
def reject_station_deposit(request, deposit_id):
    """
    Reject a station deposit request (admin only)
    """
    from bank_account.models import StationDepositRequest
    from accounts.models import AuditLog
    
    if not request.user.is_staff:
        return Response(
            {"detail": "Only staff members can reject deposits"}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    rejection_reason = request.data.get('rejection_reason', '')
    if not rejection_reason:
        return Response(
            {"detail": "Rejection reason is required"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        deposit = StationDepositRequest.objects.get(id=deposit_id)
        
        # Reject
        deposit.reject(request.user, rejection_reason)
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='station_deposit_rejected',
            resource_type='StationDepositRequest',
            resource_id=str(deposit.id),
            request_data={
                'station_id': deposit.station.id,
                'station_name': deposit.station.name,
                'amount': str(deposit.amount),
                'rejection_reason': rejection_reason
            }
        )
        
        return Response({
            'success': True,
            'message': 'Deposit request rejected',
            'deposit_id': deposit.id,
            'status': deposit.status
        })
        
    except StationDepositRequest.DoesNotExist:
        return Response(
            {"detail": "Deposit request not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except ValidationError as e:
        return Response(
            {"detail": str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"detail": f"Failed to reject deposit: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
