/**
 * Profile API functions and types
 * All field names use snake_case to match backend responses
 */
import authApi, { type ApiEnvelope } from './api';

// ===== TYPES =====

export interface ArtistProfile {
  artist_id: string;
  stage_name: string;
  bio: string;
  profile_image: string | null;
  cover_image: string | null;
  verified: boolean;
  join_date: string | null;
  location: string | null;
  genres: string[];
}

export interface ContactInfo {
  email: string;
  phone: string | null;
  instagram: string;
  twitter: string;
  facebook: string | null;
  website: string;
  spotify_url: string;
  shazam_url: string;
}

export interface PublisherInfo {
  publisher_id: string;
  company_name: string;
  company_type: string;
  description: string;
  website_url: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  region: string;
  city: string;
  country: string;
}

export interface PublisherData {
  is_self_published: boolean;
  publisher: PublisherInfo | null;
}

export interface ProfileStats {
  total_plays: number;
  total_earnings: number;
  monthly_plays: number;
  monthly_earnings: number;
  new_followers: number;
  radio_coverage: number;
  avg_rating: number;
  total_songs: number;
  followers: number;
}

export interface TopTrack {
  track_id: string;
  title: string;
  duration: string;
  release_date: string | null;
  total_plays: number;
  total_earnings: number;
  status: string;
  album: string | null;
  genre: string | null;
}

export interface RecentActivity {
  id: number;
  track_title: string;
  station_name: string;
  detected_at: string | null;
  confidence_score: number;
}

export interface Achievement {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ProfileData {
  profile: ArtistProfile;
  contact: ContactInfo;
  publisher: PublisherData;
  stats: ProfileStats;
  top_tracks: TopTrack[];
  recent_activity: RecentActivity[];
  achievements: Achievement[];
}

export interface UpdateProfileParams {
  artist_id: string;
  stage_name?: string;
  bio?: string;
  contact_email?: string;
  instagram?: string;
  twitter?: string;
  website?: string;
  spotify_url?: string;
  shazam_url?: string;
}

// ===== API FUNCTIONS =====

/**
 * Fetch comprehensive profile data for an artist
 */
export const fetchArtistProfile = async (artistId: string): Promise<ProfileData> => {
  const { data } = await authApi.get<ApiEnvelope<ProfileData>>(
    '/api/artists/profile/',
    { params: { artist_id: artistId } }
  );
  return data.data;
};

/**
 * Update artist profile information
 */
export const updateArtistProfile = async (params: UpdateProfileParams): Promise<{ artist_id: string; stage_name: string; updated: boolean }> => {
  const { data } = await authApi.put<ApiEnvelope<{ artist_id: string; stage_name: string; updated: boolean }>>(
    '/api/artists/profile/update/',
    params
  );
  return data.data;
};
