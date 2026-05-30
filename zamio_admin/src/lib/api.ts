import {
  authApi,
  loginWithPassword,
  legacyRoleLogin,
  getStoredAuth,
  logout,
  resolveApiBaseUrl,
  type LegacyLoginResponse,
} from '@zamio/ui';

export {
  authApi,
  loginWithPassword,
  legacyRoleLogin,
  getStoredAuth,
  logout,
  resolveApiBaseUrl,
};

export default authApi;

export type { LegacyLoginResponse };

export interface ApiErrorMap {
  [field: string]: string[] | string | undefined;
}

export type ApiEnvelope<T = Record<string, unknown>> = LegacyLoginResponse & {
  data?: T;
  errors?: ApiErrorMap;
  message?: string;
  [key: string]: unknown;
};

export interface RegisterAdminPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country?: string;
  password: string;
  password2: string;
  organization_name?: string;
  company?: string;
  role: string;
}

export interface VerifyAdminEmailCodePayload {
  email: string;
  code: string;
}

export interface AdminProfileSnapshot {
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  active?: boolean;
  organization_name?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface AdminOnboardingStatus {
  user_id?: string;
  admin_id?: string;
  next_step?: string;
  onboarding_step?: string;
  progress?: {
    profile_completed?: boolean;
    [key: string]: unknown;
  };
  profile?: AdminProfileSnapshot;
  organization_name?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

export interface CompleteAdminProfilePayload {
  address?: string;
  city: string;
  postal_code: string;
}

export const registerAdmin = async <T = Record<string, unknown>>(
  payload: RegisterAdminPayload,
) => {
  const requestPayload: Record<string, unknown> = {
    ...payload,
    organization_name: payload.organization_name ?? payload.company,
  };

  delete requestPayload.company;

  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/register-admin/', requestPayload);
  return data;
};

// Admin login that properly handles Django Token authentication
export interface AdminLoginPayload {
  email: string;
  password: string;
  fcm_token?: string;
}

export interface AdminLoginResponse {
  message: string;
  data: {
    user_id: string;
    admin_id: string;
    email: string;
    first_name: string;
    last_name: string;
    photo: string | null;
    country: string;
    phone: string;
    token: string; // Django Token (not JWT)
    access_token?: string;
    refresh_token?: string;
  };
}

export const loginAdmin = async (payload: AdminLoginPayload) => {
  // Provide default fcm_token if not provided
  const loginPayload = {
    ...payload,
    fcm_token: payload.fcm_token || 'web-admin-token',
  };

  const { data } = await authApi.post<AdminLoginResponse>('/api/accounts/login-admin/', loginPayload);
  
  // Store the Django Token (not JWT) - authApi interceptor will detect it and use "Token" header
  // The backend returns both 'token' (Django Token) and 'access_token' (JWT)
  // We use the Django Token because station endpoints use TokenAuthentication
  if (data.data && data.data.token) {
    const transformedData = {
      ...data,
      data: {
        ...data.data,
        access_token: data.data.token, // Use Django Token (no dots, so interceptor uses "Token" header)
      },
    };
    return transformedData;
  }
  
  return data;
};

export const verifyAdminEmailCode = async <T = Record<string, unknown>>(
  payload: VerifyAdminEmailCodePayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/verify-admin-email-code/', payload);
  return data;
};

export const fetchAdminOnboardingStatus = async () => {
  const { data } = await authApi.get<ApiEnvelope<AdminOnboardingStatus>>(
    '/api/accounts/admin-onboarding-status/',
  );
  return data;
};

export const completeAdminProfile = async (payload: CompleteAdminProfilePayload) => {
  const { data } = await authApi.post<ApiEnvelope<AdminOnboardingStatus>>(
    '/api/accounts/complete-admin-profile/',
    payload,
  );
  return data;
};

export interface AdminPlatformStats {
  totalStations: number;
  totalArtists: number;
  totalSongs: number;
  totalPlays: number;
  totalRoyalties: number;
  pendingPayments: number;
  activeDistributors: number;
  monthlyGrowth: number;
  systemHealth: number;
  pendingDisputes: number;
  [key: string]: number;
}

export interface AdminPublisherStats {
  totalPublishers: number;
  activeAgreements: number;
  pendingPublisherPayments: number;
  internationalPartners: number;
  catalogsUnderReview: number;
  agreementsExpiring: number;
  payoutVelocity: number;
  [key: string]: number;
}

export interface AdminRecentActivity {
  id: string;
  type: string;
  description: string;
  status: string;
  time: string;
  amount?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface AdminTopEarner {
  name: string;
  totalEarnings: number;
  plays: number;
  growth: number;
}

export interface AdminRevenueTrendPoint {
  month: string;
  revenue: number;
  artists: number;
  stations: number;
}

export interface AdminGenreDistributionPoint {
  name: string;
  value: number;
  color: string;
}

export interface AdminPublisherPerformanceRow {
  name: string;
  territory: string;
  totalRoyalties: number;
  activeAgreements: number;
  status: string;
}

export interface AdminDashboardResponse {
  platformStats: AdminPlatformStats;
  publisherStats: AdminPublisherStats;
  recentActivity: AdminRecentActivity[];
  topEarners: AdminTopEarner[];
  revenueTrends: AdminRevenueTrendPoint[];
  genreDistribution: AdminGenreDistributionPoint[];
  publisherPerformance: AdminPublisherPerformanceRow[];
  [key: string]: unknown;
}

export const fetchAdminDashboard = async () => {
  const { data } = await authApi.get<AdminDashboardResponse>('/api/analytics/admin/');
  return data;
};

// User Management API

export interface UserManagementOverview {
  user_stats: {
    total_users: number;
    artists: number;
    publishers: number;
    stations: number;
    admins: number;
  };
  kyc_stats: {
    pending: number;
    verified: number;
    rejected: number;
    incomplete: number;
  };
  recent_stats: {
    new_registrations: number;
    kyc_submissions: number;
    active_users: number;
  };
  account_stats: {
    active: number;
    inactive: number;
    email_verified: number;
    profile_complete: number;
  };
  last_updated: string;
}

export interface UserRecord {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  user_type: 'Artist' | 'Publisher' | 'Station' | 'Admin';
  kyc_status: 'pending' | 'verified' | 'rejected' | 'incomplete';
  is_active: boolean;
  email_verified: boolean;
  profile_complete: boolean;
  two_factor_enabled: boolean;
  last_activity: string | null;
  timestamp: string;
  photo_url: string | null;
  artist_id?: string;
  stage_name?: string;
  self_published?: boolean;
  publisher_id?: string;
  company_name?: string;
  station_id?: string;
  station_name?: string;
}

export interface UserListPagination {
  page_number: number;
  per_page: number;
  total_pages: number;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
  next: number | null;
  previous: number | null;
}

export interface UserListResponse {
  users: UserRecord[];
  pagination: UserListPagination;
  filters_applied: {
    search: string;
    user_type: string;
    kyc_status: string;
    account_status: string;
    order_by: string;
  };
}

export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  user_type?: string;
  kyc_status?: string;
  account_status?: string;
  order_by?: string;
}

export interface UserDetailResponse {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  country: string;
  user_type: string;
  kyc_status: string;
  kyc_documents: Record<string, unknown>;
  is_active: boolean;
  email_verified: boolean;
  profile_complete: boolean;
  two_factor_enabled: boolean;
  last_activity: string | null;
  timestamp: string;
  photo_url: string | null;
  failed_login_attempts: number;
  account_locked_until: string | null;
  permissions: Array<{
    permission: string;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
  }>;
  recent_activity: Array<{
    action: string;
    resource_type: string;
    resource_id: string;
    timestamp: string;
    ip_address: string;
    status_code: number;
  }>;
  artist_profile?: Record<string, unknown>;
  publisher_profile?: Record<string, unknown>;
  station_profile?: Record<string, unknown>;
}

export interface UpdateKycStatusPayload {
  user_id: string;
  kyc_status: 'pending' | 'verified' | 'rejected' | 'incomplete';
  rejection_reason?: string;
  admin_notes?: string;
}

export interface UpdateUserStatusPayload {
  user_id: string;
  action: 'activate' | 'deactivate' | 'suspend';
  reason?: string;
  suspension_duration?: number;
}

export interface BulkUserOperationsPayload {
  user_ids: string[];
  operation: 'activate' | 'deactivate' | 'export' | 'update_kyc';
  operation_data?: Record<string, unknown>;
}

export const fetchUserManagementOverview = async () => {
  const { data } = await authApi.get<ApiEnvelope<UserManagementOverview>>(
    '/api/accounts/admin/user-management-overview/'
  );
  return data;
};

export const fetchAllUsers = async (params: UserListParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<UserListResponse>>(
    '/api/accounts/admin/all-users/',
    { params }
  );
  return data;
};

export const fetchUserDetails = async (userId: string) => {
  const { data } = await authApi.get<ApiEnvelope<UserDetailResponse>>(
    '/api/accounts/admin/user-details/',
    { params: { user_id: userId } }
  );
  return data;
};

export interface UserRoyaltySummary {
  total_gross: number;
  total_net: number;
  total_distributions: number;
  paid_count: number;
  pending_count: number;
  paid_amount: number;
  pending_amount: number;
  currency: string;
}

export interface RoyaltyDistributionItem {
  distribution_id: string;
  gross_amount: number;
  net_amount: number;
  currency: string;
  recipient_type: string;
  percentage_split: number;
  status: string;
  calculated_at: string;
  paid_at: string | null;
  payment_reference: string | null;
  play_log?: {
    id: number;
    played_at: string | null;
    track_title: string | null;
    station_name: string | null;
  };
}

export interface UserRoyaltiesResponse {
  user_id: string;
  user_email: string;
  user_type: string;
  summary: UserRoyaltySummary;
  status_breakdown: Record<string, { count: number; amount: number }>;
  recent_royalties: RoyaltyDistributionItem[];
}

export const fetchUserRoyalties = async (userId: string) => {
  const { data } = await authApi.get<ApiEnvelope<UserRoyaltiesResponse>>(
    '/api/accounts/admin/user-royalties/',
    { params: { user_id: userId } }
  );
  return data;
};

export const updateKycStatus = async (payload: UpdateKycStatusPayload) => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/accounts/admin/update-kyc-status/',
    payload
  );
  return data;
};

export const updateUserStatus = async (payload: UpdateUserStatusPayload) => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/accounts/admin/update-user-status/',
    payload
  );
  return data;
};

export const bulkUserOperations = async (payload: BulkUserOperationsPayload) => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/accounts/admin/bulk-user-operations/',
    payload
  );
  return data;
};

// Station Management API

export interface Station {
  id: number;
  station_id: string;
  name: string;
  region: string;
  country: string;
  frequency: string;
  verification_status: string;
  is_active: boolean;
  created_at: string;
  total_plays?: number;
  balance?: number;
}

export interface StationListResponse {
  stations: Station[];
  pagination?: {
    page_number: number;
    per_page: number;
    total_pages: number;
    total_count: number;
  };
}

export interface StationListParams {
  page?: number;
  search?: string;
}

export const fetchAllStations = async (params: StationListParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<StationListResponse>>(
    '/api/stations/get-all-stations/',
    { params }
  );
  return data;
};

export interface StationDetailResponse {
  id: number;
  station_id: string;
  name: string;
  photo: string | null;
  cover_image: string | null;
  tagline: string | null;
  founded_year: number | null;
  primary_contact_name: string | null;
  primary_contact_title: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  station_class: string;
  station_type: string;
  license_number: string | null;
  license_issuing_authority: string | null;
  license_issue_date: string | null;
  license_expiry_date: string | null;
  coverage_area: string | null;
  estimated_listeners: number | null;
  station_category: string | null;
  regulatory_body: string | null;
  compliance_contact_name: string | null;
  compliance_contact_email: string | null;
  compliance_contact_phone: string | null;
  emergency_contact_phone: string | null;
  operating_hours_start: string | null;
  operating_hours_end: string | null;
  timezone: string;
  website_url: string | null;
  social_media_links: Record<string, string>;
  broadcast_frequency: string | null;
  transmission_power: string | null;
  stream_url: string | null;
  backup_stream_url: string | null;
  stream_type: string | null;
  stream_bitrate: string | null;
  stream_format: string | null;
  stream_mount_point: string | null;
  monitoring_enabled: boolean;
  monitoring_interval_seconds: number;
  stream_auto_restart: boolean;
  stream_quality_check_enabled: boolean;
  stream_status: string;
  stream_status_display: string;
  last_monitored: string | null;
  stream_validation_errors: string | null;
  verification_status: string;
  verified_by: number | null;
  verified_at: string | null;
  verification_notes: string | null;
  bank_account: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_branch_code: string | null;
  bank_swift_code: string | null;
  momo_account: string | null;
  momo_provider: string | null;
  momo_account_name: string | null;
  bio: string | null;
  location_name: string | null;
  lat: string | null;
  lng: string | null;
  avg_detection_confidence: string | null;
  about: string | null;
  onboarding_step: string;
  profile_completed: boolean;
  stream_setup_completed: boolean;
  staff_completed: boolean;
  compliance_completed: boolean;
  report_completed: boolean;
  payment_info_added: boolean;
  preferred_payout_method: string | null;
  preferred_currency: string;
  payout_frequency: string;
  minimum_payout_amount: string | null;
  tax_identification_number: string | null;
  business_registration_number: string | null;
  is_archived: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  staff_count: number;
  stream_links_count: number;
  user: number;
}

export const fetchStationDetails = async (stationId: string) => {
  const { data } = await authApi.get<ApiEnvelope<StationDetailResponse>>(
    '/api/stations/get-station-details/',
    { params: { station_id: stationId } }
  );
  return data;
};

// Disputes API
export interface UserBasic {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string;
}

export interface Dispute {
  dispute_id: string;
  title: string;
  dispute_type: string;
  status: string;
  priority: string;
  submitted_by: UserBasic;
  assigned_to?: UserBasic | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  evidence_count: number;
  comments_count: number;
  days_open: number;
}

export interface DisputesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Dispute[];
}

export interface DisputesParams {
  page?: number;
  page_size?: number;
  status?: string;
  priority?: string;
  dispute_type?: string;
  search?: string;
  ordering?: string;
}

export const fetchDisputes = async (params: DisputesParams = {}) => {
  const { data } = await authApi.get<DisputesListResponse>(
    '/api/disputes/api/disputes/',
    { params }
  );
  return data;
};

export interface DisputeEvidence {
  id: number;
  title: string;
  description: string;
  file_type: string;
  file_size: number;
  file_category: string;
  uploaded_by: UserBasic;
  uploaded_at: string;
  secure_url: string | null;
}

export interface DisputeComment {
  id: number;
  content: string;
  is_internal: boolean;
  author: UserBasic;
  created_at: string;
  updated_at: string;
  replies: DisputeComment[];
}

export interface DisputeAuditLog {
  id: number;
  action: string;
  description: string;
  previous_state: string;
  new_state: string;
  actor: UserBasic;
  timestamp: string;
}

export interface DisputeDetail {
  dispute_id: string;
  title: string;
  description: string;
  dispute_type: string;
  status: string;
  priority: string;
  submitted_by: UserBasic;
  assigned_to: UserBasic | null;
  related_track: {
    id: number;
    title: string;
    artist: string | null;
  } | null;
  related_station: {
    id: number;
    name: string;
    location: string | null;
  } | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_summary: string;
  resolution_action_taken: string;
  metadata: Record<string, any>;
  evidence: DisputeEvidence[];
  comments: DisputeComment[];
  audit_logs: DisputeAuditLog[];
  available_transitions: string[];
  timeline: any[];
}

export const fetchDisputeDetail = async (disputeId: string) => {
  const { data } = await authApi.get<DisputeDetail>(
    `/api/disputes/api/disputes/${disputeId}/`
  );
  return data;
};

export const updateDisputeStatus = async (disputeId: string, newStatus: string, reason?: string) => {
  const { data } = await authApi.post<DisputeDetail>(
    `/api/disputes/api/disputes/${disputeId}/transition_status/`,
    { new_status: newStatus, reason, notify: true }
  );
  return data;
};

export const assignDispute = async (disputeId: string, assigneeId: string, reason?: string) => {
  const { data } = await authApi.post<DisputeDetail>(
    `/api/disputes/api/disputes/${disputeId}/assign/`,
    { assignee_id: assigneeId, reason }
  );
  return data;
};

export const addDisputeComment = async (disputeId: string, content: string, isInternal: boolean = false) => {
  const { data } = await authApi.post<DisputeComment>(
    `/api/disputes/api/disputes/${disputeId}/add_comment/`,
    { content, is_internal: isInternal }
  );
  return data;
};

export const addDisputeEvidence = async (disputeId: string, formData: FormData) => {
  const { data } = await authApi.post<DisputeEvidence>(
    `/api/disputes/api/disputes/${disputeId}/add_evidence/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return data;
};

// Publishers API
export interface Publisher {
  publisher_id: string;
  company_name: string;
  company_type: string;
  industry: string;
  country: string;
  region: string;
  city: string;
  verified: boolean;
  active: boolean;
  created_at: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  website_url: string;
  user?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

export interface PublishersListResponse {
  publishers: Publisher[];
  pagination: {
    page_number: number;
    total_pages: number;
    next: number | null;
    previous: number | null;
  };
}

export interface PublishersParams {
  page?: number;
  search?: string;
}

export const fetchAllPublishers = async (params: PublishersParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<PublishersListResponse>>(
    '/api/publishers/get-all-publishers/',
    { params }
  );
  return data;
};

export interface PublisherDetailResponse {
  publisher_id: string;
  company_name: string;
  company_type: string;
  industry: string;
  founded_year: number | null;
  employee_count: number | null;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  compliance_officer_name: string;
  compliance_officer_email: string;
  compliance_officer_phone: string;
  compliance_officer_title: string;
  tax_id: string;
  business_registration_number: string;
  license_number: string;
  region: string;
  city: string;
  country: string;
  address: string;
  postal_code: string;
  location_name: string;
  lat: string | null;
  lng: string | null;
  website_url: string;
  description: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  bank_branch_code: string;
  bank_swift_code: string;
  momo_account: string;
  momo_account_name: string;
  momo_provider: string;
  preferred_payment_method: string;
  payout_currency: string;
  payout_frequency: string;
  minimum_payout_amount: string | null;
  withholding_tax_rate: string | null;
  vat_registration_number: string;
  verified: boolean;
  writer_split: string | null;
  publisher_split: string | null;
  mechanical_share: string | null;
  performance_share: string | null;
  sync_share: string | null;
  administrative_fee_percentage: string | null;
  revenue_split_notes: string;
  onboarding_step: string;
  profile_completed: boolean;
  revenue_split_completed: boolean;
  link_artist_completed: boolean;
  payment_info_added: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    first_name: string;
    last_name: string;
    photo?: string | null;
  };
}

export const fetchPublisherDetails = async (publisherId: string) => {
  const { data } = await authApi.get<ApiEnvelope<PublisherDetailResponse>>(
    '/api/publishers/get-publisher-details/',
    { params: { publisher_id: publisherId } }
  );
  return data;
};

// Playlogs API
export interface PlayLog {
  id: number;
  track: {
    id: number;
    title: string;
    artist: {
      id: number;
      stage_name: string;
    };
    isrc_code?: string;
  };
  station: {
    id: number;
    name: string;
  };
  start_time: string;
  stop_time: string;
  duration: string | null;
  royalty_amount: string;
  source: string;
  played_at: string | null;
  flagged: boolean;
  verification_status: string;
  avg_confidence_score: string | null;
  created_at: string;
}

export interface PlayLogsListResponse {
  play_logs: PlayLog[];
  pagination: {
    page_number: number;
    total_pages: number;
    next: number | null;
    previous: number | null;
  };
}

export interface PlayLogsParams {
  page?: number;
  search?: string;
}

export const fetchAllPlayLogs = async (params: PlayLogsParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<PlayLogsListResponse>>(
    '/api/music-monitor/playlog/list/',
    { params }
  );
  return data;
};

// Match Cache API
export interface MatchCache {
  id: number;
  track: {
    id: number;
    title: string;
    artist: {
      id: number;
      stage_name: string;
    };
  };
  station: {
    id: number;
    name: string;
  };
  matched_at: string;
  avg_confidence_score: string | null;
  processed: boolean;
  failed_reason: string | null;
  created_at: string;
}

export interface MatchCacheListResponse {
  match_cache: MatchCache[];
  pagination: {
    page_number: number;
    total_pages: number;
    next: number | null;
    previous: number | null;
  };
}

export interface MatchCacheParams {
  page?: number;
  search?: string;
}

export const fetchAllMatchCache = async (params: MatchCacheParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<MatchCacheListResponse>>(
    '/api/music-monitor/matchcache/list/',
    { params }
  );
  return data;
};
