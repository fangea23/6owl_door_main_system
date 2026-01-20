import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  FileText,
  Bell,
  Download,
  BookOpen,
  Search,
  TrendingUp,
  ChevronDown,
  Settings,
  LogOut,
  Clock,
  Star,
  Users
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
  const [searchTerm, setSearchTerm] = useState('');
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

  // 快速連結
  const quickLinks = [
    {
      title: '文件中心',
      description: '查看所有文件與 SOP',
      icon: FileText,
      color: 'blue',
      onClick: () => alert('文件中心功能開發中')
    },
    {
      title: '公告看板',
      description: '查看最新公告訊息',
      icon: Bell,
      color: 'red',
      badge: 3, // 未讀數
      onClick: () => alert('公告看板功能開發中')
    },
    {
      title: '表單下載',
      description: '下載各式表單',
      icon: Download,
      color: 'amber',
      onClick: () => alert('表單下載功能開發中')
    },
    {
      title: '教育訓練',
      description: '員工訓練資源',
      icon: BookOpen,
      color: 'purple',
      onClick: () => alert('教育訓練功能開發中')
    }
  ];

  // 最新公告 (示範資料)
  const announcements = [
    {
      id: 1,
      title: '歡迎使用企業入口網系統',
      date: '2026-01-16',
      priority: 'normal',
      isUnread: true
    },
    {
      id: 2,
      title: '系統維護通知 - 1/20 進行定期維護',
      date: '2026-01-15',
      priority: 'high',
      isUnread: true
    },
    {
      id: 3,
      title: '新版請款流程說明',
      date: '2026-01-14',
      priority: 'normal',
      isUnread: false
    }
  ];

  // 熱門文件 (示範資料)
  const popularDocs = [
    { id: 1, title: '員工請假作業流程', category: '人事規定', views: 230 },
    { id: 2, title: '差旅費報支標準', category: '行政規章', views: 189 },
    { id: 3, title: '物品請購 SOP', category: '作業 SOP', views: 156 }
  ];

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
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BookOpen size={18} className="text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">企業入口網</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">EIP & KM</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                    showUserMenu ? 'bg-purple-50 border-purple-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-purple-500/20">
                    {displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-700">
                      {displayName}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-purple-500' : ''}`}
                  />
                </button>

                {/* 下拉選單 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />

                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                      <p className="text-base font-bold text-stone-800 truncate">{displayName}</p>
                      <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
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
        {/* 搜尋欄 */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜尋文件、公告、SOP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 sm:py-4 border border-stone-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base shadow-sm"
            />
          </div>
        </div>

        {/* 快速連結 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-4">快速連結</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              const colorClasses = {
                blue: 'from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700',
                red: 'from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 text-red-700',
                amber: 'from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-amber-700',
                purple: 'from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700'
              }[link.color];

              return (
                <button
                  key={index}
                  onClick={link.onClick}
                  className={`relative p-6 bg-gradient-to-br ${colorClasses} rounded-xl transition-all shadow-sm hover:shadow-md text-left`}
                >
                  {link.badge && (
                    <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {link.badge}
                    </span>
                  )}
                  <Icon className="w-8 h-8 mb-3" />
                  <h3 className="font-bold text-base mb-1">{link.title}</h3>
                  <p className="text-xs opacity-80">{link.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最新公告 */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                最新公告
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                查看全部
              </button>
            </div>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    announcement.isUnread
                      ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.isUnread && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-stone-900 text-sm truncate">
                          {announcement.title}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-500">{announcement.date}</p>
                    </div>
                    {announcement.priority === 'high' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded flex-shrink-0">
                        重要
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 熱門文件 */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                熱門文件
              </h2>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                瀏覽全部
              </button>
            </div>
            <div className="space-y-3">
              {popularDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border border-stone-200 hover:bg-stone-50 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-900 text-sm mb-1 truncate">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                          {doc.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {doc.views} 次瀏覽
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 開發中提示 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-stone-900 mb-2">系統開發中</h3>
          <p className="text-sm text-stone-600">
            企業入口網與知識管理系統正在開發中，敬請期待完整功能！
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
                <span className="text-[10px] text-stone-400 tracking-wider">EIP & KM SYSTEM</span>
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
