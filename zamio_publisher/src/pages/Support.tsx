import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  FileText,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Download,
  Play,
  Settings,
  CreditCard,
  Music,
  TrendingUp,
  Shield,
  Zap,
  Target,
  Filter,
  Plus,
  Minus,
  Star,
  Heart,
  Share2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  AlertCircle,
  Info,
  Check
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  description: string;
  readTime: string;
  views: number;
  lastUpdated: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  articleCount: number;
  color: string;
}

const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState('articles');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('popular');

  // Mock data for help articles
  const helpArticles: HelpArticle[] = [
    {
      id: '1',
      title: 'Getting Started with Zamio Publisher',
      category: 'getting-started',
      description: 'Complete guide to setting up your publisher account and understanding the platform basics.',
      readTime: '5 min read',
      views: 1250,
      lastUpdated: '2023-12-15',
      difficulty: 'beginner',
      tags: ['onboarding', 'basics', 'setup']
    },
    {
      id: '2',
      title: 'Managing Artist Catalogs and Rights',
      category: 'catalog-management',
      description: 'Learn how to efficiently manage your artist catalog, track rights, and organize your music library.',
      readTime: '8 min read',
      views: 890,
      lastUpdated: '2023-12-10',
      difficulty: 'intermediate',
      tags: ['artists', 'catalog', 'rights']
    },
    {
      id: '3',
      title: 'Understanding Revenue Splits and Royalties',
      category: 'revenue-management',
      description: 'Detailed explanation of how revenue splits work, territory-based royalties, and payout calculations.',
      readTime: '12 min read',
      views: 1540,
      lastUpdated: '2023-12-12',
      difficulty: 'advanced',
      tags: ['revenue', 'royalties', 'splits', 'payments']
    },
    {
      id: '4',
      title: 'Setting Up Payment Methods for Royalties',
      category: 'payment-setup',
      description: 'Step-by-step guide to configuring bank accounts, mobile money, and other payment methods.',
      readTime: '6 min read',
      views: 720,
      lastUpdated: '2023-12-08',
      difficulty: 'beginner',
      tags: ['payments', 'banking', 'mobile-money']
    },
    {
      id: '5',
      title: 'Creating and Managing Publishing Contracts',
      category: 'contracts-legal',
      description: 'How to create, edit, and manage publishing contracts with artists and other parties.',
      readTime: '10 min read',
      views: 650,
      lastUpdated: '2023-12-05',
      difficulty: 'intermediate',
      tags: ['contracts', 'legal', 'agreements']
    },
    {
      id: '6',
      title: 'GHAMRO Compliance and Registration',
      category: 'compliance',
      description: 'Understanding GHAMRO requirements, registration process, and compliance best practices.',
      readTime: '7 min read',
      views: 430,
      lastUpdated: '2023-12-01',
      difficulty: 'intermediate',
      tags: ['ghamro', 'compliance', 'registration']
    },
    {
      id: '7',
      title: 'International Publishing and Licensing',
      category: 'international',
      description: 'Managing international publishing deals, cross-territory licensing, and global rights management.',
      readTime: '15 min read',
      views: 380,
      lastUpdated: '2023-11-28',
      difficulty: 'advanced',
      tags: ['international', 'licensing', 'global']
    },
    {
      id: '8',
      title: 'Troubleshooting Common Platform Issues',
      category: 'troubleshooting',
      description: 'Solutions to common problems, error messages, and technical issues you might encounter.',
      readTime: '9 min read',
      views: 920,
      lastUpdated: '2023-12-14',
      difficulty: 'intermediate',
      tags: ['troubleshooting', 'errors', 'technical']
    }
  ];

  // Mock data for FAQs
  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'How do I add a new artist to my catalog?',
      answer: 'To add a new artist, go to the Artist Management section, click "Link Artist", search for the artist in our database, and follow the contract setup process.',
      category: 'artists',
      helpful: 45,
      notHelpful: 2
    },
    {
      id: '2',
      question: 'When do I receive royalty payments?',
      answer: 'Royalty payments are processed monthly on the 15th of each month for earnings from the previous month. Payments are distributed based on your configured payment methods.',
      category: 'payments',
      helpful: 38,
      notHelpful: 5
    },
    {
      id: '3',
      question: 'How do revenue splits work across different territories?',
      answer: 'Revenue splits can be configured differently for each territory (Ghana, West Africa, International). The system automatically applies the correct split based on where the performance occurred.',
      category: 'revenue',
      helpful: 52,
      notHelpful: 1
    },
    {
      id: '4',
      question: 'What documents do I need for GHAMRO compliance?',
      answer: 'You\'ll need your business registration certificate, tax identification number, and GHAMRO membership certificate. These should be uploaded during the compliance verification process.',
      category: 'compliance',
      helpful: 29,
      notHelpful: 3
    },
    {
      id: '5',
      question: 'Can I export my royalty reports?',
      answer: 'Yes, you can export detailed royalty reports in PDF, Excel, or CSV formats from the Reports & Analytics section. Reports can be filtered by date range, artist, and territory.',
      category: 'reports',
      helpful: 41,
      notHelpful: 0
    }
  ];

  const supportCategories: SupportCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Essential guides for new publishers',
      icon: <Zap className="w-6 h-6" />,
      articleCount: 12,
      color: 'bg-blue-500'
    },
    {
      id: 'catalog-management',
      title: 'Catalog Management',
      description: 'Managing artists and music rights',
      icon: <Music className="w-6 h-6" />,
      articleCount: 18,
      color: 'bg-green-500'
    },
    {
      id: 'revenue-management',
      title: 'Revenue & Royalties',
      description: 'Understanding splits and payments',
      icon: <TrendingUp className="w-6 h-6" />,
      articleCount: 15,
      color: 'bg-purple-500'
    },
    {
      id: 'payment-setup',
      title: 'Payment Setup',
      description: 'Configuring payment methods',
      icon: <CreditCard className="w-6 h-6" />,
      articleCount: 8,
      color: 'bg-orange-500'
    },
    {
      id: 'contracts-legal',
      title: 'Contracts & Legal',
      description: 'Legal documents and agreements',
      icon: <Shield className="w-6 h-6" />,
      articleCount: 10,
      color: 'bg-red-500'
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      icon: <Settings className="w-6 h-6" />,
      articleCount: 14,
      color: 'bg-gray-500'
    }
  ];

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    let filtered = helpArticles;

    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    // Sort articles
    if (sortBy === 'popular') {
      filtered.sort((a, b) => b.views - a.views);
    } else if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  }, [searchTerm, selectedCategory, sortBy]);

  const renderArticles = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Categories</option>
            {supportCategories.map(category => (
              <option key={category.id} value={category.id}>{category.title}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="popular">Most Popular</option>
            <option value="recent">Recently Updated</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {supportCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`p-4 rounded-xl border text-left transition-all duration-200 ${
              selectedCategory === category.id
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <div className={`p-2 rounded-lg ${category.color} text-white`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">{category.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{category.articleCount} articles</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
          </button>
        ))}
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <div key={article.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 cursor-pointer">
                    {article.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    article.difficulty === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    article.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {article.difficulty}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-3">{article.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{article.readTime}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{article.views.toLocaleString()} views</span>
                  </span>
                  <span>Updated {article.lastUpdated}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {article.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 rounded-md text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button className="ml-4 p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200">
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No articles found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );

  const renderFAQ = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Frequently Asked Questions</h2>
        <p className="text-gray-600 dark:text-gray-300">Quick answers to common publisher questions</p>
      </div>

      <div className="space-y-4">
        {faqItems.map((faq) => (
          <div key={faq.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white pr-4">{faq.question}</h3>
              {expandedFAQ === faq.id ?
                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> :
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              }
            </button>
            {expandedFAQ === faq.id && (
              <div className="px-6 pb-6 border-t border-gray-200 dark:border-slate-700">
                <p className="text-gray-600 dark:text-gray-300 mt-4 mb-4">{faq.answer}</p>
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                    <Check className="w-4 h-4" />
                    <span>Helpful ({faq.helpful})</span>
                  </button>
                  <button className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                    <AlertCircle className="w-4 h-4" />
                    <span>Not helpful ({faq.notHelpful})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContact = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Contact Support</h2>
        <p className="text-gray-600 dark:text-gray-300">Get help from our expert support team</p>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Live Chat</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Chat with our support team in real-time</p>
          <button className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
            Start Chat
          </button>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">Available 24/7</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Email Support</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Send us a detailed message</p>
          <button className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
            Send Email
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Response in 2-4 hours</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 text-center">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Phone className="w-6 h-6 text-orange-600" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Phone Support</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Speak with a support specialist</p>
          <button className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200">
            Call Now
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Mon-Fri, 9AM-6PM GMT</p>
        </div>
      </div>

      {/* Support Hours */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Support Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">General Support</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Monday - Friday: 9:00 AM - 6:00 PM GMT</p>
              <p>Saturday: 10:00 AM - 4:00 PM GMT</p>
              <p>Sunday: Closed</p>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Emergency Support</h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>Available 24/7 for critical issues</p>
              <p>Payment problems, system outages</p>
              <p>Security concerns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Ticket */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Submit a Support Ticket</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          For complex issues or if you need detailed assistance, submit a support ticket.
        </p>
        <button className="px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200">
          Create Support Ticket
        </button>
      </div>
    </div>
  );

  const renderTroubleshooting = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Troubleshooting Guide</h2>
        <p className="text-gray-600 dark:text-gray-300">Common issues and their solutions</p>
      </div>

      {/* Common Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Royalty payments delayed</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            If your royalty payments are delayed, check your payment method verification status and ensure all required documents are uploaded.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Verify payment method is active</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Check compliance documents</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Contact support if issue persists</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Artist not appearing in catalog</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            If a linked artist isn't showing in your catalog, the linking process might not be complete or there could be a sync delay.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Wait up to 24 hours for sync</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Check artist status in management</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Verify contract is active</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Reports not loading</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            If reports are not loading, try refreshing the page or check your internet connection and browser compatibility.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Refresh the page</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Clear browser cache</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Try different browser</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Contract creation failed</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Contract creation might fail due to incomplete information or system validation errors.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Fill all required fields</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Check date validity</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Check className="w-4 h-4 text-green-500" />
              <span>Verify artist details</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">API Services</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">All systems operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Database</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Running normally</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Payment Processing</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Operational</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">File Storage</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocumentation = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Documentation & Guides</h2>
        <p className="text-gray-600 dark:text-gray-300">Comprehensive guides and resources for publishers</p>
      </div>

      {/* Quick Start Guide */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Start Guide</h3>
            <p className="text-gray-600 dark:text-gray-300">Complete setup guide for new publishers</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors duration-200">
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Documentation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Publisher Basics</h3>
          <div className="space-y-3">
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Account Setup</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Setting up your publisher account</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Dashboard Overview</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Understanding your dashboard</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Navigation Guide</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Platform navigation basics</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Advanced Features</h3>
          <div className="space-y-3">
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Revenue Analytics</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Advanced reporting features</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">API Integration</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Developer API documentation</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
            <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors duration-200">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Custom Reports</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Building custom reports</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Video Tutorials */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Video Tutorials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="group cursor-pointer">
            <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-2 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Platform Overview</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">5:23 minutes</p>
          </div>
          <div className="group cursor-pointer">
            <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-2 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Managing Artists</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">8:45 minutes</p>
          </div>
          <div className="group cursor-pointer">
            <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center mb-2 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white">Revenue Reports</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">12:15 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'articles', label: 'Help Articles', icon: BookOpen },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'contact', label: 'Contact Support', icon: MessageCircle },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: Settings },
    { id: 'docs', label: 'Documentation', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help & Support Center</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Find answers, get help, and learn how to use Zamio Publisher effectively
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 whitespace-nowrap border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          {activeTab === 'articles' && renderArticles()}
          {activeTab === 'faq' && renderFAQ()}
          {activeTab === 'contact' && renderContact()}
          {activeTab === 'troubleshooting' && renderTroubleshooting()}
          {activeTab === 'docs' && renderDocumentation()}
        </div>
      </div>
    </div>
  );
};

export default Support;
