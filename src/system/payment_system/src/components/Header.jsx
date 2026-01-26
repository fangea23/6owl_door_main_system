import React, { useState, useEffect, useRef } from 'react'; // 1. 引入 useEffect 和 useRef
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  LogOut,
  Menu,
  X,
  User,
  Settings,
  AlertCircle,
  Home,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { useUserRole } from '../../../../hooks/useUserRole';
import logoSrc from '../../../../assets/logo.png';

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';

// 六扇門 Logo 組件
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12';
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

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const { user } = useAuth();
  const { roleName } = useUserRole();

  // --- 新增：員工姓名狀態與抓取邏輯 ---
  const [employeeName, setEmployeeName] = useState(null);

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (data?.name) {
          setEmployeeName(data.name);
        }
      } catch (err) {
        // 靜默失敗或僅 console log，不影響使用者操作
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
  // -------------------------------------

  // 修改：優先顯示員工資料表中的姓名
  const displayName = employeeName || user?.user_metadata?.full_name || user?.name || user?.email;

  // 判斷是否資料不完整 (沒有全名)
  const isProfileIncomplete = user && !displayName;

  // 判斷目前頁面
  const isActive = (path) => {
    const fullPath = `${BASE_PATH}${path}`;
    if (path === '/dashboard') {
      return location.pathname === BASE_PATH ||
             location.pathname === `${BASE_PATH}/` ||
             location.pathname === fullPath;
    }
    return location.pathname.startsWith(fullPath);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("確定要登出系統嗎？");
    if (!confirmLogout) return;

    try {
      await supabase.auth.signOut();
      closeMenu();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
      alert('登出發生錯誤，請稍後再試');
    }
  };

  // 輔助函式：產生連結樣式
  const getNavLinkClass = (active) => `
    px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200
    ${active 
      ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100'
      : 'text-stone-500 hover:text-red-600 hover:bg-stone-50'
    }
  `;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm print:hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between relative">

        {/* ================= 左側：Logo 與標題 ================= */}
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
              <LayoutDashboard size={18} className="text-blue-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-stone-700">付款簽核</p>
              <p className="text-[10px] text-stone-400 tracking-wider">PAYMENT APPROVAL</p>
            </div>
          </div>
        </div>

        {/* ================= 中間：電腦版導覽選單 ================= */}
        <nav className="hidden md:flex items-center gap-1">

          <Link
            to={`${BASE_PATH}/dashboard`}
            className={getNavLinkClass(isActive('/dashboard'))}
          >
            <LayoutDashboard size={18} />
            總覽看板
          </Link>

          <Link
            to={`${BASE_PATH}/apply`}
            className={getNavLinkClass(isActive('/apply'))}
          >
            <FilePlus size={18} />
            新增申請
          </Link>
        </nav>

        {/* ================= 右側：使用者資訊 & 手機選單按鈕 ================= */}
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
                <p className="text-[10px] text-stone-400 font-medium tracking-wide">
                  {roleName}
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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500" />

                <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                  <p className="text-base font-bold text-stone-800 truncate">{displayName}</p>
                  <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded-full border border-red-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                    {roleName}
                  </span>
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

          {/* 手機版：漢堡選單按鈕 */}
          <button
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="選單"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}

            {isProfileIncomplete && !isMenuOpen && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 手機版下拉選單 ================= */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-stone-200 shadow-xl animate-in slide-in-from-top-2 z-50">
          <nav className="flex flex-col p-4 space-y-2">

            {/* 手機版使用者資訊卡片 */}
            {user && (
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
                <div className="text-[10px] text-stone-400 px-1">
                  {roleName}
                </div>
              </div>
            )}

            <Link
              to={`${BASE_PATH}/dashboard`}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/dashboard')
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <LayoutDashboard size={20} />
              總覽看板
            </Link>

            <Link
              to={`${BASE_PATH}/apply`}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/apply')
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <FilePlus size={20} />
              新增申請
            </Link>

            <div className="border-t border-stone-100 my-2 pt-2 space-y-1">
              <Link
                to="/account"
                onClick={closeMenu}
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
        </div>
      )}
    </header>
  );
}