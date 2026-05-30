import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Target,
  Search,
  Filter,
  Play,
  Pause,
  Volume2,
  CheckCircle,
  XCircle,
  User,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Settings,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  RefreshCw,
  Download,
  FileText,
  Music,
  Mic,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  History,
  X
} from 'lucide-react';

interface QAMatch {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: string;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'reassigned';
  detectedAt: string;
  station: string;
  evidence: {
    audioSample?: string;
    metadata: {
      detectedTitle: string;
      detectedArtist: string;
      isrc?: string;
      label?: string;
      releaseYear?: number;
    };
    confidenceBreakdown: {
      acoustic: number;
      metadata: number;
      fingerprint: number;
    };
  };
  qaNotes?: string;
  assignedTo?: string;
  priority: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export const AttributionQA = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [selectedMatch, setSelectedMatch] = useState<QAMatch | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'audit' | 'config'>('queue');

  // Mock QA data
  const [qaMatches, setQaMatches] = useState<QAMatch[]>([
    {
      id: '1',
      title: 'Water No Get Enemy',
      artist: 'Fela Kuti',
      album: 'Expensive Shit',
      duration: '11:05',
      confidence: 72,
      status: 'pending',
      detectedAt: '2 minutes ago',
      station: 'Accra Central FM',
      evidence: {
        metadata: {
          detectedTitle: 'Water No Get Enemy',
          detectedArtist: 'Fela Kuti',
          isrc: 'NG0890900012',
          label: 'Knitting Factory Records',
          releaseYear: 1975
        },
        confidenceBreakdown: {
          acoustic: 85,
          metadata: 65,
          fingerprint: 70
        }
      },
      priority: 'high',
      lastUpdated: 'Just now'
    },
    {
      id: '2',
      title: 'Zombie',
      artist: 'Fela Kuti',
      album: 'Zombie',
      duration: '12:25',
      confidence: 58,
      status: 'pending',
      detectedAt: '15 minutes ago',
      station: 'Kumasi Rock FM',
      evidence: {
        metadata: {
          detectedTitle: 'Zombie',
          detectedArtist: 'Fela Kuti',
          isrc: 'NG0890900015',
          label: 'Knitting Factory Records',
          releaseYear: 1976
        },
        confidenceBreakdown: {
          acoustic: 45,
          metadata: 80,
          fingerprint: 55
        }
      },
      priority: 'medium',
      lastUpdated: '5 minutes ago'
    },
    {
      id: '3',
      title: 'Unknown Track',
      artist: 'Various Artists',
      duration: '4:32',
      confidence: 35,
      status: 'approved',
      detectedAt: '1 hour ago',
      station: 'Takoradi Wave FM',
      evidence: {
        metadata: {
          detectedTitle: 'Unknown Track',
          detectedArtist: 'Various Artists',
          releaseYear: 2023
        },
        confidenceBreakdown: {
          acoustic: 25,
          metadata: 40,
          fingerprint: 35
        }
      },
      qaNotes: 'Low confidence match - approved based on station context',
      assignedTo: 'QA Team Lead',
      priority: 'low',
      lastUpdated: '1 hour ago'
    }
  ]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 dark:text-green-400';
    if (confidence >= 60) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getPriorityBadge = (priority: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (priority) {
      case 'high':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'medium':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      case 'low':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800`;
      case 'approved':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'reassigned':
        return `${baseClasses} bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const filteredMatches = qaMatches.filter(match => {
    const matchesSearch = match.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.station.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || match.status === statusFilter;
    const matchesConfidence = confidenceFilter === 'all' ||
      (confidenceFilter === 'high' && match.confidence >= 80) ||
      (confidenceFilter === 'medium' && match.confidence >= 60 && match.confidence < 80) ||
      (confidenceFilter === 'low' && match.confidence < 60);

    return matchesSearch && matchesStatus && matchesConfidence;
  });

  const handleViewEvidence = (match: QAMatch) => {
    setSelectedMatch(match);
    setShowEvidenceModal(true);
  };

  const handleQADecision = (matchId: string, decision: 'approve' | 'reject' | 'reassign', notes?: string) => {
    setQaMatches(prev => prev.map(match =>
      match.id === matchId
        ? {
            ...match,
            status: decision,
            qaNotes: notes,
            assignedTo: decision === 'reassign' ? 'Reassigned' : match.assignedTo,
            lastUpdated: 'Just now'
          }
        : match
    ));
  };

  return (
    <div>
      {/* Attribution QA Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Attribution Quality Assurance
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Review and validate music attribution matches
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Queue</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>QA Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* QA Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          {[
            { id: 'queue', name: 'QA Queue', icon: Target, count: filteredMatches.filter(m => m.status === 'pending').length },
            { id: 'audit', name: 'Audit Log', icon: History, count: qaMatches.filter(m => m.status !== 'pending').length },
            { id: 'config', name: 'Configuration', icon: Settings, count: 0 }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count > 0 && (
                  <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* QA Queue Tab */}
      {activeTab === 'queue' && (
        <>
          {/* Filters and Search */}
          <div className="mb-8">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title, artist, or station..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="reassigned">Reassigned</option>
                </select>

                {/* Confidence Filter */}
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Confidence</option>
                  <option value="high">High (80%+)</option>
                  <option value="medium">Medium (60-79%)</option>
                  <option value="low">Low (&lt;60%)</option>
                </select>
              </div>
            </Card>
          </div>

          {/* QA Queue */}
          <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
            <div className="space-y-4">
              {filteredMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-600 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Match Info */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {match.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(match.priority)}`}>
                            {match.priority.toUpperCase()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(match.status)}`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p><strong>Artist:</strong> {match.artist}</p>
                          {match.album && <p><strong>Album:</strong> {match.album}</p>}
                          <p><strong>Station:</strong> {match.station}</p>
                          <p><strong>Detected:</strong> {match.detectedAt}</p>
                        </div>

                        {/* Confidence Score */}
                        <div className="mt-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence:</span>
                            <span className={`text-lg font-bold ${getConfidenceColor(match.confidence)}`}>
                              {match.confidence}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                match.confidence >= 80 ? 'bg-green-500' :
                                match.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${match.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewEvidence(match)}
                        className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {match.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleQADecision(match.id, 'approve')}
                            className="px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQADecision(match.id, 'reject')}
                            className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQADecision(match.id, 'reassign')}
                            className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredMatches.length === 0 && (
                <div className="text-center py-16">
                  <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No matches found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or filter criteria.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <History className="w-5 h-5 mr-2" />
            QA Audit Log
          </h3>

          <div className="space-y-4">
            {qaMatches.filter(m => m.status !== 'pending').map((match) => (
              <div key={match.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{match.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(match.status)}`}>
                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                      </span>
                      <span className={`text-sm ${getConfidenceColor(match.confidence)}`}>
                        {match.confidence}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Station:</strong> {match.station} • <strong>Decision by:</strong> {match.assignedTo || 'System'}
                    </p>
                    {match.qaNotes && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Notes:</strong> {match.qaNotes}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {match.lastUpdated}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            QA Configuration
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Confidence Thresholds */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confidence Thresholds</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto-Approve Threshold
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="80"
                      max="95"
                      defaultValue="85"
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12">85%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Human Review Threshold
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="50"
                      max="80"
                      defaultValue="60"
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12">60%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rejection Threshold
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="20"
                      max="50"
                      defaultValue="40"
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-12">40%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Algorithm Settings */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Algorithm Settings</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enable Acoustic Matching</span>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enable Metadata Matching</span>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Enable Fingerprint Matching</span>
                  <input type="checkbox" defaultChecked className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Cross-Station Validation</span>
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Queue Management</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configure how matches are prioritized and assigned</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Configuration
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Evidence Viewer Modal */}
      {showEvidenceModal && selectedMatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedMatch.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedMatch.artist} • {selectedMatch.station}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Match Details */}
                <div className="space-y-6">
                  {/* Basic Match Info */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Match Details</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Detected Title</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.metadata.detectedTitle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Detected Artist</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.metadata.detectedArtist}</span>
                      </div>
                      {selectedMatch.evidence.metadata.isrc && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">ISRC</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.metadata.isrc}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score</span>
                        <span className={`font-bold ${getConfidenceColor(selectedMatch.confidence)}`}>
                          {selectedMatch.confidence}%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Audio Player */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Music className="w-5 h-5 mr-2" />
                      Audio Evidence
                    </h3>
                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                      <div className="flex items-center space-x-4 mb-4">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all duration-500 w-1/3"></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>0:00</span>
                            <span>{selectedMatch.duration}</span>
                          </div>
                        </div>
                        <Volume2 className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Audio sample captured from station broadcast
                      </p>
                    </div>
                  </Card>

                  {/* Confidence Breakdown */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confidence Breakdown</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Acoustic Matching</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.confidenceBreakdown.acoustic}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${selectedMatch.evidence.confidenceBreakdown.acoustic}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Metadata Matching</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.confidenceBreakdown.metadata}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${selectedMatch.evidence.confidenceBreakdown.metadata}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">Fingerprint Matching</span>
                          <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.evidence.confidenceBreakdown.fingerprint}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${selectedMatch.evidence.confidenceBreakdown.fingerprint}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - QA Actions */}
                <div className="space-y-6">
                  {/* QA Decision */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QA Decision</h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Approve Match</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2">
                        <XCircle className="w-5 h-5" />
                        <span>Reject Match</span>
                      </button>
                      <button className="w-full px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                        <UserCheck className="w-5 h-5" />
                        <span>Reassign for Review</span>
                      </button>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        QA Notes (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Add notes about your decision..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </Card>

                  {/* Station Context */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Station Context</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Station</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.station}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Detection Time</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedMatch.detectedAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Status</span>
                        <span className={`font-medium ${getStatusBadge(selectedMatch.status)}`}>
                          {selectedMatch.status.charAt(0).toUpperCase() + selectedMatch.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowEvidenceModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
