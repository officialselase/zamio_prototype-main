/**
 * Withdrawal management API for admin
 */
import authApi from './api';

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

export interface PlatformBalance {
  account_id: string;
  balance: string;
  currency: string;
  total_received: string;
  total_paid_out: string;
  updated_at: string;
}

export interface StationBalance {
  station_id: number;
  station_name: string;
  account_id: string;
  balance: string;
  currency: string;
  total_spent: string;
  total_plays: number;
  allow_negative_balance: boolean;
  credit_limit: string;
  updated_at: string;
}

/**
 * Get pending withdrawal requests
 */
export const getPendingWithdrawals = async (): Promise<WithdrawalRequest[]> => {
  try {
    const { data } = await authApi.get<{ withdrawals: WithdrawalRequest[]; count: number }>(
      '/api/royalties/withdrawals/',
      { params: { status: 'pending' } }
    );
    return data.withdrawals || [];
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    throw error;
  }
};

/**
 * Get all withdrawal requests with optional filters
 */
export const getAllWithdrawals = async (params?: {
  status?: string;
  requester_type?: string;
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
 * Get withdrawal details
 */
export const getWithdrawalDetails = async (withdrawalId: string): Promise<WithdrawalRequest> => {
  try {
    const { data } = await authApi.get<WithdrawalRequest>(
      `/api/royalties/withdrawals/${withdrawalId}/`
    );
    return data;
  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    throw error;
  }
};

/**
 * Approve withdrawal and process payment
 */
export const approveWithdrawal = async (withdrawalId: string): Promise<WithdrawalRequest> => {
  try {
    const { data } = await authApi.post<{ success: boolean; message: string; withdrawal: WithdrawalRequest }>(
      `/api/royalties/withdrawals/${withdrawalId}/approve-payment/`
    );
    return data.withdrawal;
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    throw error;
  }
};

/**
 * Reject withdrawal with reason
 */
export const rejectWithdrawal = async (
  withdrawalId: string,
  rejectionReason: string
): Promise<WithdrawalRequest> => {
  try {
    const { data } = await authApi.post<{ success: boolean; message: string; withdrawal: WithdrawalRequest }>(
      `/api/royalties/withdrawals/${withdrawalId}/reject-payment/`,
      { rejection_reason: rejectionReason }
    );
    return data.withdrawal;
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    throw error;
  }
};

/**
 * Get platform central pool balance
 */
export const getPlatformBalance = async (): Promise<PlatformBalance> => {
  try {
    const { data } = await authApi.get<PlatformBalance>(
      '/api/royalties/platform/balance/'
    );
    return data;
  } catch (error) {
    console.error('Error fetching platform balance:', error);
    throw error;
  }
};

/**
 * Get station balance
 */
export const getStationBalance = async (stationId: number): Promise<StationBalance> => {
  try {
    const { data } = await authApi.get<StationBalance>(
      `/api/royalties/stations/${stationId}/balance/`
    );
    return data;
  } catch (error) {
    console.error('Error fetching station balance:', error);
    throw error;
  }
};

/**
 * Add funds to station account
 */
export const addStationFunds = async (
  stationId: number,
  amount: number,
  description?: string
): Promise<{ success: boolean; message: string; new_balance: string }> => {
  try {
    const { data } = await authApi.post(
      `/api/royalties/stations/${stationId}/add-funds/`,
      { amount, description }
    );
    return data;
  } catch (error) {
    console.error('Error adding station funds:', error);
    throw error;
  }
};
