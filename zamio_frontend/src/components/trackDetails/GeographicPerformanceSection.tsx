import React from 'react';
import { MapPin } from 'lucide-react';

interface RegionPerformance {
  region: string;
  plays: number;
  percentage: number;
  color: 'green' | 'blue' | 'purple' | 'amber';
  stations: number;
}

interface GeographicPerformanceSectionProps {
  regions: RegionPerformance[];
}

const colorClassMap: Record<RegionPerformance['color'], { dot: string; bar: string; shadow: string }> = {
  green: {
    dot: 'bg-green-500',
    bar: 'bg-gradient-to-r from-green-400 to-green-600',
    shadow: 'rgba(34, 197, 94, 0.4)',
  },
  blue: {
    dot: 'bg-blue-500',
    bar: 'bg-gradient-to-r from-blue-400 to-blue-600',
    shadow: 'rgba(59, 130, 246, 0.4)',
  },
  purple: {
    dot: 'bg-purple-500',
    bar: 'bg-gradient-to-r from-purple-400 to-purple-600',
    shadow: 'rgba(147, 51, 234, 0.4)',
  },
  amber: {
    dot: 'bg-amber-500',
    bar: 'bg-gradient-to-r from-amber-400 to-amber-600',
    shadow: 'rgba(245, 158, 11, 0.4)',
  },
};

const GeographicPerformanceSection: React.FC<GeographicPerformanceSectionProps> = ({ regions }) => {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <MapPin className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
        Geographic Performance
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="relative">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Regional Play Distribution</h3>
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <svg viewBox="0 0 400 300" className="w-full h-64">
              <path
                d="M50 150 Q100 100 200 120 Q300 140 350 180 Q320 220 250 240 Q150 250 80 220 Q50 180 50 150 Z"
                fill="rgba(59, 130, 246, 0.1)"
                stroke="rgba(59, 130, 246, 0.3)"
                strokeWidth="2"
              />
              <circle cx="120" cy="160" r="25" fill="rgba(34, 197, 94, 0.8)" className="animate-pulse">
                <animate attributeName="r" values="25;30;25" dur="2s" repeatCount="indefinite" />
              </circle>
              <text x="120" y="165" textAnchor="middle" className="text-xs font-bold fill-white">Accra</text>
              <text x="120" y="180" textAnchor="middle" className="text-xs fill-gray-700 dark:fill-gray-300">423 plays</text>
              <circle cx="180" cy="180" r="18" fill="rgba(59, 130, 246, 0.7)">
                <animate attributeName="r" values="18;22;18" dur="2.5s" repeatCount="indefinite" />
              </circle>
              <text x="180" y="185" textAnchor="middle" className="text-xs font-bold fill-white">Kumasi</text>
              <text x="180" y="200" textAnchor="middle" className="text-xs fill-gray-700 dark:fill-gray-300">156 plays</text>
              <circle cx="220" cy="120" r="12" fill="rgba(147, 51, 234, 0.6)">
                <animate attributeName="r" values="12;15;12" dur="3s" repeatCount="indefinite" />
              </circle>
              <text x="220" y="125" textAnchor="middle" className="text-xs font-bold fill-white">Tamale</text>
              <text x="220" y="140" textAnchor="middle" className="text-xs fill-gray-700 dark:fill-gray-300">34 plays</text>
              <circle cx="80" cy="200" r="15" fill="rgba(245, 158, 11, 0.7)">
                <animate attributeName="r" values="15;18;15" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <text x="80" y="205" textAnchor="middle" className="text-xs font-bold fill-white">Takoradi</text>
              <text x="80" y="220" textAnchor="middle" className="text-xs fill-gray-700 dark:fill-gray-300">67 plays</text>
              <g className="station-markers">
                <circle cx="110" cy="155" r="3" fill="#ef4444" className="animate-pulse" />
                <circle cx="130" cy="165" r="3" fill="#3b82f6" className="animate-pulse" />
                <circle cx="170" cy="175" r="3" fill="#10b981" className="animate-pulse" />
                <circle cx="190" cy="185" r="3" fill="#f59e0b" className="animate-pulse" />
              </g>
            </svg>
            <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg p-2 text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">High (100+)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">Medium (50-99)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700 dark:text-gray-300">Low (1-49)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">Regional Performance</h3>
          {regions.map((region, index) => (
            <div key={index} className="group relative p-4 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${colorClassMap[region.color].dot}`}></div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{region.region}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{region.stations} active stations</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">{region.plays}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">plays</p>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-2 relative overflow-hidden">
                    <div
                      className={`${colorClassMap[region.color].bar} h-full rounded-full transition-all duration-500`}
                      style={{
                        width: `${region.percentage}%`,
                        boxShadow: `0 0 8px ${colorClassMap[region.color].shadow}`,
                      }}
                    ></div>
                  </div>
                  <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                    {region.percentage}%
                  </div>
                </div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                  {region.region}: {region.plays} plays ({region.percentage}%)
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">16</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Regions Covered</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">68%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Primary Market Share</div>
        </div>
        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">25</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Stations</div>
        </div>
      </div>
    </div>
  );
};

export default GeographicPerformanceSection;
