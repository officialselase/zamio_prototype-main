import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  MessageCircle,
  Phone,
  Mail,
  BookOpen,
  Video,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  Users,
  Settings,
  Shield,
  FileCheck,
  AlertCircle,
  CheckCircle,
  RadioTower,
  Headphones,
  Music,
  DollarSign,
  BarChart3,
  Activity,
  Zap,
  Plus,
  Check,
  Flag,
  Info,
  RadioTower as RadioIcon,
  TrendingUp,
  User,
  Building2,
  Wifi,
  Lock,
  Eye,
  EyeOff,
  Download,
  Upload,
  Filter,
  Tag,
  Calendar,
  MapPin,
  Globe,
  Smartphone,
  Monitor,
  Target,
  Award,
  Crown,
  Gem,
  Layers,
  PiggyBank,
  Wallet,
  Bell,
  Edit,
  Trash2,
  Heart,
  Share2,
  RefreshCw,
  Minus,
  X,
} from 'lucide-react';

// Station-specific help data
const helpData = {
  faqCategories: [
    {
      id: 'station-management',
      title: 'Station Management',
      icon: Settings,
      questions: [
        {
          id: 1,
          question: 'How do I set up my radio station profile?',
          answer: 'Navigate to the Profile page and click "Edit Profile". Fill in your station information including name, location, contact details, and station details. Make sure to add your station logo and cover image for better visibility.',
          helpful: 45,
          views: 234
        },
        {
          id: 2,
          question: 'How do I manage staff permissions?',
          answer: 'Go to Staff Management page to add, edit, or remove staff members. You can assign different roles like Administrator, Content Manager, or Technical Operator, each with specific permissions.',
          helpful: 32,
          views: 156
        },
        {
          id: 3,
          question: 'How do I update station settings?',
          answer: 'Access Settings in your profile to update station configuration, streaming URLs, contact information, and operational preferences. Changes are saved automatically.',
          helpful: 28,
          views: 189
        }
      ]
    },
    {
      id: 'content-monitoring',
      title: 'Content Monitoring',
      icon: Activity,
      questions: [
        {
          id: 4,
          question: 'How does music detection work?',
          answer: 'Our system analyzes audio streams in real-time using advanced fingerprinting technology. It identifies songs, artists, and generates detailed playlogs for royalty reporting and compliance monitoring.',
          helpful: 67,
          views: 445
        },
        {
          id: 5,
          question: 'How do I review detection results?',
          answer: 'Check the Match Logs page to view all detected music with timestamps, confidence scores, and manual review options. You can confirm or dispute matches as needed.',
          helpful: 52,
          views: 387
        },
        {
          id: 6,
          question: 'How do I handle disputed matches?',
          answer: 'Use the Match Disputes page to submit disputes for incorrect detections. Provide evidence like playlist logs or audio samples. Our team reviews disputes within 48 hours.',
          helpful: 41,
          views: 298
        }
      ]
    },
    {
      id: 'compliance',
      title: 'Compliance & Reporting',
      icon: Shield,
      questions: [
        {
          id: 7,
          question: 'What compliance reports are available?',
          answer: 'Generate detailed compliance reports including playlogs, royalty statements, and regulatory filings. Access these through the Compliance Management page with filtering options.',
          helpful: 73,
          views: 521
        },
        {
          id: 8,
          question: 'How do I track license compliance?',
          answer: 'Monitor your license status in the Compliance section. The system tracks music usage against your licensed repertoire and alerts you to any compliance issues.',
          helpful: 38,
          views: 267
        },
        {
          id: 9,
          question: 'How do I export compliance data?',
          answer: 'Use the export function in Compliance Management to download reports in CSV, PDF, or Excel formats. You can select specific date ranges and report types.',
          helpful: 35,
          views: 203
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: Wifi,
      questions: [
        {
          id: 10,
          question: 'How do I configure my stream settings?',
          answer: 'Navigate to Radio Stream Monitor to set up your streaming URL, audio quality settings, and monitoring preferences. Ensure your stream is accessible and properly formatted.',
          helpful: 29,
          views: 178
        },
        {
          id: 11,
          question: 'What audio formats are supported for matching?',
          answer: 'We support WAV, MP3, FLAC, and AIFF formats for audio file processing. For live streams, we recommend MP3 or AAC encoding at 128kbps or higher.',
          helpful: 44,
          views: 289
        },
        {
          id: 12,
          question: 'How do I troubleshoot connection issues?',
          answer: 'Check your internet connection, verify stream URL accessibility, and ensure proper encoding settings. Contact support if issues persist with specific error details.',
          helpful: 26,
          views: 145
        }
      ]
    }
  ],
  quickActions: [
    {
      id: 1,
      title: 'Contact Support',
      description: 'Get help from our station support team',
      icon: MessageCircle,
      action: 'contact',
      color: 'indigo'
    },
    {
      id: 2,
      title: 'Report Technical Issue',
      description: 'Report stream or system problems',
      icon: AlertCircle,
      action: 'bug',
      color: 'red'
    },
    {
      id: 3,
      title: 'Request New Features',
      description: 'Suggest improvements for stations',
      icon: Plus,
      action: 'feature',
      color: 'green'
    },
    {
      id: 4,
      title: 'Station Setup Guide',
      description: 'Complete setup walkthrough',
      icon: BookOpen,
      action: 'guide',
      color: 'purple'
    }
  ],
  contactInfo: {
    email: 'stations@zamio.com',
    phone: '+233 30 123 4567',
    hours: 'Mon-Fri 9AM-6PM GMT',
    responseTime: '2-4 hours',
    social: [
      { platform: 'Twitter', handle: '@zamio_stations', url: 'https://twitter.com/zamio_stations' },
      { platform: 'LinkedIn', handle: 'Zamio Stations', url: 'https://linkedin.com/company/zamio' }
    ]
  },
  resources: [
    {
      id: 1,
      title: 'Station Setup Guide',
      type: 'guide',
      description: 'Complete guide for new station operators',
      duration: '15 min read',
      url: '#'
    },
    {
      id: 2,
      title: 'Music Detection Best Practices',
      type: 'article',
      description: 'Tips for accurate music identification',
      duration: '8 min read',
      url: '#'
    },
    {
      id: 3,
      title: 'Compliance Requirements',
      type: 'guide',
      description: 'Understanding regulatory compliance',
      duration: '12 min read',
      url: '#'
    },
    {
      id: 4,
      title: 'Troubleshooting Common Issues',
      type: 'guide',
      description: 'Solutions for frequent station problems',
      duration: '10 min read',
      url: '#'
    }
  ]
};

const Help: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState<{ [key: string]: boolean }>({});
  const [activeCategory, setActiveCategory] = useState('all');

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const filteredFAQs = activeCategory === 'all'
    ? helpData.faqCategories.flatMap(cat => cat.questions)
    : helpData.faqCategories.find(cat => cat.id === activeCategory)?.questions || [];

  const searchedFAQs = filteredFAQs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Enhanced Page Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-b border-gray-200 dark:border-slate-700 mb-8">
        <div className="px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
                  <p className="text-gray-600 dark:text-gray-300 font-light">
                    Get comprehensive help for station management, troubleshooting guides, and contact support for any station-related questions
                  </p>
                </div>
              </div>

              {/* Support Stats */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    24/7
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Monitoring</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {helpData.contactInfo.responseTime}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg Response</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    96%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Station Satisfaction</div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <MessageCircle className="w-4 h-4" />
                <span>Start Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {helpData.quickActions.map((action) => (
            <button
              key={action.id}
              className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105 group ${
                action.color === 'indigo' ? 'hover:border-indigo-300 dark:hover:border-indigo-600' :
                action.color === 'red' ? 'hover:border-red-300 dark:hover:border-red-600' :
                action.color === 'green' ? 'hover:border-green-300 dark:hover:border-green-600' :
                'hover:border-purple-300 dark:hover:border-purple-600'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 bg-gradient-to-br ${
                  action.color === 'indigo' ? 'from-indigo-100 to-indigo-200 dark:from-indigo-900/60 dark:to-indigo-800/60' :
                  action.color === 'red' ? 'from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60' :
                  action.color === 'green' ? 'from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60' :
                  'from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60'
                } rounded-xl group-hover:scale-110 transition-transform duration-200`}>
                  <action.icon className={`w-6 h-6 ${
                    action.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                    action.color === 'red' ? 'text-red-600 dark:text-red-400' :
                    action.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    'text-purple-600 dark:text-purple-400'
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help articles, station guides, or contact support..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              Search
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Filter:</span>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                {helpData.faqCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {searchedFAQs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleQuestion(faq.id.toString())}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200"
                >
                  <div className="flex items-start space-x-3">
                    <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4" />
                          <span>{faq.helpful} found helpful</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>{faq.views} views</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  {expandedQuestions[faq.id] ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedQuestions[faq.id] && (
                  <div className="px-4 pb-4 border-t border-gray-200 dark:border-slate-600">
                    <p className="text-gray-700 dark:text-gray-300 mt-4 leading-relaxed">{faq.answer}</p>
                    <div className="flex items-center space-x-4 mt-4">
                      <button className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors duration-200">
                        <Check className="w-4 h-4" />
                        <span>Helpful</span>
                      </button>
                      <button className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200">
                        <Flag className="w-4 h-4" />
                        <span>Report Issue</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact & Resources */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Contact Support
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Email Support</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{helpData.contactInfo.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Phone Support</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{helpData.contactInfo.phone}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Support Hours</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{helpData.contactInfo.hours}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Zap className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Response Time</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{helpData.contactInfo.responseTime}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Follow Us</h4>
              <div className="flex space-x-4">
                {helpData.contactInfo.social.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
                  >
                    {social.platform === 'Twitter' ? <MessageCircle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    <span>{social.handle}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Station Resources */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-slate-700/30 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
              Station Resources
            </h3>

            <div className="space-y-4">
              {helpData.resources.map((resource) => (
                <div key={resource.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-200">
                  <div className={`p-2 rounded-lg ${
                    resource.type === 'guide' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    resource.type === 'article' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {resource.type === 'guide' ? <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" /> :
                     resource.type === 'article' ? <FileText className="w-4 h-4 text-green-600 dark:text-green-400" /> :
                     <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{resource.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{resource.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{resource.duration}</span>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors duration-200">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Video className="w-4 h-4" />
                <span>Watch All Station Tutorials</span>
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800/50">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Need Immediate Technical Help?</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For urgent technical issues affecting your station's streaming, music detection, or critical platform functionality, contact our technical support team immediately.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200">
                  <Phone className="w-4 h-4" />
                  <span>Technical Support: +233 30 987 6543</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-white/60 dark:bg-slate-800/60 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200/60 dark:border-slate-600/60 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
                  <Mail className="w-4 h-4" />
                  <span>tech@zamio.com</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Help;
