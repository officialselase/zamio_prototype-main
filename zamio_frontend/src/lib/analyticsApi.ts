/**
 * Analytics API functions and types
 */
import authApi, { type ApiEnvelope } from './api';

// ===== TYPES =====

export interface AnalyticsOverview {
  total_plays: number;
  total_revenue: number;
  total_tracks: number;
  total_albums: number;
  active_listeners: number;
  growth_rate: number;
  previous_period_growth: number;
}

export interface MonthlyPerformanceEntry {
  month: string;
  plays: number;
  revenue: number;
  listeners: number;
}

export interface TopTrackEntry {
  title: string;
  plays: number;
  revenue: number;
  growth: number;
  listeners: number;
  avg_play_time: number;
}

export interface GeographicPerformanceEntry {
  region: string;
  plays: number;
  percentage: number;
  revenue: number;
  listeners: number;
  avg_revenue_per_listener: number;
}

export interface RevenueSourceEntry {
  source: string;
  amount: number;
  percentage: number;
  plays: number;
  avg_per_play: number;
}

export interface RecentActivityEntry {
  action: string;
  time: string;
  plays?: number;
  revenue?: number;
  followers?: number;
  location: string;
}

export interface TrackDetailEntry {
  title: string;
  plays: number;
  revenue: number;
  listeners: number;
  avg_play_time: number;
  completion_rate: number;
  skip_rate: number;
}

export interface AnalyticsData {
  time_range: string;
  overview: AnalyticsOverview;
  monthly_performance: MonthlyPerformanceEntry[];
  top_tracks: TopTrackEntry[];
  geographic_performance: GeographicPerformanceEntry[];
  revenue_by_source: RevenueSourceEntry[];
  recent_activity: RecentActivityEntry[];
  track_details: TrackDetailEntry[];
}

export interface AnalyticsParams {
  artist_id: string;
  time_range?: '7days' | '30days' | '3months' | '12months';
}

// ===== API FUNCTIONS =====

/**
 * Fetch comprehensive analytics data for an artist
 */
export const fetchArtistAnalytics = async (params: AnalyticsParams): Promise<AnalyticsData> => {
  const { data } = await authApi.get<ApiEnvelope<AnalyticsData>>(
    '/api/artists/analytics/',
    { params }
  );
  return data.data;
};
