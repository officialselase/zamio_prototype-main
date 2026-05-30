import React, { useState, useMemo, useEffect } from 'react';
import { Activity, Eye, Search, Clock, Radio, Music, TrendingUp, Filter, Download, Settings, MoreVertical, Trash2, Edit, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { fetchAllPlayLogs, fetchAllMatchCache, type PlayLog as ApiPlayLog, type MatchCache as ApiMatchCache } from '../lib/api';

// Type definitions for better type safety
interface PlayLogData {
  id: number;
  track_title: string;
  artist: string;
  station_name: string;
  matched_at: string;
  stop_time: string;
  duration: string;
  royalty_amount: number;
  status: 'Confirmed' | 'Pending' | 'Disputed' | 'Rejected';
  attribution_source: string;
  plays: number;
  partner_name?: string;
  isrc?: string;
  fingerprint_id?: string;
  confidence_score?: number;
}

interface MatchLogData {
  id: number;
  song: string;
  artist: string;
  station: string;
  matched_at: string;
  confidence: number;
  source: string;
  match_type: string;
  status: 'Verified' | 'Under Review' | 'Rejected' | 'Pending';
  fingerprint_id?: string;
  audio_hash?: string;
  detection_method?: string;
}

// Demo data for play logs - enhanced with more admin-specific fields
const playLogsData: PlayLogData[] = [
  {
    id: 1,
    track_title: "Enjoyment",
    artist: "Sarkodie",
    station_name: "Joy FM",
    matched_at: "2024-01-15 14:30:00",
    stop_time: "2024-01-15 14:33:45",
    duration: "3:45",
    royalty_amount: 12.50,
    status: "Confirmed",
    attribution_source: "Station",
    plays: 156,
    isrc: "GHA001230001",
    fingerprint_id: "fp_001",
    confidence_score: 98.5
  },
  {
    id: 2,
    track_title: "Kpokeke",
    artist: "Stonebwoy",
    station_name: "Adom FM",
    matched_at: "2024-01-15 16:15:00",
    stop_time: "2024-01-15 16:18:20",
    duration: "3:20",
    royalty_amount: 8.75,
    status: "Pending",
    attribution_source: "Partner",
    partner_name: "Ghana Music Rights",
    plays: 89,
    isrc: "GHA001230002",
    fingerprint_id: "fp_002",
    confidence_score: 94.2
  },
  {
    id: 3,
    track_title: "Aseda",
    artist: "King Promise",
    station_name: "Peace FM",
    matched_at: "2024-01-15 19:45:00",
    stop_time: "2024-01-15 19:49:30",
    duration: "4:30",
    royalty_amount: 15.20,
    status: "Confirmed",
    attribution_source: "Station",
    plays: 203,
    isrc: "GHA001230003",
    fingerprint_id: "fp_003",
    confidence_score: 99.1
  },
  {
    id: 4,
    track_title: "Heat",
    artist: "Wendy Shay",
    station_name: "Citi FM",
    matched_at: "2024-01-15 12:20:00",
    stop_time: "2024-01-15 12:23:15",
    duration: "3:15",
    royalty_amount: 6.80,
    status: "Disputed",
    attribution_source: "Station",
    plays: 67,
    isrc: "GHA001230004",
    fingerprint_id: "fp_004",
    confidence_score: 87.3
  },
  {
    id: 5,
    track_title: "Second Sermon",
    artist: "Black Sherif",
    station_name: "Angel FM",
    matched_at: "2024-01-15 21:10:00",
    stop_time: "2024-01-15 21:14:45",
    duration: "4:45",
    royalty_amount: 18.90,
    status: "Confirmed",
    attribution_source: "Partner",
    partner_name: "Audiomack Ghana",
    plays: 245,
    isrc: "GHA001230005",
    fingerprint_id: "fp_005",
    confidence_score: 95.8
  }
];

// Demo data for match logs - enhanced with admin fields
const matchLogsData: MatchLogData[] = [
  {
    id: 1,
    song: "Enjoyment",
    artist: "Sarkodie",
    station: "Joy FM",
    matched_at: "2024-01-15 14:30:00",
    confidence: 98.5,
    source: "ACRCloud",
    match_type: "Exact Match",
    status: "Verified",
    fingerprint_id: "fp_001",
    audio_hash: "ah_001",
    detection_method: "Audio Fingerprinting"
  },
  {
    id: 2,
    song: "Kpokeke",
    artist: "Stonebwoy",
    station: "Adom FM",
    matched_at: "2024-01-15 16:15:00",
    confidence: 94.2,
    source: "Partner Detection",
    match_type: "Partial Match",
    status: "Under Review",
    fingerprint_id: "fp_002",
    audio_hash: "ah_002",
    detection_method: "Metadata Matching"
  },
  {
    id: 3,
    song: "Aseda",
    artist: "King Promise",
    station: "Peace FM",
    matched_at: "2024-01-15 19:45:00",
    confidence: 99.1,
    source: "ACRCloud",
    match_type: "Exact Match",
    status: "Verified",
    fingerprint_id: "fp_003",
    audio_hash: "ah_003",
    detection_method: "Audio Fingerprinting"
  },
  {
    id: 4,
    song: "Heat",
    artist: "Wendy Shay",
    station: "Citi FM",
    matched_at: "2024-01-15 12:20:00",
    confidence: 87.3,
    source: "Station Upload",
    match_type: "Metadata Match",
    status: "Rejected",
    fingerprint_id: "fp_004",
    audio_hash: "ah_004",
    detection_method: "Manual Upload"
  },
  {
    id: 5,
    song: "Second Sermon",
    artist: "Black Sherif",
    station: "Angel FM",
    matched_at: "2024-01-15 21:10:00",
    confidence: 95.8,
    source: "ACRCloud",
    match_type: "Exact Match",
    status: "Verified",
    fingerprint_id: "fp_005",
    audio_hash: "ah_005",
    detection_method: "Audio Fingerprinting"
  }
];

const PlayLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('playlogs');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [sortBy, setSortBy] = useState('matched_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Real data state
  const [playLogs, setPlayLogs] = useState<ApiPlayLog[]>([]);
  const [matchCache, setMatchCache] = useState<ApiMatchCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  // Load data when tab or page changes
  useEffect(() => {
    loadData();
  }, [activeTab, currentPage]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'playlogs') {
        const response = await fetchAllPlayLogs({ page: currentPage, search: searchTerm });
        if (response.data) {
          setPlayLogs(response.data.play_logs || []);
          setTotalPages(response.data.pagination?.total_pages || 1);
        }
      } else {
        const response = await fetchAllMatchCache({ page: currentPage, search: searchTerm });
        if (response.data) {
          setMatchCache(response.data.match_cache || []);
          setTotalPages(response.data.pagination?.total_pages || 1);
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search when searchTerm changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadData();
      } else {
        setCurrentPage(1); // This will trigger loadData via the useEffect above
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Helper functions to determine status (must be defined before transformedData)
  const getPlayLogStatus = (log: ApiPlayLog): 'Confirmed' | 'Pending' | 'Disputed' | 'Rejected' => {
    if (log.flagged) return 'Disputed';
    if (log.verification_status === 'verified') return 'Confirmed';
    if (log.verification_status === 'rejected') return 'Rejected';
    return 'Pending';
  };

  const getMatchCacheStatus = (match: ApiMatchCache): 'Verified' | 'Under Review' | 'Rejected' | 'Pending' => {
    if (match.failed_reason) return 'Rejected';
    if (match.processed) return 'Verified';
    return 'Pending';
  };

  // Transform API data to component format
  const transformedData = useMemo(() => {
    if (activeTab === 'playlogs') {
      return playLogs.map((log): PlayLogData => ({
        id: log.id,
        track_title: log.track?.title || 'Unknown Track',
        artist: log.track?.artist?.stage_name || 'Unknown Artist',
        station_name: log.station?.name || 'Unknown Station',
        matched_at: log.played_at || log.start_time || log.created_at,
        stop_time: log.stop_time,
        duration: log.duration || '0:00',
        royalty_amount: parseFloat(log.royalty_amount || '0'),
        status: getPlayLogStatus(log),
        attribution_source: log.source || 'Station',
        plays: 0, // Not available in API
        isrc: log.track?.isrc_code,
        confidence_score: log.avg_confidence_score ? parseFloat(log.avg_confidence_score) : undefined,
      }));
    } else {
      return matchCache.map((match): MatchLogData => ({
        id: match.id,
        song: match.track?.title || 'Unknown Track',
        artist: match.track?.artist?.stage_name || 'Unknown Artist',
        station: match.station?.name || 'Unknown Station',
        matched_at: match.matched_at || match.created_at,
        confidence: match.avg_confidence_score ? parseFloat(match.avg_confidence_score) : 0,
        source: 'ACRCloud', // Default source
        match_type: 'Exact Match', // Default type
        status: getMatchCacheStatus(match),
      }));
    }
  }, [activeTab, playLogs, matchCache]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let data: (PlayLogData | MatchLogData)[] = transformedData;

    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        if (activeTab === 'playlogs') {
          const playLog = item as PlayLogData;
          return (
            playLog.track_title.toLowerCase().includes(searchLower) ||
            playLog.artist.toLowerCase().includes(searchLower) ||
            playLog.station_name.toLowerCase().includes(searchLower) ||
            playLog.status.toLowerCase().includes(searchLower) ||
            (playLog.isrc && playLog.isrc.toLowerCase().includes(searchLower))
          );
        } else {
          const matchLog = item as MatchLogData;
          return (
            matchLog.song.toLowerCase().includes(searchLower) ||
            matchLog.artist.toLowerCase().includes(searchLower) ||
            matchLog.station.toLowerCase().includes(searchLower) ||
            matchLog.status.toLowerCase().includes(searchLower) ||
            matchLog.source.toLowerCase().includes(searchLower)
          );
        }
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      data = data.filter(item => {
        if (activeTab === 'playlogs') {
          return (item as PlayLogData).status === statusFilter;
        } else {
          return (item as MatchLogData).status === statusFilter;
        }
      });
    }

    // Apply sorting
    data.sort((a, b) => {
      let aValue, bValue;

      if (activeTab === 'playlogs') {
        const playLogA = a as PlayLogData;
        const playLogB = b as PlayLogData;
        switch (sortBy) {
          case 'track_title':
            aValue = playLogA.track_title;
            bValue = playLogB.track_title;
            break;
          case 'station_name':
            aValue = playLogA.station_name;
            bValue = playLogB.station_name;
            break;
          case 'royalty_amount':
            aValue = playLogA.royalty_amount;
            bValue = playLogB.royalty_amount;
            break;
          case 'plays':
            aValue = playLogA.plays;
            bValue = playLogB.plays;
            break;
          case 'confidence_score':
            aValue = playLogA.confidence_score || 0;
            bValue = playLogB.confidence_score || 0;
            break;
          default:
            aValue = new Date(playLogA.matched_at);
            bValue = new Date(playLogB.matched_at);
        }
      } else {
        const matchLogA = a as MatchLogData;
        const matchLogB = b as MatchLogData;
        switch (sortBy) {
          case 'song':
            aValue = matchLogA.song;
            bValue = matchLogB.song;
            break;
          case 'station':
            aValue = matchLogA.station;
            bValue = matchLogB.station;
            break;
          case 'confidence':
            aValue = matchLogA.confidence;
            bValue = matchLogB.confidence;
            break;
          default:
            aValue = new Date(matchLogA.matched_at);
            bValue = new Date(matchLogB.matched_at);
        }
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    return data;
  }, [transformedData, searchTerm, sortBy, sortOrder, statusFilter]);

  // Use filtered data directly (pagination handled by backend)
  const paginatedData = filteredAndSortedData;

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === paginatedData.length
        ? []
        : paginatedData.map(item => item.id)
    );
  };

  const handleBulkAction = (action: string) => {
    // Handle bulk actions like approve, reject, delete, etc.
    console.log(`Bulk ${action} for items:`, selectedItems);
    setSelectedItems([]);
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick }: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: (id: string) => void;
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

  const getStatusBadge = (status: string, type: 'play' | 'match') => {
    const statusConfig = {
      play: {
        Confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        Disputed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        Rejected: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      },
      match: {
        Verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        'Under Review': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        Pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      }
    };

    return (
      <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${statusConfig[type][status as keyof typeof statusConfig.play]}`}>
        {status}
      </span>
    );
  };

  if (loading && playLogs.length === 0 && matchCache.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading {activeTab === 'playlogs' ? 'play logs' : 'match logs'}...</p>
        </div>
      </div>
    );
  }

  return (
    <>
        {/* Page header */}
        <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Play & Match Logs</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                  Monitor music performance and detection across all platforms
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <select className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">All Time</option>
                  <option value="monthly">This Month</option>
                  <option value="weekly">This Week</option>
                </select>
                <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-4 bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
              <TabButton
                id="playlogs"
                label="Play Logs"
                icon={Activity}
                isActive={activeTab === 'playlogs'}
                onClick={setActiveTab}
              />
              <TabButton
                id="matchlogs"
                label="Match Logs"
                icon={Eye}
                isActive={activeTab === 'matchlogs'}
                onClick={setActiveTab}
              />
            </div>
          </div>

          {/* Controls and Filters */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab === 'playlogs' ? 'songs, artists, stations...' : 'songs, artists, stations, sources...'}`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Count and Items Per Page */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{paginatedData.length} entries on this page</span>
              </div>

              {/* Bulk Actions */}
              {selectedItems.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedItems.length} selected
                  </span>
                  <div className="flex space-x-1">
                    {activeTab === 'playlogs' ? (
                      <>
                        <button
                          onClick={() => handleBulkAction('approve')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleBulkAction('dispute')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Dispute</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleBulkAction('verify')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                        <button
                          onClick={() => handleBulkAction('reject')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status Filter
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="all">All Statuses</option>
                      {activeTab === 'playlogs' ? (
                        <>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Pending">Pending</option>
                          <option value="Disputed">Disputed</option>
                          <option value="Rejected">Rejected</option>
                        </>
                      ) : (
                        <>
                          <option value="Verified">Verified</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Pending">Pending</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => handleSort(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="matched_at">Date</option>
                      {activeTab === 'playlogs' ? (
                        <>
                          <option value="track_title">Song Title</option>
                          <option value="station_name">Station</option>
                          <option value="royalty_amount">Earnings</option>
                          <option value="plays">Plays</option>
                          <option value="confidence_score">Confidence</option>
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
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setSortBy('matched_at');
                        setSortOrder('desc');
                      }}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === paginatedData.length && paginatedData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
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
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                            Confidence
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                            Source
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                    {paginatedData.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors duration-200">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(log.id)}
                            onChange={() => handleSelectItem(log.id)}
                            className="rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        {activeTab === 'playlogs' ? (
                          <>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex flex-col">
                                <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                  {(log as PlayLogData).track_title}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs truncate">by {(log as PlayLogData).artist}</span>
                                <span className="text-gray-400 dark:text-gray-500 text-xs truncate">ISRC: {(log as PlayLogData).isrc}</span>
                                {(log as PlayLogData).attribution_source === 'Partner' && (
                                  <span className="inline-flex items-center mt-1 px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                    Partner: {(log as PlayLogData).partner_name || 'Ghana Music Rights'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                              {(log as PlayLogData).station_name}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                              <div className="flex flex-col">
                                <span className="sm:hidden">{new Date((log as PlayLogData).matched_at).toLocaleDateString()}</span>
                                <span className="hidden sm:inline">{new Date((log as PlayLogData).matched_at).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell">
                              {(log as PlayLogData).duration}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs sm:text-sm">
                                ₵{(log as PlayLogData).royalty_amount.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              {getStatusBadge((log as PlayLogData).status, 'play')}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 hidden lg:table-cell">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <div className="w-8 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(log as PlayLogData).confidence_score || 0}%` }}
                                  ></div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">{(log as PlayLogData).confidence_score || 0}%</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex items-center space-x-1">
                                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-900 dark:text-white font-medium text-xs sm:text-sm truncate max-w-[120px]">
                              {(log as MatchLogData).song}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden sm:table-cell truncate max-w-[100px]">
                              {(log as MatchLogData).station}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                              <div className="flex flex-col">
                                <span className="sm:hidden">{new Date((log as MatchLogData).matched_at).toLocaleDateString()}</span>
                                <span className="hidden sm:inline">{new Date((log as MatchLogData).matched_at).toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <div className="w-8 sm:w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                  <div
                                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(log as MatchLogData).confidence}%` }}
                                  ></div>
                                </div>
                                <span className="text-gray-900 dark:text-white font-medium text-xs sm:text-sm">{(log as MatchLogData).confidence}%</span>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4 text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                              {(log as MatchLogData).source}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              {getStatusBadge((log as MatchLogData).status, 'match')}
                            </td>
                            <td className="px-3 sm:px-6 py-2 sm:py-4">
                              <div className="flex items-center space-x-1">
                                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                    {paginatedData.length === 0 && (
                      <tr>
                        <td
                          colSpan={activeTab === 'playlogs' ? 9 : 8}
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

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/30 -mx-8 px-8 py-4 rounded-b-2xl">
                <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Page <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentPage}</span> of{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{totalPages}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-sm ${
                            currentPage === pageNum
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105'
                              : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

            {totalPages === 1 && paginatedData.length > 0 && (
              <div className="flex justify-center mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing all {paginatedData.length} entries
                </div>
              </div>
            )}
          </div>
        </div>
    </>
  );
};

export default PlayLogs;
