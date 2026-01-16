import React from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Car, LayoutDashboard, FileText, History, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-rose-600" />
              <h1 className="text-2xl font-bold text-gray-900">公司車租借系統</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* 使用者資訊 */}
              {user && (
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-rose-800 flex items-center justify-center text-white font-medium shadow-sm">
                    {displayName?.charAt(0) || <User size={16} />}
                  </div>
                  <span className="font-medium">{displayName}</span>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                返回主系統
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    active
                      ? 'bg-rose-50 text-rose-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-rose-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
