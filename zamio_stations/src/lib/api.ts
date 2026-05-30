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

export interface RegisterStationPayload {
  first_name: string;
  last_name: string;
  station_name: string;
  email: string;
  phone: string;
  country?: string;
  password: string;
  password2: string;
}

export interface VerifyStationEmailCodePayload {
  email: string;
  code: string;
}

export interface PasswordResetRequestPayload {
  email: string;
  method?: 'code' | 'link';
}

export interface PasswordResetVerificationPayload {
  email: string;
  code: string;
  new_password: string;
  new_password2: string;
}

export interface ApiErrorMap {
  [field: string]: string[] | string | undefined;
}

export type ApiEnvelope<T = Record<string, unknown>> = LegacyLoginResponse & {
  data?: T;
  errors?: ApiErrorMap;
  [key: string]: unknown;
};

export interface StationOnboardingProgress {
  profile_completed?: boolean;
  stream_setup_completed?: boolean;
  staff_completed?: boolean;
  compliance_completed?: boolean;
  payment_info_added?: boolean;
  [key: string]: unknown;
}

export interface StationProfileSnapshot {
  name?: string;
  phone?: string;
  country?: string;
  region?: string;
  city?: string;
  coverage_area?: string;
  estimated_listeners?: number | string;
  license_number?: string;
  license_expiry_date?: string;
  website_url?: string;
  about?: string;
  station_type?: string;
  station_class?: string;
  station_category?: string;
  location_name?: string;
  [key: string]: unknown;
}

export interface StationStreamConfiguration {
  stream_url?: string;
  backup_stream_url?: string;
  stream_type?: string;
  stream_bitrate?: string;
  stream_format?: string;
  stream_mount_point?: string;
  stream_username?: string;
  monitoring_enabled?: boolean;
  monitoring_interval_seconds?: number;
  stream_auto_restart?: boolean;
  stream_quality_check_enabled?: boolean;
  [key: string]: unknown;
}

export interface StationComplianceSnapshot {
  license_number?: string;
  license_issuing_authority?: string;
  license_issue_date?: string;
  license_expiry_date?: string;
  broadcast_frequency?: string;
  transmission_power?: string;
  regulatory_body?: string;
  coverage_area?: string;
  estimated_listeners?: number | string;
  compliance_contact_name?: string;
  compliance_contact_email?: string;
  compliance_contact_phone?: string;
  emergency_contact_phone?: string;
  [key: string]: unknown;
}

export interface StationPaymentPreferences {
  preferred_payout_method?: string;
  preferred_currency?: string;
  payout_frequency?: string;
  minimum_payout_amount?: number | string;
  tax_identification_number?: string;
  business_registration_number?: string;
  momo_account?: string;
  momo_provider?: string;
  momo_account_name?: string;
  bank_account?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_branch_code?: string;
  bank_swift_code?: string;
  [key: string]: unknown;
}

export interface StationOnboardingStatus {
  station_id?: string;
  station_name?: string;
  onboarding_step?: string;
  next_step?: string;
  progress?: StationOnboardingProgress;
  profile?: StationProfileSnapshot;
  stream_configuration?: StationStreamConfiguration;
  compliance?: StationComplianceSnapshot;
  payment_preferences?: StationPaymentPreferences;
  stream_status?: string;
  stream_validation_errors?: string | null;
  [key: string]: unknown;
}

export type StationDashboardTrend = 'up' | 'down' | 'stable';
export type StationDashboardStatusLevel = 'excellent' | 'good' | 'average' | 'poor';

export interface StationDashboardStatsSummary {
  tracksDetected: number;
  monitoringAccuracy: number;
  uptime: number;
  revenueEarned: number;
  activeStaff: number;
  complianceScore: number;
}

export interface StationDashboardTargets {
  detectionTarget: number;
  earningsTarget: number;
  stationsTarget: number;
  accuracyTarget: number;
  uptimeTarget: number;
  revenueTarget: number;
}

export interface StationDashboardPerformanceScore {
  overall: number;
  detectionGrowth: number;
  regionalReach: number;
  systemHealth: number;
  compliance: number;
}

export interface StationDashboardDetectionRecord {
  id: number | string;
  title: string;
  artist?: string | null;
  confidence: number;
  timestamp?: string | null;
  status: string;
}

export interface StationDashboardSystemMetric {
  metric: string;
  value: number;
  status: StationDashboardStatusLevel;
  unit?: string;
}

export interface StationDashboardStaffPerformance {
  name: string;
  role?: string | null;
  detections: number;
  accuracy: number;
  status: string;
}

export interface StationDashboardTopTrack {
  id: number | string | null;
  title: string;
  detections: number;
  earnings: number;
  confidence: number;
  trend?: StationDashboardTrend;
  stations: number;
}

export interface StationDashboardMonthlyTrend {
  month: string;
  detections: number;
  accuracy: number;
  earnings: number;
}

export interface StationDashboardBreakdownEntry {
  station: string;
  detections: number;
  percentage: number;
  region: string;
  type?: string;
}

export interface StationDashboardRegionStat {
  region: string;
  detections: number;
  earnings: number;
  stations: number;
  growth: number;
  trend?: StationDashboardTrend;
}

export interface StationDashboardComplianceStatus {
  broadcastingLicense?: string;
  musicLicense?: string;
  technicalCertification?: string;
  lastAudit?: string | null;
  nextAudit?: string | null;
}

export interface StationDashboardPayload {
  period?: string;
  start_date?: string | null;
  end_date?: string | null;
  stationId?: string;
  stationName?: string;
  totalSongs?: number;
  totalPlays?: number;
  totalRoyalties?: number;
  confidenceScore?: number;
  activeRegions?: number;
  stats?: StationDashboardStatsSummary;
  targets?: StationDashboardTargets;
  performanceScore?: StationDashboardPerformanceScore;
  recentDetections?: StationDashboardDetectionRecord[];
  systemHealth?: StationDashboardSystemMetric[];
  staffPerformance?: StationDashboardStaffPerformance[];
  topTracks?: StationDashboardTopTrack[];
  monthlyTrends?: StationDashboardMonthlyTrend[];
  stationBreakdown?: StationDashboardBreakdownEntry[];
  ghanaRegions?: StationDashboardRegionStat[];
  complianceStatus?: StationDashboardComplianceStatus;
  disputeSummary?: {
    total?: number;
    disputed?: number;
    undisputed?: number;
  };
  airplayData?: { day: string; plays: number }[];
  trendData?: { date: string; plays: number }[];
  [key: string]: unknown;
}

export interface StationDashboardParams {
  period?: string;
  start_date?: string;
  end_date?: string;
}

export interface StationLogPagination {
  count: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface StationPlayLogRecord {
  id: number | string;
  track_title: string;
  artist: string | null;
  station_name: string | null;
  matched_at: string | null;
  stop_time: string | null;
  duration: string | null;
  royalty_amount: number;
  status: string;
  attribution_source: string | null;
  partner_name: string | null;
  plays: number;
  source: string | null;
  confidence: number | null;
}

export interface StationMatchLogRecord {
  id: number | string;
  track_title: string;
  artist: string | null;
  station_name: string | null;
  matched_at: string | null;
  confidence: number | null;
  status: string;
}

export interface StationLogsCollection<T> {
  results: T[];
  pagination: StationLogPagination;
}

export interface StationLogsPayload {
  playLogs?: StationLogsCollection<StationPlayLogRecord>;
  matchLogs?: StationLogsCollection<StationMatchLogRecord>;
}

export interface StationLogsParams {
  stationId: string;
  search?: string;
  playPage?: number;
  matchPage?: number;
  playPageSize?: number;
  matchPageSize?: number;
  playSortBy?: string;
  playSortOrder?: 'asc' | 'desc';
  matchSortBy?: string;
  matchSortOrder?: 'asc' | 'desc';
  logPageState?: 'playlogs' | 'matchlogs' | 'all';
}

export interface FlagStationPlayLogPayload {
  playlogId: number | string;
  comment: string;
}

export interface StationNotificationRecord {
  id: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: string | null;
  time_ago: string;
  station_name?: string | null;
  station_id?: string | null;
  alert_level?: string | null;
  actionable: boolean;
  action_label?: string | null;
  action_type?: string | null;
  listeners?: number | null;
  milestone?: boolean;
  tracks_detected?: number | null;
  days_until_expiry?: number | null;
  license_type?: string | null;
  amount?: number | null;
  growth?: number | null;
  platform?: string | null;
  username?: string | null;
  playlist?: string | null;
}

export interface StationNotificationsStats {
  total_count: number;
  unread_count: number;
  read_count: number;
  high_priority_count: number;
  system_count: number;
  performance_count: number;
}

export interface StationNotificationsFilters {
  available_types: string[];
  available_priorities: string[];
}

export interface StationNotificationsPagination {
  page_number: number;
  page_size: number;
  total_pages: number;
  count: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface StationNotificationsPayload {
  notifications: StationNotificationRecord[];
  stats: StationNotificationsStats;
  filters: StationNotificationsFilters;
  pagination: StationNotificationsPagination;
}

export interface StationNotificationsParams {
  stationId: string;
  search?: string;
  filterType?: string;
  filterPriority?: string;
  filterRead?: 'read' | 'unread';
  orderBy?: 'newest' | 'oldest' | 'title' | 'priority';
  page?: number;
  pageSize?: number;
}

export interface MarkStationNotificationReadPayload {
  stationId: string;
  notificationId: number | string;
}

export interface MarkAllStationNotificationsPayload {
  stationId: string;
}

export interface DeleteStationNotificationPayload {
  stationId: string;
  notificationId: number | string;
}

export interface StationDisputePlayLog {
  time: string | null;
  station: string | null;
  region: string | null;
}

export interface StationDisputeRecord {
  id: number | string;
  track_title: string | null;
  artist_name: string | null;
  start_time: string | null;
  stop_time: string | null;
  duration: string | null;
  confidence: number | null;
  earnings: number;
  status: string | null;
  comment: string | null;
  timestamp: string | null;
  cover_art: string | null;
  audio_file_mp3: string | null;
  release_date: string | null;
  plays: number;
  title: string | null;
  play_logs: StationDisputePlayLog[];
}

export interface StationDisputeSummary {
  total: number;
  resolved: number;
  flagged: number;
  pending: number;
  pending_review: number;
  average_confidence: number;
}

export interface StationDisputeCollection {
  results: StationDisputeRecord[];
  pagination: StationLogPagination;
}

export interface StationDisputesPayload {
  disputes: StationDisputeCollection;
  summary: StationDisputeSummary;
  status_choices: string[];
}

export interface StationDisputesParams {
  stationId: string;
  search?: string;
  status?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StationDisputeDetailParams {
  stationId: string;
  disputeId: number | string;
}

export interface StationProfileInfo {
  id: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  frequency?: string | null;
  established?: string | null;
  licenseNumber?: string | null;
  licenseExpiry?: string | null;
  status?: string | null;
  rating?: number | null;
  weeklyReach?: number | null;
  stationType?: string | null;
  coverageArea?: string | null;
  contactName?: string | null;
  contactTitle?: string | null;
  complianceOfficer?: string | null;
  complianceOfficerEmail?: string | null;
  complianceOfficerPhone?: string | null;
  emergencyContact?: string | null;
  socialMedia?: Record<string, string>;
}

export interface StationProfileStats {
  totalDetections: number;
  monthlyDetections: number;
  accuracy: number;
  uptime: number;
  revenue: number;
  activeStaff: number;
  broadcasts: number;
  avgDailyListeners: number;
  weeklyReach: number;
}

export interface StationProfileActivity {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  time?: string | null;
  status?: string | null;
}

export interface StationProfileStaffMember {
  id: number | string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  joinDate?: string | null;
  avatar?: string | null;
  permissions: string[];
  roleType: string | null;
}

export interface StationComplianceDocumentEntry {
  id: number | string;
  name: string;
  type: string;
  status: string;
  uploadedAt?: string | null;
  fileSize?: string | null;
  expiryDate?: string | null;
}

export interface StationProfilePayload {
  profile: StationProfileInfo;
  stats: StationProfileStats;
  recentActivity: StationProfileActivity[];
  staff: StationProfileStaffMember[];
  complianceDocuments: StationComplianceDocumentEntry[];
}

export interface StationStaffRoleDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface StationStaffPermissionDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface StationStaffSummary {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  adminCount: number;
  managerCount: number;
  reporterCount: number;
}

export interface StationStaffRecord {
  id: number | string;
  stationName?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'reporter' | string;
  roleLabel?: string;
  permissionLevel?: string;
  permissions: string[];
  permissionLabels?: string[];
  isActive: boolean;
  joinDate?: string | null;
  avatar?: string | null;
  department?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  hireDate?: string | null;
  employeeId?: string | null;
}

export interface StationStaffFilters {
  roles: StationStaffRoleDefinition[];
  permissions: StationStaffPermissionDefinition[];
  statuses: { id: string; label: string }[];
  roleDefaults: Record<string, string[]>;
}

export interface StationStaffListPayload {
  staff: {
    results: StationStaffRecord[];
    pagination: StationLogPagination;
  };
  summary: StationStaffSummary;
  filters: StationStaffFilters;
}

export interface FetchStationStaffParams {
  stationId: string;
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface UpsertStationStaffPayload {
  stationId: string;
  staffId?: string | number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'manager' | 'reporter';
  permissions?: string[];
  department?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  employeeId?: string;
  hireDate?: string;
}

export const fetchStationOnboardingStatus = async (stationId: string) => {
  const { data } = await authApi.get<ApiEnvelope<StationOnboardingStatus>>(
    `/api/accounts/enhanced-station-onboarding-status/${stationId}/`,
  );
  return data;
};

export const fetchStationProfile = async (stationId: string) => {
  const { data } = await authApi.get<ApiEnvelope<StationProfilePayload>>(
    '/api/stations/profile/',
    {
      params: { station_id: stationId },
    },
  );

  return data;
};

export const fetchStationStaff = async (
  params: FetchStationStaffParams,
) => {
  const { stationId, search, role, status, page, pageSize } = params;
  const { data } = await authApi.get<ApiEnvelope<StationStaffListPayload>>(
    '/api/stations/get-station-staff-list/',
    {
      params: {
        station_id: stationId,
        search,
        role,
        status,
        page,
        page_size: pageSize,
      },
    },
  );

  return data;
};

const normalizeStaffPayload = (payload: UpsertStationStaffPayload) => ({
  station_id: payload.stationId,
  staff_id: payload.staffId,
  first_name: payload.firstName,
  last_name: payload.lastName,
  email: payload.email,
  phone: payload.phone,
  role: payload.role,
  permissions: payload.permissions,
  department: payload.department,
  emergency_contact: payload.emergencyContact,
  emergency_phone: payload.emergencyPhone,
  employee_id: payload.employeeId,
  hire_date: payload.hireDate,
});

export const createStationStaff = async (
  payload: UpsertStationStaffPayload,
) => {
  const body = normalizeStaffPayload(payload);
  const { data } = await authApi.post<ApiEnvelope<StationStaffRecord>>(
    '/api/stations/add-station-staff/',
    body,
  );
  return data;
};

export const updateStationStaff = async (
  payload: UpsertStationStaffPayload & { staffId: string | number },
) => {
  const body = normalizeStaffPayload(payload);
  const { data } = await authApi.post<ApiEnvelope<StationStaffRecord>>(
    '/api/stations/edit-station-staff/',
    body,
  );
  return data;
};

export const archiveStationStaff = async (staffId: string | number) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/stations/archive-station-staff/',
    {
      staff_id: staffId,
    },
  );
  return data;
};

export const toggleStationStaffActive = async (
  staffId: string | number,
  active: boolean,
) => {
  const { data } = await authApi.post<ApiEnvelope<StationStaffRecord>>(
    '/api/stations/activate-station-staff/',
    {
      staff_id: staffId,
      active,
    },
  );
  return data;
};

export const fetchStationDashboard = async (
  stationId: string,
  params: StationDashboardParams = {},
) => {
  const query = {
    station_id: stationId,
    ...params,
  };

  const { data } = await authApi.get<ApiEnvelope<StationDashboardPayload>>(
    '/api/stations/dashboard/',
    { params: query },
  );

  return data;
};

export const fetchStationLogs = async ({
  stationId,
  search,
  playPage,
  matchPage,
  playPageSize,
  matchPageSize,
  playSortBy,
  playSortOrder,
  matchSortBy,
  matchSortOrder,
  logPageState,
}: StationLogsParams) => {
  const query: Record<string, string | number> = {
    station_id: stationId,
  };

  if (search) {
    query.search = search;
  }
  if (typeof playPage === 'number') {
    query.play_page = playPage;
  }
  if (typeof matchPage === 'number') {
    query.match_page = matchPage;
  }
  if (typeof playPageSize === 'number') {
    query.play_page_size = playPageSize;
  }
  if (typeof matchPageSize === 'number') {
    query.match_page_size = matchPageSize;
  }
  if (playSortBy) {
    query.play_sort_by = playSortBy;
  }
  if (playSortOrder) {
    query.play_sort_order = playSortOrder;
  }
  if (matchSortBy) {
    query.match_sort_by = matchSortBy;
  }
  if (matchSortOrder) {
    query.match_sort_order = matchSortOrder;
  }
  if (logPageState) {
    query.log_page_state = logPageState;
  }

  const { data } = await authApi.get<ApiEnvelope<StationLogsPayload>>(
    '/api/stations/playlogs/',
    { params: query },
  );

  return data;
};

export const flagStationPlayLog = async ({ playlogId, comment }: FlagStationPlayLogPayload) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/music-monitor/flag-playlog/',
    {
      playlog_id: playlogId,
      comment,
    },
  );

  return data;
};

export const fetchStationNotifications = async ({
  stationId,
  search,
  filterType,
  filterPriority,
  filterRead,
  orderBy,
  page,
  pageSize,
}: StationNotificationsParams) => {
  const query: Record<string, string | number> = {
    station_id: stationId,
  };

  if (search) {
    query.search = search;
  }
  if (filterType && filterType !== 'all') {
    query.filter_type = filterType;
  }
  if (filterPriority && filterPriority !== 'all') {
    query.filter_priority = filterPriority;
  }
  if (filterRead) {
    query.filter_read = filterRead;
  }
  if (orderBy) {
    query.order_by = orderBy;
  }
  if (typeof page === 'number') {
    query.page = page;
  }
  if (typeof pageSize === 'number') {
    query.page_size = pageSize;
  }

  const { data } = await authApi.get<ApiEnvelope<StationNotificationsPayload>>(
    '/api/stations/notifications/',
    { params: query },
  );

  return data;
};

export const markStationNotificationRead = async ({
  stationId,
  notificationId,
}: MarkStationNotificationReadPayload) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/stations/notifications/mark-read/',
    {
      station_id: stationId,
      notification_id: notificationId,
    },
  );

  return data;
};

export const markAllStationNotificationsRead = async ({
  stationId,
}: MarkAllStationNotificationsPayload) => {
  const { data } = await authApi.post<ApiEnvelope<{ updated_count: number }>>(
    '/api/stations/notifications/mark-all-read/',
    {
      station_id: stationId,
    },
  );

  return data;
};

export const deleteStationNotification = async ({
  stationId,
  notificationId,
}: DeleteStationNotificationPayload) => {
  const { data } = await authApi.delete<ApiEnvelope>(
    '/api/stations/notifications/delete/',
    {
      data: {
        station_id: stationId,
        notification_id: notificationId,
      },
    },
  );

  return data;
};

export const fetchStationDisputes = async ({
  stationId,
  search,
  status,
  period,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: StationDisputesParams) => {
  const query: Record<string, string | number> = {
    station_id: stationId,
  };

  if (search) {
    query.search = search;
  }
  if (status) {
    query.status = status;
  }
  if (period) {
    query.period = period;
  }
  if (typeof page === 'number') {
    query.page = page;
  }
  if (typeof pageSize === 'number') {
    query.page_size = pageSize;
  }
  if (sortBy) {
    query.sort_by = sortBy;
  }
  if (sortOrder) {
    query.sort_order = sortOrder;
  }

  const { data } = await authApi.get<ApiEnvelope<StationDisputesPayload>>(
    '/api/stations/disputes/',
    { params: query },
  );

  return data;
};

export const fetchStationDisputeDetail = async ({
  stationId,
  disputeId,
}: StationDisputeDetailParams) => {
  const { data } = await authApi.get<ApiEnvelope<StationDisputeRecord>>(
    `/api/stations/disputes/${disputeId}/`,
    {
      params: {
        station_id: stationId,
      },
    },
  );

  return data;
};

export const registerStation = async <T = Record<string, unknown>>(
  payload: RegisterStationPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/register-station/', payload);
  return data;
};

export const verifyStationEmailCode = async <T = Record<string, unknown>>(
  payload: VerifyStationEmailCodePayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/verify-station-email-code/', payload);
  return data;
};

export const resendStationVerification = async (
  payload: { email: string; method?: 'code' | 'link' },
) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/accounts/email/resend-verification-by-email/',
    payload,
  );
  return data;
};

export const requestPasswordReset = async (
  payload: PasswordResetRequestPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/accounts/email/request-password-reset/',
    payload,
  );
  return data;
};

export const resendPasswordResetRequest = async (
  payload: PasswordResetRequestPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/accounts/email/resend-password-reset/',
    payload,
  );
  return data;
};

export const verifyPasswordResetCode = async (
  payload: PasswordResetVerificationPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/accounts/verify-password-reset-code/',
    payload,
  );
  return data;
};

export const completeStationProfile = async (formData: FormData) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/complete-station-profile/',
    formData,
  );
  return data;
};

export const completeStationStreamSetup = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/complete-station-stream/',
    payload,
  );
  return data;
};

export const completeStationStaff = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/complete-add-staff/',
    payload,
  );
  return data;
};

export const completeStationCompliance = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/update-station-compliance-setup/',
    payload,
  );
  return data;
};

export const completeStationPayment = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/complete-station-payment/',
    payload,
  );
  return data;
};

export const completeStationOnboarding = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/complete-station-onboarding/',
    payload,
  );
  return data;
};

export const skipStationOnboardingStep = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<StationOnboardingStatus>>(
    '/api/accounts/skip-station-onboarding/',
    payload,
  );
  return data;
};

