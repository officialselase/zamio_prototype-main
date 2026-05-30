import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Music2,
  Image,
  Users,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  X,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  AlertCircle,
  Music,
  Calendar,
  Tag,
  Clock,
  User,
  Mail,
  Phone,
  Percent
} from 'lucide-react';
import { initiateUpload, fetchTrackUploadSupportData, createAlbumForUploads } from '../lib/api';
import { useAuth } from '../lib/auth';

// Types for the multi-step form
interface TrackData {
  title: string;
  genre: string;
  album: string;
  releaseDate: string;
  description: string;
}

interface CoverArtData {
  file: File | null;
  fileName: string | null;
  preview: string | null;
}

interface ContributorData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  royaltyPercentage: number;
  isrcCode?: string;
}

interface ReviewData {
  trackData: TrackData;
  coverArtData: CoverArtData;
  contributors: ContributorData[];
}

interface GenreOption {
  id: number;
  name: string;
}

interface AlbumOption {
  id: number;
  title: string;
  artist_name?: string | null;
}

const DEMO_CONTRIBUTOR_ROLES = [
  'Artist', 'Producer', 'Songwriter', 'Featured Artist', 'Remixer', 'Engineer', 'Composer'
];

const AddTrack: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const artistId = (user && typeof user['artist_id'] === 'string') ? (user['artist_id'] as string) : '';
  const stageName = (user && typeof user['stage_name'] === 'string') ? (user['stage_name'] as string) : '';
  const userEmail = (user && typeof user['email'] === 'string') ? (user['email'] as string) : '';
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  // Form data for each step
  const [trackData, setTrackData] = useState<TrackData>({
    title: '',
    genre: '',
    album: '',
    releaseDate: '',
    description: ''
  });

  const [coverArtData, setCoverArtData] = useState<CoverArtData>({
    file: null,
    fileName: null,
    preview: null
  });

  const [contributors, setContributors] = useState<ContributorData[]>([
    {
      id: '1',
      name: stageName || '',
      email: userEmail,
      phone: '',
      role: 'Artist',
      royaltyPercentage: 100
    }
  ]);

  useEffect(() => {
    if (!artistId) {
      setSupportError('Artist profile is required before uploading tracks.');
      return;
    }

    let isActive = true;
    setSupportLoading(true);
    setSupportError(null);

    fetchTrackUploadSupportData(artistId)
      .then((response) => {
        if (!isActive) return;
        const payload = response?.data;
        setGenres(payload?.genres ?? []);
        setAlbums(payload?.albums ?? []);
      })
      .catch(() => {
        if (!isActive) return;
        setSupportError('Unable to load genres and albums. Please try again.');
      })
      .finally(() => {
        if (isActive) {
          setSupportLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [artistId]);

  useEffect(() => {
    if (!stageName) {
      return;
    }
    setContributors((prev) => {
      if (!prev.length) {
        return prev;
      }
      const [first, ...rest] = prev;
      if (first.name && first.name !== '') {
        return prev;
      }
      return [
        {
          ...first,
          name: stageName,
        },
        ...rest,
      ];
    });
  }, [stageName]);

  const steps = [
    { id: 0, label: 'Track Info', icon: Music2, title: 'Track Information' },
    { id: 1, label: 'Cover Art', icon: Image, title: 'Cover Artwork' },
    { id: 2, label: 'Contributors', icon: Users, title: 'Contributors & Rights' },
    { id: 3, label: 'Review', icon: CheckCircle, title: 'Review & Submit' }
  ];

  const handleAudioFileSelect = (file: File) => {
    const maxSize = 100 * 1024 * 1024;
    if (!file.type.startsWith('audio/')) {
      setError('Please choose a valid audio file.');
      return;
    }
    if (file.size > maxSize) {
      setError('Audio file is too large. Maximum size is 100MB.');
      return;
    }
    setAudioFile(file);
    setError(null);
  };

  const removeAudioFile = () => {
    setAudioFile(null);
  };

  // Step 1: Track Information Handlers
  const handleTrackInfoChange = (field: keyof TrackData, value: string) => {
    setTrackData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = (): boolean => {
    if (!trackData.title.trim()) {
      setError('Track title is required.');
      return false;
    }
    if (!trackData.genre) {
      setError('Please select a genre.');
      return false;
    }
    if (!audioFile) {
      setError('Please select an audio file to upload.');
      return false;
    }
    return true;
  };

  // Step 2: Cover Art Handlers
  const handleCoverArtFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      setError('Cover art file too large. Maximum 10MB allowed.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setCoverArtData({
      file,
      fileName: file.name,
      preview: URL.createObjectURL(file)
    });
    setError(null);
  };

  const handleCoverArtDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleCoverArtFile(files[0]);
    }
  };

  const removeCoverArt = () => {
    if (coverArtData.preview) {
      URL.revokeObjectURL(coverArtData.preview);
    }
    setCoverArtData({ file: null, fileName: null, preview: null });
  };

  // Step 3: Contributors Handlers
  const addContributor = () => {
    const newContributor: ContributorData = {
      id: Date.now().toString(),
      name: '',
      email: '',
      phone: '',
      role: 'Artist',
      royaltyPercentage: 0
    };
    setContributors(prev => [...prev, newContributor]);
  };

  const updateContributor = (id: string, field: keyof ContributorData, value: string | number) => {
    setContributors(prev => prev.map(contrib =>
      contrib.id === id ? { ...contrib, [field]: value } : contrib
    ));
  };

  const removeContributor = (id: string) => {
    setContributors(prev => prev.filter(contrib => contrib.id !== id));
  };

  const validateStep3 = (): boolean => {
    const totalPercentage = contributors.reduce((sum, contrib) => sum + contrib.royaltyPercentage, 0);
    if (totalPercentage > 100) {
      setError('Total royalty percentage cannot exceed 100%.');
      return false;
    }
    if (contributors.some(c => !c.name.trim() || !c.email.trim())) {
      setError('All contributors must have name and email.');
      return false;
    }
    return true;
  };

  // Step Navigation
  const goToNextStep = () => {
    setError(null);

    if (currentStep === 0 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep3()) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const selectedGenre = genres.find((genre) => String(genre.id) === trackData.genre);
  const selectedAlbum = albums.find((album) => String(album.id) === trackData.album);

  // Final Submit
  const handleSubmit = async () => {
    setError(null);

    if (!validateStep1()) {
      return;
    }

    if (!artistId) {
      setError('Artist profile is required before uploading tracks.');
      return;
    }

    if (!audioFile) {
      setError('Please select an audio file to upload.');
      return;
    }

    setLoading(true);

    const sanitizedContributors = contributors
      .filter((contributor) => contributor.name.trim() || contributor.email.trim())
      .map((contributor) => ({
        name: contributor.name.trim(),
        email: contributor.email.trim(),
        phone: contributor.phone.trim(),
        role: contributor.role,
        royaltyPercentage: contributor.royaltyPercentage,
      }));

    const trimmedTitle = trackData.title.trim();

    try {
      const formData = new FormData();
      formData.append('upload_type', 'track_audio');
      formData.append('file', audioFile);
      formData.append('title', trimmedTitle);
      formData.append('artist_name', stageName || '');
      formData.append('explicit', 'false');

      if (trackData.genre) {
        formData.append('genre_id', trackData.genre);
      }
      if (selectedGenre) {
        formData.append('genre_name', selectedGenre.name);
      }
      if (trackData.album) {
        formData.append('album_id', trackData.album);
      }
      if (selectedAlbum) {
        formData.append('album_title', selectedAlbum.title);
      }
      if (trackData.releaseDate) {
        formData.append('release_date', trackData.releaseDate);
      }
      if (trackData.description) {
        formData.append('lyrics', trackData.description);
      }
      if (sanitizedContributors.length) {
        formData.append('contributors', JSON.stringify(sanitizedContributors));
      }

      const response = await initiateUpload(formData);
      const payload = response?.data ?? {};
      const uploadId = payload['upload_id'] as string | undefined;
      const trackId = payload['track_id'] as number | undefined;

      if (coverArtData.file && trackId) {
        const coverFormData = new FormData();
        coverFormData.append('upload_type', 'track_cover');
        coverFormData.append('file', coverArtData.file);
        coverFormData.append('track_id', String(trackId));
        coverFormData.append('title', trimmedTitle);
        if (trackData.album) {
          coverFormData.append('album_id', trackData.album);
        }
        try {
          await initiateUpload(coverFormData);
        } catch (coverError) {
          console.error('Cover art upload failed', coverError);
          setSupportError('Cover art upload failed. You can retry from Upload Management.');
        }
      }

      setSuccessMessage(`${trimmedTitle} is being processed. You can monitor progress from Upload Management.`);
      setCurrentStep(3);

      setTimeout(() => {
        setTrackData({ title: '', genre: '', album: '', releaseDate: '', description: '' });
        setAudioFile(null);
        if (coverArtData.preview) {
          URL.revokeObjectURL(coverArtData.preview);
        }
        setCoverArtData({ file: null, fileName: null, preview: null });
        setContributors([
          {
            id: '1',
            name: stageName || '',
            email: userEmail,
            phone: '',
            role: 'Artist',
            royaltyPercentage: 100,
          },
        ]);
        setCurrentStep(0);
        setSuccessMessage('');
        if (uploadId) {
          navigate('/dashboard/upload-management', { state: { highlightUploadId: uploadId } });
        } else {
          navigate('/dashboard/upload-management');
        }
      }, 2000);
    } catch (err: any) {
      let message = 'Failed to upload track. Please try again.';
      const responseErrors = err?.response?.data?.errors;
      if (responseErrors && typeof responseErrors === 'object') {
        const firstKey = Object.keys(responseErrors)[0];
        const firstMessage = responseErrors[firstKey];
        if (Array.isArray(firstMessage) && firstMessage.length > 0) {
          message = String(firstMessage[0]);
        } else if (typeof firstMessage === 'string') {
          message = firstMessage;
        }
      } else if (err?.response?.data?.message) {
        message = String(err.response.data.message);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TrackInfoStep
            data={trackData}
            onChange={handleTrackInfoChange}
            genres={genres}
            albums={albums}
            audioFile={audioFile}
            onAudioSelect={handleAudioFileSelect}
            onAudioRemove={removeAudioFile}
            isLoading={supportLoading}
            errorMessage={supportError}
          />
        );
      case 1:
        return <CoverArtStep data={coverArtData} onFileSelect={handleCoverArtFile} onDrop={handleCoverArtDrop} onRemove={removeCoverArt} />;
      case 2:
        return <ContributorsStep contributors={contributors} onAdd={addContributor} onUpdate={updateContributor} onRemove={removeContributor} />;
      case 3:
        return (
          <ReviewStep
            data={{ trackData, coverArtData, contributors }}
            genreName={selectedGenre?.name ?? 'Not selected'}
            albumTitle={selectedAlbum?.title ?? 'No album selected'}
            audioFileName={audioFile?.name ?? null}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/upload-management')}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Uploads</span>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Add New Track</h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                  Complete track upload process for royalty management
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4 bg-white/60 dark:bg-slate-800/60 p-4 rounded-xl border border-gray-200 dark:border-slate-600 backdrop-blur-sm">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                  currentStep === step.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : currentStep > step.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/10 text-gray-400 border border-white/20'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-3 text-left">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step.id ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-200 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-800 dark:text-emerald-200 font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-8 mt-8 border-t border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={currentStep === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Previous
            </button>

            <div className="flex items-center space-x-4">
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`inline-flex items-center px-8 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg ${
                    loading
                      ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Upload
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={goToNextStep}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Step 1: Track Information Component
const TrackInfoStep: React.FC<{
  data: TrackData;
  onChange: (field: keyof TrackData, value: string) => void;
  genres: GenreOption[];
  albums: AlbumOption[];
  audioFile: File | null;
  onAudioSelect: (file: File) => void;
  onAudioRemove: () => void;
  isLoading: boolean;
  errorMessage?: string | null;
}> = ({ data, onChange, genres, albums, audioFile, onAudioSelect, onAudioRemove, isLoading, errorMessage }) => (
  <div className="space-y-6">
    <div className="flex items-center space-x-3 mb-6">
      <Music className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Track Information</h2>
    </div>

    {errorMessage && (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
        {errorMessage}
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Audio File <span className="text-red-500">*</span>
        </label>
        <div className={`rounded-lg border-2 border-dashed ${audioFile ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-900/10' : 'border-gray-300 dark:border-slate-600 bg-gray-50/40 dark:bg-slate-800/20'} p-4 transition-all duration-200`}>
          {audioFile ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{audioFile.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB • {audioFile.type || 'audio'}
                </p>
              </div>
              <button
                type="button"
                onClick={onAudioRemove}
                className="inline-flex items-center px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Remove file
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center space-y-3 cursor-pointer">
              <Upload className="w-8 h-8 text-indigo-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Select or drag in your audio file</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Supports MP3, WAV, AAC up to 100MB</p>
              </div>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => e.target.files?.[0] && onAudioSelect(e.target.files[0])}
                aria-label="Audio file"
                className="hidden"
              />
              <span className="px-4 py-2 rounded-md bg-indigo-600 text-white text-xs uppercase tracking-wide">Browse Files</span>
            </label>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="track-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Track Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange('title', e.target.value)}
          id="track-title"
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          placeholder="Enter track title"
        />
      </div>

      <div>
        <label htmlFor="track-genre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Genre <span className="text-red-500">*</span>
        </label>
        <select
          value={data.genre}
          onChange={(e) => onChange('genre', e.target.value)}
          id="track-genre"
          disabled={isLoading}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-60"
        >
          <option value="">Select Genre</option>
          {genres.map((genre) => (
            <option key={genre.id} value={genre.id}>{genre.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="track-album" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Album
        </label>
        <select
          value={data.album}
          onChange={(e) => onChange('album', e.target.value)}
          id="track-album"
          disabled={isLoading}
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 disabled:opacity-60"
        >
          <option value="">Select Album (Optional)</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>{album.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="track-release-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Release Date
        </label>
        <input
          type="date"
          value={data.releaseDate}
          onChange={(e) => onChange('releaseDate', e.target.value)}
          id="track-release-date"
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="track-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={data.description}
          onChange={(e) => onChange('description', e.target.value)}
          rows={4}
          id="track-description"
          className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          placeholder="Brief description of the track (optional)"
        />
      </div>
    </div>
  </div>
);

// Step 2: Cover Art Component
const CoverArtStep: React.FC<{
  data: CoverArtData;
  onFileSelect: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
}> = ({ data, onFileSelect, onDrop, onRemove }) => (
  <div className="space-y-6">
    <div className="flex items-center space-x-3 mb-6">
      <Image className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cover Artwork</h2>
    </div>

    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
        data.file
          ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20'
          : 'border-gray-300 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-800/20 hover:border-indigo-400 dark:hover:border-indigo-500'
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {data.file ? (
        <div className="space-y-4">
          <img
            src={data.preview!}
            alt="Cover art preview"
            className="w-48 h-48 object-cover rounded-lg mx-auto shadow-lg"
          />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white">{data.fileName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {(data.file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
          >
            Remove artwork
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <Image className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Upload Cover Art
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop your cover image here, or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Supports JPG, PNG up to 10MB
            </p>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg">
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

// Step 3: Contributors Component
const ContributorsStep: React.FC<{
  contributors: ContributorData[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof ContributorData, value: string | number) => void;
  onRemove: (id: string) => void;
}> = ({ contributors, onAdd, onUpdate, onRemove }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contributors & Rights</h2>
      </div>
      <button
        onClick={onAdd}
        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-md hover:shadow-lg"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Contributor
      </button>
    </div>

    <div className="space-y-4">
      {contributors.map((contributor, index) => (
        <div key={contributor.id} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contributor.name}
                onChange={(e) => onUpdate(contributor.id, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contributor.email}
                onChange={(e) => onUpdate(contributor.id, 'email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={contributor.phone}
                onChange={(e) => onUpdate(contributor.id, 'phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+233 XX XXX XXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={contributor.role}
                onChange={(e) => onUpdate(contributor.id, 'role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DEMO_CONTRIBUTOR_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Royalty % <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={contributor.royaltyPercentage}
                onChange={(e) => onUpdate(contributor.id, 'royaltyPercentage', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => onRemove(contributor.id)}
                className="p-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Royalty Summary */}
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Total Royalty Distribution:
        </span>
        <span className={`text-lg font-bold ${
          contributors.reduce((sum, c) => sum + c.royaltyPercentage, 0) > 100
            ? 'text-red-600 dark:text-red-400'
            : 'text-blue-900 dark:text-blue-100'
        }`}>
          {contributors.reduce((sum, c) => sum + c.royaltyPercentage, 0)}%
        </span>
      </div>
    </div>
  </div>
);

// Step 4: Review Component
const ReviewStep: React.FC<{
  data: ReviewData;
  genreName: string;
  albumTitle: string;
  audioFileName: string | null;
}> = ({ data, genreName, albumTitle, audioFileName }) => (
  <div className="space-y-6">
    <div className="flex items-center space-x-3 mb-6">
      <CheckCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review & Submit</h2>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Track Information */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
          Track Information
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Title:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{data.trackData.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Genre:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{genreName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Album:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{albumTitle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Release Date:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.trackData.releaseDate || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Audio File:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {audioFileName || 'No file selected'}
            </span>
          </div>
          {data.trackData.description && (
            <div className="pt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Description:</span>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {data.trackData.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cover Art */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
          Cover Artwork
        </h3>

        {data.coverArtData.preview ? (
          <div className="text-center">
            <img
              src={data.coverArtData.preview}
              alt="Cover art"
              className="w-32 h-32 object-cover rounded-lg mx-auto shadow-md"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {data.coverArtData.fileName}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No cover art uploaded</p>
        )}
      </div>

      {/* Contributors */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
          Contributors ({data.contributors.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.contributors.map((contributor) => (
            <div key={contributor.id} className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {contributor.name}
                </h4>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded">
                  {contributor.role}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3 h-3" />
                  <span>{contributor.email}</span>
                </div>
                {contributor.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3" />
                    <span>{contributor.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Percent className="w-3 h-3" />
                  <span>{contributor.royaltyPercentage}% royalty</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Royalty Summary */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              Total Royalty Distribution:
            </span>
            <span className="text-lg font-bold text-green-900 dark:text-green-100">
              {data.contributors.reduce((sum, c) => sum + c.royaltyPercentage, 0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default AddTrack;
