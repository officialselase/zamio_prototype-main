from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DisputeViewSet, DisputeNotificationViewSet
from .api.evidence_views import (
    EvidenceUploadView, EvidenceDownloadView, EvidenceSecureUrlView,
    EvidenceListView, quarantine_evidence, unquarantine_evidence,
    evidence_retention_report, delete_evidence_file
)

app_name = 'disputes'

router = DefaultRouter()
router.register(r'disputes', DisputeViewSet, basename='dispute')
router.register(r'notifications', DisputeNotificationViewSet, basename='notification')

# Evidence management URLs
evidence_patterns = [
    # Evidence file operations
    path('disputes/<int:dispute_id>/evidence/upload/', EvidenceUploadView.as_view(), name='evidence-upload'),
    path('disputes/<int:dispute_id>/evidence/', EvidenceListView.as_view(), name='evidence-list'),
    path('evidence/<int:evidence_id>/download/', EvidenceDownloadView.as_view(), name='evidence-download'),
    path('evidence/<int:evidence_id>/secure-url/', EvidenceSecureUrlView.as_view(), name='evidence-secure-url'),
    
    # Evidence administration
    path('evidence/<int:evidence_id>/quarantine/', quarantine_evidence, name='evidence-quarantine'),
    path('evidence/<int:evidence_id>/unquarantine/', unquarantine_evidence, name='evidence-unquarantine'),
    path('evidence/<int:evidence_id>/delete/', delete_evidence_file, name='evidence-delete'),
    
    # Evidence retention management
    path('evidence/retention-report/', evidence_retention_report, name='evidence-retention-report'),
]

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/', include(evidence_patterns)),
]