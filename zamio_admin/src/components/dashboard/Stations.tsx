import { useState } from 'react';
import { Card } from '@zamio/ui';
import {
  Radio,
  Search,
  Filter,
  MoreHorizontal,
  Settings,
  Activity,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Music,
  Wifi,
  WifiOff,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Calendar,
  BarChart3,
  FileText,
  Globe,
  Server,
  Zap,
  Shield,
  Database
} from 'lucide-react';

interface Station {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  performance: number;
  lastSeen: string;
  totalStreams: number;
  avgConfidence: number;
  totalArtists: number;
  region: string;
  stationClass: string;
  monthlyRevenue: number;
}

export const Stations = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'performance' | 'revenue'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Mock station data
  const [stations, setStations] = useState<Station[]>([
    {
      id: '1',
      name: 'Accra Central FM',
      location: 'Accra, Ghana',
      status: 'online',
      performance: 95,
      lastSeen: '2 minutes ago',
      totalStreams: 15420,
      avgConfidence: 87,
      totalArtists: 2340,
      region: 'Greater Accra',
      stationClass: 'A',
      monthlyRevenue: 45000
    },
    {
      id: '2',
      name: 'Kumasi Rock FM',
      location: 'Kumasi, Ghana',
      status: 'online',
      performance: 88,
      lastSeen: '5 minutes ago',
      totalStreams: 12890,
      avgConfidence: 82,
      totalArtists: 1890,
      region: 'Ashanti',
      stationClass: 'B',
      monthlyRevenue: 32000
    },
    {
      id: '3',
      name: 'Takoradi Wave FM',
      location: 'Takoradi, Ghana',
      status: 'offline',
      performance: 0,
      lastSeen: '2 hours ago',
      totalStreams: 8750,
      avgConfidence: 79,
      totalArtists: 1250,
      region: 'Western',
      stationClass: 'B',
      monthlyRevenue: 18500
    },
    {
      id: '4',
      name: 'Tamale Community Radio',
      location: 'Tamale, Ghana',
      status: 'maintenance',
      performance: 45,
      lastSeen: '1 day ago',
      totalStreams: 5620,
      avgConfidence: 74,
      totalArtists: 890,
      region: 'Northern',
      stationClass: 'C',
      monthlyRevenue: 12000
    },
    {
      id: '5',
      name: 'Cape Coast FM',
      location: 'Cape Coast, Ghana',
      status: 'online',
      performance: 92,
      lastSeen: '1 minute ago',
      totalStreams: 11200,
      avgConfidence: 85,
      totalArtists: 1650,
      region: 'Central',
      stationClass: 'A',
      monthlyRevenue: 28500
    }
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-amber-500" />;
      default:
        return <Radio className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'online':
        return `${baseClasses} bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800`;
      case 'offline':
        return `${baseClasses} bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800`;
      case 'maintenance':
        return `${baseClasses} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800`;
      default:
        return `${baseClasses} bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800`;
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return 'text-green-600 dark:text-green-400';
    if (performance >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const filteredStations = stations.filter(station => {
    const matchesSearch = station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         station.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
    const matchesRegion = regionFilter === 'all' || station.region === regionFilter;

    return matchesSearch && matchesStatus && matchesRegion;
  });

  const sortedStations = [...filteredStations].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'name') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStations(sortedStations.map(s => s.id));
    } else {
      setSelectedStations([]);
    }
  };

  const handleSelectStation = (stationId: string, checked: boolean) => {
    if (checked) {
      setSelectedStations([...selectedStations, stationId]);
    } else {
      setSelectedStations(selectedStations.filter(id => id !== stationId));
    }
  };

  const handleSort = (column: 'name' | 'performance' | 'revenue') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortOrder === 'asc' ?
      <TrendingUp className="w-4 h-4 text-indigo-500" /> :
      <TrendingDown className="w-4 h-4 text-indigo-500" />;
  };

  const handleViewStation = (station: Station) => {
    setSelectedStation(station);
    setShowDetailsModal(true);
  };

  const handleEditStation = (station: Station) => {
    // TODO: Implement edit functionality
    console.log('Edit station:', station);
  };

  const handleDeleteStation = (stationId: string) => {
    // TODO: Implement delete functionality
    console.log('Delete station:', stationId);
  };

  return (
    <div>
      {/* Station Management Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Radio className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Station Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  Monitor and manage radio stations across the platform
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Station</span>
            </button>
            <button className="px-4 py-2 bg-white/80 dark:bg-slate-800/80 text-gray-700 dark:text-gray-300 rounded-lg font-medium border border-gray-200 dark:border-slate-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Bulk Actions</span>
            </button>
          </div>
        </div>
      </div>

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
                  placeholder="Search stations by name or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Region Filter */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Regions</option>
                <option value="Greater Accra">Greater Accra</option>
                <option value="Ashanti">Ashanti</option>
                <option value="Western">Western</option>
                <option value="Northern">Northern</option>
                <option value="Central">Central</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Stations Table */}
      <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedStations.length === sortedStations.length && sortedStations.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedStations.length > 0 ? `${selectedStations.length} selected` : 'Select all'}
                </span>
              </div>
            </div>

            {selectedStations.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedStations.length} stations selected
                </span>
                <button className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30">
                  Bulk Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectedStations.length === sortedStations.length && sortedStations.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <span>Station</span>
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Performance</th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('revenue')}
                    className="flex items-center space-x-1 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <span>Revenue</span>
                    {getSortIcon('revenue')}
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Streams</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Artists</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Last Seen</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStations.map((station) => (
                <tr key={station.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedStations.includes(station.id)}
                      onChange={(e) => handleSelectStation(station.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center">
                        <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{station.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {station.location}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(station.status)}
                      <span className={getStatusBadge(station.status)}>
                        {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${station.performance >= 90 ? 'bg-green-500' : station.performance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                      <span className={`font-medium ${getPerformanceColor(station.performance)}`}>
                        {station.performance}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      ₵{station.monthlyRevenue.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-600 dark:text-gray-300">
                      {station.totalStreams.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-gray-600 dark:text-gray-300">
                      {station.totalArtists.toLocaleString()}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {station.lastSeen}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewStation(station)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditStation(station)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStation(station.id)}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedStations.length === 0 && (
          <div className="text-center py-16">
            <Radio className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No stations found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </Card>

      {/* Station Performance Summary */}
      <div className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-200/50 dark:border-slate-600/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Online Stations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stations.filter(s => s.status === 'online').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50/90 via-orange-50/80 to-yellow-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/50 dark:border-slate-600/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Avg Performance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {Math.round(stations.reduce((acc, s) => acc + s.performance, 0) / stations.length)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50/90 via-sky-50/80 to-cyan-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Total Streams</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {stations.reduce((acc, s) => acc + s.totalStreams, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center">
                <Music className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50/90 via-violet-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-normal text-gray-700 dark:text-slate-300 leading-relaxed">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  ₵{stations.reduce((acc, s) => acc + s.monthlyRevenue, 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Station Details Modal */}
      {showDetailsModal && selectedStation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 dark:from-blue-400 dark:to-cyan-500 rounded-xl flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedStation.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {selectedStation.location}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Station Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Station Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Station ID</label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedStation.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Region</label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedStation.region}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Station Class</label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedStation.stationClass}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(selectedStation.status)}
                          <span className={getStatusBadge(selectedStation.status)}>
                            {selectedStation.status.charAt(0).toUpperCase() + selectedStation.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Performance Metrics */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Performance Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="text-center">
                        <div className={`text-3xl font-bold ${getPerformanceColor(selectedStation.performance)}`}>
                          {selectedStation.performance}%
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Performance Score</p>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">
                          {selectedStation.avgConfidence}%
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
                      </div>
                    </div>
                  </Card>

                  {/* Activity Log */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Recent Activity
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Station came online</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Configuration updated</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">1 hour ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Performance dip detected</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">3 hours ago</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Right Column - Configuration & Actions */}
                <div className="space-y-6">
                  {/* Quick Stats */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Streams</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedStation.totalStreams.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Artists</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedStation.totalArtists.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ₵{selectedStation.monthlyRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Last Seen</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {selectedStation.lastSeen}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Configuration Options */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Configuration
                    </h3>
                    <div className="space-y-3">
                      <button className="w-full px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                        Update Station Settings
                      </button>
                      <button className="w-full px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        Restart Station Service
                      </button>
                      <button className="w-full px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                        Run Diagnostics
                      </button>
                      <button className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        Maintenance Mode
                      </button>
                    </div>
                  </Card>

                  {/* System Information */}
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Server className="w-5 h-5 mr-2" />
                      System Info
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Uptime</span>
                        <span className="font-medium text-gray-900 dark:text-white">15d 8h 32m</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CPU Usage</span>
                        <span className="font-medium text-gray-900 dark:text-white">23%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Memory</span>
                        <span className="font-medium text-gray-900 dark:text-white">1.2GB / 4GB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Storage</span>
                        <span className="font-medium text-gray-900 dark:text-white">45GB / 100GB</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
