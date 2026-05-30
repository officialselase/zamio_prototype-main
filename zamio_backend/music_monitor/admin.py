from django.contrib import admin

from music_monitor.models import (
    Dispute, 
    FailedPlayLog, 
    MatchCache, 
    PlayLog, 
    StreamLog,
    SnippetIngest,
    AudioDetection,
    RoyaltyDistribution,
    PublisherArtistSubDistribution
)

# Register your models here.
admin.site.register(MatchCache)
admin.site.register(PlayLog)
admin.site.register(FailedPlayLog)
admin.site.register(StreamLog)
admin.site.register(Dispute)

@admin.register(SnippetIngest)
class SnippetIngestAdmin(admin.ModelAdmin):
    list_display = ('chunk_id', 'station', 'started_at', 'processed')
    list_filter = ('processed', 'station')
    search_fields = ('chunk_id', 'station__name')
    raw_id_fields = ('audio_detection',)

@admin.register(AudioDetection)
class AudioDetectionAdmin(admin.ModelAdmin):
    list_display = ('detection_id', 'track', 'station', 'detection_source', 'confidence_score')
    list_filter = ('detection_source', 'processing_status')
    search_fields = ('track__title', 'station__name')
    raw_id_fields = ('track', 'station')


@admin.register(RoyaltyDistribution)
class RoyaltyDistributionAdmin(admin.ModelAdmin):
    list_display = ('distribution_id', 'recipient', 'recipient_type', 'net_amount', 'currency', 'status', 'calculated_at')
    list_filter = ('recipient_type', 'status', 'currency', 'calculated_at')
    search_fields = ('recipient__email', 'recipient__first_name', 'recipient__last_name', 'payment_reference')
    raw_id_fields = ('play_log', 'audio_detection', 'recipient', 'external_pro', 'created_by')
    readonly_fields = ('distribution_id', 'calculated_at', 'created_at', 'updated_at')
    fieldsets = (
        ('Distribution Info', {
            'fields': ('distribution_id', 'play_log', 'audio_detection', 'status')
        }),
        ('Recipient', {
            'fields': ('recipient', 'recipient_type', 'contributor_role')
        }),
        ('Financial Details', {
            'fields': ('gross_amount', 'net_amount', 'currency', 'exchange_rate', 'percentage_split', 'payment_fee')
        }),
        ('PRO & External Routing', {
            'fields': ('pro_share', 'external_pro', 'reciprocal_agreement')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'payment_reference', 'approved_at', 'paid_at')
        }),
        ('Metadata', {
            'fields': ('calculation_metadata', 'notes', 'created_by', 'calculated_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PublisherArtistSubDistribution)
class PublisherArtistSubDistributionAdmin(admin.ModelAdmin):
    list_display = ('sub_distribution_id', 'publisher', 'artist', 'artist_net_amount', 'publisher_fee_amount', 'currency', 'status', 'calculated_at')
    list_filter = ('status', 'currency', 'calculated_at', 'publisher')
    search_fields = ('artist__email', 'artist__first_name', 'artist__last_name', 'publisher__company_name', 'payment_reference')
    raw_id_fields = ('parent_distribution', 'publisher', 'artist')
    readonly_fields = ('sub_distribution_id', 'calculated_at', 'created_at', 'updated_at')
    fieldsets = (
        ('Sub-Distribution Info', {
            'fields': ('sub_distribution_id', 'parent_distribution', 'status')
        }),
        ('Parties', {
            'fields': ('publisher', 'artist', 'agreement_reference')
        }),
        ('Financial Breakdown', {
            'fields': ('total_amount', 'publisher_fee_percentage', 'publisher_fee_amount', 'artist_net_amount', 'currency')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'payment_reference', 'approved_at', 'paid_to_artist_at')
        }),
        ('Metadata', {
            'fields': ('calculation_metadata', 'notes', 'calculated_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
