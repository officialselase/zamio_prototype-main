import React, { useState } from 'react';
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Bug,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Send,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Flag,
  Eye,
  Heart,
  Share2,
  Download,
  RefreshCw,
  Award,
  Target,
  Zap,
  Crown,
  Gem,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info as InfoIcon,
  FileText,
  Image,
  Paperclip,
  Smile,
  Frown,
  Meh,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  MapPin,
  Globe,
  Wifi,
  Monitor,
  Smartphone,
  Headphones,
  Music,
  DollarSign,
  BarChart3,
  Activity,
  Settings,
  Bell,
  User,
  HelpCircle,
  Phone,
  Mail,
  Instagram,
  Twitter,
  Facebook,
  X
} from 'lucide-react';

// Mock feedback data
const feedbackData = {
  platformRating: 4.2,
  totalReviews: 1247,
  ratingDistribution: [
    { stars: 5, count: 687, percentage: 55 },
    { stars: 4, count: 342, percentage: 27 },
    { stars: 3, count: 156, percentage: 13 },
    { stars: 2, count: 45, percentage: 4 },
    { stars: 1, count: 17, percentage: 1 }
  ],
  recentReviews: [
    {
      id: 1,
      user: 'Kofi Mensah',
      avatar: '/api/placeholder/40/40',
      rating: 5,
      title: 'Excellent Platform for Artists',
      content: 'Zamio has revolutionized how I track my music royalties. The interface is intuitive and the reporting is comprehensive. Highly recommended!',
      date: '2024-01-15',
      verified: true,
      likes: 23,
      replies: 2,
      category: 'general'
    },
    {
      id: 2,
      user: 'Ama Serwaa',
      avatar: '/api/placeholder/40/40',
      rating: 4,
      title: 'Great for Tracking Royalties',
      content: 'The royalty tracking is excellent, but I wish there were more detailed analytics for individual songs.',
      date: '2024-01-14',
      verified: true,
      likes: 15,
      replies: 1,
      category: 'analytics'
    },
    {
      id: 3,
      user: 'Kwame Asante',
      avatar: '/api/placeholder/40/40',
      rating: 3,
      title: 'Good but needs improvement',
      content: 'Platform works well for basic royalty tracking, but the mobile app needs better functionality.',
      date: '2024-01-13',
      verified: false,
      likes: 8,
      replies: 0,
      category: 'mobile'
    }
  ],
  featureRequests: [
    {
      id: 1,
      title: 'Advanced Analytics Dashboard',
      description: 'More detailed analytics with custom date ranges and export options',
      votes: 156,
      status: 'under_review',
      submittedBy: 'Music Producer Ghana',
      date: '2024-01-10',
      comments: 23
    },
    {
      id: 2,
      title: 'Mobile App Improvements',
      description: 'Better mobile interface and offline functionality',
      votes: 89,
      status: 'planned',
      submittedBy: 'DJ Fresh FM',
      date: '2024-01-08',
      comments: 15
    },
    {
      id: 3,
      title: 'API Integration',
      description: 'REST API for third-party integrations and custom reporting',
      votes: 67,
      status: 'in_development',
      submittedBy: 'Tech Startup Ghana',
      date: '2024-01-05',
      comments: 12
    }
  ],
  bugReports: [
    {
      id: 1,
      title: 'Payment Dashboard Loading Issue',
      description: 'Payment dashboard takes too long to load on mobile devices',
      severity: 'medium',
      status: 'investigating',
      reportedBy: 'Sarah Johnson',
      date: '2024-01-12',
      comments: 5,
      affectedUsers: 23
    },
    {
      id: 2,
      title: 'Export Function Error',
      description: 'CSV export fails when selecting large date ranges',
      severity: 'high',
      status: 'in_progress',
      reportedBy: 'Michael Chen',
      date: '2024-01-11',
      comments: 8,
      affectedUsers: 45
    }
  ],
  platformStats: {
    totalUsers: 15420,
    activeUsers: 8934,
    satisfactionRate: 94.2,
    responseTime: '2.3 hours',
    resolutionRate: 87.5
  }
};

const Feedback: React.FC = () => {
  const [activeTab, setActiveTab] = useState('reviews');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'general',
    title: '',
    description: '',
    rating: 0,
    category: 'general'
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const StarRating = ({ rating, interactive = false, onChange }: {
    rating: number;
    interactive?: boolean;
    onChange?: (rating: number) => void;
  }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onChange?.(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform duration-200`}
            disabled={!interactive}
          >
            <Star
              className={`w-5 h-5 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, isActive, onClick, badge }: {
    id: string;
    label: string;
    icon: any;
    isActive: boolean;
    onClick: (id: string) => void;
    badge?: number;
  }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all relative ${
        isActive
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg'
          : 'text-gray-300 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="font-medium">{label}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );

  const FeedbackCard = ({ item, type }: { item: any; type: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (type === 'review') {
      return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              <img
                src={item.avatar}
                alt={item.user}
                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.user}</h4>
                  {item.verified && (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <StarRating rating={item.rating} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(item.date)}</span>
                </div>
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">{item.title}</h5>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.content}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">{item.likes}</span>
              </button>
              <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">{item.replies} replies</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                item.category === 'general' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                item.category === 'analytics' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {item.category}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'feature') {
      return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  item.status === 'under_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  item.status === 'planned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  item.status === 'in_development' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-3">{item.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <span>By: {item.submittedBy}</span>
                <span>•</span>
                <span>{formatDate(item.date)}</span>
                <span>•</span>
                <span>{item.comments} comments</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200">
                <ThumbsUp className="w-4 h-4" />
                <span className="font-semibold">{item.votes}</span>
              </button>
              <button className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">
                <MessageSquare className="w-4 h-4" />
                <span>Comment</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'bug') {
      return (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 rounded-lg ${
                item.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                item.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <Bug className={`w-5 h-5 ${
                  item.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                  item.severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'investigating' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    item.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{item.affectedUsers}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Affected Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{item.comments}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Comments</div>
            </div>
            <div className="text-center">
              <div className={`text-sm font-medium ${
                item.severity === 'high' ? 'text-red-600 dark:text-red-400' :
                item.severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                'text-blue-600 dark:text-blue-400'
              }`}>
                {item.severity}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Severity</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(item.date)}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Reported</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
            <div className="flex items-center space-x-2">
              <button className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors duration-200">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Add Comment</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Enhanced Page Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Feedback & Reviews</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Share your thoughts, report issues, and help us improve the platform
                  </p>
                </div>
              </div>

              {/* Platform Stats in Header */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {feedbackData.platformRating}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Platform Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {feedbackData.totalReviews.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {feedbackData.platformStats.satisfactionRate}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Plus className="w-4 h-4" />
                <span>Submit Feedback</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Platform Rating Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Overall Rating */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Rating</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="text-4xl font-bold text-gray-900 dark:text-white">{feedbackData.platformRating}</div>
              <div>
                <StarRating rating={Math.floor(feedbackData.platformRating)} />
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Based on {feedbackData.totalReviews.toLocaleString()} reviews
                </p>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {feedbackData.ratingDistribution.map((rating) => (
                <div key={rating.stars} className="flex items-center space-x-2 text-sm">
                  <span className="w-8 text-gray-600 dark:text-gray-400">{rating.stars}★</span>
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${rating.percentage}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right text-gray-600 dark:text-gray-400">
                    {rating.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Platform Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Total Users</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {feedbackData.platformStats.totalUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Active Users</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {feedbackData.platformStats.activeUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Avg Response Time</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {feedbackData.platformStats.responseTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Resolution Rate</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {feedbackData.platformStats.resolutionRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Submit Feedback CTA */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800/50">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Share Your Feedback</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200">
                  <MessageSquare className="w-4 h-4" />
                  <span>Write Review</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <Bug className="w-4 h-4" />
                  <span>Report Issue</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <Lightbulb className="w-4 h-4" />
                  <span>Suggest Feature</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Navigation */}
        <div className="flex flex-wrap gap-2 p-1 bg-white/10 dark:bg-slate-800/50 backdrop-blur-md rounded-lg border border-white/20 dark:border-slate-700/30">
          <TabButton
            id="reviews"
            label="Reviews"
            icon={Star}
            isActive={activeTab === 'reviews'}
            onClick={setActiveTab}
            badge={feedbackData.recentReviews.length}
          />
          <TabButton
            id="features"
            label="Feature Requests"
            icon={Lightbulb}
            isActive={activeTab === 'features'}
            onClick={setActiveTab}
            badge={feedbackData.featureRequests.length}
          />
          <TabButton
            id="bugs"
            label="Bug Reports"
            icon={Bug}
            isActive={activeTab === 'bugs'}
            onClick={setActiveTab}
            badge={feedbackData.bugReports.length}
          />
        </div>

        {/* Category Filter */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by:</span>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="analytics">Analytics</option>
              <option value="mobile">Mobile App</option>
              <option value="payments">Payments</option>
              <option value="security">Security</option>
            </select>
          </div>
        </div>

        {/* Feedback Content */}
        <div className="space-y-6">
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Reviews</h2>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Search className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-200">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {feedbackData.recentReviews.map((review) => (
                  <FeedbackCard key={review.id} item={review} type="review" />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Feature Requests</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Plus className="w-4 h-4" />
                  <span>Submit Request</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {feedbackData.featureRequests.map((feature) => (
                  <FeedbackCard key={feature.id} item={feature} type="feature" />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'bugs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bug Reports</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                  <Bug className="w-4 h-4" />
                  <span>Report Bug</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {feedbackData.bugReports.map((bug) => (
                  <FeedbackCard key={bug.id} item={bug} type="bug" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Submission Modal Placeholder */}
        {isSubmittingFeedback && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit Feedback</h2>
                <button
                  onClick={() => setIsSubmittingFeedback(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Feedback Type
                  </label>
                  <select className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option>General Feedback</option>
                    <option>Bug Report</option>
                    <option>Feature Request</option>
                    <option>Improvement Suggestion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rating
                  </label>
                  <StarRating rating={feedbackForm.rating} interactive onChange={(rating) => setFeedbackForm(prev => ({ ...prev, rating }))} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Brief title for your feedback"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide detailed feedback..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => setIsSubmittingFeedback(false)}
                    className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                    Submit Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Feedback;
