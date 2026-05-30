import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Album,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Music,
  Play,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  fetchArtistAlbums,
  createArtistAlbum,
  updateArtistAlbum,
  deleteArtistAlbum,
  type AlbumSummary,
  type AlbumListStats,
  type AlbumListPagination,
} from '../lib/api';
import ProtectedImage from '../components/ProtectedImage';

interface AlbumData {
  id: number;
  title: string;
  artist: string;
  genre: string;
  releaseDate: string | null;
  trackCount: number;
  totalPlays: number;
  totalRevenue: number;
  coverArt?: string | null;
  status: 'active' | 'inactive' | 'draft';
  rawStatus?: string | null;
  createdAt: string;
}

interface AlbumFormState {
  title: string;
  genre: string;
  releaseDate: string;
}

const genreOptions = [
  'Afrobeats',
  'Afro Pop',
  'Highlife',
  'Hip Hop',
  'Gospel',
  'Reggae',
  'Dancehall',
  'R&B',
  'Traditional',
  'Jazz',
  'Mixed',
  'Podcast',
];

const mapAlbumSummaryToData = (item: AlbumSummary): AlbumData => ({
  id: item.id,
  title: item.title,
  artist: item.artist,
  genre: item.genre ?? 'Uncategorized',
  releaseDate: item.release_date ?? null,
  trackCount: typeof item.track_count === 'number' ? item.track_count : 0,
  totalPlays: typeof item.total_plays === 'number' ? item.total_plays : 0,
  totalRevenue: Number(item.total_revenue ?? 0),
  coverArt: item.cover_art_url ?? undefined,
  status: item.status,
  rawStatus: item.raw_status ?? undefined,
  createdAt: item.created_at,
});

const defaultStats: AlbumListStats = {
  total: 0,
  active: 0,
  inactive: 0,
  draft: 0,
};

const AlbumList: React.FC = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [stats, setStats] = useState<AlbumListStats>(defaultStats);
  const [pagination, setPagination] = useState<AlbumListPagination | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumData | null>(null);
  const [formState, setFormState] = useState<AlbumFormState>({
    title: '',
    genre: '',
    releaseDate: '',
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const updateCoverPreview = useCallback((next: string | null) => {
    setCoverPreview((previous) => {
      if (previous && previous.startsWith('blob:')) {
        URL.revokeObjectURL(previous);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreview && coverPreview.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  const pageSize = 9;

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!actionMessage) {
      return;
    }
    const timer = window.setTimeout(() => setActionMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  const loadAlbums = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchArtistAlbums({
          page: pageToLoad,
          page_size: pageSize,
          search: debouncedSearch || undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        const payload = response?.data;
        const remoteAlbums = payload?.albums ?? [];
        setAlbums(remoteAlbums.map(mapAlbumSummaryToData));

        if (payload?.stats) {
          setStats(payload.stats);
        } else {
          setStats(defaultStats);
        }

        if (payload?.pagination) {
          setPagination(payload.pagination);
          if (payload.pagination.page !== currentPage) {
            setCurrentPage(payload.pagination.page);
          }
        } else {
          setPagination(null);
        }
      } catch (err) {
        setError('Unable to load albums. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [currentPage, debouncedSearch, pageSize, selectedStatus, sortBy, sortOrder],
  );

  useEffect(() => {
    loadAlbums(currentPage);
  }, [loadAlbums, currentPage]);

  useEffect(() => {
    setCurrentPage((prev) => (prev === 1 ? prev : 1));
  }, [debouncedSearch, selectedStatus, sortBy, sortOrder]);

  const filteredAlbums = useMemo(() => {
    if (selectedGenre === 'all') {
      return albums;
    }
    return albums.filter((album) => album.genre.toLowerCase() === selectedGenre.toLowerCase());
  }, [albums, selectedGenre]);

  const totalRevenueValue = useMemo(
    () => filteredAlbums.reduce((sum, album) => sum + (Number.isFinite(album.totalRevenue) ? album.totalRevenue : 0), 0),
    [filteredAlbums],
  );

  const formatDate = (value: string | null) => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }
    return parsed.toLocaleDateString();
  };

  const handleOpenCreateModal = () => {
    setEditingAlbum(null);
    setFormState({ title: '', genre: '', releaseDate: '' });
    setCoverFile(null);
    updateCoverPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (album: AlbumData) => {
    setEditingAlbum(album);
    setFormState({
      title: album.title,
      genre: album.genre === 'Uncategorized' ? '' : album.genre,
      releaseDate: album.releaseDate ? album.releaseDate.slice(0, 10) : '',
    });
    setCoverFile(null);
    updateCoverPreview(album.coverArt ?? null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSavingAlbum) {
      return;
    }
    setIsModalOpen(false);
    setEditingAlbum(null);
    setFormState({ title: '', genre: '', releaseDate: '' });
    setCoverFile(null);
    updateCoverPreview(null);
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCoverFile(file);

    if (file) {
      updateCoverPreview(URL.createObjectURL(file));
    } else if (editingAlbum?.coverArt) {
      updateCoverPreview(editingAlbum.coverArt);
    } else {
      updateCoverPreview(null);
    }
  };

  const handleSubmitAlbum = async () => {
    const trimmedTitle = formState.title.trim();
    if (!trimmedTitle) {
      setActionMessage('Album title is required.');
      return;
    }

    setIsSavingAlbum(true);
    try {
      if (editingAlbum) {
        await updateArtistAlbum(editingAlbum.id, {
          title: trimmedTitle,
          release_date: formState.releaseDate || undefined,
          genre: formState.genre || undefined,
          cover_art: coverFile ?? undefined,
        });
        setActionMessage('Album updated successfully.');
      } else {
        await createArtistAlbum({
          title: trimmedTitle,
          release_date: formState.releaseDate || undefined,
          genre: formState.genre || undefined,
          cover_art: coverFile ?? undefined,
        });
        setActionMessage('Album created successfully.');
      }

      await loadAlbums(currentPage);
      setIsModalOpen(false);
      setEditingAlbum(null);
      setFormState({ title: '', genre: '', releaseDate: '' });
      setCoverFile(null);
      updateCoverPreview(null);
    } catch (err) {
      setActionMessage('Unable to save album. Please try again.');
    } finally {
      setIsSavingAlbum(false);
    }
  };

  const handleDeleteAlbum = async (album: AlbumData) => {
    const shouldDelete = window.confirm(`Remove album "${album.title}"?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteArtistAlbum(album.id);
      const effectivePageSize = pagination?.page_size ?? pageSize;
      const remaining = (pagination?.total_count ?? albums.length) - 1;
      const newTotalPages = Math.max(1, Math.ceil(Math.max(remaining, 0) / effectivePageSize));
      const targetPage = Math.min(currentPage, newTotalPages);
      await loadAlbums(targetPage);
      setCurrentPage(targetPage);
      setActionMessage('Album removed successfully.');
    } catch (err) {
      setActionMessage('Unable to remove album. Please try again.');
    }
  };

  const handleViewAlbum = (albumId: number) => {
    navigate(`/dashboard/album-details?albumId=${albumId}`, { state: { albumId } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'draft':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const totalPages = pagination?.total_pages ?? 1;

  const handleNextPage = () => {
    if (pagination?.has_next) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pagination?.has_previous && currentPage > 1) {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  };

  return (
    <>
      <div className="border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm mb-2" aria-label="Breadcrumb">
                <button
                  onClick={() => navigate('/dashboard/upload-management')}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-1"
                  aria-label="Go back to upload management"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Upload Management</span>
                  <span className="sm:hidden">Back</span>
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">Album Management</span>
              </nav>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Album Management</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                Manage your music albums, track performance, and organize your catalog
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Add Album</span>
              </button>
            </div>
          </div>
          {actionMessage && (
            <div className="mt-4 inline-flex items-center space-x-2 px-3 py-2 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{actionMessage}</span>
            </div>
          )}
          {error && (
            <div className="mt-4 inline-flex items-center space-x-2 px-3 py-2 rounded-md bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Albums</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {stats.total}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Album className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-emerald-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Active Albums</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {stats.active}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Play className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Draft Albums</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-300">
                  {stats.draft}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Edit className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 hover:border-purple-300 dark:hover:border-purple-700/70 group cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                  ₵{totalRevenueValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Music className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-8 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Album className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Album Catalog
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search albums..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Genres</option>
                {genreOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-600 dark:text-gray-300">
              <svg className="animate-spin h-5 w-5 mr-3 text-indigo-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              Loading albums...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlbums.map((album) => (
                  <div key={album.id} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-600 p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 group">
                    <div className="relative mb-4">
                      <div className="w-full aspect-square bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center">
                        {album.coverArt ? (
                          <ProtectedImage
                            src={album.coverArt}
                            alt={`${album.title} cover`}
                            className="w-full h-full object-cover rounded-lg"
                            fallback={<Album className="w-16 h-16 text-indigo-400 dark:text-indigo-300" />}
                          />
                        ) : (
                          <Album className="w-16 h-16 text-indigo-400 dark:text-indigo-300" />
                        )}
                      </div>
                      <span className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(album.status)}`}>
                        {album.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200 truncate">
                        {album.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">by {album.artist}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{album.genre}</p>

                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-2">
                        <span className="flex items-center space-x-1">
                          <Music className="w-4 h-4" />
                          <span>{album.trackCount} tracks</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(album.releaseDate)}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-200 dark:border-slate-700">
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900 dark:text-white">
                            {album.totalPlays.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Plays</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-600 dark:text-green-400">
                            ₵{album.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          onClick={() => handleViewAlbum(album.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors duration-200"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(album)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAlbum(album)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAlbums.length === 0 && (
                <div className="text-center py-16">
                  <Album className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No albums found</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm || selectedGenre !== 'all' || selectedStatus !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first album to get started.'}
                  </p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {pagination?.page ?? currentPage} of {totalPages}
                  </span>
                  <div className="space-x-3">
                    <button
                      onClick={handlePreviousPage}
                      disabled={!pagination?.has_previous}
                      className={`px-4 py-2 rounded-md border text-sm transition-colors duration-200 ${
                        pagination?.has_previous
                          ? 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                          : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={!pagination?.has_next}
                      className={`px-4 py-2 rounded-md border text-sm transition-colors duration-200 ${
                        pagination?.has_next
                          ? 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                          : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingAlbum ? 'Edit Album' : 'Add New Album'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="album-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Album Title
                </label>
                <input
                  type="text"
                  id="album-title"
                  value={formState.title}
                  onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter album title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="album-genre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  id="album-genre"
                  value={formState.genre}
                  onChange={(e) => setFormState((prev) => ({ ...prev, genre: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Genre (optional)</option>
                  {genreOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="album-release-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Release Date
                </label>
                <input
                  type="date"
                  id="album-release-date"
                  value={formState.releaseDate}
                  onChange={(e) => setFormState((prev) => ({ ...prev, releaseDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label htmlFor="album-cover" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Album Cover
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                    {coverPreview || editingAlbum?.coverArt ? (
                      <ProtectedImage
                        src={coverPreview ?? editingAlbum?.coverArt ?? ''}
                        alt="Album cover preview"
                        className="w-full h-full object-cover"
                        fallback={<Album className="w-8 h-8 text-gray-400" />}
                      />
                    ) : (
                      <Album className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="album-cover"
                      accept="image/*"
                      onChange={handleCoverChange}
                      disabled={isSavingAlbum}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 focus:outline-none"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Upload a square image (JPG, PNG, GIF, or WEBP) up to 10MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  disabled={isSavingAlbum}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAlbum}
                  disabled={isSavingAlbum}
                  className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
                    isSavingAlbum
                      ? 'bg-purple-300 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                  }`}
                >
                  {isSavingAlbum ? 'Saving...' : editingAlbum ? 'Save Changes' : 'Create Album'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AlbumList;
