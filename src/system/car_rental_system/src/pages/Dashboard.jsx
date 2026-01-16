import React from 'react';
import { Link } from 'react-router-dom';
import { Car, CheckCircle, Clock, AlertCircle, Plus, TrendingUp } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';

export const Dashboard = () => {
  const { stats, loading } = useDashboard();

  const statCards = [
    {
      title: '總車輛數',
      value: stats.totalVehicles,
      icon: Car,
      color: 'blue',
      link: '/systems/car-rental/vehicles',
    },
    {
      title: '可用車輛',
      value: stats.availableVehicles,
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: '租借中',
      value: stats.rentedVehicles,
      icon: Clock,
      color: 'orange',
    },
    {
      title: '維護中',
      value: stats.maintenanceVehicles,
      icon: AlertCircle,
      color: 'red',
    },
    {
      title: '待審核申請',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'purple',
      link: '/systems/car-rental/requests',
    },
    {
      title: '進行中租借',
      value: stats.activeRentals,
      icon: TrendingUp,
      color: 'indigo',
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-red-50 text-red-700 border-red-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-amber-50 text-amber-700 border-amber-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      purple: 'bg-red-50 text-red-700 border-red-200',
      indigo: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-stone-600 text-sm sm:text-base">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-stone-900 truncate">儀表板</h1>
          <p className="text-stone-600 mt-0.5 sm:mt-1 text-xs sm:text-sm lg:text-base hidden sm:block">公司車租借系統總覽</p>
        </div>
        <Link
          to="/systems/car-rental/requests/new"
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg hover:from-red-700 hover:to-amber-600 transition-all shadow-lg shadow-red-500/20 text-sm sm:text-base touch-manipulation active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">申請租車</span>
          <span className="sm:hidden">申請</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);
          const CardWrapper = stat.link ? Link : 'div';
          const cardProps = stat.link ? { to: stat.link } : {};

          return (
            <CardWrapper
              key={index}
              {...cardProps}
              className={`bg-white rounded-lg border border-stone-200 p-4 sm:p-5 lg:p-6 shadow-sm shadow-red-500/5 ${
                stat.link ? 'hover:shadow-lg hover:shadow-red-500/10 transition-all cursor-pointer touch-manipulation active:scale-98' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-stone-600 mb-1 sm:mb-2 truncate">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-stone-900">{stat.value}</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-lg border ${colorClasses} flex-shrink-0`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
            </CardWrapper>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-stone-200 p-4 sm:p-5 lg:p-6 shadow-sm shadow-red-500/5">
        <h2 className="text-lg sm:text-xl font-semibold text-stone-900 mb-3 sm:mb-4">快速操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
          <Link
            to="/systems/car-rental/requests/new"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 rounded-lg transition-all shadow-sm shadow-red-500/10 touch-manipulation active:scale-98"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium text-stone-900 text-sm sm:text-base">申請租車</span>
          </Link>
          <Link
            to="/systems/car-rental/vehicles"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-red-50 hover:from-amber-100 hover:to-red-100 rounded-lg transition-all shadow-sm shadow-amber-500/10 touch-manipulation active:scale-98"
          >
            <Car className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
            <span className="font-medium text-stone-900 text-sm sm:text-base">查看車輛</span>
          </Link>
          <Link
            to="/systems/car-rental/requests"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-red-50 to-amber-50 hover:from-red-100 hover:to-amber-100 rounded-lg transition-all shadow-sm shadow-red-500/10 touch-manipulation active:scale-98"
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium text-stone-900 text-sm sm:text-base">待審核申請</span>
          </Link>
          <Link
            to="/systems/car-rental/my-rentals"
            className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-all shadow-sm shadow-green-500/10 touch-manipulation active:scale-98"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
            <span className="font-medium text-stone-900 text-sm sm:text-base">我的租借</span>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg border border-stone-200 p-4 sm:p-5 lg:p-6 shadow-sm shadow-red-500/5">
          <h3 className="text-base sm:text-lg font-semibold text-stone-900 mb-2 sm:mb-3">本月統計</h3>
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex justify-between items-center gap-3">
              <span className="text-stone-600 text-sm sm:text-base">完成租借次數</span>
              <span className="text-lg sm:text-xl font-bold text-stone-900">
                {stats.completedRentalsThisMonth}
              </span>
            </div>
            <div className="flex justify-between items-center gap-3">
              <span className="text-stone-600 text-sm sm:text-base">即將到來（7天內）</span>
              <span className="text-lg sm:text-xl font-bold text-stone-900">{stats.upcomingRentals}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600 to-amber-500 rounded-lg p-4 sm:p-5 lg:p-6 text-white shadow-lg shadow-red-500/20">
          <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2">需要租車嗎？</h3>
          <p className="text-red-50 mb-3 sm:mb-4 text-sm sm:text-base">提交租車申請，讓我們為您安排最合適的車輛。</p>
          <Link
            to="/systems/car-rental/requests/new"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-red-50 transition-all font-medium text-sm sm:text-base shadow-md touch-manipulation active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            立即申請
          </Link>
        </div>
      </div>
    </div>
  );
};
