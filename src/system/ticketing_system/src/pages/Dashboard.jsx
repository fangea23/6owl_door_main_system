import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  Settings,
  LogOut,
  BarChart3,
  Star
} from 'lucide-react';
import logoSrc from '../../../../assets/logo.png';

// 六扇門 Logo 組件
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img
        src={logoSrc}
        alt="六扇門 Logo"
        className="w-full h-full object-contain filter drop-shadow-md"
      />
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // 點擊外部關閉用戶選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '使用者';

  // 登出處理
  const handleLogout = async () => {
    const confirmLogout = window.confirm("確定要登出系統嗎？");
    if (!confirmLogout) return;
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 統計資料 (示範)
  const stats = [
    {
      label: '待處理工單',
      value: 8,
      icon: Clock,
      color: 'blue',
      trend: '+2'
    },
    {
      label: '處理中',
      value: 5,
      icon: TrendingUp,
      color: 'amber',
      trend: '-1'
    },
    {
      label: '已完成',
      value: 42,
      icon: CheckCircle,
      color: 'green',
      trend: '+12'
    },
    {
      label: '逾期工單',
      value: 2,
      icon: AlertCircle,
      color: 'red',
      trend: '0'
    }
  ];

  // 最近工單 (示範資料)
  const recentTickets = [
    {
      id: 'TK20260116001',
      title: 'POS 機無法開機',
      category: '設備維修',
      status: 'open',
      priority: 'high',
      store: '信義店',
      createdAt: '1 小時前'
    },
    {
      id: 'TK20260116002',
      title: '冷氣不冷',
      category: '設備維修',
      status: 'in_progress',
      priority: 'normal',
      store: '台中店',
      createdAt: '3 小時前'
    },
    {
      id: 'TK20260115001',
      title: '網路連線異常',
      category: 'IT 支援',
      status: 'resolved',
      priority: 'high',
      store: '高雄店',
      createdAt: '昨天'
    }
  ];

  // 快速操作
  const quickActions = [
    {
      title: '建立工單',
      description: '報修或提出服務需求',
      icon: Plus,
      color: 'blue',
      onClick: () => alert('建立工單功能開發中')
    },
    {
      title: '我的工單',
      description: '查看我提交的工單',
      icon: Wrench,
      color: 'amber',
      onClick: () => alert('我的工單功能開發中')
    },
    {
      title: '待處理',
      description: '檢視待處理的工單',
      icon: Clock,
      color: 'red',
      onClick: () => alert('待處理工單功能開發中')
    },
    {
      title: '統計報表',
      description: '查看工單統計數據',
      icon: BarChart3,
      color: 'purple',
      onClick: () => alert('統計報表功能開發中')
    }
  ];

  const getStatusBadge = (status) => {
    const badges = {
      open: { text: '待處理', class: 'bg-blue-100 text-blue-700' },
      assigned: { text: '已指派', class: 'bg-purple-100 text-purple-700' },
      in_progress: { text: '處理中', class: 'bg-amber-100 text-amber-700' },
      resolved: { text: '已解決', class: 'bg-green-100 text-green-700' },
      closed: { text: '已關閉', class: 'bg-stone-100 text-stone-700' }
    };
    return badges[status] || badges.open;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: { text: '緊急', class: 'bg-red-500 text-white' },
      high: { text: '高', class: 'bg-red-100 text-red-700' },
      normal: { text: '普通', class: 'bg-stone-100 text-stone-700' },
      low: { text: '低', class: 'bg-stone-50 text-stone-600' }
    };
    return badges[priority] || badges.normal;
  };

  return (
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-pattern-diagonal opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-3 hover:opacity-100 transition-opacity"
                title="回到入口"
              >
                <Logo />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-stone-800 tracking-tight group-hover:text-red-800 transition-colors">
                    六扇門
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <div className="h-[1px] w-3 bg-amber-500/50"></div>
                    <p className="text-[10px] text-stone-500 font-medium tracking-[0.2em] group-hover:text-amber-600 transition-colors">
                      6OWL DOOR
                    </p>
                  </div>
                </div>
              </button>

              <div className="h-8 w-px bg-stone-200 mx-2" />

              {/* 子系統標題 */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Wrench size={18} className="text-amber-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">叫修服務</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">TICKETING SYSTEM</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                    showUserMenu ? 'bg-orange-50 border-orange-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-orange-500/20">
                    {displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-700">
                      {displayName}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-orange-500' : ''}`}
                  />
                </button>

                {/* 下拉選單 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />

                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                      <p className="text-base font-bold text-stone-800 truncate">{displayName}</p>
                      <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          <Settings size={16} />
                        </span>
                        帳戶設定
                      </Link>
                    </div>

                    <div className="p-2 border-t border-stone-100">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                          <LogOut size={16} />
                        </span>
                        登出系統
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const colors = {
              blue: 'from-blue-50 to-blue-100 text-blue-700',
              amber: 'from-amber-50 to-amber-100 text-amber-700',
              green: 'from-green-50 to-green-100 text-green-700',
              red: 'from-red-50 to-red-100 text-red-700'
            };

            return (
              <div
                key={index}
                className={`p-6 bg-gradient-to-br ${colors[stat.color]} rounded-xl shadow-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-8 h-8" />
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{stat.label}</span>
                  <span className="text-xs px-2 py-1 bg-white/50 rounded">
                    {stat.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 快速操作 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const colors = {
                blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
              };

              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`p-6 bg-gradient-to-br ${colors[action.color]} text-white rounded-xl transition-all shadow-lg hover:shadow-xl text-left`}
                >
                  <Icon className="w-8 h-8 mb-3" />
                  <h3 className="font-bold text-base mb-1">{action.title}</h3>
                  <p className="text-xs opacity-90">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 最近工單 */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-stone-900">最近工單</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              查看全部
            </button>
          </div>

          <div className="space-y-4">
            {recentTickets.map((ticket) => {
              const statusBadge = getStatusBadge(ticket.status);
              const priorityBadge = getPriorityBadge(ticket.priority);

              return (
                <div
                  key={ticket.id}
                  className="p-4 border border-stone-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-stone-500">{ticket.id}</span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${statusBadge.class}`}>
                          {statusBadge.text}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${priorityBadge.class}`}>
                          {priorityBadge.text}
                        </span>
                      </div>
                      <h3 className="font-semibold text-stone-900 text-base mb-1">
                        {ticket.title}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span>分類: {ticket.category}</span>
                        <span>店舖: {ticket.store}</span>
                        <span>{ticket.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 開發中提示 */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Wrench className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-900 mb-2">系統開發中</h3>
          <p className="text-sm text-stone-600">
            內部叫修/服務單系統正在開發中，敬請期待完整功能！
            <br />
            資料庫結構已完成，前端功能將陸續上線。
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/60 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-stone-600">
              <div className="w-8 h-8 flex items-center justify-center">
                <img src={logoSrc} alt="Logo" className="w-full h-full object-contain opacity-80" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800">六扇門企業服務入口</span>
                <span className="text-[10px] text-stone-400 tracking-wider">TICKETING SYSTEM</span>
              </div>
            </div>
            <div className="text-sm text-stone-500 font-medium">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. <span className="text-stone-300">|</span> All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
