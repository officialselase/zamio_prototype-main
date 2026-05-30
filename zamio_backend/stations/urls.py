from django.urls import path

from stations.views.station_dashboard_view import get_station_dashboard_data
from stations.views.station_playlog_views import get_all_station_playlog_view
from stations.views.station_dispute_views import (
    get_station_dispute_detail_view,
    get_station_disputes_view,
)
from stations.views.station_profile_views import get_station_profile_view
from stations.views.station_programs_staff_views import add_program_staff, archive_program_staff, delete_program_staff, edit_program_staff, get_all_archived_program_staff_view, get_all_program_staff_view, get_program_staff_details_view, unarchive_program_staff
from stations.views.station_programs_views import add_station_program, archive_station_program, delete_station_program, edit_station_program, get_all_archived_station_programs_view, get_all_station_programs_view, get_station_program_details_view, unarchive_station_program
from stations.views.station_views import (
    archive_station, edit_station, get_all_archived_stations_view, 
    get_all_stations_view, get_station_details_view, unarchive_station,
    update_station_stream_url, test_station_stream_url, get_station_stream_status
)
from stations.views.station_stream_links_views import (
    get_station_stream_links_view,
    add_station_stream_link_view,
    edit_station_stream_link_view,
    delete_station_stream_link_view,
)
from stations.views.station_staff_views import (
    add_station_staff,
    get_station_staff_list,
    get_station_staff_details,
    edit_station_staff,
    archive_station_staff,
    activate_station_staff,
)
from notifications.api.station_notifications_view import (
    get_station_notifications_view as station_notifications_list_view,
    mark_station_notification_read_view as station_notification_mark_read_view,
    mark_all_station_notifications_read_view as station_notifications_mark_all_view,
    delete_station_notification_view as station_notification_delete_view,
)
from stations.views.station_compliance_views import (
    update_station_compliance,
    get_stations_for_verification,
    verify_station,
    get_station_compliance_report,
)
from stations.views.playlog_management_views import (
    upload_playlog,
    get_playlog_comparison,
    get_match_log_details,
    verify_detection_match,
)
from stations.views.station_complaint_views import (
    create_complaint,
    get_complaints_list,
    get_complaint_details,
    update_complaint_status,
    add_complaint_update,
    assign_complaint,
    archive_complaint,
    get_complaint_statistics,
)
from . import views

app_name = "stations"

urlpatterns = [
    # Station URLs
    # path('add/', add_station, name='add_station'),
    path('get-all-stations/', get_all_stations_view, name='get_all_stations'),
    path('get-station-details/', get_station_details_view, name='get_station_details'),
    path('edit-station/', edit_station, name='edit_station'),
    path('archive-station/', archive_station, name='archive_station'),
    path('unarchive-station/', unarchive_station, name='unarchive_station'),
    # path('delete/', delete_station, name='delete_station'),
    path('get-all-archived-stations/', get_all_archived_stations_view, name='get_all_archived_stations'),
# 
    # # StationProgram URLs
    path('add-station-program/', add_station_program, name='add_station_program'),
    path('get-all-station-programs/', get_all_station_programs_view, name='get_all_station_programs'),
    path('get-station-program-details/', get_station_program_details_view, name='get_station_program_details'),
    path('edit-station-program/', edit_station_program, name='edit_station_program'),
    path('archive-station-program/', archive_station_program, name='archive_station_program'),
    path('unarchive-station-program/', unarchive_station_program, name='unarchive_station_program'),
    path('delete-station-program/', delete_station_program, name='delete_station_program'),
    path('get-all-archived-station-programs/', get_all_archived_station_programs_view, name='get_all_archived_station_programs'),
# 
    # # ProgramStaff URLs
    path('add-program-staff/', add_program_staff, name='add_program_staff'),
    path('get-all-program-staffs/', get_all_program_staff_view, name='get_all_program_staff'),
    path('get-program-staff-details/', get_program_staff_details_view, name='get_program_staff_details'),
    path('edit-program-staff/', edit_program_staff, name='edit_program_staff'),
    path('archive-program-staff/', archive_program_staff, name='archive_program_staff'),
    path('unarchive-program-staff/', unarchive_program_staff, name='unarchive_program_staff'),
    path('delete-program-staff/', delete_program_staff, name='delete_program_staff'),
    path('get-all-archived-program-staff/', get_all_archived_program_staff_view, name='get_all_archived_program_staff'),
    
    path('dashboard/', get_station_dashboard_data, name='get_station_dashboard_data'),
    path('profile/', get_station_profile_view, name='get_station_profile_view'),
    path('playlogs/', get_all_station_playlog_view, name='get_all_station_playlog_view'),
    path('disputes/', get_station_disputes_view, name='get_station_disputes_view'),
    path('disputes/<int:dispute_id>/', get_station_dispute_detail_view, name='get_station_dispute_detail_view'),
    path('notifications/', station_notifications_list_view, name='get_station_notifications_view'),
    path('notifications/mark-read/', station_notification_mark_read_view, name='mark_station_notification_read_view'),
    path('notifications/mark-all-read/', station_notifications_mark_all_view, name='mark_all_station_notifications_read_view'),
    path('notifications/delete/', station_notification_delete_view, name='delete_station_notification_view'),

    # Station Stream Links
    path('get-station-stream-links/', get_station_stream_links_view, name='get_station_stream_links_view'),
    path('add-station-stream-link/', add_station_stream_link_view, name='add_station_stream_link_view'),
    path('edit-station-stream-link/', edit_station_stream_link_view, name='edit_station_stream_link_view'),
    path('delete-station-stream-link/', delete_station_stream_link_view, name='delete_station_stream_link_view'),

    # Station Stream URL Management
    path('update-stream-url/', update_station_stream_url, name='update_station_stream_url'),
    path('test-stream-url/', test_station_stream_url, name='test_station_stream_url'),
    path('get-stream-status/', get_station_stream_status, name='get_station_stream_status'),

    # Station Staff Management
    path('add-station-staff/', add_station_staff, name='add_station_staff'),
    path('get-station-staff-list/', get_station_staff_list, name='get_station_staff_list'),
    path('get-station-staff-details/', get_station_staff_details, name='get_station_staff_details'),
    path('edit-station-staff/', edit_station_staff, name='edit_station_staff'),
    path('archive-station-staff/', archive_station_staff, name='archive_station_staff'),
    path('activate-station-staff/', activate_station_staff, name='activate_station_staff'),

    # Station Compliance and Verification
    path('update-station-compliance/', update_station_compliance, name='update_station_compliance'),
    path('get-stations-for-verification/', get_stations_for_verification, name='get_stations_for_verification'),
    path('verify-station/', verify_station, name='verify_station'),
    path('get-station-compliance-report/', get_station_compliance_report, name='get_station_compliance_report'),

    # Playlog and Match Log Management
    path('upload-playlog/', upload_playlog, name='upload_playlog'),
    path('get-playlog-comparison/', get_playlog_comparison, name='get_playlog_comparison'),
    path('get-match-log-details/', get_match_log_details, name='get_match_log_details'),
    path('verify-detection-match/', verify_detection_match, name='verify_detection_match'),

    # Complaint Management
    path('create-complaint/', create_complaint, name='create_complaint'),
    path('get-complaints-list/', get_complaints_list, name='get_complaints_list'),
    path('get-complaint-details/', get_complaint_details, name='get_complaint_details'),
    path('update-complaint-status/', update_complaint_status, name='update_complaint_status'),
    path('add-complaint-update/', add_complaint_update, name='add_complaint_update'),
    path('assign-complaint/', assign_complaint, name='assign_complaint'),
    path('archive-complaint/', archive_complaint, name='archive_complaint'),
    path('get-complaint-statistics/', get_complaint_statistics, name='get_complaint_statistics'),

]
