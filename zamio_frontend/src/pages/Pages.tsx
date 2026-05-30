import React from 'react';
import ComingSoonPage from './ComingSoon';
import UploadManagement from './UploadManagement';
import TrackDetails from './TrackDetails';
import Profile from './Profile';
import Legal from './Legal';
import Feedback from './Feedback';
import Help from './Help';
import { Bell, User, HelpCircle, MessageSquare, Calendar, Users, Upload } from 'lucide-react';

const Notifications: React.FC = () => {
  return (
    <ComingSoonPage
      title="Notifications"
      description="Stay updated with real-time alerts about your music plays, earnings, and important platform updates."
      icon={<Bell className="w-8 h-8" />}
    />
  );
};

const Schedule: React.FC = () => {
  return (
    <ComingSoonPage
      title="Schedule"
      description="Manage your release schedule, plan promotional activities, and organize your music calendar."
      icon={<Calendar className="w-8 h-8" />}
    />
  );
};

const Collaborations: React.FC = () => {
  return (
    <ComingSoonPage
      title="Collaborations"
      description="Connect with other artists, manage collaboration projects, and track joint music releases."
      icon={<Users className="w-8 h-8" />}
    />
  );
};

const AllArtistSongs: React.FC = () => {
  return <UploadManagement />;
};

const TrackDetailsPage: React.FC = () => {
  return <TrackDetails />;
};

export {
  Notifications,
  Profile,
  Legal,
  Feedback,
  Help,
  Schedule,
  Collaborations,
  AllArtistSongs,
  TrackDetailsPage
};
