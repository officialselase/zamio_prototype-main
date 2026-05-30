import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Eye, Clock, Radio, Music, TrendingUp } from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  ArtistLogPagination,
  ArtistLogsPayload,
  ArtistMatchLogRecord,
  ArtistPlayLogRecord,
  fetchArtistLogs,
} from '../lib/api';

const ITEMS_PER_PAGE = 10;

const buildEmptyPagination = (pageSize = ITEMS_PER_PAGE): ArtistLogPagination => ({
  count: 0,
  page_number: 1,
  page_size: pageSize,
  total_pages: 0,
  next: null,
  previous: null,
  has_next: false,
  has_previous: false,
});

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

const parseDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(' ~ ', 'T');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDateTime = (value: string | null) => {
  const parsed = parseDate(value);
  if (!parsed) {
    return value ? value.replace(' ~ ', ' ') : '—';
  }
  return parsed.toLocaleString();
};

const resolveLogsError = (maybeError: unknown) => {
  if (!maybeError) {
    return 'Unable to load logs. Please try again later.';
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

  return 'Unable to load logs. Please try again later.';
};

type TabKey = 'playlogs' | 'matchlogs';

const getPlayStatusClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'flagged':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'pending':
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

const getMatchStatusClasses = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'review':
    case 'under review':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'pending':
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

const MatchLogsPage = () => {
  const { user } = useAuth();
  const artistId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = user['artist_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [activeTab, setActiveTab] = useState<TabKey>('playlogs');
  const [playLogs, setPlayLogs] = useState<ArtistPlayLogRecord[]>([]);
  const [matchLogs, setMatchLogs] = useState<ArtistMatchLogRecord[]>([]);
  const [playPagination, setPlayPagination] = useState<ArtistLogPagination>(() => buildEmptyPagination());
  const [matchPagination, setMatchPagination] = useState<ArtistLogPagination>(() => buildEmptyPagination());
  const [playSort, setPlaySort] = useState<{ sortBy: string; sortOrder: 'asc' | 'desc' }>({
    sortBy: 'matched_at',
    sortOrder: 'desc',
  });
  const [matchSort, setMatchSort] = useState<{ sortBy: string; sortOrder: 'asc' | 'desc' }>({
    sortBy: 'matched_at',
    sortOrder: 'desc',
  });
  const [playPage, setPlayPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    if (!artistId) {
      setPlayLogs([]);
      setMatchLogs([]);
      setPlayPagination(buildEmptyPagination());
      setMatchPagination(buildEmptyPagination());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchArtistLogs({
        artistId,
        playPage,
        matchPage,
        playPageSize: ITEMS_PER_PAGE,
        matchPageSize: ITEMS_PER_PAGE,
        playSortBy: playSort.sortBy,
        playSortOrder: playSort.sortOrder,
        matchSortBy: matchSort.sortBy,
        matchSortOrder: matchSort.sortOrder,
      });

      const payload = (envelope?.data ?? null) as ArtistLogsPayload | null;

      setPlayLogs(payload?.playLogs?.results ?? []);
      setMatchLogs(payload?.matchLogs?.results ?? []);
      setPlayPagination(payload?.playLogs?.pagination ?? buildEmptyPagination());
      setMatchPagination(payload?.matchLogs?.pagination ?? buildEmptyPagination());
    } catch (fetchError) {
      setError(resolveLogsError(fetchError));
      setPlayLogs([]);
      setMatchLogs([]);
      setPlayPagination(buildEmptyPagination());
      setMatchPagination(buildEmptyPagination());
    } finally {
      setIsLoading(false);
    }
  }, [artistId, playPage, matchPage, playSort.sortBy, playSort.sortOrder, matchSort.sortBy, matchSort.sortOrder]);

  useEffect(() => {
    if (!artistId) {
      return;
    }
    loadLogs();
  }, [artistId, loadLogs]);

  const activeData = activeTab === 'playlogs' ? playLogs : matchLogs;
  const activePagination = activeTab === 'playlogs' ? playPagination : matchPagination;
  const activeSort = activeTab === 'playlogs' ? playSort : matchSort;

  const totalEntries = activePagination?.count ?? 0;
  const totalPages = activePagination?.total_pages ?? 0;
  const currentPage = activePagination?.page_number ?? 1;
  const pageSize = activePagination?.page_size ?? ITEMS_PER_PAGE;

  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = totalEntries === 0 ? 0 : Math.min(currentPage * pageSize, totalEntries);

  const pageNumbers = useMemo(() => {
    if (!totalPages) {
      return [] as number[];
    }

    const visiblePages = Math.min(5, totalPages);
    const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - (visiblePages - 1)));
    return Array.from({ length: visiblePages }, (_, index) => startPage + index).filter(
      (page) => page <= totalPages,
    );
  }, [currentPage, totalPages]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
  };

  const handleSort = (column: string) => {
    if (activeTab === 'playlogs') {
      setPlaySort((prev) => {
        if (prev.sortBy === column) {
          return {
            sortBy: column,
            sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
          };
        }
        return {
          sortBy: column,
          sortOrder: 'asc',
        };
      });
      setPlayPage(1);
    } else {
      setMatchSort((prev) => {
        if (prev.sortBy === column) {
          return {
            sortBy: column,
            sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
          };
        }
        return {
          sortBy: column,
          sortOrder: 'asc',
        };
      });
      setMatchPage(1);
    }
  };

  const getSortIcon = (column: string) => {
    if (activeSort.sortBy !== column) {
      return '↕️';
    }
    return activeSort.sortOrder === 'asc' ? '↑' : '↓';
  };

  const changePage = (page: number) => {
    if (page < 1 || (totalPages && page > totalPages)) {
      return;
    }
    if (activeTab === 'playlogs') {
      setPlayPage(page);
    } else {
      setMatchPage(page);
    }
  };

  if (!artistId) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
            <Activity className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">We couldn't find your artist profile</h2>
          <p className="max-w-md text-sm text-gray-600 dark:text-gray-300">
            Please sign out and sign in again to refresh your account data, then return to your logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Play & Match Logs</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Track your music performance and detection across all platforms
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">All Time</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            <button
              onClick={() => handleTabChange('playlogs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === 'playlogs'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Play Logs</span>
            </button>
            <button
              onClick={() => handleTabChange('matchlogs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === 'matchlogs'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>Match Logs</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mb-6 max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/30 dark:text-red-200">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadLogs}
                className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-800/40"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {activeTab === 'playlogs' ? (
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Eye className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              )}
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'playlogs' ? 'Play Logs' : 'Match Logs'}
              </h2>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{totalEntries} total entries</span>
              <select
                value={activeSort.sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1 rounded border border-gray-200 dark:border-slate-600"
              >
                <option value="matched_at">Date</option>
                {activeTab === 'playlogs' ? (
                  <>
                    <option value="track_title">Song Title</option>
                    <option value="station_name">Station</option>
                    <option value="royalty_amount">Earnings</option>
                    <option value="plays">Plays</option>
                  </>
                ) : (
                  <>
                    <option value="song">Song</option>
                    <option value="station">Station</option>
                    <option value="confidence">Confidence</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    {activeTab === 'playlogs' ? (
                      <>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            <Music className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Song</span>
                            <span className="sm:hidden">Song</span>
                            <span className="text-xs">{getSortIcon('track_title')}</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            <Radio className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Station</span>
                            <span className="sm:hidden">Station</span>
                            <span className="text-xs">{getSortIcon('station_name')}</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Played At</span>
                            <span className="text-xs">{getSortIcon('matched_at')}</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          Duration
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Earnings</span>
                            <span className="sm:hidden">$</span>
                            <span className="text-xs">{getSortIcon('royalty_amount')}</span>
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Song
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          Station
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                          Matched At
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                  {isLoading && activeData.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTab === 'playlogs' ? 6 : 5}
                        className="px-3 sm:px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        Loading logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && activeData.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTab === 'playlogs' ? 6 : 5}
                        className="px-3 sm:px-6 py-8 sm:py-16 text-center text-gray-500 dark:text-gray-400"
                      >
                        No logs found matching your filters.
                      </td>
                    </tr>
                  )}
                  {activeTab === 'playlogs'
                    ? activeData.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {log.track_title}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                by {log.artist ?? 'Unknown Artist'}
                              </span>
                              {log.attribution_source === 'Partner' && (
                                <span className="inline-flex items-center mt-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  Partner: {log.partner_name || 'External Catalogue'}
                                </span>
                              )}
                              {typeof log.plays === 'number' && (
                                <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                                  {log.plays} total plays
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium">
                                {log.station_name}
                              </span>
                              {log.source && (
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">{log.source}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
                            <div className="flex flex-col text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <span>{formatDateTime(log.matched_at)}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell text-gray-900 dark:text-white text-xs sm:text-sm">
                            {log.duration ?? '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-semibold text-xs sm:text-sm">
                                {formatCurrency(log.royalty_amount ?? 0)}
                              </span>
                              {typeof log.confidence === 'number' && (
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Confidence {Math.round(log.confidence)}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span
                              className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getPlayStatusClasses(
                                log.status,
                              )}`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    : activeData.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {log.song}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                by {log.artist ?? 'Unknown Artist'}
                              </span>
                              {log.match_type && (
                                <span className="inline-flex items-center mt-1 px-3 py-1.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {log.match_type}
                                </span>
                              )}
                              {log.source && (
                                <span className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{log.source}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">
                            <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium">
                              {log.station}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden md:table-cell">
                            <div className="flex flex-col text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              <span>{formatDateTime(log.matched_at)}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="w-8 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(0, Math.round(log.confidence ?? 0)))}%` }}
                                ></div>
                              </div>
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">
                                {Math.round(log.confidence ?? 0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span
                              className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getMatchStatusClasses(
                                log.status,
                              )}`}
                            >
                              {log.status ?? 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/30 -mx-8 px-8 py-4 rounded-b-2xl">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Showing{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{startEntry}</span> to{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{endEntry}</span> of{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{totalEntries}</span> entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => changePage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1">
                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => changePage(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                          : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => changePage(currentPage + 1)}
                  disabled={totalPages === 0 || currentPage === totalPages}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {totalPages <= 1 && totalEntries > 0 && (
            <div className="flex justify-center mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {totalEntries} entries
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MatchLogsPage;
