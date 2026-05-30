import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Clock,
  Download,
  Eye,
  Filter,
  Flag,
  Loader2,
  Music,
  RadioTower,
  Search,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import {
  fetchStationLogs,
  flagStationPlayLog,
  type StationLogPagination,
  type StationLogsPayload,
  type StationMatchLogRecord,
  type StationPlayLogRecord,
} from '../lib/api';

const ITEMS_PER_PAGE = 10;

type TabKey = 'playlogs' | 'matchlogs';

type SortState = { sortBy: string; sortOrder: 'asc' | 'desc' };

interface FlagPlayLogModalProps {
  isOpen: boolean;
  log: StationPlayLogRecord | null;
  comment: string;
  onCommentChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  error: string | null;
}

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

const getPlayStatusClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'disputed':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'flagged':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'resolved':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'pending':
    default:
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
  }
};

const getMatchStatusClasses = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case 'verified':
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

const PlayLogs: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState<TabKey>('playlogs');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [playSort, setPlaySort] = useState<SortState>({ sortBy: 'matched_at', sortOrder: 'desc' });
  const [matchSort, setMatchSort] = useState<SortState>({ sortBy: 'matched_at', sortOrder: 'desc' });
  const [playPage, setPlayPage] = useState(1);
  const [matchPage, setMatchPage] = useState(1);
  const [playLogs, setPlayLogs] = useState<StationPlayLogRecord[]>([]);
  const [matchLogs, setMatchLogs] = useState<StationMatchLogRecord[]>([]);
  const [playPagination, setPlayPagination] = useState<StationLogPagination>(() => buildEmptyPagination());
  const [matchPagination, setMatchPagination] = useState<StationLogPagination>(() => buildEmptyPagination());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [flaggingLogs, setFlaggingLogs] = useState<Record<string, boolean>>({});
  const [flagModalLog, setFlagModalLog] = useState<StationPlayLogRecord | null>(null);
  const [flagModalComment, setFlagModalComment] = useState('');
  const [flagModalError, setFlagModalError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPlayPage(1);
    setMatchPage(1);
  }, [debouncedSearch]);

  const loadLogs = useCallback(async () => {
    if (!stationId) {
      setPlayLogs([]);
      setMatchLogs([]);
      setPlayPagination(buildEmptyPagination());
      setMatchPagination(buildEmptyPagination());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const envelope = await fetchStationLogs({
        stationId,
        search: debouncedSearch || undefined,
        playPage,
        matchPage,
        playPageSize: ITEMS_PER_PAGE,
        matchPageSize: ITEMS_PER_PAGE,
        playSortBy: playSort.sortBy,
        playSortOrder: playSort.sortOrder,
        matchSortBy: matchSort.sortBy,
        matchSortOrder: matchSort.sortOrder,
      });

      const payload = (envelope?.data ?? null) as StationLogsPayload | null;

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
    stationId,
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

  const openFlagModal = useCallback((log: StationPlayLogRecord) => {
    if (!log || log.id === null || log.id === undefined) {
      return;
    }

    setFlagModalLog(log);
    setFlagModalComment('');
    setFlagModalError(null);
    setActionMessage(null);
    setActionError(null);
  }, []);

  const closeFlagModal = useCallback(() => {
    setFlagModalLog(null);
    setFlagModalComment('');
    setFlagModalError(null);
  }, []);

  const confirmFlagLog = useCallback(async () => {
    if (!flagModalLog || flagModalLog.id === null || flagModalLog.id === undefined) {
      return;
    }

    const trimmedComment = flagModalComment.trim();
    if (!trimmedComment) {
      setFlagModalError('A comment is required to flag this play log for dispute.');
      return;
    }

    const logKey = String(flagModalLog.id);

    setFlaggingLogs((previous) => ({ ...previous, [logKey]: true }));
    setFlagModalError(null);
    setActionMessage(null);
    setActionError(null);

    try {
      await flagStationPlayLog({ playlogId: flagModalLog.id, comment: trimmedComment });
      setActionMessage('Play log flagged for dispute. Our team will review it shortly.');
      await loadLogs();
      closeFlagModal();
    } catch (flagError) {
      const resolved = resolveLogsError(flagError);
      setActionError(resolved);
      setFlagModalError(resolved);
    } finally {
      setFlaggingLogs((previous) => {
        const next = { ...previous };
        delete next[logKey];
        return next;
      });
    }
  }, [flagModalLog, flagModalComment, closeFlagModal, loadLogs]);

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
      return [];
    }

    const visibleCount = Math.min(5, totalPages);
    const start = Math.max(1, Math.min(totalPages - visibleCount + 1, currentPage - Math.floor(visibleCount / 2)));
    return Array.from({ length: visibleCount }, (_, index) => start + index).filter((page) => page >= 1 && page <= totalPages);
  }, [totalPages, currentPage]);

  const handleSort = (column: string) => {
    if (activeTab === 'playlogs') {
      if (playSort.sortBy === column) {
        setPlaySort((prev) => ({ sortBy: prev.sortBy, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }));
      } else {
        setPlaySort({ sortBy: column, sortOrder: 'asc' });
      }
      setPlayPage(1);
    } else {
      if (matchSort.sortBy === column) {
        setMatchSort((prev) => ({ sortBy: prev.sortBy, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }));
      } else {
        setMatchSort({ sortBy: column, sortOrder: 'asc' });
      }
      setMatchPage(1);
    }
  };

  const getSortIcon = (column: string) => {
    if (activeSort.sortBy !== column) {
      return <ArrowUpDown className="w-3 h-3" />;
    }
    return activeSort.sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const handlePreviousPage = () => {
    if (activeTab === 'playlogs') {
      setPlayPage((prev) => Math.max(prev - 1, 1));
    } else {
      setMatchPage((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleNextPage = () => {
    if (activeTab === 'playlogs') {
      setPlayPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)));
    } else {
      setMatchPage((prev) => Math.min(prev + 1, Math.max(totalPages, 1)));
    }
  };

  const handleGoToPage = (page: number) => {
    if (activeTab === 'playlogs') {
      setPlayPage(page);
    } else {
      setMatchPage(page);
    }
  };

  const TabButton = ({
    id,
    label,
    icon: Icon,
    isActive,
    onClick,
  }: {
    id: TabKey;
    label: string;
    icon: React.ElementType;
    isActive: boolean;
    onClick: (id: TabKey) => void;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
          : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/40'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Play & Match Logs</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Track your music performance and detection across all platforms
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  placeholder="Search logs"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="pl-9 pr-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
                <button
                  type="button"
                  className="inline-flex items-center space-x-2 px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                <select className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">All Time</option>
                  <option value="monthly">This Month</option>
                  <option value="weekly">This Week</option>
                </select>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 px-4 py-3 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm">
              {error}
            </div>
          )}
          {!error && actionError && (
            <div className="mt-4 px-4 py-3 rounded-md bg-red-50 text-red-600 border border-red-100 text-sm">
              {actionError}
            </div>
          )}
          {actionMessage && (
            <div className="mt-4 px-4 py-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm">
              {actionMessage}
            </div>
          )}
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
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
                onChange={(event) => handleSort(event.target.value)}
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
                            <RadioTower className="w-3 h-3 sm:w-4 sm:h-4" />
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
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                          Actions
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
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={activeTab === 'playlogs' ? 7 : 5}
                        className="px-3 sm:px-6 py-10 text-center text-gray-500 dark:text-gray-400"
                      >
                        Loading logs...
                      </td>
                    </tr>
                  )}
                  {!isLoading && activeData.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                      {activeTab === 'playlogs' ? (
                        <>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {(log as StationPlayLogRecord).track_title}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                by {(log as StationPlayLogRecord).artist || 'Unknown Artist'}
                              </span>
                              {(log as StationPlayLogRecord).attribution_source === 'Partner' && (
                                <span className="inline-flex items-center mt-1 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  Partner: {(log as StationPlayLogRecord).partner_name || 'Partner Network'}
                                </span>
                              )}
                              <div className="sm:hidden mt-3">
                                {(() => {
                                  const playLog = log as StationPlayLogRecord;
                                  const normalizedStatus = (playLog.status || '').toLowerCase();
                                  const isFlagging = Boolean(flaggingLogs[String(playLog.id ?? '')]);
                                  const isAlreadyFlagged = normalizedStatus === 'flagged';

                                  return (
                                    <button
                                      type="button"
                                      onClick={() => openFlagModal(playLog)}
                                      disabled={isFlagging || isAlreadyFlagged}
                                      className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                    >
                                      {isFlagging ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Flag className="w-4 h-4" />
                                      )}
                                      <span>{isAlreadyFlagged ? 'Flagged' : 'Flag'}</span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                            {(log as StationPlayLogRecord).station_name || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="sm:hidden">{formatDateTime((log as StationPlayLogRecord).matched_at)}</span>
                              <span className="hidden sm:inline">{formatDateTime((log as StationPlayLogRecord).matched_at)}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500">Stop: {formatDateTime((log as StationPlayLogRecord).stop_time)}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white text-xs sm:text-sm hidden sm:table-cell">
                            {(log as StationPlayLogRecord).duration || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold">
                            {formatCurrency((log as StationPlayLogRecord).royalty_amount || 0)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getPlayStatusClasses((log as StationPlayLogRecord).status)}`}>
                              {(log as StationPlayLogRecord).status || 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 hidden sm:table-cell">
                            {(() => {
                              const playLog = log as StationPlayLogRecord;
                              const normalizedStatus = (playLog.status || '').toLowerCase();
                              const isFlagging = Boolean(flaggingLogs[String(playLog.id ?? '')]);
                              const isAlreadyFlagged = normalizedStatus === 'flagged';

                              return (
                                <button
                                  type="button"
                                onClick={() => openFlagModal(playLog)}
                                  disabled={isFlagging || isAlreadyFlagged}
                                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                >
                                  {isFlagging ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Flag className="w-4 h-4" />
                                  )}
                                  <span>{isAlreadyFlagged ? 'Flagged' : 'Flag'}</span>
                                </button>
                              );
                            })()}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex flex-col">
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
                                {(log as StationMatchLogRecord).track_title}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-xs truncate">
                                {(log as StationMatchLogRecord).artist || 'Unknown Artist'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white text-xs sm:text-sm font-medium hidden sm:table-cell">
                            {(log as StationMatchLogRecord).station_name || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                            <div className="flex flex-col">
                              <span className="sm:hidden">{formatDateTime((log as StationMatchLogRecord).matched_at)}</span>
                              <span className="hidden sm:inline">{formatDateTime((log as StationMatchLogRecord).matched_at)}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex items-center space-x-1 sm:space-x-2">
                              <div className="w-8 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(0, Math.min(100, (log as StationMatchLogRecord).confidence ?? 0))}%` }}
                                />
                              </div>
                              <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">
                                {(log as StationMatchLogRecord).confidence != null
                                  ? `${Math.round((log as StationMatchLogRecord).confidence ?? 0)}%`
                                  : '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${getMatchStatusClasses((log as StationMatchLogRecord).status)}`}>
                              {(log as StationMatchLogRecord).status || 'Pending'}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {!isLoading && activeData.length === 0 && (
                    <tr>
                      <td
                        colSpan={activeTab === 'playlogs' ? 7 : 5}
                        className="px-3 sm:px-6 py-8 sm:py-16 text-center text-gray-500 dark:text-gray-400"
                      >
                        No logs found matching your search criteria.
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
                Showing <span className="text-blue-600 dark:text-blue-400 font-semibold">{startEntry}</span> to{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{endEntry}</span> of{' '}
                <span className="text-blue-600 dark:text-blue-400 font-semibold">{totalEntries}</span> entries
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1">
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => handleGoToPage(pageNumber)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm ${
                        currentPage === pageNumber
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                          : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleNextPage}
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

          {totalPages === 1 && totalEntries > 0 && (
            <div className="flex justify-center mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing all {totalEntries} entries
              </div>
            </div>
          )}
        </div>
      </div>

      <FlagPlayLogModal
        isOpen={Boolean(flagModalLog)}
        log={flagModalLog}
        comment={flagModalComment}
        onCommentChange={setFlagModalComment}
        onConfirm={confirmFlagLog}
        onCancel={closeFlagModal}
        isSubmitting={flagModalLog ? Boolean(flaggingLogs[String(flagModalLog.id ?? '')]) : false}
        error={flagModalError}
      />
    </>
  );
};

const FlagPlayLogModal: React.FC<FlagPlayLogModalProps> = ({
  isOpen,
  log,
  comment,
  onCommentChange,
  onConfirm,
  onCancel,
  isSubmitting,
  error,
}) => {
  if (!isOpen || !log) {
    return null;
  }

  const trackTitle = log.track_title || 'Unknown track';
  const artistName = log.artist || 'Unknown artist';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4 py-6">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 dark:ring-white/10">
        <div className="border-b border-slate-200/70 bg-slate-50 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Flag play log for dispute</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Provide a brief reason so our review team understands the issue.
          </p>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800/70">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{trackTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{artistName}</p>
            {log.matched_at && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Matched at {formatDateTime(log.matched_at)}</p>
            )}
          </div>

          <div>
            <label htmlFor="flag-comment" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Comment <span className="text-rose-500">*</span>
            </label>
            {error && (
              <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-300">
                {error}
              </div>
            )}
            <textarea
              id="flag-comment"
              className="h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="Share why this play log should be reviewed..."
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              disabled={isSubmitting}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Comments help us validate disputes faster. Include any context the reviewers should know.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-200/70 bg-slate-50 px-6 py-4 dark:border-slate-700/60 dark:bg-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-offset-slate-900"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Flagging...
              </>
            ) : (
              'Submit flag'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayLogs;
