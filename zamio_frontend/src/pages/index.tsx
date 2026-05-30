import React from 'react';
import ComingSoonPage from './ComingSoon';
import { Upload, BarChart3, DollarSign, Bell, User, HelpCircle, MessageSquare, Calendar, Users } from 'lucide-react';

// Analytics Page
const Analytics: React.FC = () => {
  return (
    <ComingSoonPage
      title="Analytics"
      description="Deep dive into your music performance with comprehensive analytics, trends, and insights to optimize your royalty earnings."
      icon={<BarChart3 className="w-8 h-8" />}
    />
  );
};

// Royalty Payments Page
const RoyaltyPayments: React.FC = () => {
  return (
    <ComingSoonPage
      title="Royalty Payments"
      description="Track your earnings, view payment history, and manage your royalty distributions across all platforms and territories."
      icon={<DollarSign className="w-8 h-8" />}
    />
  );
};

// Notifications Page
const Notifications: React.FC = () => {
  return (
    <ComingSoonPage
      title="Notifications"
      description="Stay updated with real-time alerts about your music plays, earnings, and important platform updates."
      icon={<Bell className="w-8 h-8" />}
    />
  );
};

// Profile Page
const Profile: React.FC = () => {
  return (
    <ComingSoonPage
      title="Profile"
      description="Manage your artist profile, update your information, and customize your dashboard preferences."
      icon={<User className="w-8 h-8" />}
    />
  );
};

// Legal Page
const Legal: React.FC = () => {
  return (
    <ComingSoonPage
      title="Legal"
      description="Access legal information, terms of service, privacy policy, and compliance documentation."
      icon={<HelpCircle className="w-8 h-8" />}
    />
  );
};

// Feedback Page
const Feedback: React.FC = () => {
  return (
    <ComingSoonPage
      title="Feedback & Reviews"
      description="Share your thoughts, report issues, and help us improve the platform with your valuable feedback."
      icon={<MessageSquare className="w-8 h-8" />}
    />
  );
};

// Help Page
const Help: React.FC = () => {
  return (
    <ComingSoonPage
      title="Help & Support"
      description="Get comprehensive help, troubleshooting guides, and contact support for any questions or issues."
      icon={<HelpCircle className="w-8 h-8" />}
    />
  );
};

// Schedule Page
const Schedule: React.FC = () => {
  return (
    <ComingSoonPage
      title="Schedule"
      description="Manage your release schedule, plan promotional activities, and organize your music calendar."
      icon={<Calendar className="w-8 h-8" />}
    />
  );
};

// Collaborations Page
const Collaborations: React.FC = () => {
  return (
    <ComingSoonPage
      title="Collaborations"
      description="Connect with other artists, manage collaboration projects, and track joint music releases."
      icon={<Users className="w-8 h-8" />}
    />
  );
};

// Upload/Management Page
const AllArtistSongs: React.FC = () => {
  return (
    <ComingSoonPage
      title="Music Management"
      description="Upload new tracks, manage your music catalog, and organize your releases across all platforms."
      icon={<Upload className="w-8 h-8" />}
    />
  );
};

export {
  Analytics,
  RoyaltyPayments,
  Notifications,
  Profile,
  Legal,
  Feedback,
  Help,
  Schedule,
  Collaborations,
  AllArtistSongs
};
