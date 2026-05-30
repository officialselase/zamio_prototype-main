import React from 'react';
import { Plus, Users } from 'lucide-react';

interface Contributor {
  role: string;
  name: string;
  percentage: number;
}

interface ContributorsSectionProps {
  contributors: Contributor[];
  currentTotalPercentage: number;
  remainingPercentage: number;
  onAddClick: () => void;
}

const ContributorsSection: React.FC<ContributorsSectionProps> = ({
  contributors,
  currentTotalPercentage,
  remainingPercentage,
  onAddClick,
}) => {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center group">
          <Users className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200" />
          Contributors
        </h2>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-200">{currentTotalPercentage}%</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Remaining: <span className={`font-medium transition-colors duration-200 ${remainingPercentage < 0 ? 'text-red-500' : 'text-green-500'}`}>
                {remainingPercentage}%
              </span>
            </div>
          </div>
          <button
            onClick={onAddClick}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span className="text-sm">Add</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {contributors.map((contributor, index) => (
          <div key={index} className="group relative p-4 bg-gray-50/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg hover:bg-gray-100/80 dark:hover:bg-slate-700/80 border border-gray-200/50 dark:border-slate-700/30 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-lg group-hover:scale-110 transition-all duration-200 ${
                    index === 0 ? 'bg-gradient-to-br from-green-400 to-green-600' :
                    index === 1 ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
                    'bg-gradient-to-br from-purple-400 to-purple-600'
                  }`}>
                    {contributor.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Role badge */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md">
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-green-500' :
                      index === 1 ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></div>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">{contributor.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">{contributor.role}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="relative">
                  <div className={`w-16 h-8 rounded-full flex items-center justify-center mb-1 shadow-inner ${
                    index === 0 ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30' :
                    index === 1 ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30' :
                    'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30'
                  }`}>
                    <span className={`text-sm font-bold ${
                      index === 0 ? 'text-green-700 dark:text-green-300' :
                      index === 1 ? 'text-blue-700 dark:text-blue-300' :
                      'text-purple-700 dark:text-purple-300'
                    }`}>
                      {contributor.percentage}%
                    </span>
                  </div>
                  {/* Animated progress ring */}
                  <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
                    index === 0 ? 'border-green-300 dark:border-green-600' :
                    index === 1 ? 'border-blue-300 dark:border-blue-600' :
                    'border-purple-300 dark:border-purple-600'
                  } opacity-0 group-hover:opacity-100`}></div>
                </div>
              </div>
            </div>

            {/* Hover glow effect */}
            <div className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
              index === 0 ? 'bg-gradient-to-r from-green-400/5 to-emerald-400/5' :
              index === 1 ? 'bg-gradient-to-r from-blue-400/5 to-indigo-400/5' :
              'bg-gradient-to-r from-purple-400/5 to-pink-400/5'
            }`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContributorsSection;
