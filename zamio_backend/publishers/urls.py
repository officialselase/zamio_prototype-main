"""
URL patterns for publishers app
"""
from django.urls import path
from publishers.api.contract_views import (
    ContractUploadView,
    ContractDownloadView,
    ContractSecureUrlView,
    ContractVersionHistoryView,
    quarantine_contract,
    unquarantine_contract,
    contract_retention_report,
    delete_contract_file
)
from publishers.views.publisher_dashboard_views import (
    get_publisher_metrics_view,
    get_publisher_analytics_view,
    get_publisher_detail_view,
    get_publisher_dashboard_view,
)
from publishers.views.managed_artist_views import (
    get_all_managed_artists_view,
    get_managed_artist_details_view,
)
from publishers.views.publisher_playlog_views import get_publisher_playlogs_view
from publishers.views.publisher_catalog_views import get_publisher_catalog_view
from publishers.views.publisher_reports_views import get_publisher_reports_view
from publishers.views.publisher_royalties_view import get_publisher_royalties_view
from publishers.views.publisher_sub_distributions_view import (
    get_publisher_sub_distributions_view,
    approve_sub_distribution_view,
    mark_sub_distribution_paid_view
)
from publishers.views.publisher_profile_views import (
    get_publisher_profile_view,
    update_publisher_account_settings_view,
)
from publishers.views.publisher_view import (
    get_all_publishers_view,
    get_publisher_details_view,
)

app_name = 'publishers'

# API URL patterns
api_urlpatterns = [
    # Contract file management
    path('contracts/<int:contract_id>/download/', ContractDownloadView.as_view(), name='contract-download'),
    path('contracts/<int:contract_id>/secure-url/', ContractSecureUrlView.as_view(), name='contract-secure-url'),
    path('contracts/<str:contract_type>/<int:contract_id>/upload/', ContractUploadView.as_view(), name='contract-upload'),
    path('contracts/<str:contract_type>/<int:contract_id>/versions/', ContractVersionHistoryView.as_view(), name='contract-versions'),
    
    # Admin contract management
    path('admin/contracts/<int:contract_id>/quarantine/', quarantine_contract, name='quarantine-contract'),
    path('admin/contracts/<int:contract_id>/unquarantine/', unquarantine_contract, name='unquarantine-contract'),
    path('admin/contracts/retention-report/', contract_retention_report, name='contract-retention-report'),
    path('admin/contracts/<int:contract_id>/delete/', delete_contract_file, name='delete-contract-file'),
    
    # Publisher dashboard integration
    path('metrics/', get_publisher_metrics_view, name='publisher-metrics'),
    path('analytics/', get_publisher_analytics_view, name='publisher-analytics'),
    path('detail/', get_publisher_detail_view, name='publisher-detail'),
    path('dashboard/', get_publisher_dashboard_view, name='publisher-dashboard'),
    path('playlogs/', get_publisher_playlogs_view, name='publisher-playlogs'),
    path('catalog/', get_publisher_catalog_view, name='publisher-catalog'),
    path('reports/', get_publisher_reports_view, name='publisher-reports'),
    path('royalties/', get_publisher_royalties_view, name='publisher-royalties'),
    path('sub-distributions/', get_publisher_sub_distributions_view, name='publisher-sub-distributions'),
    path('sub-distributions/approve/', approve_sub_distribution_view, name='approve-sub-distribution'),
    path('sub-distributions/mark-paid/', mark_sub_distribution_paid_view, name='mark-sub-distribution-paid'),
    path('artists/', get_all_managed_artists_view, name='publisher-artists'),
    path('artists/detail/', get_managed_artist_details_view, name='publisher-artist-detail'),
    path('profile/', get_publisher_profile_view, name='publisher-profile'),
    path('account-settings/', update_publisher_account_settings_view, name='publisher-account-settings'),
    
    # Admin endpoints for listing all publishers
    path('get-all-publishers/', get_all_publishers_view, name='get-all-publishers'),
    path('get-publisher-details/', get_publisher_details_view, name='get-publisher-details'),
]

urlpatterns = api_urlpatterns
