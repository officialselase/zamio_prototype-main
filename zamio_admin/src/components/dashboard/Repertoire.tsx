import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Database,
  Upload,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  Music,
  User,
  Calendar,
  Clock,
  TrendingUp,
  Settings,
  History,
  Plus,
  X,
  ChevronDown,
  BarChart3,
  FileSpreadsheet,
  FileAudio,
  FileCode,
  Check,
  AlertCircle,
  Info,
  RotateCcw
} from 'lucide-react';

interface RepertoireTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  isrc?: string;
  duration: string;
  genre?: string;
  releaseYear?: number;
  label?: string;
  status: 'active' | 'pending' | 'conflict' | 'archived';
  lastUpdated: string;
  importSource?: string;
  conflicts?: string[];
  metadataQuality: 'high' | 'medium' | 'low';
  playCount?: number;
  lastPlayed?: string;
}

interface ImportLog {
  id: string;
  filename: string;
  type: 'CSV' | 'CWR' | 'DDEX';
  status: 'success' | 'partial' | 'failed';
  importedAt: string;
  totalTracks: number;
  successCount: number;
  errorCount: number;
  conflicts: number;
  processedBy: string;
}

export const Repertoire = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'import' | 'logs' | 'metadata'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<RepertoireTrack | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  // Mock repertoire data
  const [repertoireTracks, setRepertoireTracks] = useState<RepertoireTrack[]>([
    {
      id: '1',
      title: 'Water No Get Enemy',
      artist: 'Fela Kuti',
      album: 'Expensive Shit',
      isrc: 'NG0890900012',
      duration: '11:05',
      genre: 'Afrobeat',
      releaseYear: 1975,
      label: 'Knitting Factory Records',
      status: 'active',
      lastUpdated: '2 days ago',
      importSource: 'DDEX Import #2024-001',
      metadataQuality: 'high',
      playCount: 15420,
      lastPlayed: '1 hour ago'
    },
    {
      id: '2',
      title: 'Zombie',
      artist: 'Fela Kuti',
      album: 'Zombie',
      isrc: 'NG0890900015',
      duration: '12:25',
      genre: 'Afrobeat',
      releaseYear: 1976,
      label: 'Knitting Factory Records',
      status: 'conflict',
      lastUpdated: '1 day ago',
      importSource: 'CSV Import #2024-002',
      conflicts: ['Duplicate ISRC with track #1', 'Missing duration'],
      metadataQuality: 'medium',
      playCount: 12890,
      lastPlayed: '3 hours ago'
    },
    {
      id: '3',
      title: 'Unknown Track',
      artist: 'Various Artists',
      duration: '4:32',
      genre: 'Unknown',
      status: 'pending',
      lastUpdated: 'Just now',
      importSource: 'CWR Import #2024-003',
      conflicts: ['Missing artist information', 'Low metadata quality'],
      metadataQuality: 'low',
      playCount: 0
    }
  ]);

  // Mock import logs
  const [importLogs, setImportLogs] = useState<ImportLog[]>([
    {
      id: '1',
      filename: 'repertoire_oct_2024.ddex',
      type: 'DDEX',
      status: 'success',
      importedAt: '2 hours ago',
      totalTracks: 1250,
      successCount: 1245,
      errorCount: 5,
      conflicts: 12,
      processedBy: 'System'
    },
    {
      id: '2',
      filename: 'backup_catalog.csv',
      type: 'CSV',
      status: 'partial',
      importedAt: '1 day ago',
      totalTracks: 800,
      successCount: 750,
      errorCount: 50,
      conflicts: 25,
      processedBy: 'Admin User'
    },
    {
      id: '3',
      filename: 'urgent_updates.cwr',
      type: 'CWR',
      status: 'failed',
      importedAt: '3 days ago',
      totalTracks: 150,
      successCount: 0,
      errorCount: 150,
      conflicts: 45,
      processedBy: 'System'
    }
  ]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'pending':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'conflict':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'archived':
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getQualityBadge = (quality: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (quality) {
      case 'high':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'medium':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'low':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getImportStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const filteredTracks = repertoireTracks.filter(track => {
    const matchesSearch = track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (track.isrc && track.isrc.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || track.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleViewMetadata = (track: RepertoireTrack) => {
    setSelectedTrack(track);
    setShowMetadataModal(true);
  };

  const handleImportFile = () => {
    setIsImporting(true);
    setImportProgress(0);

    // Simulate import progress
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsImporting(false);
          // Add new import log
          const newLog: ImportLog = {
            id: Date.now().toString(),
            filename: `import_${Date.now()}.csv`,
            type: 'CSV',
            status: 'success',
            importedAt: 'Just now',
            totalTracks: 500,
            successCount: 485,
            errorCount: 15,
            conflicts: 8,
            processedBy: 'Admin User'
          };
          setImportLogs(prev => [newLog, ...prev]);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const handleRollback = (logId: string) => {
    // Simulate rollback
    setImportLogs(prev => prev.map(log =>
      log.id === logId ? { ...log, status: 'failed' as const } : log
    ));
  };

  return (
    <div>
      {/* Repertoire Management Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Repertoire Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Import, manage, and validate music catalog data
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Import Data</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Catalog</span>
            </button>
          </div>
        </div>
      </div>

      {/* Repertoire Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'catalog', name: 'Catalog Browser', icon: Database, count: repertoireTracks.length },
            { id: 'import', name: 'Data Import', icon: Upload, count: 0 },
            { id: 'logs', name: 'Import Logs', icon: History, count: importLogs.length },
            { id: 'metadata', name: 'Metadata Tools', icon: Settings, count: 0 }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Browser Tab */}
      {activeTab === 'catalog' && (
        <>
          {/* Search and Filters */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title, artist, or ISRC..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="conflict">Conflicts</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </Card>
          </div>

          {/* Catalog Grid */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{track.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(track.status)}`}>
                          {track.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{track.artist}</p>
                      {track.album && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 truncate">{track.album}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {track.isrc && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">ISRC:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{track.isrc}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{track.duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                      <span className={`font-medium ${getQualityBadge(track.metadataQuality)}`}>
                        {track.metadataQuality}
                      </span>
                    </div>
                  </div>

                  {track.conflicts && track.conflicts.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Conflicts</span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {track.conflicts.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Updated {track.lastUpdated}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewMetadata(track)}
                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/20 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredTracks.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tracks found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Data Import Tab */}
      {activeTab === 'import' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Data Import Interface
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Import Options */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Import Formats</h4>
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-500" />
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">CSV Import</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Standard spreadsheet format</p>
                    </div>
                  </div>
                  <button
                    onClick={handleImportFile}
                    disabled={isImporting}
                    className="w-full px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Import CSV'}
                  </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileAudio className="w-8 h-8 text-blue-500" />
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">CWR Import</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Common Works Registration</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    Import CWR
                  </button>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                  <div className="flex items-center space-x-3 mb-3">
                    <FileCode className="w-8 h-8 text-purple-500" />
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">DDEX Import</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Digital Data Exchange</p>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                    Import DDEX
                  </button>
                </div>
              </div>
            </div>

            {/* Import Progress */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Import Progress</h4>
              {isImporting ? (
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Processing... {importProgress}%
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Upload className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Select an import format to begin
                  </p>
                </div>
              )}

              {/* Import Settings */}
              <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3">Import Settings</h5>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Validate metadata</span>
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Auto-resolve conflicts</span>
                    <input type="checkbox" className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Create backup</span>
                    <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Import Logs Tab */}
      {activeTab === 'logs' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Import History & Logs
          </h3>

          <div className="space-y-4">
            {importLogs.map((log) => (
              <div key={log.id} className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {getImportStatusIcon(log.status)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{log.filename}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                          {log.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Total Tracks</p>
                          <p className="font-medium text-gray-900 dark:text-white">{log.totalTracks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Successful</p>
                          <p className="font-medium text-green-600 dark:text-green-400">{log.successCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
                          <p className="font-medium text-red-600 dark:text-red-400">{log.errorCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Conflicts</p>
                          <p className="font-medium text-amber-600 dark:text-amber-400">{log.conflicts}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Imported {log.importedAt} • Processed by {log.processedBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </button>
                    {log.status === 'success' && (
                      <button
                        onClick={() => handleRollback(log.id)}
                        className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metadata Tools Tab */}
      {activeTab === 'metadata' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Metadata Management & Validation
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Validation Rules */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Validation Rules</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Required Fields</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Title, Artist, ISRC must be present</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">ISRC Format Validation</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Check ISRC code format and uniqueness</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Duration Validation</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Validate track duration format</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Duplicate Detection</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Identify potential duplicate entries</p>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                </div>
              </div>
            </div>

            {/* Bulk Operations */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Bulk Operations</h4>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                  <Check className="w-5 h-5" />
                  <span>Validate All Metadata</span>
                </button>
                <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh Metadata Cache</span>
                </button>
                <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>Fix Common Issues</span>
                </button>
                <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                  <Trash2 className="w-5 h-5" />
                  <span>Clean Invalid Records</span>
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Quality Overview */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Metadata Quality Overview</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">85%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Quality</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">2,450 tracks</p>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">12%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medium Quality</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">350 tracks</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">3%</div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Low Quality</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">85 tracks</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Metadata Viewer Modal */}
      {showMetadataModal && selectedTrack && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-400 dark:to-indigo-500 rounded-xl flex items-center justify-center">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedTrack.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedTrack.artist} • {selectedTrack.status}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMetadataModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Track Details */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Track Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Title</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Artist</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.artist}</span>
                      </div>
                      {selectedTrack.album && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Album</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.album}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.duration}</span>
                      </div>
                      {selectedTrack.isrc && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">ISRC</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.isrc}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Additional Metadata */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Metadata</h3>
                    <div className="space-y-3">
                      {selectedTrack.genre && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Genre</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.genre}</span>
                        </div>
                      )}
                      {selectedTrack.releaseYear && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Release Year</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.releaseYear}</span>
                        </div>
                      )}
                      {selectedTrack.label && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Label</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.label}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Quality Score</span>
                        <span className={`font-medium ${getQualityBadge(selectedTrack.metadataQuality)}`}>
                          {selectedTrack.metadataQuality}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                  {/* Status & Conflicts */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status & Issues</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedTrack.status)}`}>
                          {selectedTrack.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.lastUpdated}</span>
                      </div>
                      {selectedTrack.importSource && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Import Source</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedTrack.importSource}</span>
                        </div>
                      )}
                    </div>

                    {selectedTrack.conflicts && selectedTrack.conflicts.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Conflicts Detected</h4>
                        <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                          {selectedTrack.conflicts.map((conflict, index) => (
                            <li key={index}>• {conflict}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>

                  {/* Usage Statistics */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Play Count</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedTrack.playCount?.toLocaleString() || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Played</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedTrack.lastPlayed || 'Never'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Actions */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                        <Edit className="w-5 h-5" />
                        <span>Edit Metadata</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <Check className="w-5 h-5" />
                        <span>Resolve Conflicts</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center space-x-2">
                        <RefreshCw className="w-5 h-5" />
                        <span>Re-validate</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <Trash2 className="w-5 h-5" />
                        <span>Archive Track</span>
                      </button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowMetadataModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
