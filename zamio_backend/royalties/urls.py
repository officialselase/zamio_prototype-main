from django.urls import path

from . import views

urlpatterns = [
    # Partners
    path("partners/", views.list_partners),
    path("partners/create/", views.create_partner),
    path("partners/<int:partner_id>/", views.get_partner),
    path("partners/<int:partner_id>/agreements/", views.list_agreements),
    path("partners/<int:partner_id>/agreements/create/", views.create_agreement),
    path("partners/<int:partner_id>/ingest-repertoire/", views.ingest_repertoire),
    path("partners/<int:partner_id>/repertoire/upload/", views.ingest_repertoire_upload),

    # Cycles
    path("cycles/", views.list_cycles),
    path("cycles/create/", views.create_cycle),
    path("cycles/<int:cycle_id>/close/", views.close_cycle),
    path("cycles/<int:cycle_id>/line-items/", views.list_cycle_line_items),
    path("cycles/<int:cycle_id>/exports/", views.list_cycle_exports),

    # Exports & Remittance
    path("cycles/<int:cycle_id>/partners/<int:partner_id>/export/", views.export_partner_csv),
    path("cycles/<int:cycle_id>/partners/<int:partner_id>/remit/", views.create_remittance),
    path("remittances/<int:remittance_id>/", views.get_remittance),
    path("cycles/<int:cycle_id>/remittances/", views.list_cycle_remittances),

    # QA
    path("usage/unmatched/", views.list_unmatched_usage),
    
    # Enhanced Royalty Calculator
    path("calculate/", views.calculate_play_log_royalties),
    path("rates/", views.get_royalty_rates),
    path("rates/<int:rate_id>/update/", views.update_royalty_rate),
    path("exchange-rates/", views.get_exchange_rates),
    path("audit/", views.get_calculation_audit),
    
    # PRO Integration and Reciprocal Agreements
    path("cycles/<int:cycle_id>/process-reciprocal/", views.process_reciprocal_cycle),
    path("generate-pro-report/", views.generate_pro_report),
    path("cycles/<int:cycle_id>/reciprocal-summary/", views.get_reciprocal_payments_summary),
    
    # Secure Financial File Processing
    path("partners/<int:partner_id>/upload-secure/", views.upload_secure_financial_file),
    path("files/<str:upload_id>/status/", views.get_financial_file_status),
    path("files/audit-trail/", views.get_financial_file_audit_trail),
    path("files/verify-integrity/", views.verify_financial_file_integrity),
    
    # Royalty Withdrawal Management
    path("withdrawals/", views.list_withdrawal_requests),
    path("withdrawal-request/", views.create_withdrawal_request),
    path("withdrawals/<str:withdrawal_id>/", views.get_withdrawal_request),
    path("withdrawals/<str:withdrawal_id>/action/", views.process_withdrawal_action),
    path("artists/<int:artist_id>/withdrawal-eligibility/", views.get_artist_withdrawal_eligibility),
    path("publishers/<int:publisher_id>/withdrawal-summary/", views.get_publisher_withdrawal_summary),
    
    # Money Flow Management (New)
    path("withdrawals/<str:withdrawal_id>/approve-payment/", views.approve_withdrawal_with_payment),
    path("withdrawals/<str:withdrawal_id>/reject-payment/", views.reject_withdrawal_with_reason),
    path("platform/balance/", views.get_platform_balance),
    path("stations/<str:station_id>/balance/", views.get_station_balance),
    path("stations/<str:station_id>/add-funds/", views.add_station_funds),
    
    # Station Deposit Management (New)
    path("stations/<str:station_id>/deposit/", views.station_request_deposit),
    path("stations/deposit-requests/", views.list_station_deposit_requests),
    path("stations/deposits/<int:deposit_id>/approve/", views.approve_station_deposit),
    path("stations/deposits/<int:deposit_id>/reject/", views.reject_station_deposit),
]
