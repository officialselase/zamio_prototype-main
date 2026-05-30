import React from 'react';
import { BarChart3 } from 'lucide-react';

interface PlaysOverTimeEntry {
  month: string;
  plays: number;
}

interface PlaysOverTimeSectionProps {
  playsOverTime: PlaysOverTimeEntry[];
}

const PlaysOverTimeSection: React.FC<PlaysOverTimeSectionProps> = ({ playsOverTime }) => {
  const maxPlays = Math.max(...playsOverTime.map((d) => d.plays));

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
        Plays Over Time
      </h2>

      <div className="space-y-4">
        {playsOverTime.map((data, index) => {
          const percentage = maxPlays ? (data.plays / maxPlays) * 100 : 0;
          const prevPlays = index > 0 ? playsOverTime[index - 1].plays : 0;
          const growth = index > 0 && prevPlays ? ((data.plays - prevPlays) / prevPlays) * 100 : 0;

          return (
            <div key={index} className="group relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {data.month}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    growth > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : growth < 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {growth > 0 ? '+' : ''}{isFinite(growth) ? growth.toFixed(1) : '0.0'}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {data.plays.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    plays
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-500 h-full rounded-full transition-all duration-500 ease-out relative"
                      style={{
                        width: `${percentage}%`,
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                    {percentage.toFixed(0)}%
                  </div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {data.month}: {data.plays.toLocaleString()} plays
                {growth !== 0 && (
                  <span className={`ml-1 ${growth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({growth > 0 ? '+' : ''}{isFinite(growth) ? growth.toFixed(1) : '0.0'}%)
                  </span>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {Math.max(...playsOverTime.map((d) => d.plays)).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Peak Plays</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {playsOverTime.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Months Data</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
              +{((playsOverTime[playsOverTime.length - 1]?.plays - playsOverTime[0]?.plays) / playsOverTime[0]?.plays * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Growth</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaysOverTimeSection;
