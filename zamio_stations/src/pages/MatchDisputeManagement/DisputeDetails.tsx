import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@zamio/ui';
import {
  Clock,
  BarChart3,
  Calendar,
  MapPin,
  Music,
  Play,
  Pause,
  Volume2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

import { useAuth } from '../../lib/auth';
import {
  fetchStationDisputeDetail,
  type StationDisputeRecord,
} from '../../lib/api';

const resolveDisputeError = (maybeError: unknown): string => {
  if (!maybeError) {
    return 'Unable to load dispute details. Please try again later.';
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

  return 'Unable to load dispute details. Please try again later.';
};

const parseDisputeDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.includes(' ~ ') ? value.replace(' ~ ', 'T') : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const formatDisputeDateTime = (value: string | null | undefined) => {
  const parsed = parseDisputeDate(value);
  if (!parsed) {
    return value ? value.replace(' ~ ', ' ') : '—';
  }
  return parsed.toLocaleString();
};

const formatDisputeDate = (value: string | null | undefined) => {
  const parsed = parseDisputeDate(value);
  if (!parsed) {
    return value ? value.split('T')[0] : '—';
  }
  return parsed.toLocaleDateString();
};

const formatDisputeCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);

export default function DisputeDetails() {
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

  const location = useLocation();
  const { dispute_id } = location.state || {};
  const disputeId = dispute_id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispute, setDispute] = useState<StationDisputeRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToReview, setItemToReview] = useState<number | string | null>(null);
  const [comment, setComment] = useState('');
  const [alert, setAlert] = useState<{ message: string; type: string }>({ message: '', type: '' });
  const [inputError, setInputError] = useState('');

  // Audio Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return undefined;
    }

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play().catch(() => undefined);
    }
    setIsPlaying((previous) => !previous);
  };

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) {
      return;
    }

    const time = Number(event.target.value);
    if (Number.isNaN(time)) {
      return;
    }

    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(time % 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const loadDispute = useCallback(async () => {
    if (!stationId) {
      return;
    }

    if (!disputeId) {
      setError('We could not determine which dispute to load.');
      setDispute(null);
      setAudioUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const envelope = await fetchStationDisputeDetail({
        stationId,
        disputeId,
      });

      const record = (envelope?.data ?? null) as StationDisputeRecord | null;

      setDispute(record);
      setAudioUrl(record?.audio_file_mp3 ?? null);
      setIsPlaying(false);
      setCurrentTime(0);
    } catch (fetchError) {
      setError(resolveDisputeError(fetchError));
      setDispute(null);
      setAudioUrl(null);
    } finally {
      setLoading(false);
    }
  }, [stationId, disputeId]);

  useEffect(() => {
    loadDispute();
  }, [loadDispute]);

  const handleReview = useCallback(
    (itemId: number | string | null) => {
      const trimmedComment = comment.trim();
      if (!trimmedComment) {
        setInputError('Your comment is required.');
        return;
      }

      setInputError('');

      setDispute((previous) => {
        if (!previous || previous.id !== itemId) {
          return previous;
        }

        return {
          ...previous,
          status: 'Resolved',
          comment: trimmedComment,
        };
      });

      setAlert({ message: 'Dispute marked as resolved', type: 'success' });
      setIsModalOpen(false);
      setItemToReview(null);
      setComment('');
    },
    [comment],
  );

  const openReviewModal = (itemId: number | string | null) => {
    setItemToReview(itemId);
    setIsModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsModalOpen(false);
    setItemToReview(null);
  };

  const closeAlert = () => {
    setAlert({ message: '', type: '' });
  };

  const playLogs = useMemo(() => dispute?.play_logs ?? [], [dispute]);
  const releaseDateDisplay = useMemo(() => formatDisputeDate(dispute?.release_date), [dispute?.release_date]);
  const confidenceDisplay = useMemo(() => {
    if (dispute?.confidence == null) {
      return '—';
    }
    return `${Math.round(dispute.confidence)}%`;
  }, [dispute?.confidence]);
  const earningsDisplay = useMemo(() => formatDisputeCurrency(dispute?.earnings ?? 0), [dispute?.earnings]);

  const statusColors = {
    excellent: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      accent: 'text-emerald-600 dark:text-emerald-400'
    },
    good: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      accent: 'text-blue-600 dark:text-blue-400'
    },
    average: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      accent: 'text-amber-600 dark:text-amber-400'
    },
    poor: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      accent: 'text-red-600 dark:text-red-400'
    }
  };

  const getStatusColor = (status: string | null | undefined) => {
    switch (status?.toLowerCase()) {
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

  // Simple Review Modal
  const ReviewModal = () => {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Review Dispute</h3>
            <button
              onClick={closeReviewModal}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You are about to review this music identification dispute. Please provide your assessment and comments.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Comment <span className="text-red-500">*</span>
              </label>
              {inputError && (
                <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">{inputError}</p>
                </div>
              )}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your review comments..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleReview(itemToReview)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Resolve Dispute
              </button>
              <button
                onClick={closeReviewModal}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {error && (
        <Card className="border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-rose-500 dark:text-rose-300" />
              <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 transition hover:text-rose-600 dark:text-rose-300 dark:hover:text-rose-100"
            >
              ×
            </button>
          </div>
        </Card>
      )}

      {loading && (
        <div className="flex items-center space-x-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading dispute details...</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dispute Details</h1>
          <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
            Review and resolve music identification disputes with detailed analysis.
          </p>
        </div>
        <Link to="/dashboard/match-disputes">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200">
            ← Back to Disputes
          </button>
        </Link>
      </div>

      {/* Alert */}
      {alert.message && (
        <Card className={`p-4 ${alert.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {alert.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              )}
              <p className={`text-sm font-medium ${alert.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'}`}>
                {alert.message}
              </p>
            </div>
            <button onClick={closeAlert} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
              ×
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Track Information */}
          <Card className="bg-gradient-to-br from-slate-50/90 via-gray-50/80 to-zinc-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-600/60 p-8">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {dispute?.cover_art ? (
                  <img
                    src={dispute.cover_art}
                    alt={dispute?.title ?? 'Track cover art'}
                    className="h-32 w-32 rounded-xl object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-200/70 shadow-inner dark:bg-slate-700/60">
                    <Music className="h-10 w-10 text-slate-500 dark:text-slate-300" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {dispute?.title ?? 'Unknown Track'}
                    </h2>
                    <p className="mb-4 text-lg text-gray-600 dark:text-gray-300">
                      {dispute?.artist_name ?? 'Unknown Artist'}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{dispute?.duration ?? '—'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{releaseDateDisplay}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{(dispute?.plays ?? 0).toLocaleString()} plays</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {confidenceDisplay === '—' ? 'Confidence unavailable' : `${confidenceDisplay} confidence`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-3">
                    <div className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium ${getStatusColor(dispute?.status).bg} ${getStatusColor(dispute?.status).border} ${getStatusColor(dispute?.status).text}`}>
                      {dispute?.status === 'Resolved' ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : dispute?.status === 'Flagged' ? (
                        <AlertTriangle className="w-4 h-4 mr-1" />
                      ) : (
                        <Clock className="w-4 h-4 mr-1" />
                      )}
                      {dispute?.status || 'Pending'}
                    </div>

                    {dispute?.status !== 'Resolved' && dispute?.id != null && (
                      <button
                        onClick={() => openReviewModal(dispute.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-all duration-200 hover:scale-105"
                      >
                        Review Dispute
                      </button>
                    )}
                  </div>
                </div>

                {dispute?.comment && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Comment:</span> {dispute?.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Audio Player */}
          <Card className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-8">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-center">
                <Music className="w-5 h-5 mr-2 text-blue-500" />
                Audio Preview
              </h3>

              {audioUrl ? (
                <div className="space-y-6">
                  <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />

                  {/* Play/Pause Button */}
                  <button
                    onClick={togglePlay}
                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>

                  {/* Progress Bar */}
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">Loading audio preview...</p>
                </div>
              )}
            </div>
          </Card>

          {/* Analysis Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Waveform Analysis */}
            <Card className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-emerald-500" />
                Audio Waveform
              </h3>
              <div className="h-32 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center space-x-1 mb-2">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                      <div key={i} className="w-2 h-8 bg-emerald-400 rounded" style={{height: `${Math.random() * 32 + 8}px`}}></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Audio waveform visualization</p>
                </div>
              </div>
            </Card>

            {/* Spectrum Analysis */}
            <Card className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-500" />
                Frequency Spectrum
              </h3>
              <div className="h-32 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center space-x-2 mb-2">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                      <div key={i} className={`w-1 h-16 rounded ${Math.random() > 0.7 ? 'bg-red-400' : 'bg-purple-400'}`} style={{height: `${Math.random() * 64 + 8}px`}}></div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Frequency spectrum analysis</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Play Logs */}
          <Card className="bg-gradient-to-br from-indigo-50/90 via-purple-50/80 to-pink-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-indigo-200/50 dark:border-slate-600/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-indigo-500" />
              Play History
            </h3>
            <div className="space-y-3">
              {playLogs.map((log, index) => (
                <div
                  key={`${log.time ?? 'log'}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-600 dark:bg-slate-800"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.station ?? 'Unknown station'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDisputeDateTime(log.time)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {log.region ?? '—'}
                    </div>
                  </div>
                </div>
              ))}

              {playLogs.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white/60 p-4 text-center text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-gray-400">
                  No recent play history was found for this dispute.
                </div>
              )}
            </div>
          </Card>

          {/* Dispute Stats */}
          <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-amber-500" />
              Dispute Statistics
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{confidenceDisplay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Earnings</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">{earningsDisplay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Play Duration</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{dispute?.duration ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Total Plays</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{(dispute?.plays ?? 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal />
    </div>
  );
}
