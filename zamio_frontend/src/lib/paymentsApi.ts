/**
 * Payments API functions and types
 * All field names use snake_case to match backend responses
 */
import authApi, { type ApiEnvelope } from './api';

// ===== TYPES =====

export interface PaymentsOverview {
  total_earnings: number;
  pending_payments: number;
  paid_this_month: number;
  total_transactions: number;
  average_payment: number;
  growth_rate: number;
  next_payout_date: string | null;
  next_payout_amount: number;
}

export interface PaymentStatusEntry {
  status: 'paid' | 'pending' | 'failed';
  amount: number;
  count: number;
  percentage: number;
  description: string;
}

export interface RecentPaymentEntry {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  source: string;
  period: string;
  tracks: number;
  description: string;
  payment_method: string;
  reference: string;
}

export interface MonthlyTrendEntry {
  month: string;
  amount: number;
  status: 'paid' | 'pending';
}

export interface TopEarningTrackEntry {
  title: string;
  earnings: number;
  plays: number;
  trend: number;
}

export interface PaymentMethodEntry {
  method: string;
  count: number;
  total_amount: number;
  percentage: number;
}

export interface PaymentsData {
  time_range: string;
  overview: PaymentsOverview;
  payment_status: PaymentStatusEntry[];
  recent_payments: RecentPaymentEntry[];
  monthly_trends: MonthlyTrendEntry[];
  top_earning_tracks: TopEarningTrackEntry[];
  payment_methods: PaymentMethodEntry[];
}

export interface PaymentsParams {
  artist_id: string;
  time_range?: '7days' | '30days' | '3months' | '12months';
  status_filter?: 'all' | 'paid' | 'pending' | 'failed';
}

// ===== API FUNCTIONS =====

/**
 * Fetch comprehensive payments data for an artist
 * Now uses the real royalties endpoint instead of mock data
 */
export const fetchArtistPayments = async (params: PaymentsParams): Promise<PaymentsData> => {
  try {
    const { data } = await authApi.get<ApiEnvelope<PaymentsData>>(
      '/api/artists/royalties/',
      { 
        params: {
          time_range: params.time_range || '12months'
        }
      }
    );
    
    // Return the data from the envelope
    if (data && data.data) {
      return data.data;
    }
    
    // Fallback to empty data if response is malformed
    return {
      time_range: params.time_range || '12months',
      overview: {
        total_earnings: 0,
        pending_payments: 0,
        paid_this_month: 0,
        total_transactions: 0,
        average_payment: 0,
        growth_rate: 0,
        next_payout_date: null,
        next_payout_amount: 0
      },
      payment_status: [],
      recent_payments: [],
      monthly_trends: [],
      top_earning_tracks: [],
      payment_methods: []
    };
  } catch (error) {
    console.error('Error fetching artist royalties:', error);
    throw error;
  }
};

/**
 * Request a payout/withdrawal for an artist
 */
export interface WithdrawalRequest {
  amount: number;
  currency?: string;
  notes?: string;
}

export interface WithdrawalResponse {
  id: number;
  withdrawal_id: string;
  requester: number;
  requester_email: string;
  requester_type: string;
  amount: number;
  currency: string;
  artist: number | null;
  artist_name: string | null;
  publisher: number | null;
  publisher_name: string | null;
  status: string;
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
  publishing_authority_check?: {
    is_valid: boolean;
    message: string;
  };
}

export const requestPayout = async (request: WithdrawalRequest): Promise<WithdrawalResponse> => {
  try {
    // Backend expects direct fields, not wrapped in 'data'
    const response = await authApi.post<WithdrawalResponse>(
      '/api/royalties/withdrawal-request/',
      {
        amount: request.amount,
        currency: request.currency || 'GHS',
        admin_notes: request.notes || ''
      }
    );
    
    // Backend returns data directly, not in an envelope
    return response.data;
  } catch (error) {
    console.error('Error requesting payout:', error);
    throw error;
  }
};

/**
 * Get withdrawal history for the current user
 */
export interface WithdrawalHistoryParams {
  status?: 'pending' | 'approved' | 'rejected' | 'processed' | 'cancelled';
  limit?: number;
}

export const getWithdrawalHistory = async (params?: WithdrawalHistoryParams): Promise<WithdrawalResponse[]> => {
  try {
    const response = await authApi.get<{ withdrawals: WithdrawalResponse[]; count: number }>(
      '/api/royalties/withdrawals/',
      { params }
    );
    
    return response.data.withdrawals || [];
  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    throw error;
  }
};

/**
 * Get a specific withdrawal request
 */
export const getWithdrawalDetails = async (withdrawalId: string): Promise<WithdrawalResponse> => {
  try {
    const response = await authApi.get<WithdrawalResponse>(
      `/api/royalties/withdrawals/${withdrawalId}/`
    );
    
    return response.data;
  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    throw error;
  }
};
