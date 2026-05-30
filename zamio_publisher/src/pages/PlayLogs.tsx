import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Clock,
  Eye,
  Loader2,
  Music,
  Search,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchPublisherLogs,
  type PublisherLogsPayload,
  type PublisherLogPagination,
  type PublisherMatchLogRecord,
  type PublisherPlayLogRecord,
} from '../lib/api';

const ITEMS_PER_PAGE = 10;

type TabKey = 'playlogs' | 'matchlogs';

type SortState = {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

const buildEmptyPagination = (pageSize = ITEMS_PER_PAGE): PublisherLogPagination => ({
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
  }).format(Number.isFinite(value) ? value : 0);

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

const formatDateTime = (value: string | null) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const getPlayStatusClasses = (status: string | null | undefined) => {
  switch ((status || '').toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  }
};

const getMatchStatusClasses = (status: string | null | undefined) => {
  switch ((status || '').toLowerCase()) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
    default:
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  }
};

const PublisherPlayLogs: React.FC = () => {
  const { user } = useAuth();

  const publisherId = useMemo(() => {
    if (user && typeof user === 'object' && user !== null) {
      const candidate = (user as Record<string, unknown>)['publisher_id'];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
    return null;
  }, [user]);

  const [activeTab, setActiveTab] = useState<TabKey>('playlogs');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [playSort, setPlaySort] = useState<SortState>({ sortBy: 'matched_at', sortOrder: 'desc' });
  const [matchSort, setMatchSort] = useState<SortState>({ sortBy: 'matched_at', sortOrder: 'desc' });
  const [playPage, setPlayPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);
  const [playLogs, setPlayLogs] = useState<PublisherPlayLogRecord[]>([]);
  const [matchLogs, setMatchLogs] = useState<PublisherMatchLogRecord[]>([]);
  const [playPagination, setPlayPagination] = useState<PublisherLogPagination>(() => buildEmptyPagination());
  const [matchPagination, setMatchPagination] = useState<PublisherLogPagination>(() => buildEmptyPagination());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPlayPage(1);
    setMatchPage(1);
  }, [debouncedSearch]);

  const loadLogs = useCallback(async () => {
    if (!publisherId) {
      setError('Your publisher ID is missing. Please sign out and sign in again.');
      setPlayLogs([]);
      setMatchLogs([]);
      setPlayPagination(buildEmptyPagination());
      setMatchPagination(buildEmptyPagination());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchPublisherLogs({
        publisherId,
        search: debouncedSearch || undefined,
        playPage,
        matchPage,
        playPageSize: ITEMS_PER_PAGE,
        matchPageSize: ITEMS_PER_PAGE,
        playSortBy: playSort.sortBy,
        playSortOrder: playSort.sortOrder,
        matchSortBy: matchSort.sortBy,
        matchSortOrder: matchSort.sortOrder,
        logPageState: 'all',
      });

      const payload = (envelope?.data ?? null) as PublisherLogsPayload | null;

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
  }, [
    publisherId,
    debouncedSearch,
    playPage,
    matchPage,
    playSort.sortBy,
    playSort.sortOrder,
    matchSort.sortBy,
    matchSort.sortOrder,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSort = (column: string) => {
    if (activeTab === 'playlogs') {
      setPlaySort(current =>
        current.sortBy === column
          ? { sortBy: column, sortOrder: current.sortOrder === 'asc' ? 'desc' : 'asc' }
          : { sortBy: column, sortOrder: 'asc' },
      );
      setPlayPage(1);
    } else {
      setMatchSort(current =>
        current.sortBy === column
          ? { sortBy: column, sortOrder: current.sortOrder === 'asc' ? 'desc' : 'asc' }
          : { sortBy: column, sortOrder: 'asc' },
      );
      setMatchPage(1);
    }
  };

  const getSortIcon = (column: string) => {
    const { sortBy, sortOrder } = activeTab === 'playlogs' ? playSort : matchSort;
    if (sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const currentPagination = activeTab === 'playlogs' ? playPagination : matchPagination;
  const displayedLogs = activeTab === 'playlogs' ? playLogs : matchLogs;
  const currentPage = currentPagination.page_number || 1;
  const totalPages = currentPagination.total_pages || 0;
  const pageSize = currentPagination.page_size || ITEMS_PER_PAGE;
  const totalEntries = currentPagination.count || 0;
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = totalEntries === 0 ? 0 : Math.min(currentPage * pageSize, totalEntries);

  const handlePageChange = (page: number) => {
    if (activeTab === 'playlogs') {
      setPlayPage(page);
    } else {
      setMatchPage(page);
    }
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }: {
    id: TabKey;
    label: string;
    icon: typeof Activity;
    isActive: boolean;
    onClick: (id: TabKey) => void;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  const pageButtons = useMemo(() => {
    if (totalPages <= 1) {
      return [1];
    }

    const maxButtons = 5;
    const halfWindow = Math.floor(maxButtons / 2);
    let start = Math.max(1, currentPage - halfWindow);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <>
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Catalog Performance Logs</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Track your music catalog performance and revenue across all licensed stations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search logs..."
                  className="pl-9 pr-3 py-2 w-48 md:w-64 text-sm rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="all">All Territories</option>
                <option value="ghana">Ghana</option>
                <option value="west-africa">West Africa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            <TabButton id="playlogs" label="Play Logs" icon={Activity} isActive={activeTab === 'playlogs'} onClick={setActiveTab} />
            <TabButton id="matchlogs" label="Match Logs" icon={Eye} isActive={activeTab === 'matchlogs'} onClick={setActiveTab} />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center space-x-3">
              {activeTab === 'playlogs' ? (
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Eye className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              )}
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {activeTab === 'playlogs' ? 'Publisher Play Logs' : 'Publisher Match Logs'}
              </h2>
              {isLoading && <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />}
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{totalEntries} total entries</span>
              <select
                value={activeTab === 'playlogs' ? playSort.sortBy : matchSort.sortBy}
                onChange={(event) => handleSort(event.target.value)}
                className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-1 rounded border border-gray-200 dark:border-slate-600"
              >
                <option value="matched_at">Date</option>
                {activeTab === 'playlogs' ? (
                  <>
                    <option value="track_title">Song Title</option>
                    <option value="station_name">Station</option>
                    <option value="royalty_amount">Revenue</option>
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

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

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
                            <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
                          License
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Revenue</span>
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
                          License Status
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
                  {displayedLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                      {activeTab === 'playlogs' ? (
                        <>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {(log as PublisherPlayLogRecord).track_title}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">by {(log as PublisherPlayLogRecord).artist ?? '—'}</span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {(log as PublisherPlayLogRecord).publisher_catalog_id ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium">
                                {(log as PublisherPlayLogRecord).station_name ?? '—'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {(log as PublisherPlayLogRecord).station_region ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                            {formatDateTime((log as PublisherPlayLogRecord).matched_at)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell">
                            <span
                              className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                (log as PublisherPlayLogRecord).license_type === 'Performance'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : (log as PublisherPlayLogRecord).license_type === 'Mechanical'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}
                            >
                              {(log as PublisherPlayLogRecord).license_type ?? 'Performance'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm">
                              {formatCurrency((log as PublisherPlayLogRecord).royalty_amount ?? 0)}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getPlayStatusClasses((log as PublisherPlayLogRecord).status)}`}>
                              {(log as PublisherPlayLogRecord).status ?? 'Pending'}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {(log as PublisherMatchLogRecord).song}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">by {(log as PublisherMatchLogRecord).artist ?? '—'}</span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {(log as PublisherMatchLogRecord).publisher_catalog_id ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white text-xs sm:text-sm font-medium">
                                {(log as PublisherMatchLogRecord).station ?? '—'}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {(log as PublisherMatchLogRecord).station_region ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                            {(log as PublisherMatchLogRecord).license_status ?? 'Pending'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="w-8 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(0, Math.min(100, (log as PublisherMatchLogRecord).confidence ?? 0))}%` }}
                                />
                              </div>
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">
                                {Math.round((log as PublisherMatchLogRecord).confidence ?? 0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getMatchStatusClasses((log as PublisherMatchLogRecord).status)}`}>
                              {(log as PublisherMatchLogRecord).status ?? 'Pending'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {displayedLogs.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={activeTab === 'playlogs' ? 6 : 5}
                        className="px-3 sm:px-6 py-8 sm:py-16 text-center text-gray-500 dark:text-gray-400"
                      >
                        No logs found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/30 -mx-8 px-8 py-4 rounded-b-2xl">
              <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                Showing{' '}
                <span className="text-green-600 dark:text-green-400 font-semibold">{startIndex}</span>
                {' '}to{' '}
                <span className="text-green-600 dark:text-green-400 font-semibold">{endIndex}</span>
                {' '}of{' '}
                <span className="text-green-600 dark:text-green-400 font-semibold">{totalEntries}</span> entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1">
                  {pageButtons.map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md transform scale-105'
                          : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:shadow-md'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
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

export default PublisherPlayLogs;
