/**
 * 軟體授權系統 Layout
 * 整合授權系統到六扇門企業入口的單一入口 (SSO)
 */
import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, NavLink, useNavigate, useLocation,Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的頁面
import { Dashboard } from '../../system/license_system/src/pages/Dashboard';
import { Licenses } from '../../system/license_system/src/pages/Licenses';
import { Assignments } from '../../system/license_system/src/pages/Assignments';
import { Employees } from '../../system/license_system/src/pages/Employees';
import { Devices } from '../../system/license_system/src/pages/Devices';
import { Software } from '../../system/license_system/src/pages/Software';
import { Settings } from '../../system/license_system/src/pages/Settings';
import { VerifyLicense } from '../../system/license_system/src/pages/VerifyLicense';

// 圖標
import {
  LayoutDashboard,
  Key,
  Users,
  Laptop,
  UserCheck,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Menu,
  X,
  Package,
  ChevronDown,
  FolderOpen
} from 'lucide-react';

// Logo 圖片
import logoSrc from '../../assets/logo.png';

// 子系統的基礎路徑
const BASE_PATH = '/systems/software-license';

// 導航結構 - 分組
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
    label: '授權',
    items: [
      { path: `${BASE_PATH}/licenses`, icon: Key, label: '授權管理' },
      { path: `${BASE_PATH}/assignments`, icon: UserCheck, label: '授權分配' }
    ]
  },
  {
    type: 'dropdown',
    icon: FolderOpen,
    label: '資源',
    items: [
      { path: `${BASE_PATH}/employees`, icon: Users, label: '員工管理' },
      { path: `${BASE_PATH}/devices`, icon: Laptop, label: '設備管理' },
      { path: `${BASE_PATH}/software`, icon: Package, label: '軟體管理' }
    ]
  },
  {
    type: 'link',
    path: `${BASE_PATH}/settings`,
    icon: SettingsIcon,
    label: '設定'
  }
];

// Logo 組件
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

// 下拉選單組件
const NavDropdown = ({ item, isOpen, onToggle, onClose }) => {
  const location = useLocation();
  const dropdownRef = useRef(null);

  // 檢查是否有子項目是當前頁面
  const hasActiveChild = item.items.some(child => location.pathname === child.path);

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          hasActiveChild || isOpen
            ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
        }`}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {item.items.map(child => (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                }`
              }
            >
              <child.icon size={16} />
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// 受保護路由組件 - 使用主系統認證
const LicenseProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 內部佈局組件 - 頂部導航
const LicenseInternalLayout = () => {
  const { profile, logout, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleSignOut = async () => {
    if (logout) {
      await logout();
    } else if (signOut) {
      await signOut();
    }
  };

  // 路由變更時關閉下拉選單
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - 頂部導航 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

              <div className="h-8 w-px bg-gray-200 mx-2" />

              {/* 子系統標題 */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield size={18} className="text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-gray-700">授權管理系統</p>
                  <p className="text-[10px] text-gray-400 tracking-wider">LICENSE SYSTEM</p>
                </div>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navConfig.map((item, index) => {
                if (item.type === 'link') {
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }`
                      }
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                }

                return (
                  <NavDropdown
                    key={item.label}
                    item={item}
                    isOpen={openDropdown === index}
                    onToggle={() => setOpenDropdown(openDropdown === index ? null : index)}
                    onClose={() => setOpenDropdown(null)}
                  />
                );
              })}
            </nav>


            {/* User Menu：將 div 改為 Link 並增加 hover 樣式 */}
            <div className="flex items-center gap-3">
              <Link 
                to="/account" 
                className="hidden sm:flex items-center gap-2 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
                title="個人資料設定"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-blue-500/20">
                  {profile?.full_name?.charAt(0) || profile?.name?.charAt(0) || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-sm hidden md:block">
                  <p className="font-medium text-gray-700">
                    {profile?.full_name || profile?.name || profile?.email?.split('@')[0] || '使用者'}
                  </p>
                </div>
              </Link>

              {/* 登出按鈕 (桌面版) */}
              <button
                onClick={handleSignOut}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="登出"
              >
                <LogOut size={18} />
                <span className="hidden lg:inline">登出</span>
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="lg:hidden border-t border-gray-200 bg-white p-4 space-y-1">
            {navConfig.map((item) => {
              if (item.type === 'link') {
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                );
              }

              // 下拉分組在手機版顯示為分組標題 + 子項目
              return (
                <div key={item.label} className="pt-2">
                  <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <item.icon size={14} />
                    {item.label}
                  </div>
                  {item.items.map(child => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 pl-10 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      <child.icon size={18} />
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              );
            })}
            <hr className="my-2 border-gray-200" />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 w-full transition-colors"
            >
              <LogOut size={18} />
              登出
            </button>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-8 h-8 flex items-center justify-center">
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="w-full h-full object-contain opacity-80"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800">六扇門企業服務入口</span>
                <span className="text-[10px] text-gray-400 tracking-wider">LICENSE SYSTEM</span>
              </div>
            </div>

            <div className="text-sm text-gray-500 font-medium">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. <span className="text-gray-300">|</span> All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default function LicenseSystemLayout() {
  return (
    <Routes>
      {/* 公開路由 - 授權驗證工具 */}
      <Route path="verify" element={<VerifyLicense />} />

      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<LicenseProtectedRoute />}>
        <Route element={<LicenseInternalLayout />}>
          {/* 預設跳轉到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="devices" element={<Devices />} />
          <Route path="software" element={<Software />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
