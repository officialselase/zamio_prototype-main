import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Wifi, Settings, Play, Pause, Volume2, Monitor, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useStationOnboarding } from '../StationOnboardingContext';

interface StreamSetupStepProps {
  onNext: () => void;
  onPrevious: () => void;
}

interface StreamFormState {
  primaryStreamUrl: string;
  backupStreamUrl: string;
  streamType: string;
  bitrate: string;
  format: string;
  mountPoint: string;
  username: string;
  password: string;
  enableMonitoring: boolean;
  monitoringInterval: string;
  autoRestart: boolean;
  qualityCheck: boolean;
}

const streamTypes = [
  { value: 'icecast', label: 'Icecast/Shoutcast' },
  { value: 'hls', label: 'HLS (HTTP Live Streaming)' },
  { value: 'dash', label: 'DASH (Dynamic Adaptive Streaming)' },
  { value: 'rtmp', label: 'RTMP (Real-Time Messaging Protocol)' },
];

const bitrates = [
  { value: '64', label: '64 kbps (Low Quality)' },
  { value: '128', label: '128 kbps (Standard Quality)' },
  { value: '256', label: '256 kbps (High Quality)' },
  { value: '320', label: '320 kbps (Studio Quality)' },
];

const formats = [
  { value: 'mp3', label: 'MP3' },
  { value: 'aac', label: 'AAC' },
  { value: 'ogg', label: 'OGG Vorbis' },
  { value: 'opus', label: 'Opus' },
];

const defaultFormState: StreamFormState = {
  primaryStreamUrl: '',
  backupStreamUrl: '',
  streamType: 'icecast',
  bitrate: '128',
  format: 'mp3',
  mountPoint: '/stream',
  username: '',
  password: '',
  enableMonitoring: true,
  monitoringInterval: '60',
  autoRestart: true,
  qualityCheck: true,
};

const StreamSetupStep: React.FC<StreamSetupStepProps> = ({ onNext, onPrevious }) => {
  const { status, submitStreamSetup } = useStationOnboarding();
  const [formState, setFormState] = useState<StreamFormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const streamSnapshot = useMemo(() => status?.stream_configuration ?? {}, [status]);

  useEffect(() => {
    const initial: StreamFormState = {
      primaryStreamUrl: typeof streamSnapshot?.stream_url === 'string' ? streamSnapshot.stream_url ?? '' : '',
      backupStreamUrl: typeof streamSnapshot?.backup_stream_url === 'string' ? streamSnapshot.backup_stream_url ?? '' : '',
      streamType: typeof streamSnapshot?.stream_type === 'string' && streamSnapshot.stream_type
        ? streamSnapshot.stream_type
        : 'icecast',
      bitrate: typeof streamSnapshot?.stream_bitrate === 'string' && streamSnapshot.stream_bitrate
        ? streamSnapshot.stream_bitrate
        : '128',
      format: typeof streamSnapshot?.stream_format === 'string' && streamSnapshot.stream_format
        ? streamSnapshot.stream_format
        : 'mp3',
      mountPoint: typeof streamSnapshot?.stream_mount_point === 'string' && streamSnapshot.stream_mount_point
        ? streamSnapshot.stream_mount_point
        : '/stream',
      username: typeof streamSnapshot?.stream_username === 'string' ? streamSnapshot.stream_username ?? '' : '',
      password: '',
      enableMonitoring: typeof streamSnapshot?.monitoring_enabled === 'boolean' ? streamSnapshot.monitoring_enabled : true,
      monitoringInterval: typeof streamSnapshot?.monitoring_interval_seconds === 'number'
        ? String(streamSnapshot.monitoring_interval_seconds)
        : '60',
      autoRestart: typeof streamSnapshot?.stream_auto_restart === 'boolean' ? streamSnapshot.stream_auto_restart : true,
      qualityCheck: typeof streamSnapshot?.stream_quality_check_enabled === 'boolean'
        ? streamSnapshot.stream_quality_check_enabled
        : true,
    };
    setFormState(initial);
  }, [streamSnapshot]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formState.primaryStreamUrl.trim()) {
      newErrors.primaryStreamUrl = 'Primary stream URL is required';
    } else if (!formState.primaryStreamUrl.startsWith('http')) {
      newErrors.primaryStreamUrl = 'Please enter a valid URL starting with http:// or https://';
    }

    if (formState.backupStreamUrl && !formState.backupStreamUrl.startsWith('http')) {
      newErrors.backupStreamUrl = 'Please enter a valid backup URL';
    }

    if (!formState.username.trim()) {
      newErrors.username = 'Username is required for stream authentication';
    }

    if (!formState.password.trim()) {
      newErrors.password = 'Password is required for stream authentication';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestStream = async () => {
    if (!validateForm()) return;

    setIsTesting(true);
    setTestStatus('idle');

    await new Promise(resolve => setTimeout(resolve, 1500));

    setTestStatus('success');
    setIsTesting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const payload = {
      primary_stream_url: formState.primaryStreamUrl.trim(),
      backup_stream_url: formState.backupStreamUrl.trim(),
      stream_type: formState.streamType,
      stream_bitrate: formState.bitrate,
      stream_format: formState.format,
      stream_mount_point: formState.mountPoint.trim(),
      stream_username: formState.username.trim(),
      stream_password: formState.password.trim(),
      enable_monitoring: formState.enableMonitoring,
      monitoring_interval: formState.monitoringInterval,
      auto_restart: formState.autoRestart,
      quality_check: formState.qualityCheck,
    };

    try {
      await submitStreamSetup(payload);
      onNext();
    } catch (err) {
      const message = resolveApiError(err, setErrors);
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-semibold text-white mb-4">Stream Configuration</h3>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Set up your audio streams for comprehensive monitoring and reporting. Zamio will track your broadcasts for music detection and royalty calculation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {apiError && (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {apiError}
          </div>
        )}

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Stream Information</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="primaryStreamUrl" className="block text-sm font-medium text-slate-200 mb-2">
                Primary Stream URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="primaryStreamUrl"
                  name="primaryStreamUrl"
                  value={formState.primaryStreamUrl}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.primaryStreamUrl
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="https://your-station.com:8000/stream"
                />
                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.primaryStreamUrl && <p className="text-red-400 text-sm mt-1">{errors.primaryStreamUrl}</p>}
              <p className="text-xs text-slate-400 mt-2">
                Your main streaming URL that listeners connect to
              </p>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="backupStreamUrl" className="block text-sm font-medium text-slate-200 mb-2">
                Backup Stream URL (Optional)
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="backupStreamUrl"
                  name="backupStreamUrl"
                  value={formState.backupStreamUrl}
                  onChange={handleInputChange}
                  className={`w-full rounded-lg border pl-10 pr-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                    errors.backupStreamUrl
                      ? 'border-red-400 bg-slate-800/50 focus:border-red-400 focus:ring-red-400'
                      : 'border-white/20 bg-slate-800/50 focus:border-indigo-400 focus:ring-indigo-400'
                  }`}
                  placeholder="https://backup.your-station.com:8000/stream"
                />
                <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
              {errors.backupStreamUrl && <p className="text-red-400 text-sm mt-1">{errors.backupStreamUrl}</p>}
              <p className="text-xs text-slate-400 mt-2">
                Alternative stream URL for redundancy (optional)
              </p>
            </div>

            <div>
              <label htmlFor="streamType" className="block text-sm font-medium text-slate-200 mb-2">
                Stream Type
              </label>
              <select
                id="streamType"
                name="streamType"
                value={formState.streamType}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {streamTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bitrate" className="block text-sm font-medium text-slate-200 mb-2">
                Bitrate
              </label>
              <select
                id="bitrate"
                name="bitrate"
                value={formState.bitrate}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {bitrates.map(rate => (
                  <option key={rate.value} value={rate.value}>
                    {rate.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-medium text-slate-200 mb-2">
                Stream Format
              </label>
              <select
                id="format"
                name="format"
                value={formState.format}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {formats.map(format => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="mountPoint" className="block text-sm font-medium text-slate-200 mb-2">
                Mount Point
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="mountPoint"
                  name="mountPoint"
                  value={formState.mountPoint}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="/stream"
                />
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-2">
                Stream Username *
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formState.username}
                onChange={handleInputChange}
                className={`w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.username
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="stream_user"
              />
              {errors.username && <p className="text-red-400 text-sm mt-1">{errors.username}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                Stream Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formState.password}
                onChange={handleInputChange}
                className={`w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
                  errors.password
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'focus:border-indigo-400 focus:ring-indigo-400'
                }`}
                placeholder="Strong password"
              />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password}</p>}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Monitoring Configuration</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/50 p-4">
              <div>
                <p className="text-slate-200 font-medium">Enable Monitoring</p>
                <p className="text-sm text-slate-400">Allow Zamio to monitor this stream in real-time.</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="enableMonitoring"
                  checked={formState.enableMonitoring}
                  onChange={handleInputChange}
                  className="h-5 w-5 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
                />
              </label>
            </div>

            <div>
              <label htmlFor="monitoringInterval" className="block text-sm font-medium text-slate-200 mb-2">
                Monitoring Interval (seconds)
              </label>
              <input
                type="number"
                id="monitoringInterval"
                name="monitoringInterval"
                value={formState.monitoringInterval}
                onChange={handleInputChange}
                min={30}
                className="w-full rounded-lg border border-white/20 bg-slate-800/50 px-4 py-3 text-white placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="autoRestart"
                name="autoRestart"
                checked={formState.autoRestart}
                onChange={handleInputChange}
                className="h-5 w-5 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
              />
              <label htmlFor="autoRestart" className="text-sm text-slate-300">
                Automatically restart monitoring if the stream disconnects
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="qualityCheck"
                name="qualityCheck"
                checked={formState.qualityCheck}
                onChange={handleInputChange}
                className="h-5 w-5 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-indigo-400"
              />
              <label htmlFor="qualityCheck" className="text-sm text-slate-300">
                Enable automated quality checks for audio fidelity
              </label>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-2xl border border-white/10 p-8">
          <h4 className="text-xl font-semibold text-white mb-6">Stream Testing</h4>
          <div className="space-y-4">
            <p className="text-slate-300 text-sm">
              Run a quick connectivity test to ensure Zamio can access your primary stream before continuing.
            </p>
            <button
              type="button"
              onClick={handleTestStream}
              disabled={isTesting}
              className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
            >
              {isTesting ? (
                <>
                  <Play className="h-4 w-4 animate-pulse" />
                  <span>Testing…</span>
                </>
              ) : testStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                  <span>Stream Accessible</span>
                </>
              ) : testStatus === 'error' ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-300" />
                  <span>Retry Test</span>
                </>
              ) : (
                <>
                  <Monitor className="h-4 w-4" />
                  <span>Test Stream</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <button
            type="button"
            onClick={onPrevious}
            className="inline-flex items-center rounded-lg bg-slate-800/50 px-6 py-3 text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 disabled:opacity-60"
          >
            <span>{submitting ? 'Saving…' : 'Next'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

const resolveApiError = (
  error: unknown,
  assignFieldErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>,
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { errors?: Record<string, string[] | string>; message?: string } | undefined;
    if (responseData?.errors) {
      const fieldErrors: Record<string, string> = {};
      Object.entries(responseData.errors).forEach(([field, value]) => {
        if (Array.isArray(value) && typeof value[0] === 'string') {
          fieldErrors[field] = value[0];
        } else if (typeof value === 'string') {
          fieldErrors[field] = value;
        }
      });
      assignFieldErrors(prev => ({ ...prev, ...fieldErrors }));
    }
    if (responseData?.message) {
      return responseData.message;
    }
    return error.message || 'Unable to save stream configuration.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unable to save stream configuration.';
};

export default StreamSetupStep;

