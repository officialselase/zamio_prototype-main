/**
 * Station account management API
 */
import { authApi } from './api';

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

export interface Transaction {
  transaction_id: string;
  transaction_type: 'deposit' | 'play_charge' | 'refund' | 'adjustment';
  amount: string;
  description: string;
  timestamp: string;
  play_log?: number;
}

export interface DepositRequest {
  amount: number;
  payment_method: 'mtn_momo' | 'bank_transfer' | 'card' | 'cash';
  reference?: string;
  notes?: string;
}

export interface DepositResponse {
  success: boolean;
  message: string;
  transaction_id: string;
  new_balance: string;
}

/**
 * Get station account balance
 */
export const getStationBalance = async (stationId: string | number): Promise<StationBalance> => {
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
 * Get station transaction history
 * Note: This endpoint needs to be implemented in the backend
 * For now, we'll extract transactions from the balance endpoint
 */
export const getStationTransactions = async (params?: {
  station_id?: string | number;
  transaction_type?: string;
  limit?: number;
}): Promise<Transaction[]> => {
  try {
    // TODO: Backend needs to implement /api/royalties/stations/transactions/ endpoint
    // For now, return empty array as transactions are not yet available via API
    console.warn('Station transactions endpoint not yet implemented');
    return [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Request deposit to station account
 * This creates a deposit request that needs admin approval or payment verification
 */
export const requestDeposit = async (
  stationId: string | number,
  request: DepositRequest
): Promise<DepositResponse> => {
  try {
    const { data } = await authApi.post<DepositResponse>(
      `/api/royalties/stations/${stationId}/deposit/`,
      {
        amount: request.amount,
        payment_method: request.payment_method,
        reference: request.reference || '',
        notes: request.notes || ''
      }
    );
    return data;
  } catch (error) {
    console.error('Error requesting deposit:', error);
    throw error;
  }
};

/**
 * Get deposit requests for station
 */
export interface DepositRequestRecord {
  id: number;
  station: number;
  station_name: string;
  amount: string;
  currency: string;
  payment_method: string;
  reference: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  processed_at: string | null;
  processed_by: number | null;
  rejection_reason: string | null;
}

export const getDepositRequests = async (params?: {
  station_id?: string | number;
  status?: string;
}): Promise<DepositRequestRecord[]> => {
  try {
    const { data } = await authApi.get<{ deposits: DepositRequestRecord[] }>(
      '/api/royalties/stations/deposit-requests/',
      { params }
    );
    return data.deposits || [];
  } catch (error) {
    console.error('Error fetching deposit requests:', error);
    throw error;
  }
};
