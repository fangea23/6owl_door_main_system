import React, { useState, useEffect, useRef } from 'react'; // 1. 引入 useEffect, useRef
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Car,
  LayoutDashboard,
  FileText,
  History,
  Menu,
  X,
  Key,
  ChevronDown,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
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

export const Layout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // --- 3. 新增：員工姓名狀態與抓取邏輯 ---
  const [employeeName, setEmployeeName] = useState(null);

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (data?.name) {
          setEmployeeName(data.name);
        }
      } catch (err) {
        console.error('Error fetching employee name:', err);
      }
    };

    fetchEmployeeName();
  }, [user]);

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

  // 4. 定義顯示名稱變數 (優先使用員工表姓名)
  const displayName = employeeName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '使用者';

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
  // -------------------------------------

  // ✅ 修改：加入「租借管理」並調整順序
  const navItems = [
    { path: '/systems/car-rental/dashboard', icon: LayoutDashboard, label: '儀表板' },
    { path: '/systems/car-rental/requests', icon: FileText, label: '租借申請' },
    { path: '/systems/car-rental/rentals', icon: Key, label: '租借管理' },
    { path: '/systems/car-rental/vehicles', icon: Car, label: '車輛管理' },
    { path: '/systems/car-rental/my-rentals', icon: History, label: '我的租借' },
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
                <div className="p-2 bg-red-50 rounded-lg">
                  <Car size={18} className="text-red-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">公司車租借</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">CAR RENTAL</p>
                </div>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {/* 使用者下拉選單 */}
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                    showUserMenu ? 'bg-red-50 border-red-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-red-500/20">
                    {displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-700">
                      {displayName}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-red-500' : ''}`}
                  />
                </button>

                {/* 下拉選單 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />

                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                      <p className="text-base font-bold text-stone-800 truncate">{displayName}</p>
                      <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-stone-200 bg-white p-4 space-y-2">
            {/* 用戶資訊卡片 */}
            <div className="rounded-xl p-3 mb-4 bg-stone-50 border border-stone-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium shadow-sm">
                  {displayName?.charAt(0) || 'U'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-stone-800 truncate">{displayName}</div>
                  <div className="text-xs text-stone-500 truncate">{user?.email}</div>
                </div>
              </div>
            </div>

            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-red-50 text-red-700'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="border-t border-stone-100 my-2 pt-2 space-y-1">
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full px-4 py-3 flex items-center gap-3 text-stone-600 hover:bg-stone-50 rounded-xl transition-colors font-medium"
              >
                <Settings size={20} />
                帳戶設定
              </Link>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
              >
                <LogOut size={20} />
                登出系統
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/60 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-stone-600">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-full h-full object-contain opacity-80"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800">六扇門企業服務入口</span>
                <span className="text-[10px] text-stone-400 tracking-wider">CAR RENTAL SYSTEM</span>
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
};