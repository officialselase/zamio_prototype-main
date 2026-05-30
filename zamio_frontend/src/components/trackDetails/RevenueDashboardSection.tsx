import React from 'react';
import { Clock, DollarSign, Download, Filter, Globe, TrendingUp } from 'lucide-react';

interface MonthlyEarning {
  month: string;
  amount: number;
  currency: string;
}

interface TerritoryEarning {
  territory: string;
  amount: number;
  currency: string;
  percentage: number;
}

interface PayoutHistoryItem {
  date: string;
  amount: number;
  status: string;
  period: string;
}

interface RevenueDashboardSectionProps {
  totalEarnings: number;
  monthlyEarnings: MonthlyEarning[];
  territoryEarnings: TerritoryEarning[];
  payoutHistory: PayoutHistoryItem[];
}

const RevenueDashboardSection: React.FC<RevenueDashboardSectionProps> = ({
  totalEarnings,
  monthlyEarnings,
  territoryEarnings,
  payoutHistory,
}) => {
  const latestEarning = monthlyEarnings[monthlyEarnings.length - 1];
  const pendingPayout = payoutHistory.find((p) => p.status === 'Pending');
  const maxMonthlyAmount = Math.max(...monthlyEarnings.map((e) => e.amount));
  const maxTerritoryAmount = Math.max(...territoryEarnings.map((t) => t.amount));

  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
        <DollarSign className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
        Revenue Dashboard
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-green-50/90 via-emerald-50/80 to-teal-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-green-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Total Earnings</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">
                ₵{totalEarnings.toLocaleString()}
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <DollarSign className="w-4 h-4 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-indigo-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">This Month</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                ₵{latestEarning?.amount.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/60 dark:to-cyan-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <TrendingUp className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50/90 via-pink-50/80 to-rose-50/90 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200/50 dark:border-slate-600/60 p-4 lg:p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group cursor-pointer sm:col-span-2 lg:col-span-1">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex-1">
              <p className="text-xs lg:text-sm font-normal text-gray-700 dark:text-slate-300">Pending Payout</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                ₵{pendingPayout?.amount.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/60 dark:to-pink-900/60 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Clock className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
              Monthly Earnings Trend
            </h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Earnings</span>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" title="Filter by earnings">
                <Filter className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {monthlyEarnings.map((earning, index) => {
              const percentage = maxMonthlyAmount ? (earning.amount / maxMonthlyAmount) * 100 : 0;
              const prevAmount = index > 0 ? monthlyEarnings[index - 1].amount : 0;
              const growth = index > 0 && prevAmount ? ((earning.amount - prevAmount) / prevAmount) * 100 : 0;

              return (
                <div key={index} className="group relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 text-sm text-gray-600 dark:text-gray-400 font-medium">
                        {earning.month}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                        growth > 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : growth < 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {growth > 0 ? '+' : ''}{isFinite(growth) ? growth.toFixed(1) : '0.0'}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₵{earning.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {earning.currency}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out relative"
                          style={{
                            width: `${percentage}%`,
                            boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)'
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                        </div>
                      </div>
                      <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>

                  <button className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  ₵{Math.max(...monthlyEarnings.map((e) => e.amount)).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Peak Month</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {monthlyEarnings.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Months Tracked</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  +{((monthlyEarnings[monthlyEarnings.length - 1]?.amount - monthlyEarnings[0]?.amount) / monthlyEarnings[0]?.amount * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Growth</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 dark:border-slate-700/30 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-gray-900 dark:text-white flex items-center">
              <Globe className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
              Earnings by Territory
            </h3>
            <div className="flex items-center space-x-2">
              <select className="text-xs px-2 py-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Territories</option>
                <option>Top 5</option>
                <option>Growth Markets</option>
              </select>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" title="Export territory data">
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {territoryEarnings.map((territory, index) => {
              const percentage = maxTerritoryAmount ? (territory.amount / maxTerritoryAmount) * 100 : 0;
              const colorClass = index === 0 ? 'green' : index === 1 ? 'blue' : index === 2 ? 'purple' : 'amber';

              return (
                <div key={index} className="group relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full bg-${colorClass}-500`}></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{territory.territory}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{territory.percentage}% of total earnings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600 dark:text-green-400">₵{territory.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{territory.currency}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 dark:bg-slate-700 rounded-full h-3 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            colorClass === 'green' ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            colorClass === 'blue' ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                            colorClass === 'purple' ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                            'bg-gradient-to-r from-amber-400 to-amber-600'
                          }`}
                          style={{
                            width: `${percentage}%`,
                            boxShadow: `0 0 8px ${
                              colorClass === 'green'
                                ? 'rgba(34, 197, 94, 0.4)'
                                : colorClass === 'blue'
                                ? 'rgba(59, 130, 246, 0.4)'
                                : colorClass === 'purple'
                                ? 'rgba(147, 51, 234, 0.4)'
                                : 'rgba(245, 158, 11, 0.4)'
                            }`
                          }}
                        ></div>
                      </div>
                      <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right font-mono">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                      {territory.territory}: ₵{territory.amount.toLocaleString()} ({territory.percentage}%)
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total Territories:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{territoryEarnings.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600 dark:text-gray-400">Primary Market:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {territoryEarnings[0]?.territory} ({territoryEarnings[0]?.percentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">Payout History</h3>
          <div className="flex items-center space-x-2">
            <select className="text-xs px-2 py-1 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option>All Status</option>
              <option>Paid</option>
              <option>Pending</option>
            </select>
            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" title="Export payout data">
              <Download className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {payoutHistory.map((payout, index) => (
            <div key={index} className="group relative flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-200">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${payout.status === 'Paid' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{payout.period}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(payout.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">₵{payout.amount.toLocaleString()}</p>
                <p className={`text-sm ${payout.status === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {payout.status}
                </p>
              </div>
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Download className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboardSection;
