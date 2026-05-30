from django.urls import path

from accounts.api.admin_view import (
    AdminLogin,
    register_admin_view,
    resend_email_verification,
    verify_admin_email,
    verify_admin_email_code,
    admin_onboarding_status_view,
    complete_admin_profile_view,
)
from accounts.api.artist_views import (
    ArtistLogin, complete_artist_payment_view, complete_artist_profile_view, 
    complete_artist_publisher_view, complete_artist_social_view, logout_artist_view, 
    register_artist_view, verify_artist_email, verify_artist_email_code, onboard_artist_view, skip_artist_onboarding_view,
    artist_onboarding_status_view, update_onboarding_status_view, complete_artist_onboarding_view,
    set_self_published_status_view, update_identity_profile_view, upload_kyc_documents_view, get_kyc_documents_view,
    delete_kyc_document_view, download_kyc_document_view, get_secure_download_url_view,
    secure_download_view, skip_verification_view, resume_verification_view, verification_status_view,
    send_verification_reminder_view, verification_requirements_view, get_publishers_list_view
)
from accounts.api.fan_views import FanLogin, register_fan_view
from accounts.api.publisher_view import (
    PublisherLogin, complete_link_artist_view, complete_publisher_payment_view, 
    complete_publisher_profile_view, complete_revenue_split_view, logout_publisher_view, 
    onboard_publisher_view, register_publisher_view, verify_publisher_email, verify_publisher_email_code, 
    list_publishers_view, invite_artist_view, skip_publisher_onboarding_view,
    publisher_onboarding_status_view, update_publisher_onboarding_status_view,
    complete_publisher_onboarding_view, create_artist_relationship_view,
    search_publisher_artists_view
)
from accounts.api.station_views import (
    StationLogin, complete_add_staff_view, complete_station_payment_view,
    complete_station_profile_view, complete_station_stream_setup_view, logout_station_view, register_station_view,
    verify_station_email, verify_station_email_code, onboard_station_view, skip_station_onboarding_view,
    station_onboarding_status_view, enhanced_station_onboarding_status_view,
    update_station_onboarding_status_view, complete_station_onboarding_view,
    update_station_stream_links_view, update_station_compliance_setup_view
)
from accounts.api.password_views import (
    PasswordResetView, confirm_otp_password_view, new_password_reset_view, resend_password_otp,
    verify_password_reset_code, verify_password_reset_token
)
from accounts.api.rbac_views import (
    artist_only_view,
    publisher_only_view,
    admin_only_view,
    upload_music_view,
    kyc_required_view,
    user_permissions_view,
    grant_permission_view,
    revoke_permission_view,
    audit_logs_view
)
from accounts.api.user_management_views import (
    get_user_management_overview,
    get_all_users,
    get_user_details,
    get_user_royalties,
    update_kyc_status,
    update_user_status,
    bulk_user_operations,
    get_kyc_pending_users,
    get_audit_logs
)
from accounts.api.views import (
    logout_view,
    invalidate_all_sessions_view,
    session_status_view,
    authentication_audit_logs_view,
    location_search_view,
    user_profile_view,
    user_preferences_view
)
from accounts.api.email_views import (
    resend_verification_email,
    resend_verification_email_by_email,
    request_password_reset,
    resend_password_reset,
    send_user_invitation,
    send_notification_to_specific_users,
    send_notification_to_user_type,
    send_welcome_email_to_user,
    mark_email_verified,
    email_system_status
)
from accounts.api.staff_views import (
    get_staff_overview,
    get_all_staff,
    get_staff_details,
    create_staff_member,
    update_staff_member,
    deactivate_staff_member,
    get_staff_activity_log,
    get_available_permissions
)

app_name = 'accounts'

urlpatterns = [
    path('register-admin/', register_admin_view, name="register_admin_view"),
    path('login-admin/', AdminLogin.as_view(), name="login_admin"),
    path('verify-admin-email/', verify_admin_email, name="verify_admin_email"),
    path('verify-admin-email-code/', verify_admin_email_code, name="verify_admin_email_code"),
    path('admin-onboarding-status/', admin_onboarding_status_view, name="admin_onboarding_status_view"),
    path('complete-admin-profile/', complete_admin_profile_view, name="complete_admin_profile_view"),

    path('resend-email-verification/', resend_email_verification, name="resend_admin_email_verification"),


    path('register-artist/', register_artist_view, name="register_artist"),
     path('verify-artist-email/', verify_artist_email, name="verify_artist_email"),
     path('verify-artist-email-code/', verify_artist_email_code, name="verify_artist_email_code"),
    path('login-artist/', ArtistLogin.as_view(), name="login_artist"),
    path('logout-artist/', logout_artist_view, name="logout_artist_view"),
    path('complete-artist-profile/', complete_artist_profile_view, name="complete_artist_profile_view"),
    path('complete-artist-social/', complete_artist_social_view, name="complete_artist_social_view"),
    path('complete-artist-payment/', complete_artist_payment_view, name="complete_artist_payment_view"),
    path('complete-artist-publisher/', complete_artist_publisher_view, name="complete_artist_publisher_view"),
    path('artist-onboarding/', onboard_artist_view, name="onboard_artist_view"),
    path('skip-artist-onboarding/', skip_artist_onboarding_view, name="skip_artist_onboarding_view"),
    
    # Enhanced Artist Onboarding Endpoints
    path('artist-onboarding-status/<str:artist_id>/', artist_onboarding_status_view, name="artist_onboarding_status_view"),
    path('update-onboarding-status/', update_onboarding_status_view, name="update_onboarding_status_view"),
    path('complete-artist-onboarding/', complete_artist_onboarding_view, name="complete_artist_onboarding_view"),
    path('set-self-published-status/', set_self_published_status_view, name="set_self_published_status_view"),
    path('update-identity-profile/', update_identity_profile_view, name="update_identity_profile_view"),
    path('upload-kyc-documents/', upload_kyc_documents_view, name="upload_kyc_documents_view"),
    path('get-kyc-documents/', get_kyc_documents_view, name="get_kyc_documents_view"),
    path('delete-kyc-document/<int:document_id>/', delete_kyc_document_view, name="delete_kyc_document_view"),
    path('download-kyc-document/<int:document_id>/', download_kyc_document_view, name="download_kyc_document_view"),
    path('secure-download-url/<int:document_id>/', get_secure_download_url_view, name="get_secure_download_url_view"),
    path('secure-download/<int:document_id>/', secure_download_view, name="secure_download_view"),
    
    # Verification Skip and Resume Endpoints
    path('skip-verification/', skip_verification_view, name="skip_verification_view"),
    path('resume-verification/', resume_verification_view, name="resume_verification_view"),
    path('verification-status/', verification_status_view, name="verification_status_view"),
    path('send-verification-reminder/', send_verification_reminder_view, name="send_verification_reminder_view"),
    path('verification-requirements/', verification_requirements_view, name="verification_requirements_view"),
    
    # Publisher Selection for Artists
    path('publishers/list/', get_publishers_list_view, name="get_publishers_list"),

   # 

    path('register-station/', register_station_view, name="register_station"),
    path('verify-station-email/', verify_station_email, name="verify_station_email"),
    path('verify-station-email-code/', verify_station_email_code, name="verify_station_email_code"),

    path('login-station/', StationLogin.as_view(), name="login_station"),
    path('station-onboarding/', onboard_station_view, name="onboard_station_view"),
    path('station-onboarding-status/', station_onboarding_status_view, name="station_onboarding_status_view"),
    path('skip-station-onboarding/', skip_station_onboarding_view, name="skip_station_onboarding_view"),
    
    # Enhanced Station Onboarding Endpoints
    path('enhanced-station-onboarding-status/<str:station_id>/', enhanced_station_onboarding_status_view, name="enhanced_station_onboarding_status_view"),
    path('update-station-onboarding-status/', update_station_onboarding_status_view, name="update_station_onboarding_status_view"),
    path('complete-station-onboarding/', complete_station_onboarding_view, name="complete_station_onboarding_view"),
    path('update-station-stream-links/', update_station_stream_links_view, name="update_station_stream_links_view"),
    path('update-station-compliance-setup/', update_station_compliance_setup_view, name="update_station_compliance_setup_view"),
    path('logout-station/', logout_station_view, name="logout_station_view"),
    path('complete-station-profile/', complete_station_profile_view, name="complete_station_profile_view"),
    path('complete-station-stream/', complete_station_stream_setup_view, name="complete_station_stream_setup_view"),
    path('complete-add-staff/', complete_add_staff_view, name="complete_add_staff_view"),
    path('complete-station-payment/', complete_station_payment_view, name="complete_station_payment_view"),

    path('register-publisher/', register_publisher_view, name="register_publisher"),
    path('verify-publisher-email/', verify_publisher_email, name="verify_publisher_email"),
    path('verify-publisher-email-code/', verify_publisher_email_code, name="verify_publisher_email_code"),

    path('login-publisher/', PublisherLogin.as_view(), name="login_publisher"),
    path('list-publishers/', list_publishers_view, name="list_publishers_view"),
    path('logout-publisher/', logout_publisher_view, name="logout_publisher_view"),
    path('complete-publisher-profile/', complete_publisher_profile_view, name="complete_publisher_profile_view"),
    path('complete-revenue-split/', complete_revenue_split_view, name="complete_revenue_split_view"),
    path('complete-link-artist/', complete_link_artist_view, name="complete_link_artist_view"),
    path('invite-artist/', invite_artist_view, name="invite_artist_view"),
    path('search-publisher-artists/', search_publisher_artists_view, name="search_publisher_artists_view"),
    path('complete-publisher-payment/', complete_publisher_payment_view, name="complete_publisher_payment_view"),
    path('skip-publisher-onboarding/', skip_publisher_onboarding_view, name="skip_publisher_onboarding_view"),
    
    # Enhanced Publisher Onboarding Endpoints
    path('publisher-onboarding-status/<str:publisher_id>/', publisher_onboarding_status_view, name="publisher_onboarding_status_view"),
    path('update-publisher-onboarding-status/', update_publisher_onboarding_status_view, name="update_publisher_onboarding_status_view"),
    path('complete-publisher-onboarding/', complete_publisher_onboarding_view, name="complete_publisher_onboarding_view"),
    path('create-artist-relationship/', create_artist_relationship_view, name="create_artist_relationship_view"),

   
    path('publisher-onboarding/', onboard_publisher_view, name="onboard_publisher_view"),


    ## Add fan account URL
    path('register-fan/', register_fan_view, name="register_fan"),
    path('login-fan/', FanLogin.as_view(), name="login_fan"),




    path('forgot-user-password/', PasswordResetView.as_view(), name="forgot_password"),
    path('confirm-password-otp/', confirm_otp_password_view, name="confirm_otp_password"),
    path('resend-password-otp/', resend_password_otp, name="resend_password_otp"),
    path('new-password-reset/', new_password_reset_view, name="new_password_reset_view"),
    
    # Enhanced password reset endpoints with dual method support
    path('verify-password-reset-code/', verify_password_reset_code, name="verify_password_reset_code"),
    path('verify-password-reset-token/', verify_password_reset_token, name="verify_password_reset_token"),

    # RBAC Demo Endpoints
    path('rbac/artist-only/', artist_only_view, name="artist_only_view"),
    path('rbac/publisher-only/', publisher_only_view, name="publisher_only_view"),
    path('rbac/admin-only/', admin_only_view, name="admin_only_view"),
    path('rbac/upload-music/', upload_music_view, name="upload_music_view"),
    path('rbac/kyc-required/', kyc_required_view, name="kyc_required_view"),
    path('rbac/user-permissions/', user_permissions_view, name="user_permissions_view"),
    path('rbac/grant-permission/', grant_permission_view, name="grant_permission_view"),
    path('rbac/revoke-permission/', revoke_permission_view, name="revoke_permission_view"),
    path('rbac/audit-logs/', audit_logs_view, name="audit_logs_view"),
    # User Management Endpoints
    path('admin/user-management-overview/', get_user_management_overview, name="get_user_management_overview"),
    path('admin/all-users/', get_all_users, name="get_all_users"),
    path('admin/user-details/', get_user_details, name="get_user_details"),
    path('admin/user-royalties/', get_user_royalties, name="get_user_royalties"),
    path('admin/update-kyc-status/', update_kyc_status, name="update_kyc_status"),
    path('admin/update-user-status/', update_user_status, name="update_user_status"),
    path('admin/bulk-user-operations/', bulk_user_operations, name="bulk_user_operations"),
    path('admin/kyc-pending-users/', get_kyc_pending_users, name="get_kyc_pending_users"),
    path('admin/audit-logs/', get_audit_logs, name="get_audit_logs"),

    # Enhanced Authentication Endpoints
    path('logout/', logout_view, name="enhanced_logout"),
    path('invalidate-all-sessions/', invalidate_all_sessions_view, name="invalidate_all_sessions"),
    path('session-status/', session_status_view, name="session_status"),
    path('auth-audit-logs/', authentication_audit_logs_view, name="auth_audit_logs"),

    # Email Task System Endpoints
    path('email/resend-verification/', resend_verification_email, name="resend_verification_email"),
    path('email/resend-verification-by-email/', resend_verification_email_by_email, name="resend_verification_email_by_email"),
    path('email/request-password-reset/', request_password_reset, name="request_password_reset"),
    path('email/resend-password-reset/', resend_password_reset, name="resend_password_reset"),
    path('email/send-invitation/', send_user_invitation, name="send_user_invitation"),
    path('email/send-notification-to-users/', send_notification_to_specific_users, name="send_notification_to_users"),
    path('email/send-notification-to-user-type/', send_notification_to_user_type, name="send_notification_to_user_type"),
    path('email/send-welcome/', send_welcome_email_to_user, name="send_welcome_email"),
    path('email/verify/', mark_email_verified, name="mark_email_verified"),
    path('email/system-status/', email_system_status, name="email_system_status"),

    # Staff Management Endpoints
    path('admin/staff-overview/', get_staff_overview, name="get_staff_overview"),
    path('admin/all-staff/', get_all_staff, name="get_all_staff"),
    path('admin/staff-details/<str:staff_id>/', get_staff_details, name="get_staff_details"),
    path('admin/create-staff/', create_staff_member, name="create_staff_member"),
    path('admin/update-staff/<str:staff_id>/', update_staff_member, name="update_staff_member"),
    path('admin/deactivate-staff/<str:staff_id>/', deactivate_staff_member, name="deactivate_staff_member"),
    path('admin/staff-activity-log/<str:staff_id>/', get_staff_activity_log, name="get_staff_activity_log"),
    path('admin/available-permissions/', get_available_permissions, name="get_available_permissions"),

    # Location Search API
    path('location-search/', location_search_view, name="location_search"),
    
    # User Profile Management
    path('profile/', user_profile_view, name="user_profile"),
    path('edit-profile/', user_profile_view, name="edit_profile"),  # Alias for profile editing
    
    # User Preferences Management
    path('user-preferences/', user_preferences_view, name="user_preferences"),

    #path('remove_user/', remove_user_view, name="remove_user_view"),
   # path('send-sms/', send_sms_view, name="send_sms_view"),

]
