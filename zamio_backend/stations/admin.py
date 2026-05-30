from django.contrib import admin

from stations.models import ProgramStaff, Station, StationProgram, StationStreamLink, Complaint, ComplaintUpdate, StationStaff


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ['complaint_id', 'subject', 'station', 'complainant', 'status', 'priority', 'assigned_to', 'created_at']
    list_filter = ['status', 'complaint_type', 'priority', 'created_at']
    search_fields = ['complaint_id', 'subject', 'description', 'station__name', 'complainant__username']
    readonly_fields = ['complaint_id', 'created_at', 'updated_at']
    raw_id_fields = ['station', 'complainant', 'assigned_to', 'resolved_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('complaint_id', 'station', 'complainant', 'subject', 'description')
        }),
        ('Classification', {
            'fields': ('complaint_type', 'priority', 'status')
        }),
        ('Assignment & Resolution', {
            'fields': ('assigned_to', 'resolution_notes', 'resolved_by', 'resolved_at')
        }),
        ('Contact Information', {
            'fields': ('contact_email', 'contact_phone')
        }),
        ('Metadata', {
            'fields': ('is_archived', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )


@admin.register(ComplaintUpdate)
class ComplaintUpdateAdmin(admin.ModelAdmin):
    list_display = ['complaint', 'user', 'update_type', 'created_at']
    list_filter = ['update_type', 'created_at']
    search_fields = ['complaint__complaint_id', 'message', 'user__username']
    readonly_fields = ['created_at']
    raw_id_fields = ['complaint', 'user']


# Register your models here.
admin.site.register(Station)
admin.site.register(StationStreamLink)
admin.site.register(StationStaff)
admin.site.register(StationProgram)
admin.site.register(ProgramStaff)
