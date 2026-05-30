import React from 'react';
import { Clock } from 'lucide-react';

interface PlayLog {
  time: string;
  station: string;
  region: string;
}

interface PlayLogsSectionProps {
  playLogs: PlayLog[];
}

const PlayLogsSection: React.FC<PlayLogsSectionProps> = ({ playLogs }) => {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
        Recent Play Logs
      </h2>

      <div className="space-y-3">
        {playLogs.map((log, index) => (
          <div key={index} className="group relative p-4 bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg hover:bg-gray-100/80 dark:hover:bg-slate-700/80 border border-gray-200/50 dark:border-slate-700/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors duration-200">
                    {log.station}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{log.region}</p>
                </div>
              </div>
              <div className="text-left sm:text-right flex-shrink-0">
                <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                  {new Date(log.time).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(log.time).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="absolute inset-0 rounded-lg opacity-0 group-active:opacity-10 bg-amber-500 transition-opacity duration-100"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayLogsSection;
