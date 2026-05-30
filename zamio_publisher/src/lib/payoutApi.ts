/**
 * Payout API for publishers
 */
import authApi from './api';

export interface Artist {
  id: number;
  stage_name: string;
  user: number;
  self_published: boolean;
}

export interface WithdrawalRequest {
  id: number;
  withdrawal_id: string;
  requester: number;
  requester_email: string;
  requester_type: 'artist' | 'publisher' | 'admin';
  amount: number;
  currency: string;
  artist: number | null;
  artist_name: string | null;
  publisher: number | null;
  publisher_name: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  publishing_status_validated: boolean;
  validation_notes: string | null;
  payment_method: string | null;
  payment_details: any;
  processed_by: number | null;
  processed_by_email: string | null;
  processed_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  requested_at: string;
  updated_at: string;
}

/**
 * Get artists signed to the publisher
 */
export const getSignedArtists = async (): Promise<Artist[]> => {
  try {
    const { data } = await authApi.get<{ artists: Artist[] }>('/api/publishers/signed-artists/');
    return data.artists || [];
  } catch (error) {
    console.error('Error fetching signed artists:', error);
    throw error;
  }
};

/**
 * Request withdrawal for an artist (publisher on behalf of artist)
 */
export const requestArtistPayout = async (params: {
  artist_id: number;
  amount: number;
  currency?: string;
  notes?: string;
}): Promise<WithdrawalRequest> => {
  try {
    const response = await authApi.post<WithdrawalRequest>(
      '/api/royalties/withdrawal-request/',
      {
        artist: params.artist_id,
        amount: params.amount,
        currency: params.currency || 'GHS',
        admin_notes: params.notes || ''
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error requesting payout:', error);
    throw error;
  }
};

/**
 * Get withdrawal history for publisher
 */
export const getPublisherWithdrawals = async (params?: {
  status?: string;
  artist_id?: number;
  limit?: number;
}): Promise<WithdrawalRequest[]> => {
  try {
    const { data } = await authApi.get<{ withdrawals: WithdrawalRequest[]; count: number }>(
      '/api/royalties/withdrawals/',
      { params }
    );
    return data.withdrawals || [];
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    throw error;
  }
};

/**
 * Get artist earnings summary
 */
export interface ArtistEarnings {
  artist_id: number;
  artist_name: string;
  total_earnings: number;
  pending_payments: number;
  total_withdrawals: number;
  available_balance: number;
}

export const getArtistEarnings = async (artistId: number): Promise<ArtistEarnings> => {
  try {
    const { data } = await authApi.get<ArtistEarnings>(
      `/api/artists/${artistId}/earnings/`
    );
    return data;
  } catch (error) {
    console.error('Error fetching artist earnings:', error);
    throw error;
  }
};
