import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  LogOut,
  Wallet,
  Menu,
  X,
  User,
  Settings,
  AlertCircle,
  Shield,
  Home
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';

// 六扇門 Logo 組件
const Logo = () => (
  <div className="bg-white p-1.5 rounded-lg shadow-sm">
    <svg viewBox="0 0 40 40" className="w-6 h-6">
      <polygon
        points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8"
        fill="none"
        stroke="#991b1b"
        strokeWidth="2.5"
      />
      <circle cx="20" cy="20" r="8" fill="none" stroke="#991b1b" strokeWidth="2"/>
      <line x1="20" y1="12" x2="20" y2="28" stroke="#991b1b" strokeWidth="2"/>
      <line x1="12" y1="20" x2="28" y2="20" stroke="#991b1b" strokeWidth="2"/>
    </svg>
  </div>
);

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, role } = useAuth();

  // 取得顯示名稱（相容不同資料格式）
  const displayName = user?.user_metadata?.full_name || user?.name || user?.email;

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
      // 導回主系統登入頁
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
      alert('登出發生錯誤，請稍後再試');
    }
  };

  // 角色名稱對照
  const roleName = {
    'staff': '一般員工',
    'unit_manager': '單位主管',
    'accountant': '會計',
    'audit_manager': '審核主管',
    'cashier': '出納',
    'boss': '放行主管',
    'admin': '管理員'
  }[role] || '訪客';

  return (
    <header className="bg-gradient-to-r from-red-800 to-red-900 text-white shadow-lg sticky top-0 z-40 print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">

        {/* ================= 左側：Logo 與標題 ================= */}
        <Link to={`${BASE_PATH}/dashboard`} onClick={closeMenu} className="flex items-center gap-3 hover:opacity-90 transition-opacity select-none">
          <Logo />
          <div>
            <h1 className="font-bold text-lg tracking-wide leading-tight">六扇門付款簽核</h1>
            <p className="text-[10px] text-red-200 tracking-wider font-medium">PAYMENT APPROVAL</p>
          </div>
        </Link>

        {/* ================= 中間：電腦版導覽選單 ================= */}
        <nav className="hidden md:flex items-center gap-1">
          {/* 返回主入口 */}
          <Link
            to="/"
            className="px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 text-red-100 hover:bg-red-700 hover:text-white"
          >
            <Home size={18} />
            主入口
          </Link>

          <Link
            to={`${BASE_PATH}/dashboard`}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
              isActive('/dashboard')
                ? 'bg-red-700 text-white shadow-inner ring-1 ring-red-600'
                : 'text-red-100 hover:bg-red-700 hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} />
            總覽看板
          </Link>

          <Link
            to={`${BASE_PATH}/apply`}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
              isActive('/apply')
                ? 'bg-red-700 text-white shadow-inner ring-1 ring-red-600'
                : 'text-red-100 hover:bg-red-700 hover:text-white'
            }`}
          >
            <FilePlus size={18} />
            新增申請
          </Link>

          {(role === 'admin' || role === 'boss') && (
            <Link
              to={`${BASE_PATH}/admin`}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                isActive('/admin')
                  ? 'bg-red-700 text-white shadow-inner ring-1 ring-red-600'
                  : 'text-red-100 hover:bg-red-700 hover:text-white'
              }`}
            >
              <Shield size={18} />
              系統管理
            </Link>
          )}
        </nav>

        {/* ================= 右側：使用者資訊 & 手機選單按鈕 ================= */}
        <div className="flex items-center gap-4">

          {/* 電腦版使用者資訊 */}
          {user && (
            <Link
              to={`${BASE_PATH}/profile`}
              className={`text-right hidden md:flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all group ${
                isProfileIncomplete
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400 shadow-lg'
                  : 'hover:bg-red-700/50'
              }`}
              title={isProfileIncomplete ? "請點擊設定顯示名稱" : "個人資料設定"}
            >
              <div>
                <div className="text-sm font-bold truncate max-w-[150px] flex items-center justify-end gap-1">
                  {isProfileIncomplete ? (
                    <>
                      <AlertCircle size={14} className="text-white" />
                      <span>未設定名稱</span>
                    </>
                  ) : (
                    <span className="group-hover:text-red-100">{displayName}</span>
                  )}
                </div>

                <div className={`text-xs px-1.5 rounded inline-block mt-0.5 ${
                  isProfileIncomplete
                    ? 'bg-amber-800/30 text-amber-100 font-medium'
                    : 'text-red-200 font-mono bg-red-950/30 group-hover:bg-red-950/50'
                }`}>
                  {isProfileIncomplete ? '點此設定' : roleName}
                </div>
              </div>
            </Link>
          )}

          {/* 電腦版登出按鈕 */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center justify-center p-2 hover:bg-white/10 text-red-100 hover:text-white rounded-full transition-all duration-200"
            title="登出系統"
          >
            <LogOut size={20} />
          </button>

          {/* 手機版：漢堡選單按鈕 */}
          <button
            className="md:hidden p-2 hover:bg-red-700 rounded transition-colors active:scale-95 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="選單"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}

            {/* 手機版紅點 */}
            {isProfileIncomplete && !isMenuOpen && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-red-900" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 手機版下拉選單 ================= */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-red-900 border-t border-red-700 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-4 space-y-2">

            {/* 手機版使用者資訊卡片 */}
            {user && (
              <Link
                to={`${BASE_PATH}/profile`}
                onClick={closeMenu}
                className={`rounded-lg p-3 mb-2 flex items-center gap-3 border transition-colors ${
                  isProfileIncomplete
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-100'
                    : 'bg-red-800/50 border-red-700/50 text-white'
                }`}
              >
                <div className={`p-2 rounded-full ${isProfileIncomplete ? 'bg-amber-600 text-white' : 'bg-red-700 text-red-100'}`}>
                  {isProfileIncomplete ? <AlertCircle size={20} /> : <User size={20} />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-sm font-bold truncate">
                    {isProfileIncomplete ? '請設定顯示名稱' : (displayName || user.email)}
                  </div>
                  <div className={`text-xs ${isProfileIncomplete ? 'text-amber-300' : 'text-red-200'}`}>
                    {isProfileIncomplete ? '點擊此處完善資料' : `目前身分：${roleName}`}
                  </div>
                </div>
                <div className="text-red-300">
                   <Settings size={16} />
                </div>
              </Link>
            )}

            {/* 返回主入口 */}
            <Link
              to="/"
              onClick={closeMenu}
              className="px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors text-red-100 hover:bg-red-800/50"
            >
              <Home size={20} />
              返回主入口
            </Link>

            <Link
              to={`${BASE_PATH}/dashboard`}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/dashboard')
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-red-100 hover:bg-red-800/50'
              }`}
            >
              <LayoutDashboard size={20} />
              總覽看板
            </Link>

            <Link
              to={`${BASE_PATH}/apply`}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/apply')
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-red-100 hover:bg-red-800/50'
              }`}
            >
              <FilePlus size={20} />
              新增申請
            </Link>

            <Link
              to={`${BASE_PATH}/profile`}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/profile')
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-red-100 hover:bg-red-800/50'
              }`}
            >
              <div className="relative">
                <User size={20} />
                {isProfileIncomplete && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400" />
                )}
              </div>
              <span className={isProfileIncomplete ? "text-amber-300 font-bold" : ""}>
                個人資料設定
              </span>
            </Link>

            {(role === 'admin' || role === 'boss') && (
              <Link
                to={`${BASE_PATH}/admin`}
                onClick={closeMenu}
                className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                  isActive('/admin')
                    ? 'bg-red-700 text-white shadow-sm'
                    : 'text-red-100 hover:bg-red-800/50'
                }`}
              >
                <Shield size={18} />
                系統管理
              </Link>
            )}

            <div className="border-t border-red-700 my-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 text-red-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
              >
                <LogOut size={20} />
                登出系統
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* 點擊外部關閉選單的遮罩 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 top-16 bg-black/20 z-[-1] md:hidden backdrop-blur-[1px]"
          onClick={closeMenu}
        />
      )}
    </header>
  );
}
