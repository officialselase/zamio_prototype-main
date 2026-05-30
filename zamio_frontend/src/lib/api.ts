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

export interface RegisterArtistPayload {
  first_name: string;
  last_name: string;
  stage_name: string;
  email: string;
  phone: string;
  country?: string;
  location?: string;
  password: string;
  password2: string;
}

export interface VerifyArtistEmailCodePayload {
  email: string;
  code: string;
}

export interface ApiErrorMap {
  [field: string]: string[] | string | undefined;
}

export type ApiEnvelope<T = Record<string, unknown>> = LegacyLoginResponse & {
  data?: T;
  errors?: ApiErrorMap;
  [key: string]: unknown;
};

export interface ArtistOnboardingProgress {
  profile_completed?: boolean;
  social_media_added?: boolean;
  payment_info_added?: boolean;
  publisher_added?: boolean;
  track_uploaded?: boolean;
  [key: string]: unknown;
}

export interface IdentityProfileSnapshot {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  id_type: string;
  id_number: string;
  residential_address: string;
}

export interface ArtistOnboardingStatus {
  artist_id?: string;
  onboarding_step?: string;
  next_step?: string;
  progress?: ArtistOnboardingProgress;
  completion_percentage?: number;
  required_fields?: Record<string, unknown>;
  verification_status?: string;
  kyc_status?: string;
  can_resume_verification?: boolean;
  can_skip_verification?: boolean;
  identity_profile?: IdentityProfileSnapshot;
  [key: string]: unknown;
}

export interface IdentityProfilePayload extends Partial<IdentityProfileSnapshot> {
  artist_id: string;
}

export const registerArtist = async <T = Record<string, unknown>>(
  payload: RegisterArtistPayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>('/api/accounts/register-artist/', payload);
  return data;
};

export const verifyArtistEmailCode = async <T = Record<string, unknown>>(
  payload: VerifyArtistEmailCodePayload,
) => {
  const { data } = await authApi.post<ApiEnvelope<T>>(
    '/api/accounts/verify-artist-email-code/',
    payload,
  );
  return data;
};

export const fetchArtistOnboardingStatus = async (artistId: string) => {
  const { data } = await authApi.get<ApiEnvelope<ArtistOnboardingStatus>>(
    `/api/accounts/artist-onboarding-status/${artistId}/`,
  );
  return data;
};

export const completeArtistProfile = async (formData: FormData) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/complete-artist-profile/',
    formData,
  );
  return data;
};

export const completeArtistSocial = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/complete-artist-social/',
    payload,
  );
  return data;
};

export const completeArtistPayment = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/complete-artist-payment/',
    payload,
  );
  return data;
};

export const completeArtistPublisher = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/complete-artist-publisher/',
    payload,
  );
  return data;
};

export const completeArtistOnboarding = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/complete-artist-onboarding/',
    payload,
  );
  return data;
};

export interface PublisherListItem {
  id: string;
  name: string;
  type: string;
  location: string;
  specialties: string[];
  description?: string;
}

export const fetchPublishersList = async () => {
  const { data } = await authApi.get<ApiEnvelope<PublisherListItem[]>>(
    '/api/accounts/publishers/list/',
  );
  return data;
};


export const skipArtistOnboardingStep = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/skip-artist-onboarding/',
    payload,
  );
  return data;
};

export const updateIdentityProfile = async (payload: IdentityProfilePayload) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus>>(
    '/api/accounts/update-identity-profile/',
    payload,
  );
  return data;
};

export interface KycDocumentSummary {
  id: number;
  document_type: string;
  document_type_display?: string;
  status?: string;
  status_display?: string;
  original_filename?: string;
  file_size?: number;
  uploaded_at?: string;
}

export interface ArtistDashboardStatsSummary {
  totalPlays: number;
  totalStations: number;
  totalEarnings: number;
  avgConfidence: number;
  growthRate: number;
  activeTracks: number;
}

export type ArtistDashboardTrend = 'up' | 'down' | 'stable';

export interface ArtistDashboardTopSong {
  title: string;
  plays: number;
  earnings: number;
  confidence: number;
  stations: number;
  trend?: ArtistDashboardTrend;
}

export interface ArtistDashboardSeriesPoint {
  date: string;
  airplay: number;
  earnings?: number;
}

export interface ArtistDashboardRegionStat {
  region: string;
  plays: number;
  earnings: number;
  stations: number;
  growth: number;
  trend?: ArtistDashboardTrend;
}

export interface ArtistDashboardStationBreakdown {
  station: string;
  plays: number;
  percentage: number;
  region: string;
  type?: string;
}

export interface ArtistDashboardPerformanceScore {
  overall: number;
  airplayGrowth: number;
  regionalReach: number;
  fanEngagement: number;
  trackQuality: number;
}

export type ArtistFanDemographicCategory = 'region' | 'country' | 'age_range';

export interface ArtistFanDemographicStat {
  category: ArtistFanDemographicCategory;
  label: string;
  fans: number;
  percentage: number;
}

export interface ArtistDashboardTargets {
  airplayTarget: number;
  earningsTarget: number;
  stationsTarget: number;
  confidenceTarget: number;
}

export interface ArtistDashboardPayload {
  period?: string;
  start_date?: string | null;
  end_date?: string | null;
  artistName?: string;
  stats?: ArtistDashboardStatsSummary;
  confidenceScore?: number;
  activeRegions?: number;
  topSongs?: ArtistDashboardTopSong[];
  playsOverTime?: ArtistDashboardSeriesPoint[];
  ghanaRegions?: ArtistDashboardRegionStat[];
  stationBreakdown?: ArtistDashboardStationBreakdown[];
  fanDemographics?: ArtistFanDemographicStat[];
  performanceScore?: ArtistDashboardPerformanceScore;
  targets?: ArtistDashboardTargets;
}

export interface ArtistDashboardParams {
  period?: string;
  start_date?: string;
  end_date?: string;
}

export interface ArtistLogPagination {
  count: number;
  page_number: number;
  page_size: number;
  total_pages: number;
  next: number | null;
  previous: number | null;
  has_next: boolean;
  has_previous: boolean;
}

export interface ArtistPlayLogRecord {
  id: number;
  track_title: string;
  artist: string | null;
  station_name: string;
  matched_at: string | null;
  stop_time: string | null;
  duration: string | null;
  royalty_amount: number;
  status: string;
  attribution_source: string;
  partner_name?: string | null;
  plays: number;
  source?: string | null;
  confidence?: number | null;
}

export interface ArtistMatchLogRecord {
  id: number;
  song: string;
  artist: string | null;
  station: string;
  matched_at: string | null;
  confidence?: number | null;
  source?: string | null;
  match_type?: string | null;
  status?: string | null;
}

export interface ArtistLogsCollection<T> {
  results: T[];
  pagination: ArtistLogPagination;
}

export interface ArtistLogsPayload {
  playLogs?: ArtistLogsCollection<ArtistPlayLogRecord>;
  matchLogs?: ArtistLogsCollection<ArtistMatchLogRecord>;
}

export interface ArtistLogsParams {
  artistId: string;
  search?: string;
  playPage?: number;
  matchPage?: number;
  playPageSize?: number;
  matchPageSize?: number;
  playSortBy?: string;
  playSortOrder?: 'asc' | 'desc';
  matchSortBy?: string;
  matchSortOrder?: 'asc' | 'desc';
}

export const uploadKycDocument = async (formData: FormData) => {
  const { data } = await authApi.post<ApiEnvelope<{ document_id: number }>>(
    '/api/accounts/upload-kyc-documents/',
    formData,
  );
  return data;
};

export const fetchKycDocuments = async () => {
  const { data } = await authApi.get<ApiEnvelope<{ documents?: KycDocumentSummary[] }>>(
    '/api/accounts/get-kyc-documents/',
  );
  return data;
};

export const fetchArtistDashboard = async (
  artistId: string,
  params: ArtistDashboardParams = {},
) => {
  const query = {
    artist_id: artistId,
    ...params,
  };

  const { data } = await authApi.get<ApiEnvelope<ArtistDashboardPayload>>(
    '/api/artists/dashboard/',
    { params: query },
  );

  return data;
};

export const fetchArtistLogs = async ({
  artistId,
  search,
  playPage,
  matchPage,
  playPageSize,
  matchPageSize,
  playSortBy,
  playSortOrder,
  matchSortBy,
  matchSortOrder,
}: ArtistLogsParams) => {
  const query: Record<string, string | number> = {
    artist_id: artistId,
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

  const { data } = await authApi.get<ApiEnvelope<ArtistLogsPayload>>(
    '/api/artists/playlogs/',
    { params: query },
  );

  return data;
};

export const skipArtistVerification = async (payload: Record<string, unknown>) => {
  const { data } = await authApi.post<ApiEnvelope<ArtistOnboardingStatus | Record<string, unknown>>>(
    '/api/accounts/skip-verification/',
    payload,
  );
  return data;
};

export const resumeArtistVerification = async () => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/accounts/resume-verification/',
    {},
  );
  return data;
};

export type UploadLifecycleStatus = 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'pending';

export interface UploadManagementRecord {
  id: string;
  upload_id: string;
  status: UploadLifecycleStatus;
  raw_status?: string;
  progress: number;
  upload_type?: string;
  filename: string;
  file_size: number;
  file_type?: string | null;
  upload_date: string;
  error?: string | null;
  retry_count?: number;
  duration?: string | null;
  artist?: string | null;
  album?: string | null;
  title?: string | null;
  station?: string | null;
  entity_id?: number | null;
  metadata?: Record<string, unknown>;
  cover_art_url?: string | null;
  album_cover_url?: string | null;
}

export interface UploadManagementPagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface UploadManagementStats {
  total: number;
  uploading: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface UploadManagementFilters {
  albums: string[];
  status_counts?: Record<string, number>;
  frontend_status_counts?: Record<string, number>;
}

export interface UploadManagementPayload {
  uploads?: UploadManagementRecord[];
  pagination?: UploadManagementPagination;
  stats?: UploadManagementStats;
  filters?: UploadManagementFilters;
}

export interface TrackUploadSupportData {
  genres: { id: number; name: string }[];
  albums: { id: number; title: string; artist_name?: string | null }[];
}

export interface UploadManagementParams {
  page?: number;
  page_size?: number;
  status?: string;
  upload_type?: string;
  search?: string;
  album?: string;
  sort_by?: string;
  sort_order?: string;
}

export const fetchUploadManagement = async (params: UploadManagementParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<UploadManagementPayload>>(
    '/api/artists/api/uploads/',
    { params },
  );
  return data;
};

export const initiateUpload = async (formData: FormData) => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/artists/api/upload/initiate/',
    formData,
  );
  return data;
};

export const fetchTrackUploadSupportData = async (artistId: string) => {
  const { data } = await authApi.get<ApiEnvelope<TrackUploadSupportData>>(
    '/api/artists/get-upload-track-support-data/',
    {
      params: { artist_id: artistId },
    },
  );
  return data;
};

export const fetchUploadStatusById = async (uploadId: string) => {
  const { data } = await authApi.get<ApiEnvelope<Record<string, any>>>(
    `/api/artists/api/upload-status/${uploadId}/`,
  );
  return data;
};

export const cancelUploadRequest = async (uploadId: string) => {
  const { data } = await authApi.delete<ApiEnvelope<Record<string, unknown>>>(
    `/api/artists/api/upload/${uploadId}/cancel/`,
  );
  return data;
};

export const deleteUploadRequest = async (uploadId: string) => {
  const { data } = await authApi.delete<ApiEnvelope<Record<string, unknown>>>(
    `/api/artists/api/upload/${uploadId}/delete/`,
  );
  return data;
};

export interface CreateAlbumPayload {
  title: string;
  release_date?: string;
  genre?: string;
}

export const createAlbumForUploads = async (payload: CreateAlbumPayload) => {
  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/artists/api/albums/create/',
    payload,
  );
  return data;
};

export interface AlbumSummary {
  id: number;
  album_id?: string | null;
  title: string;
  artist: string;
  artist_id?: string;
  genre?: string | null;
  release_date?: string | null;
  track_count: number;
  total_plays: number;
  total_revenue: number;
  cover_art_url?: string | null;
  status: 'active' | 'inactive' | 'draft';
  raw_status?: string | null;
  is_archived: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlbumListStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
}

export interface AlbumListPagination {
  page: number;
  page_size: number;
  total_pages: number;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface AlbumListPayload {
  albums: AlbumSummary[];
  pagination: AlbumListPagination;
  stats: AlbumListStats;
}

export interface AlbumListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}

export const fetchArtistAlbums = async (params: AlbumListParams = {}) => {
  const { data } = await authApi.get<ApiEnvelope<AlbumListPayload>>(
    '/api/artists/api/albums/',
    { params },
  );
  return data;
};

export const deleteArtistAlbum = async (albumId: number | string) => {
  const { data } = await authApi.delete<ApiEnvelope<Record<string, unknown>>>(
    `/api/artists/api/albums/${albumId}/delete/`,
  );
  return data;
};

export const deleteArtistTrack = async (trackId: number | string) => {
  const { data } = await authApi.delete<ApiEnvelope<Record<string, unknown>>>(
    `/api/artists/api/tracks/${trackId}/delete/`,
  );
  return data;
};

export interface CreateArtistAlbumPayload {
  title: string;
  release_date?: string;
  genre_id?: number;
  genre?: string;
  cover_art?: File | null;
}

export const createArtistAlbum = async (payload: CreateArtistAlbumPayload) => {
  const formData = new FormData();
  formData.append('title', payload.title);

  if (payload.release_date) {
    formData.append('release_date', payload.release_date);
  }
  if (typeof payload.genre_id === 'number') {
    formData.append('genre_id', String(payload.genre_id));
  }
  if (payload.genre) {
    formData.append('genre', payload.genre);
  }
  if (payload.cover_art instanceof File) {
    formData.append('cover_art', payload.cover_art);
  }

  const { data } = await authApi.post<ApiEnvelope<{ album: AlbumSummary }>>(
    '/api/artists/api/albums/manage/',
    formData,
  );
  return data;
};

export interface UpdateArtistAlbumPayload {
  title?: string;
  release_date?: string;
  genre_id?: number;
  genre?: string;
  status?: string;
  active?: boolean;
  cover_art?: File | null;
}

const appendFormValue = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value === 'boolean') {
    formData.append(key, value ? 'true' : 'false');
    return;
  }
  formData.append(key, String(value));
};

export const updateArtistAlbum = async (
  albumId: number,
  payload: UpdateArtistAlbumPayload,
) => {
  const { cover_art: coverArt, ...rest } = payload;
  const hasFile = coverArt instanceof File;

  if (hasFile) {
    const formData = new FormData();
    Object.entries(rest).forEach(([key, value]) => appendFormValue(formData, key, value));
    formData.append('cover_art', coverArt);

    const { data } = await authApi.patch<ApiEnvelope<{ album: AlbumSummary }>>(
      `/api/artists/api/albums/${albumId}/`,
      formData,
    );
    return data;
  }

  const filteredPayload = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  );

  const { data } = await authApi.patch<ApiEnvelope<{ album: AlbumSummary }>>(
    `/api/artists/api/albums/${albumId}/`,
    filteredPayload,
  );
  return data;
};

export interface AlbumTrackDetail {
  id: number;
  title: string;
  status: string;
  release_date: string | null;
  duration_seconds: number | null;
  plays: number;
  revenue: number;
  cover_art_url: string | null;
  active: boolean;
}

export interface AlbumDetailStats {
  total_tracks: number;
  active_tracks: number;
  inactive_tracks: number;
  total_plays: number;
  total_revenue: number;
  average_track_duration_seconds: number | null;
}

export interface AlbumMonthlyRevenueEntry {
  month: string;
  amount: number;
  currency: string;
  plays: number;
}

export interface AlbumTerritoryRevenueEntry {
  territory: string;
  amount: number;
  currency: string;
  percentage: number;
  plays: number;
}

export interface AlbumPlaysOverTimeEntry {
  label: string;
  plays: number;
}

export interface AlbumTopStationEntry {
  name: string;
  count: number;
  region?: string | null;
  country?: string | null;
  revenue: number;
}

export interface AlbumContributorSummary {
  id: number;
  name: string;
  role: string;
  percentage: number;
}

export interface AlbumDetailPayload {
  album: AlbumSummary;
  stats: AlbumDetailStats;
  tracks: AlbumTrackDetail[];
  revenue: {
    monthly: AlbumMonthlyRevenueEntry[];
    territories: AlbumTerritoryRevenueEntry[];
  };
  performance: {
    plays_over_time: AlbumPlaysOverTimeEntry[];
    top_stations: AlbumTopStationEntry[];
  };
  contributors: AlbumContributorSummary[];
}

export const fetchArtistAlbumDetail = async (albumId: number) => {
  const { data } = await authApi.get<ApiEnvelope<AlbumDetailPayload>>(
    `/api/artists/api/albums/${albumId}/detail/`,
  );
  return data;
};

interface LegacyTrackPlayLog {
  time?: string | null;
  played_at?: string | null;
  station?: string | null;
  region?: string | null;
  country?: string | null;
}

interface LegacyTrackTopStation {
  name?: string | null;
  count?: number | null;
  region?: string | null;
  country?: string | null;
}

interface LegacyTrackPlaysOverTimeEntry {
  month?: string | null;
  revenue?: number | string | null;
  artists?: number | null;
  stations?: number | null;
  plays?: number | null;
}

interface LegacyTrackDetailResponse {
  // Flat structure (legacy)
  track_id?: number | string | null;
  title?: string | null;
  artist_name?: string | null;
  album_title?: string | null;
  genre_name?: string | null;
  duration?: string | number | null;
  release_date?: string | null;
  plays?: number | null;
  total_revenue?: number | null;
  cover_art?: string | null;
  audio_file_mp3?: string | null;
  audio_file_url?: string | null;
  lyrics?: string | null;
  topStations?: LegacyTrackTopStation[] | null;
  playLogs?: LegacyTrackPlayLog[] | null;
  playsOverTime?: LegacyTrackPlaysOverTimeEntry[] | null;
  contributors?: { role?: string | null; name?: string | null; percentage?: number | null }[] | null;

  // Nested structure (current)
  track?: {
    id?: number | string | null;
    track_id?: number | string | null;
    title?: string | null;
    artist?: string | null;
    album?: string | null;
    genre?: string | null;
    duration_seconds?: number | null;
    release_date?: string | null;
    plays?: number | null;
    total_revenue?: number | null;
    cover_art_url?: string | null;
    audio_file_url?: string | null;
    lyrics?: string | null;
  } | null;
  stats?: {
    total_plays?: number | null;
    total_revenue?: number | null;
    average_confidence?: number | null;
    first_played_at?: string | null;
    last_played_at?: string | null;
  } | null;
  revenue?: {
    monthly?: { month?: string | null; amount?: number | string | null; currency?: string | null }[] | null;
    territories?: {
      territory?: string | null;
      amount?: number | string | null;
      currency?: string | null;
      percentage?: number | null;
    }[] | null;
    payout_history?: {
      date?: string | null;
      amount?: number | string | null;
      status?: string | null;
      period?: string | null;
    }[] | null;
  } | null;
  performance?: {
    plays_over_time?: LegacyTrackPlaysOverTimeEntry[] | null;
    top_stations?: LegacyTrackTopStation[] | null;
  } | null;
  play_logs?: LegacyTrackPlayLog[] | null;
}

const parseDurationToSeconds = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const parts = value.split(':').map((segment) => Number.parseInt(segment, 10));
  if (parts.some((segment) => Number.isNaN(segment))) {
    return null;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return null;
};

const ensureArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const normalizeTimestamp = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
};

export interface TrackDetailTrack {
  id: number | string;
  track_id?: string | number | null;
  title: string;
  artist: string;
  album?: string | null;
  genre?: string | null;
  duration_seconds?: number | null;
  release_date?: string | null;
  plays?: number;
  total_revenue?: number;
  cover_art_url?: string | null;
  audio_file_url?: string | null;
  lyrics?: string | null;
}

export interface TrackDetailStats {
  total_plays: number;
  total_revenue: number;
  average_confidence: number | null;
  first_played_at: string | null;
  last_played_at: string | null;
}

export interface TrackRevenueMonthlyEntry {
  month: string;
  amount: number;
  currency: string;
}

export interface TrackRevenueTerritoryEntry {
  territory: string;
  amount: number;
  currency: string;
  percentage: number;
}

export interface TrackRevenuePayoutEntry {
  date: string;
  amount: number;
  status: string;
  period: string;
}

export interface TrackPerformanceSeriesEntry {
  label: string;
  plays?: number;
  revenue?: number;
  stations?: number;
}

export interface TrackPerformanceTopStationEntry {
  name: string;
  count?: number;
  region?: string | null;
  country?: string | null;
}

export interface TrackPlayLogEntry {
  played_at: string | null;
  station: string | null;
  region: string | null;
  country: string | null;
}

export interface TrackContributorEntry {
  role: string;
  name: string;
  percentage?: number | null;
}

export interface TrackDetailPayload {
  track: TrackDetailTrack;
  stats: TrackDetailStats;
  revenue: {
    monthly: TrackRevenueMonthlyEntry[];
    territories: TrackRevenueTerritoryEntry[];
    payout_history: TrackRevenuePayoutEntry[];
  };
  performance: {
    plays_over_time: TrackPerformanceSeriesEntry[];
    top_stations: TrackPerformanceTopStationEntry[];
  };
  play_logs: TrackPlayLogEntry[];
  contributors: TrackContributorEntry[];
}

const normalizeTrackDetail = (
  trackIdentifier: number | string,
  raw: LegacyTrackDetailResponse,
): TrackDetailPayload => {
  const rawPlayLogs = raw.play_logs ?? raw.playLogs ?? [];
  const playLogs = ensureArray(rawPlayLogs).map<TrackPlayLogEntry>((log) => ({
    played_at: normalizeTimestamp(log.played_at ?? log.time ?? null),
    station: log.station ?? null,
    region: log.region ?? null,
    country: log.country ?? null,
  }));

  const sortedTimestamps = playLogs
    .map((log) => log.played_at)
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort();

  const playsOverTimeEntries = ensureArray(
    raw.performance?.plays_over_time ?? raw.playsOverTime,
  ).map<TrackPerformanceSeriesEntry>((entry) => ({
    label: entry.month ?? 'Period',
    plays: typeof entry.plays === 'number' ? entry.plays : entry.artists ?? undefined,
    revenue: entry.revenue != null ? Number(entry.revenue) || 0 : undefined,
    stations: entry.stations ?? undefined,
  }));

  const monthlyRevenueEntries = ensureArray(raw.revenue?.monthly).map<TrackRevenueMonthlyEntry>((entry) => ({
    month: entry.month ?? 'Period',
    amount: entry.amount != null ? Number(entry.amount) || 0 : 0,
    currency: entry.currency ?? 'GHS',
  }));

  const inferredMonthlyRevenue = monthlyRevenueEntries.length
    ? monthlyRevenueEntries
    : playsOverTimeEntries.map<TrackRevenueMonthlyEntry>((entry) => ({
      month: entry.label,
      amount: entry.revenue ?? 0,
      currency: 'GHS',
    }));

  const topStations = ensureArray(raw.performance?.top_stations ?? raw.topStations).map<TrackPerformanceTopStationEntry>(
    (station) => ({
      name: station.name ?? 'Unknown Station',
      count: station.count ?? undefined,
      region: station.region ?? null,
      country: station.country ?? null,
    }),
  );

  const totalStationPlays = topStations.reduce((sum, station) => sum + (station.count ?? 0), 0);

  const territoryBreakdown = ensureArray(raw.revenue?.territories).length
    ? ensureArray(raw.revenue?.territories).map<TrackRevenueTerritoryEntry>((entry) => ({
      territory: entry.territory ?? 'Territory',
      amount: entry.amount != null ? Number(entry.amount) || 0 : 0,
      currency: entry.currency ?? 'GHS',
      percentage: entry.percentage ?? 0,
    }))
    : topStations.map<TrackRevenueTerritoryEntry>((station) => ({
      territory: station.region ?? station.country ?? station.name,
      amount: 0,
      currency: 'GHS',
      percentage:
        totalStationPlays > 0 && station.count
          ? Number(((station.count / totalStationPlays) * 100).toFixed(2))
          : 0,
    }));

  const payoutHistoryEntries = ensureArray(raw.revenue?.payout_history).map<TrackRevenuePayoutEntry>((entry) => ({
    date: entry.date ?? new Date().toISOString().slice(0, 10),
    amount: entry.amount != null ? Number(entry.amount) || 0 : 0,
    status: entry.status ?? 'Pending',
    period: entry.period ?? 'Period',
  }));

  const totalRevenue = inferredMonthlyRevenue.reduce((sum, entry) => sum + entry.amount, 0);
  const totalPlaysFromSeries = playsOverTimeEntries.reduce((sum, entry) => sum + (entry.plays ?? 0), 0);
  const totalPlays = raw.stats?.total_plays ?? raw.plays ?? totalPlaysFromSeries;

  const rawIdentifierValue =
    typeof trackIdentifier === 'string'
      ? trackIdentifier.trim()
      : typeof trackIdentifier === 'number' && Number.isFinite(trackIdentifier)
        ? trackIdentifier
        : null;

  const numericIdentifier =
    typeof rawIdentifierValue === 'number'
      ? rawIdentifierValue
      : typeof rawIdentifierValue === 'string'
        ? Number(rawIdentifierValue)
        : null;

  const resolvedTrackKey =
    raw.track?.track_id ?? raw.track_id ?? (typeof rawIdentifierValue === 'string' && rawIdentifierValue ? rawIdentifierValue : null);

  const resolvedTrackId: string | number =
    raw.track?.id ?? (typeof raw.track_id === 'number'
      ? raw.track_id
      : typeof numericIdentifier === 'number' && Number.isFinite(numericIdentifier)
        ? numericIdentifier
        : resolvedTrackKey ?? rawIdentifierValue ?? 'unknown-track');

  // Prioritize nested structure, fallback to flat structure
  const trackTitle = raw.track?.title ?? raw.title ?? 'Untitled Track';
  const artistName = raw.track?.artist ?? raw.artist_name ?? 'Unknown Artist';
  const albumTitle = raw.track?.album ?? raw.album_title ?? null;
  const genreName = raw.track?.genre ?? raw.genre_name ?? null;
  const durationSeconds = raw.track?.duration_seconds ?? parseDurationToSeconds(raw.duration);
  const releaseDate = raw.track?.release_date ?? raw.release_date ?? null;
  const coverArtUrl = raw.track?.cover_art_url ?? raw.cover_art ?? null;
  const audioFileUrl = raw.track?.audio_file_url ?? raw.audio_file_url ?? raw.audio_file_mp3 ?? null;
  const lyrics = raw.track?.lyrics ?? raw.lyrics ?? null;

  // Use stats from nested structure or calculate from flat structure
  const statsTotalRevenue = raw.stats?.total_revenue ?? raw.total_revenue ?? totalRevenue;
  const finalTotalRevenue = typeof statsTotalRevenue === 'number' ? statsTotalRevenue : 0;

  return {
    track: {
      id: resolvedTrackId,
      track_id: resolvedTrackKey ?? (typeof resolvedTrackId === 'string' ? resolvedTrackId : null),
      title: trackTitle,
      artist: artistName,
      album: albumTitle,
      genre: genreName,
      duration_seconds: durationSeconds,
      release_date: releaseDate,
      plays: typeof totalPlays === 'number' ? totalPlays : 0,
      total_revenue: finalTotalRevenue,
      cover_art_url: coverArtUrl,
      audio_file_url: audioFileUrl,
      lyrics: lyrics,
    },
    stats: {
      total_plays: typeof totalPlays === 'number' ? totalPlays : 0,
      total_revenue: finalTotalRevenue,
      average_confidence: raw.stats?.average_confidence ?? null,
      first_played_at: raw.stats?.first_played_at ?? sortedTimestamps[0] ?? null,
      last_played_at: raw.stats?.last_played_at ?? sortedTimestamps[sortedTimestamps.length - 1] ?? null,
    },
    revenue: {
      monthly: inferredMonthlyRevenue,
      territories: territoryBreakdown,
      payout_history: payoutHistoryEntries,
    },
    performance: {
      plays_over_time: playsOverTimeEntries,
      top_stations: topStations,
    },
    play_logs: playLogs,
    contributors: ensureArray(raw.contributors).map<TrackContributorEntry>((entry) => ({
      role: entry.role ?? 'Contributor',
      name: entry.name ?? 'Unknown',
      percentage: entry.percentage ?? null,
    })),
  };
};

export interface TrackDetailRequestOptions {
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

export const fetchArtistTrackDetail = async (
  trackIdentifier: number | string,
  options: TrackDetailRequestOptions = {},
): Promise<TrackDetailPayload> => {
  const invalidTokens = new Set(['undefined', 'null', 'none', 'nan']);
  const normalizedIdentifier =
    typeof trackIdentifier === 'string'
      ? (() => {
        const trimmed = trackIdentifier.trim();
        if (!trimmed) {
          return '';
        }
        if (invalidTokens.has(trimmed.toLowerCase())) {
          return '';
        }
        return trimmed;
      })()
      : typeof trackIdentifier === 'number' && Number.isFinite(trackIdentifier)
        ? trackIdentifier
        : null;

  if (normalizedIdentifier === null || normalizedIdentifier === '') {
    throw new Error('Track identifier is missing.');
  }

  const params = {
    track_id: normalizedIdentifier,
    period: options.period ?? 'all-time',
  };

  const { data } = await authApi.get<ApiEnvelope<LegacyTrackDetailResponse>>(
    '/api/artists/get-track-details/',
    { params },
  );

  if (!data?.data) {
    const extractEnvelopeError = (payload?: ApiEnvelope<unknown>) => {
      if (!payload) {
        return '';
      }

      const { errors, message } = payload;
      if (errors && typeof errors === 'object') {
        for (const value of Object.values(errors)) {
          if (Array.isArray(value)) {
            const first = value.find((item) => typeof item === 'string' && item.trim());
            if (first) {
              return first.trim();
            }
          } else if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
      }

      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }

      return '';
    };

    const message = extractEnvelopeError(data) || 'Unable to load track details. Please try again.';
    throw new Error(message);
  }

  return normalizeTrackDetail(trackIdentifier, data.data);
};

export interface UpdateArtistTrackPayload {
  title?: string;
  release_date?: string;
  lyrics?: string;
  explicit?: boolean;
  genre_id?: number;
  genre?: string;
  album_id?: number | string | null;
  album_title?: string;
  artist_id?: string;
  cover_art?: File | null;
  edit_reason?: string;
}

const appendTrackField = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) {
    return;
  }

  if (value instanceof File) {
    formData.append(key, value);
    return;
  }

  if (typeof value === 'boolean') {
    formData.append(key, value ? 'true' : 'false');
    return;
  }

  formData.append(key, String(value));
};

export const updateArtistTrack = async (
  trackId: number | string,
  payload: UpdateArtistTrackPayload,
) => {
  const formData = new FormData();
  formData.append('track_id', String(trackId));

  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'cover_art') {
      if (value instanceof File) {
        formData.append(key, value);
      }
      return;
    }

    if (key === 'album_id' && value === null) {
      formData.append(key, '');
      return;
    }

    appendTrackField(formData, key, value);
  });

  const { data } = await authApi.post<ApiEnvelope<Record<string, unknown>>>(
    '/api/artists/edit-track/',
    formData,
  );
  return data;
};
