import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Car, LayoutDashboard, FileText, History, Settings, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 獲取顯示名稱（優先順序：profile.name > user_metadata.name > email）
  const displayName = profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  const handleLogout = () => {
    // 回到主系統
    navigate('/');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navItems = [
    {
      path: '/systems/car-rental/dashboard',
      label: '儀表板',
      icon: LayoutDashboard,
    },
    {
      path: '/systems/car-rental/vehicles',
      label: '車輛管理',
      icon: Car,
    },
    {
      path: '/systems/car-rental/requests',
      label: '租借申請',
      icon: FileText,
    },
    {
      path: '/systems/car-rental/my-rentals',
      label: '我的租借',
      icon: History,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-amber-500 text-white sticky top-0 z-20 shadow-lg shadow-red-500/20">
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* 手機版漢堡選單按鈕 */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-1.5 hover:bg-white/10 rounded-lg transition-colors touch-manipulation active:scale-95"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Car className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 flex-shrink-0" />
              <h1 className="text-base sm:text-lg lg:text-2xl font-bold leading-tight">
                <span className="hidden sm:inline">公司車租借系統</span>
                <span className="sm:hidden">公司車</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
              {/* 使用者資訊 */}
              {user && (
                <Link
                  to="/account"
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-manipulation active:scale-95"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-medium shadow-sm flex-shrink-0">
                    {displayName?.charAt(0) || <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>
                  <span className="font-medium hidden md:inline text-sm lg:text-base">{displayName}</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors touch-manipulation active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm lg:text-base hidden sm:inline">返回主系統</span>
                <span className="text-xs sm:hidden">返回</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar Overlay (手機版) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-0 left-0 w-64 sm:w-72 bg-white border-r border-stone-200 min-h-screen z-40 transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header (手機版) */}
          <div className="lg:hidden p-3 sm:p-4 border-b border-stone-200 bg-gradient-to-r from-red-600 to-amber-500 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                <h2 className="font-bold text-sm sm:text-base">公司車租借系統</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors touch-manipulation active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="p-3 sm:p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all touch-manipulation active:scale-98 ${
                    active
                      ? 'bg-gradient-to-r from-red-50 to-amber-50 text-red-700 font-medium shadow-md shadow-red-500/10'
                      : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${active ? 'text-red-600' : 'text-stone-400'}`} />
                  <span className="text-sm sm:text-base">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
