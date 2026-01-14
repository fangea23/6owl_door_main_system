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
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      orange: 'bg-orange-50 text-orange-700 border-orange-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">儀表板</h1>
          <p className="text-gray-600 mt-1">公司車租借系統總覽</p>
        </div>
        <Link
          to="/systems/car-rental/requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          申請租車
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = getColorClasses(stat.color);
          const CardWrapper = stat.link ? Link : 'div';
          const cardProps = stat.link ? { to: stat.link } : {};

          return (
            <CardWrapper
              key={index}
              {...cardProps}
              className={`bg-white rounded-lg border border-gray-200 p-6 ${
                stat.link ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg border ${colorClasses}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </CardWrapper>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/systems/car-rental/requests/new"
            className="flex items-center gap-3 p-4 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 text-rose-600" />
            <span className="font-medium text-gray-900">申請租車</span>
          </Link>
          <Link
            to="/systems/car-rental/vehicles"
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Car className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-900">查看車輛</span>
          </Link>
          <Link
            to="/systems/car-rental/requests"
            className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
          >
            <Clock className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">待審核申請</span>
          </Link>
          <Link
            to="/systems/car-rental/my-rentals"
            className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-gray-900">我的租借</span>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">本月統計</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">完成租借次數</span>
              <span className="text-xl font-bold text-gray-900">
                {stats.completedRentalsThisMonth}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">即將到來（7天內）</span>
              <span className="text-xl font-bold text-gray-900">{stats.upcomingRentals}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">需要租車嗎？</h3>
          <p className="text-rose-50 mb-4">提交租車申請，讓我們為您安排最合適的車輛。</p>
          <Link
            to="/systems/car-rental/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-lg hover:bg-rose-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            立即申請
          </Link>
        </div>
      </div>
    </div>
  );
};
