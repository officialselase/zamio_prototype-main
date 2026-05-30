import React from 'react';
import { ArrowLeft, Clock, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ComingSoonPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description = "This feature is currently under development and will be available soon.",
  icon = <Wrench className="w-8 h-8" />
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link
          to="/dashboard"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        {/* Coming Soon Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl mb-6">
            <div className="text-indigo-600 dark:text-indigo-400">
              {icon}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {description}
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full border border-amber-200 dark:border-amber-800">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Coming Soon
            </span>
          </div>

          {/* Feature Preview */}
          <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-700 rounded-xl">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We're working hard to bring you this feature. Stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
