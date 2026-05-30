import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@zamio/ui';
import { Activity, AlertTriangle, CheckCircle, Clock, Search, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../lib/auth';
import {
  fetchStationDisputes,
  type StationDisputeRecord,
  type StationDisputeSummary,
  type StationDisputesPayload,
  type StationLogPagination,
} from '../../lib/api';

const ITEMS_PER_PAGE = 10;

const buildEmptyPagination = (pageSize = ITEMS_PER_PAGE): StationLogPagination => ({
  count: 0,
  page_number: 1,
  page_size: pageSize,
  total_pages: 0,
  next: null,
  previous: null,
  has_next: false,
  has_previous: false,
});

const resolveDisputeError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load disputes. Please try again later.';
  }

  if (typeof maybeError === 'object' && maybeError !== null) {
    const response = (maybeError as { response?: unknown }).response;
    if (response && typeof response === 'object') {
      const data = (response as { data?: unknown }).data;
      if (data && typeof data === 'object') {
        const message = (data as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim().length > 0) {
          return message;
        }

        const errors = (data as { errors?: unknown }).errors;
        if (errors && typeof errors === 'object') {
          const entries = Object.entries(errors as Record<string, unknown>);
          const firstEntry = entries[0];
          if (firstEntry) {
            const [, errorValue] = firstEntry;
            if (typeof errorValue === 'string' && errorValue.length > 0) {
              return errorValue;
            }
            if (Array.isArray(errorValue) && errorValue.length > 0) {
              const candidate = errorValue[0];
              if (typeof candidate === 'string' && candidate.length > 0) {
                return candidate;
              }
            }
          }
        }
      }
    }

    const message = (maybeError as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return 'Unable to load disputes. Please try again later.';
};

const normalizeStatusKey = (status: string | null | undefined) =>
  (status || 'pending').toLowerCase();

const AllDisputeMatches: React.FC = () => {
  const { user } = useAuth();
  const stationId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['station_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('monthly');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [disputes, setDisputes] = useState<StationDisputeRecord[]>([]);
  const [summary, setSummary] = useState<StationDisputeSummary | null>(null);
  const [pagination, setPagination] = useState<StationLogPagination>(() => buildEmptyPagination());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedPeriod]);

  const loadDisputes = useCallback(async () => {
    if (!stationId) {
      setDisputes([]);
      setSummary(null);
      setPagination(buildEmptyPagination());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchStationDisputes({
        stationId,
        search: debouncedSearch || undefined,
        period: selectedPeriod,
        page,
        pageSize: ITEMS_PER_PAGE,
        sortBy: 'recent',
        sortOrder: 'desc',
      });

      const payload = (envelope?.data ?? null) as StationDisputesPayload | null;

      setDisputes(payload?.disputes?.results ?? []);
      setPagination(payload?.disputes?.pagination ?? buildEmptyPagination());
      setSummary(payload?.summary ?? null);
    } catch (fetchError) {
      setError(resolveDisputeError(fetchError));
      setDisputes([]);
      setPagination(buildEmptyPagination());
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [stationId, debouncedSearch, selectedPeriod, page]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const totalDisputes = summary?.total ?? pagination.count ?? disputes.length;
  const resolvedDisputes = summary?.resolved ?? disputes.filter((item) => normalizeStatusKey(item.status) === 'resolved').length;
  const pendingReviewDisputes =
    summary?.pending_review ??
    disputes.filter((item) => {
      const key = normalizeStatusKey(item.status);
      return key === 'pending' || key === 'flagged';
    }).length;

  const fallbackAverageConfidence = useMemo(() => {
    if (!disputes.length) {
      return 0;
    }
    const total = disputes.reduce((acc, item) => acc + (item.confidence ?? 0), 0);
    return total / disputes.length;
  }, [disputes]);

  const averageConfidence = summary?.average_confidence ?? fallbackAverageConfidence ?? 0;

  const statusColors = {
    excellent: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    good: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    average: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      accent: 'text-amber-600 dark:text-amber-400',
    },
    poor: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      accent: 'text-red-600 dark:text-red-400',
    },
  } as const;

  const getStatusColor = (status: string | null | undefined) => {
    switch (normalizeStatusKey(status)) {
      case 'resolved':
        return statusColors.excellent;
      case 'flagged':
        return statusColors.poor;
      case 'pending':
        return statusColors.average;
      case 'dispute':
        return statusColors.poor;
      default:
        return statusColors.average;
    }
  };

  const getStatusIcon = (status: string | null | undefined) => {
    switch (normalizeStatusKey(status)) {
      case 'resolved':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'flagged':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'dispute':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const displayedDisputes = disputes;
  const showingCount = pagination.count ?? displayedDisputes.length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Match Disputes</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Manage and resolve music identification disputes, review contested matches, and maintain accurate reporting.
          </p>
          {error && (
            <div className="mt-4 px-4 py-3 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm max-w-xl">
              {error}
            </div>
          )}
          {isLoading && !error && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading disputes…</div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all duration-200"
            />
          </div>
          <select
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value as typeof selectedPeriod)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-blue-400 transition-all duration-200"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-red-50/90 via-orange-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-red-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-red-300 dark:hover:border-red-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Disputes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-300">
                {totalDisputes}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Resolved</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                {resolvedDisputes}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Pending Review</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                {pendingReviewDisputes}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Avg. Confidence</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                {Math.round(averageConfidence)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            All Match Disputes
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {showingCount} disputes</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Track Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confidence & Earnings
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
              {displayedDisputes.map((dispute) => {
                const statusColor = getStatusColor(dispute.status);
                const confidenceValue = dispute.confidence ?? 0;
                const earningsValue = Number.isFinite(dispute.earnings) ? dispute.earnings : 0;

                return (
                  <tr key={dispute.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-lg object-cover"
                            src={dispute.cover_art || ''}
                            alt={dispute.track_title ?? 'Track cover'}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dispute.track_title ?? 'Unknown Track'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {dispute.artist_name ?? 'Unknown Artist'}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {dispute.start_time ? dispute.start_time.replace(' ~ ', ' ') : '—'} • {dispute.duration ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {Math.round(confidenceValue)}% confidence
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        ₵{earningsValue.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(dispute.status)}
                        <span
                          className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.border} ${statusColor.text}`}
                        >
                          {dispute.status || 'Pending'}
                        </span>
                      </div>
                      {dispute.comment && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{dispute.comment}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link to="/dashboard/match-dispute-details" state={{ dispute_id: dispute.id }}>
                        <button
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md transition-all duration-200 hover:scale-105 ${
                            normalizeStatusKey(dispute.status) === 'resolved'
                              ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50'
                              : 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/30 dark:hover:bg-red-900/50'
                          }`}
                        >
                          {normalizeStatusKey(dispute.status) === 'resolved' ? 'View Details' : 'Review Dispute'}
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!displayedDisputes.length && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No disputes found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AllDisputeMatches;

