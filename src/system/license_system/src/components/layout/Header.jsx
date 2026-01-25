import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Key, 
  Laptop, 
  UserCheck, 
  LogOut, 
  Shield, 
  Menu, 
  X, 
  Package, 
  ChevronDown, 
  FolderOpen,
  User,
  Settings,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useUserRole } from '../../../../../hooks/useUserRole';
import logoSrc from '../../../../../assets/logo.png'; 

// 系統基礎路徑
const BASE_PATH = '/systems/software-license';

// --- Logo 組件 ---
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img 
        src={logoSrc} 
        alt="六扇門 Logo" 
        className="w-full h-full object-contain filter drop-shadow-md"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentNode.classList.add('bg-blue-100', 'text-blue-600', 'font-bold', 'rounded-lg');
          e.target.parentNode.innerText = '6OWL';
        }}
      />
    </div>
  );
};

// --- 導航設定 ---
const navConfig = [
  {
    type: 'link',
    path: `${BASE_PATH}/dashboard`,
    icon: LayoutDashboard,
    label: '儀表板'
  },
  {
    type: 'dropdown',
    icon: Key,
    label: '授權管理',
    items: [
      { path: `${BASE_PATH}/licenses`, icon: Key, label: '授權清單' },
      { path: `${BASE_PATH}/assignments`, icon: UserCheck, label: '授權分配' }
    ]
  },
  {
    type: 'dropdown',
    icon: FolderOpen,
    label: '資產資源',
    items: [
      { path: `${BASE_PATH}/devices`, icon: Laptop, label: '設備管理' },
      { path: `${BASE_PATH}/software`, icon: Package, label: '軟體產品' }
    ]
  },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, signOut } = useAuth();
  const { roleName } = useUserRole();

  // --- 狀態管理 ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 控制電腦版下拉
  const [showUserMenu, setShowUserMenu] = useState(false); // 控制用戶下拉選單
  const [employeeName, setEmployeeName] = useState(null); // 員工姓名
  const dropdownRef = useRef(null); // 用於點擊外部關閉
  const userMenuRef = useRef(null); // 用於用戶選單點擊外部關閉

  // --- 1. 抓取員工姓名邏輯 ---
  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;
      try {
        // 嘗試從 employees 表抓取對應 user_id 的資料
        const { data, error } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .maybeSingle(); // 使用 maybeSingle 避免沒有資料時報錯

        if (data?.name) {
          setEmployeeName(data.name);
        }
      } catch (err) {
        console.error('Error fetching employee name:', err);
      }
    };
    fetchEmployeeName();
  }, [user]);

  // --- 2. 顯示名稱與狀態判斷 ---
  // 優先順序：員工表姓名 > Metadata 全名 > Metadata 名字 > Email
  const displayName = employeeName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  // 是否資料不完整 (若只抓到 email 通常視為不完整，視您的需求而定)
  const isProfileIncomplete = !employeeName && !user?.user_metadata?.full_name;

  // --- 3. 路由與互動邏輯 ---
  // 路由變更時重置狀態
  useEffect(() => {
    setOpenDropdown(null);
    setIsMenuOpen(false);
  }, [location.pathname]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const confirmLogout = window.confirm("確定要登出系統嗎？");
    if (!confirmLogout) return;
    try {
      if (logout) await logout();
      else if (signOut) await signOut();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };

  // 判斷連結是否啟用
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm print:hidden">
      {/* 裝飾背景 */}
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
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 tracking-tight group-hover:text-red-800 transition-colors">
                六扇門
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="h-[1px] w-3 bg-blue-500/50"></div>
                <p className="text-[10px] text-gray-500 font-medium tracking-[0.2em] group-hover:text-blue-600 transition-colors">
                  6OWL DOOR
                </p>
              </div>
            </div>
          </button>

          <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block" />

          {/* 子系統標題 */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg hidden sm:block">
              <Shield size={18} className="text-blue-600" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-gray-700">授權管理系統</p>
              <p className="text-[10px] text-gray-400 tracking-wider">LICENSE SYSTEM</p>
            </div>
          </div>
        </div>

        {/* ================= 中間：電腦版導覽選單 (含下拉) ================= */}
        <nav className="hidden lg:flex items-center gap-1" ref={dropdownRef}>
          {navConfig.map((item, index) => {
            if (item.type === 'link') {
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            }
            
            // Dropdown 類型
            const isOpen = openDropdown === index;
            const hasActiveChild = item.items.some(child => isActive(child.path));
            
            return (
              <div key={item.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : index)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                    hasActiveChild || isOpen
                      ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {item.items.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive(child.path)
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <child.icon size={16} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ================= 右側：使用者資訊 & 手機選單按鈕 ================= */}
        <div className="flex items-center gap-3">

          {/* 使用者下拉選單 */}
          <div className="relative hidden lg:block" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                showUserMenu ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-blue-500/20">
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-700">
                  {displayName}
                </p>
                <p className="text-[10px] text-gray-400 font-medium tracking-wide">
                  {roleName}
                </p>
              </div>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-blue-500' : ''}`}
              />
            </button>

            {/* 下拉選單 */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />

                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-base font-bold text-gray-800 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 mb-2 truncate">{user?.email}</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    {roleName}
                  </span>
                </div>

                <div className="p-2 space-y-1">
                  <Link
                    to="/account"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors group"
                  >
                    <span className="p-1.5 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      <Settings size={16} />
                    </span>
                    帳戶設定
                  </Link>
                </div>

                <div className="p-2 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
                  >
                    <span className="p-1.5 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
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
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
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
        <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top-2 z-50 max-h-[calc(100vh-80px)] overflow-y-auto">
          <nav className="flex flex-col p-4 space-y-2">

            {/* 手機版使用者資訊卡片 */}
            {user && (
              <div className="rounded-xl p-3 mb-4 bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-medium shadow-sm">
                    {displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-800 truncate">{displayName}</div>
                    <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 px-1">
                  {roleName}
                </div>
              </div>
            )}

            {/* 手機版導航連結 */}
            {navConfig.map((item) => {
              if (item.type === 'link') {
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </Link>
                );
              }
              // 下拉分組 (手機版展開顯示)
              return (
                <div key={item.label} className="pt-2">
                  <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <item.icon size={14} />
                    {item.label}
                  </div>
                  <div className="space-y-1 mt-1">
                    {item.items.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 pl-10 rounded-xl text-base font-medium transition-colors ${
                          isActive(child.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <child.icon size={18} />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="border-t border-gray-100 my-2 pt-2 mt-4 space-y-1">
              <Link
                to="/account"
                onClick={() => setIsMenuOpen(false)}
                className="w-full px-4 py-3 flex items-center gap-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
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