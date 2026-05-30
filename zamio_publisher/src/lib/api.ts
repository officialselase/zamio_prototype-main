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
  authApi as default,
  authApi,
  loginWithPassword,
  legacyRoleLogin,
  getStoredAuth,
  logout,
  resolveApiBaseUrl,
};

export type { LegacyLoginResponse };

export interface RegisterPublisherPayload {
  first_name: string;
  last_name: string;
  publisher_name: string;
  email: string;
  phone: string;
  country?: string;
  password: string;
  password2: string;
}

export interface VerifyPublisherEmailCodePayload {
  email: string;
  code: string;
}

export interface ApiErrorMap {
  [field: string]: string[] | string | undefined;
}

export type ApiEnvelope<T = Record<string, unknown>> = LegacyLoginResponse & {
  data?: T;
  errors?: ApiErrorMap;
  message?: string;
  [key: string]: unknown;
};

export interface PublisherOnboardingProgress {
  profile_completed?: boolean;
  revenue_split_completed?: boolean;
  link_artist_completed?: boolean;
  payment_info_added?: boolean;
  [key: string]: unknown;
}

export interface PublisherCompanyProfile {
  company_name?: string | null;
  company_type?: string | null;
  industry?: string | null;
  founded_year?: number | null;
  employee_count?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  postal_code?: string | null;
  location_name?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  website_url?: string | null;
  description?: string | null;
  business_registration_number?: string | null;
  license_number?: string | null;
  tax_id?: string | null;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  compliance_officer_name?: string | null;
  compliance_officer_email?: string | null;
  compliance_officer_phone?: string | null;
  compliance_officer_title?: string | null;
  logo_url?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  [key: string]: unknown;
}

export interface PublisherRevenueSplit {
  writer_split?: number | string | null;
  publisher_split?: number | string | null;
  mechanical_share?: number | string | null;
  performance_share?: number | string | null;
  sync_share?: number | string | null;
  administrative_fee_percentage?: number | string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export interface PublisherPaymentPreferences {
  preferred_method?: string | null;
  payout_currency?: string | null;
  payout_frequency?: string | null;
  minimum_payout_amount?: number | string | null;
  withholding_tax_rate?: number | string | null;
  vat_registration_number?: string | null;
  tax_id?: string | null;
  business_registration_number?: string | null;
  momo_provider?: string | null;
  momo_account?: string | null;
  momo_account_name?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  bank_branch_code?: string | null;
  bank_swift_code?: string | null;
  [key: string]: unknown;
}

export interface LinkedArtistSummary {
  artist_id?: string | null;
  stage_name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  relationship_type?: string | null;
  relationship_id?: number | null;
  linked_date?: string | null;
  catalog_size?: number | null;
  last_activity?: string | null;
  [key: string]: unknown;
}

export interface PublisherProfileSummary {
  publisherId?: string;
  companyName?: string;
  companyType?: string;
  industry?: string;
  foundedYear?: number | string | null;
  employeeCount?: number | string | null;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  businessRegistration?: string;
  taxId?: string;
  licenseNumber?: string;
  primaryContact?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  complianceOfficer?: string;
  officerEmail?: string;
  officerPhone?: string;
  officerTitle?: string;
  description?: string;
  logoUrl?: string | null;
  [key: string]: unknown;
}

export interface PublisherProfileRevenueSplit {
  id: string;
  name: string;
  writerPercentage: number;
  publisherPercentage: number;
  territory: string;
  type: string;
  isActive: boolean;
}

export interface PublisherProfilePaymentMethod {
  id: string;
  type: 'bank' | 'mobile_money' | 'paypal' | 'stripe';
  accountName: string;
  accountNumber: string | null;
  bankName?: string;
  routingNumber?: string;
  mobileProvider?: string;
  isDefault: boolean;
  isVerified: boolean;
}

export interface PublisherProfileLinkedArtist {
  id: string;
  name: string;
  status: string;
  contractType: string;
  linkedDate: string | null;
  catalogSize: number;
  lastRoyalty: number;
}

export interface PublisherProfileAccountSettings {
  emailNotifications: boolean;
  royaltyAlerts: boolean;
  weeklyReports: boolean;
  twoFactorAuth: boolean;
  language: string;
  timezone: string;
  currency: string;
}

export interface PublisherProfilePayload {
  publisher?: PublisherProfileSummary;
  revenueSplits?: PublisherProfileRevenueSplit[];
  paymentMethods?: PublisherProfilePaymentMethod[];
  linkedArtists?: PublisherProfileLinkedArtist[];
  accountSettings?: PublisherProfileAccountSettings;
}

export interface PublisherAccountSettingsPayload {
  email_notifications?: boolean;
  royalty_alerts?: boolean;
  weekly_reports?: boolean;
  two_factor_auth?: boolean;
  language?: string;
  timezone?: string;
  currency?: string;
}

export interface PublisherOnboardingStatus {
  publisher_id?: string;
  onboarding_step?: string;
  next_step?: string;
  progress?: PublisherOnboardingProgress;
  company_profile?: PublisherCompanyProfile;
  revenue_split?: PublisherRevenueSplit;
  payment_preferences?: PublisherPaymentPreferences;
  linked_artists?: LinkedArtistSummary[];
  kyc_status?: string | null;
  kyc_documents?: unknown;
  profile_complete_percentage?: number;
  next_recommended_step?: string;
  required_fields?: Record<string, unknown>;
  admin_approval_required?: boolean;
  [key: string]: unknown;
}

export interface PublisherArtistSearchResult {
  artist_id?: string | null;
  stage_name?: string | null;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  relationship_type?: string | null;
  relationship_id?: number | null;
  linked_date?: string | null;
  catalog_size?: number | null;
  last_activity?: string | null;
  [key: string]: unknown;
}

export interface PublisherArtistStatsSummary {
  totalArtists?: number;
  activeArtists?: number;
  pendingArtists?: number;
  totalStreams?: number;
  monthlyStreams?: number;
  totalEarnings?: number;
  [key: string]: number | undefined;
}

export interface PublisherArtistFilters {
  statuses?: string[];
  genres?: string[];
  sortOptions?: string[];
  [key: string]: unknown;
}

export interface PublisherArtistContract {
  type?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  royaltyRate?: number | null;
  advance?: number | null;
  territory?: string | null;
  worldwide?: boolean | null;
  [key: string]: unknown;
}

export interface PublisherArtistActivity {
  type?: string | null;
  title?: string | null;
  details?: string | null;
  date?: string | null;
  [key: string]: unknown;
}

export interface PublisherArtistStatsBlock {
  totalStreams?: number;
  monthlyStreams?: number;
  totalTracks?: number;
  totalAlbums?: number;
  followers?: number;
  earnings?: number;
  lastActivity?: string | null;
  [key: string]: number | string | null | undefined;
}

export interface PublisherArtistSongRecord {
  id?: number | string | null;
  trackId?: string | null;
  title?: string | null;
  duration?: number | string | null;
  releaseDate?: string | null;
  totalPlays?: number;
  totalEarnings?: number;
  status?: string | null;
  album?: string | null;
  genre?: string | null;
  recentPlays?: PublisherArtistActivity[];
  [key: string]: unknown;
}

export interface PublisherArtistRoyaltyEntry {
  date?: string | null;
  amount?: number;
  source?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

export interface PublisherArtistRecord {
  artistId?: string | null;
  stageName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  joinDate?: string | null;
  location?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  genres?: string[];
  socialMedia?: Record<string, string | null | undefined>;
  stats?: PublisherArtistStatsBlock;
  contract?: PublisherArtistContract;
  recentActivity?: PublisherArtistActivity[];
  songs?: PublisherArtistSongRecord[];
  royaltyHistory?: PublisherArtistRoyaltyEntry[];
  playLogs?: PublisherArtistRoyaltyEntry[];
  [key: string]: unknown;
}

export interface PublisherArtistPagination {
  page_number?: number;
  total_pages?: number;
  count?: number;
  next?: number | null;
  previous?: number | null;
  [key: string]: number | null | undefined;
}

export interface PublisherArtistListPayload {
  summary?: PublisherArtistStatsSummary;
  filters?: PublisherArtistFilters;
  artists?: {
    results?: PublisherArtistRecord[];
    pagination?: PublisherArtistPagination;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PublisherArtistDetailPayload extends PublisherArtistRecord {}

export interface FetchPublisherArtistsParams {
  publisherId: string;
  search?: string;
  status?: string;
  genre?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FetchPublisherArtistDetailParams {
  publisherId: string;
  artistId: string;
}

export interface PublisherDashboardStat {
  value?: number;
  change?: number;
  target?: number;
  targetLabel?: string | null;
}

export interface PublisherDashboardStatsBlock {
  totalPerformances?: PublisherDashboardStat;
  totalEarnings?: PublisherDashboardStat;
  worksInCatalog?: PublisherDashboardStat;
  activeStations?: PublisherDashboardStat;
  [key: string]: PublisherDashboardStat | undefined;
}

export interface PublisherDashboardTrendPoint {
  period?: string | null;
  label?: string | null;
  airplay?: number;
  streaming?: number;
  total?: number;
}

export interface PublisherDashboardTopSong {
  trackId?: number | string | null;
  title?: string | null;
  artist?: string | null;
  plays?: number;
  earnings?: number;
  stations?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardRegionPerformance {
  region?: string | null;
  plays?: number;
  earnings?: number;
  stations?: number;
  growth?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardStationBreakdown {
  stationId?: number | string | null;
  name?: string | null;
  region?: string | null;
  plays?: number;
  percentage?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardActivityItem {
  id?: string | number;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  timestamp?: string | null;
  time?: string | null;
  [key: string]: unknown;
}

export interface PublisherDashboardRosterSummary {
  writerCount?: number;
  agreementCount?: number;
  publisherSplit?: number;
  writerSplit?: number;
  unclaimedLogs?: number;
  disputes?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardTopArtist {
  artistId?: number | string | null;
  name?: string | null;
  plays?: number;
  revenue?: number;
  trend?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardPerformanceScore {
  overall?: number;
  publishingGrowth?: number;
  revenueGrowth?: number;
  catalogQuality?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardTargets {
  performancesTarget?: number;
  earningsTarget?: number;
  catalogTarget?: number;
  stationTarget?: number;
  [key: string]: unknown;
}

export interface PublisherDashboardMetadata {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  [key: string]: unknown;
}

export interface PublisherDashboardPayload {
  stats?: PublisherDashboardStatsBlock;
  playsOverTime?: PublisherDashboardTrendPoint[];
  topSongs?: PublisherDashboardTopSong[];
  regionPerformance?: PublisherDashboardRegionPerformance[];
  topStations?: PublisherDashboardStationBreakdown[];
  recentActivity?: PublisherDashboardActivityItem[];
  roster?: PublisherDashboardRosterSummary;
  topArtists?: PublisherDashboardTopArtist[];
  performanceScore?: PublisherDashboardPerformanceScore;
  targets?: PublisherDashboardTargets;
  metadata?: PublisherDashboardMetadata;
  [key: string]: unknown;
}

export interface PublisherDashboardParams {
  period?: string;
  start_date?: string;
  end_date?: string;
}

export interface PublisherLogPagination {
  count: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface PublisherPlayLogRecord {
  id: number | string;
  track_title: string;
  artist: string | null;
  publisher_catalog_id: string | null;
  station_name: string | null;
  station_region: string | null;
  matched_at: string | null;
  stop_time: string | null;
  duration: string | null;
  plays: number;
  royalty_amount: number;
  status: string | null;
  license_type: string | null;
  territory: string | null;
}

export interface PublisherMatchLogRecord {
  id: number | string;
  song: string;
  artist: string | null;
  publisher_catalog_id: string | null;
  station: string | null;
  station_region: string | null;
  matched_at: string | null;
  confidence: number | null;
  status: string | null;
  license_status: string | null;
}

export interface PublisherLogsCollection<T> {
  results: T[];
  pagination: PublisherLogPagination;
}

export interface PublisherLogsPayload {
  playLogs?: PublisherLogsCollection<PublisherPlayLogRecord>;
  matchLogs?: PublisherLogsCollection<PublisherMatchLogRecord>;
}

export interface PublisherCatalogTrackPerformance {
  dailyStreams: number[];
  topCountries: string[];
  peakPosition: number | null;
  chartPerformance: string | null;
}

export interface PublisherCatalogTrack {
  id: number | string;
  title: string;
  artist: string | null;
  artistId?: string | null;
  album: string | null;
  duration: string | null;
  releaseDate: string | null;
  status: string | null;
  genre: string | null;
  streams: number;
  downloads: number;
  revenue: number;
  platforms: string[];
  composer?: string | null;
  producer?: string | null;
  label?: string | null;
  coverArt?: string | null;
  audioUrl?: string | null;
  bpm?: number | null;
  key?: string | null;
  mood?: string | null;
  language?: string | null;
  explicit?: boolean;
  featured?: boolean;
  tags?: string[];
  collaborators?: string[];
  lastUpdated?: string | null;
  performance?: PublisherCatalogTrackPerformance;
  publisherCatalogId?: string | null;
  isrc_code?: string | null;
  [key: string]: unknown;
}

export interface PublisherCatalogPagination {
  count: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface PublisherCatalogSummary {
  totalTracks: number;
  publishedTracks: number;
  draftTracks: number;
  scheduledTracks: number;
  totalStreams: number;
  totalDownloads: number;
  totalRevenue: number;
  [key: string]: number;
}

export interface PublisherCatalogArtistFilter {
  id: string;
  name: string;
  trackCount?: number;
  [key: string]: unknown;
}

export interface PublisherCatalogFilters {
  statuses?: string[];
  genres?: string[];
  artists?: PublisherCatalogArtistFilter[];
  [key: string]: unknown;
}

export interface PublisherCatalogPayload {
  summary?: PublisherCatalogSummary;
  filters?: PublisherCatalogFilters;
  tracks: {
    results: PublisherCatalogTrack[];
    pagination: PublisherCatalogPagination;
  };
  [key: string]: unknown;
}

export interface PublisherCatalogParams {
  publisherId: string;
  search?: string;
  status?: string;
  genre?: string;
  artistId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PublisherRoyaltiesSummary {
  totalEarnings?: number;
  paidEarnings?: number;
  pendingEarnings?: number;
  processingEarnings?: number;
  scheduledEarnings?: number;
  disputedEarnings?: number;
  currency?: string;
  latestPaymentDate?: string | null;
  trendPercentage?: number | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalDurationHours?: number;
}

export interface PublisherMonthlyEarning {
  period: string;
  startDate?: string | null;
  endDate?: string | null;
  totalEarnings: number;
  status?: string;
  paidDate?: string | null;
  tracks?: number;
  artists?: number;
  broadcastHours?: number;
  platformBreakdown: Record<string, number>;
}

export interface PublisherStationBreakdown {
  station: string;
  region?: string | null;
  plays: number;
  royalties: number;
  percentage: number;
}

export type PublisherTrackTrend = 'up' | 'down' | 'flat';

export interface PublisherTopTrack {
  trackId: string;
  title: string;
  artist?: string | null;
  airplay: number;
  earnings: number;
  station?: string | null;
  region?: string | null;
  trend?: PublisherTrackTrend;
  lastActivity?: string | null;
}

export interface PublisherPaymentScheduleItem {
  paymentId: string;
  artist: string;
  amount: number;
  status: string;
  dueDate?: string | null;
  processedAt?: string | null;
  tracks: string[];
  station?: string | null;
  region?: string | null;
}

export interface PublisherPaymentStats {
  totalScheduled?: number;
  totalProcessing?: number;
  totalPaid?: number;
  currency?: string;
}

export interface PublisherRoyaltiesPayments {
  items: PublisherPaymentScheduleItem[];
  stats: PublisherPaymentStats;
}

export interface PublisherDistributionSplit {
  label: string;
  amount: number;
  percentage: number;
  description?: string | null;
}

export interface PublisherDistributionSettings {
  autoPayoutThreshold?: number;
  paymentFrequency?: string;
  defaultSplitLabel?: string;
}

export interface PublisherRoyaltiesDistribution {
  splits: PublisherDistributionSplit[];
  settings: PublisherDistributionSettings;
}

export interface PublisherRoyaltiesPayload {
  summary?: PublisherRoyaltiesSummary;
  earnings?: PublisherMonthlyEarning[];
  stationBreakdown?: PublisherStationBreakdown[];
  topTracks?: PublisherTopTrack[];
  payments?: PublisherRoyaltiesPayments;
  distribution?: PublisherRoyaltiesDistribution;
}

export interface PublisherRoyaltiesParams {
  publisherId: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

export interface PublisherLogsParams {
  publisherId: string;
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

export interface PublisherReportGrowthMetrics {
  earnings?: number;
  airplay?: number;
  stations?: number;
  artists?: number;
  [key: string]: number | undefined;
}

export interface PublisherReportOverview {
  totalEarnings?: number;
  totalAirplay?: number;
  totalStations?: number;
  totalArtists?: number;
  growth?: PublisherReportGrowthMetrics;
  [key: string]: unknown;
}

export interface PublisherReportStationPerformance {
  stationId?: string | number | null;
  station?: string | null;
  region?: string | null;
  airplay?: number;
  earnings?: number;
  tracks?: number;
  artists?: number;
  avgPerPlay?: number;
  trend?: string | null;
  earningsTrend?: string | null;
  [key: string]: unknown;
}

export interface PublisherReportArtistPerformance {
  artistId?: string | number | null;
  artist?: string | null;
  region?: string | null;
  totalAirplay?: number;
  totalEarnings?: number;
  topStation?: string | null;
  tracks?: number;
  avgPerTrack?: number;
  trend?: string | null;
  airplayTrend?: string | null;
  [key: string]: unknown;
}

export interface PublisherReportMonthlyTrend {
  month?: string | null;
  year?: string | null;
  label?: string | null;
  earnings?: number;
  airplay?: number;
  [key: string]: unknown;
}

export interface PublisherReportRegionalPerformance {
  region?: string | null;
  earnings?: number;
  airplay?: number;
  stations?: number;
  percentage?: number;
  [key: string]: unknown;
}

export interface PublisherReportStationOption {
  stationId?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface PublisherReportAvailablePeriod {
  value: string;
  label: string;
}

export interface PublisherReportFilterSelection {
  period?: string;
  stationId?: string | null;
  region?: string | null;
  [key: string]: unknown;
}

export interface PublisherReportFilters {
  stations?: PublisherReportStationOption[];
  regions?: string[];
  availablePeriods?: PublisherReportAvailablePeriod[];
  selected?: PublisherReportFilterSelection;
  [key: string]: unknown;
}

export interface PublisherReportsPayload {
  overview?: PublisherReportOverview;
  stationPerformance?: PublisherReportStationPerformance[];
  artistPerformance?: PublisherReportArtistPerformance[];
  monthlyTrends?: PublisherReportMonthlyTrend[];
  regionalPerformance?: PublisherReportRegionalPerformance[];
  filters?: PublisherReportFilters;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PublisherReportsParams {
  publisherId: string;
  period?: string;
  stationId?: string;
  region?: string;
}

export const registerPublisher = async <T = Record<string, unknown>>(
  payload: RegisterPublisherPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/register-publisher/', payload);
  return data;
};

export const verifyPublisherEmailCode = async <T = Record<string, unknown>>(
  payload: VerifyPublisherEmailCodePayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/verify-publisher-email-code/', payload);
  return data;
};

export const fetchPublisherProfile = async (publisherId: string) => {
  const { data } = await authApi.get<ApiEnvelope<PublisherProfilePayload>>(
    '/api/publishers/profile/',
    {
      params: {
        publisher_id: publisherId,
      },
    },
  );
  return data;
};

export const updatePublisherAccountSettings = async (
  publisherId: string,
  payload: PublisherAccountSettingsPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<{ accountSettings?: PublisherProfileAccountSettings }>>(
    '/api/publishers/account-settings/',
    {
      publisher_id: publisherId,
      ...payload,
    },
  );
  return data;
};

export const fetchPublisherOnboardingStatus = async (publisherId: string) => {
  const { data } = await authApi.get<ApiEnvelope<PublisherOnboardingStatus>>(
    `/api/accounts/publisher-onboarding-status/${publisherId}/`,
  );
  return data;
};

export const fetchPublisherDashboard = async (
  publisherId: string,
  params: PublisherDashboardParams = {},
) => {
  const query: Record<string, string> = {
    publisher_id: publisherId,
  };

  if (params.period) {
    query.period = params.period;
  }
  if (params.start_date) {
    query.start_date = params.start_date;
  }
  if (params.end_date) {
    query.end_date = params.end_date;
  }

  const { data } = await authApi.get<ApiEnvelope<PublisherDashboardPayload>>(
    '/api/publishers/dashboard/',
    { params: query },
  );

  return data;
};

export const fetchPublisherLogs = async ({
  publisherId,
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
}: PublisherLogsParams) => {
  const query: Record<string, string | number> = {
    publisher_id: publisherId,
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

  const { data } = await authApi.get<ApiEnvelope<PublisherLogsPayload>>(
    '/api/publishers/playlogs/',
    { params: query },
  );

  return data;
};

export const fetchPublisherReports = async ({
  publisherId,
  period,
  stationId,
  region,
}: PublisherReportsParams) => {
  const query: Record<string, string> = {
    publisher_id: publisherId,
  };

  if (period) {
    query.period = period;
  }

  if (stationId && stationId !== 'all') {
    query.station_id = stationId;
  }

  if (region && region !== 'all') {
    query.region = region;
  }

  const { data } = await authApi.get<ApiEnvelope<PublisherReportsPayload>>(
    '/api/publishers/reports/',
    { params: query },
  );

  return data;
};

export const fetchPublisherCatalog = async ({
  publisherId,
  search,
  status,
  genre,
  artistId,
  sortBy,
  sortOrder,
  page,
  pageSize,
}: PublisherCatalogParams) => {
  const query: Record<string, string | number> = {
    publisher_id: publisherId,
  };

  if (search) {
    query.search = search;
  }
  if (status) {
    query.status = status;
  }
  if (genre) {
    query.genre = genre;
  }
  if (artistId) {
    query.artist_id = artistId;
  }
  if (sortBy) {
    query.sort_by = sortBy;
  }
  if (sortOrder) {
    query.sort_order = sortOrder;
  }
  if (typeof page === 'number') {
    query.page = page;
  }
  if (typeof pageSize === 'number') {
    query.page_size = pageSize;
  }

  const { data } = await authApi.get<ApiEnvelope<PublisherCatalogPayload>>(
    '/api/publishers/catalog/',
    { params: query },
  );

  return data;
};

export const fetchPublisherRoyalties = async ({
  publisherId,
  period,
  startDate,
  endDate,
}: PublisherRoyaltiesParams) => {
  const params: Record<string, string> = {
    publisher_id: publisherId,
  };

  if (period) {
    params.period = period;
  }
  if (startDate) {
    params.start_date = startDate;
  }
  if (endDate) {
    params.end_date = endDate;
  }

  const { data } = await authApi.get<ApiEnvelope<PublisherRoyaltiesPayload>>(
    '/api/publishers/royalties/',
    { params },
  );

  return data;
};

export const fetchPublisherArtists = async ({
  publisherId,
  search,
  status,
  genre,
  page,
  pageSize,
  sortBy,
  sortOrder,
}: FetchPublisherArtistsParams) => {
  const params: Record<string, unknown> = {
    publisher_id: publisherId,
  };

  if (search) {
    params.search = search;
  }
  if (status) {
    params.status = status;
  }
  if (genre) {
    params.genre = genre;
  }
  if (page) {
    params.page = page;
  }
  if (pageSize) {
    params.page_size = pageSize;
  }
  if (sortBy) {
    params.sort_by = sortBy;
  }
  if (sortOrder) {
    params.sort_order = sortOrder;
  }

  const { data } = await authApi.get<ApiEnvelope<PublisherArtistListPayload>>(
    '/api/publishers/artists/',
    { params },
  );

  return data;
};

export const fetchPublisherArtistDetail = async ({
  publisherId,
  artistId,
}: FetchPublisherArtistDetailParams) => {
  const { data } = await authApi.get<ApiEnvelope<PublisherArtistDetailPayload>>(
    '/api/publishers/artists/detail/',
    {
      params: {
        publisher_id: publisherId,
        artist_id: artistId,
      },
    },
  );

  return data;
};

export const completePublisherProfile = async (formData: FormData) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/complete-publisher-profile/',
    formData,
  );
  return data;
};

export const completePublisherRevenueSplit = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/complete-revenue-split/',
    payload,
  );
  return data;
};

export const completePublisherArtistLink = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/complete-link-artist/',
    payload,
  );
  return data;
};

export const completePublisherPayment = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/complete-publisher-payment/',
    payload,
  );
  return data;
};

export const skipPublisherOnboardingStep = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/skip-publisher-onboarding/',
    payload,
  );
  return data;
};

export const completePublisherOnboarding = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<PublisherOnboardingStatus>>(
    '/api/accounts/complete-publisher-onboarding/',
    payload,
  );
  return data;
};

export const createArtistRelationship = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope>(
    '/api/accounts/create-artist-relationship/',
    payload,
  );
  return data;
};

export const inviteArtist = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope>('/api/accounts/invite-artist/', payload);
  return data;
};

export const searchPublisherArtists = async (
  publisherId: string,
  query: string,
) => {
  const { data } = await authApi.get<ApiEnvelope<{ results?: PublisherArtistSearchResult[] }>>(
    '/api/accounts/search-publisher-artists/',
    {
      params: {
        publisher_id: publisherId,
        query,
      },
    },
  );
  return data;
};

export const logoutPublisher = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope>('/api/accounts/logout-publisher/', payload);
  return data;
};
