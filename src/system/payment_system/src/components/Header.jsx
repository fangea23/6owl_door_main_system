import React, { useState } from 'react';
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
  Home
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import logoSrc from '../../../../assets/logo.png';
// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';

// 六扇門 Logo 組件 - 修改為適應白底的樣式
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      {/* 3. 使用 img 標籤顯示 Logo */}
      <img 
        src={logoSrc} 
        alt="六扇門 Logo" 
        className="w-full h-full object-contain filter drop-shadow-md" // object-contain 確保圖片不變形
      />
    </div>
  );
};

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

  // 輔助函式：產生連結樣式 (避免重複寫 ClassName)
  const getNavLinkClass = (active) => `
    px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-200
    ${active 
      ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100' // 選中狀態：淡紅底 + 紅字
      : 'text-stone-500 hover:text-red-600 hover:bg-stone-50'   // 一般狀態：灰字 -> Hover 變紅
    }
  `;

  return (
    // 修改：背景改為白色玻璃擬態，文字改為深灰
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm print:hidden">
      {/* 裝飾：極淡的紋理背景 (與主入口一致) */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-50 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between relative">

        {/* ================= 左側：Logo 與標題 ================= */}
        <Link to={`${BASE_PATH}/dashboard`} onClick={closeMenu} className="flex items-center gap-3 group select-none">
          <Logo />
          <div>
            {/* 修改：文字顏色改為 Stone-800，Hover 變紅 */}
            <h1 className="font-bold text-lg sm:text-xl text-stone-800 tracking-tight group-hover:text-red-800 transition-colors leading-tight">
              六扇門付款簽核
            </h1>
            <div className="flex items-center gap-1.5">
               {/* 裝飾線條 */}
               <div className="h-[1px] w-3 bg-amber-500/50"></div>
               <p className="text-[10px] text-stone-500 font-medium tracking-[0.15em] group-hover:text-amber-600 transition-colors">
                 PAYMENT APPROVAL
               </p>
            </div>
          </div>
        </Link>

        {/* ================= 中間：電腦版導覽選單 ================= */}
        <nav className="hidden md:flex items-center gap-1">
          {/* 返回主入口 */}
          <Link
            to="/"
            className={getNavLinkClass(false)} // 使用新的樣式函式
          >
            <Home size={18} />
            主入口
          </Link>

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

          {/* 電腦版使用者資訊 */}
          {user && (
            <Link
              to="/account"
              // 修改：移除深色背景邏輯，改為灰底/琥珀色底
              className={`hidden md:flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all border ${
                isProfileIncomplete
                  ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-100'
                  : 'border-transparent hover:bg-stone-50 hover:border-stone-200 text-stone-600 hover:text-stone-900'
              }`}
              title={isProfileIncomplete ? "請點擊設定顯示名稱" : "個人資料設定"}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-sm ${
                  isProfileIncomplete ? 'bg-amber-500' : 'bg-gradient-to-br from-red-700 to-red-900'
              }`}>
                {displayName?.charAt(0) || <User size={16}/>}
              </div>
              
              <div className="text-right">
                <div className="text-sm font-bold leading-none mb-1 flex items-center justify-end gap-1">
                  {isProfileIncomplete ? (
                    <>
                      <AlertCircle size={14} />
                      <span>未設定</span>
                    </>
                  ) : (
                    <span>{displayName}</span>
                  )}
                </div>
                <div className={`text-[10px] font-medium tracking-wide ${
                  isProfileIncomplete ? 'text-amber-600' : 'text-stone-400'
                }`}>
                  {isProfileIncomplete ? '點此設定' : roleName}
                </div>
              </div>
            </Link>
          )}

          {/* 電腦版登出按鈕 */}
          <button
            onClick={handleLogout}
            // 修改：按鈕樣式改為深灰 -> Hover 紅
            className="hidden md:flex items-center justify-center p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
            title="登出系統"
          >
            <LogOut size={20} />
          </button>

          {/* 手機版：漢堡選單按鈕 */}
          <button
            // 修改：按鈕樣式改為深灰
            className="md:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors active:scale-95 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="選單"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}

            {/* 手機版紅點 */}
            {isProfileIncomplete && !isMenuOpen && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 手機版下拉選單 ================= */}
      {isMenuOpen && (
        // 修改：背景改為白色，邊框改為 Stone-200
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-stone-200 shadow-xl animate-in slide-in-from-top-2 z-50">
          <nav className="flex flex-col p-4 space-y-2">

            {/* 手機版使用者資訊卡片 */}
            {user && (
              <Link
                to={`${BASE_PATH}/profile`}
                onClick={closeMenu}
                // 修改：卡片樣式改為白底/灰底
                className={`rounded-xl p-3 mb-2 flex items-center gap-3 border transition-colors ${
                  isProfileIncomplete
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-stone-50 border-stone-100 text-stone-800'
                }`}
              >
                <div className={`p-2 rounded-lg text-white ${isProfileIncomplete ? 'bg-amber-500' : 'bg-red-700'}`}>
                  {isProfileIncomplete ? <AlertCircle size={20} /> : <User size={20} />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-sm font-bold truncate">
                    {isProfileIncomplete ? '請設定顯示名稱' : (displayName || user.email)}
                  </div>
                  <div className={`text-xs ${isProfileIncomplete ? 'text-amber-600' : 'text-stone-500'}`}>
                    {isProfileIncomplete ? '點擊此處完善資料' : `目前身分：${roleName}`}
                  </div>
                </div>
                <div className="text-stone-400">
                   <Settings size={16} />
                </div>
              </Link>
            )}

            {/* 手機版連結項目 - 修改為深灰色系 */}
            <Link
              to="/"
              onClick={closeMenu}
              className="px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors text-stone-600 hover:bg-stone-50"
            >
              <Home size={20} />
              返回主入口
            </Link>

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

            <Link
              to="/account"
              onClick={closeMenu}
              className={`px-4 py-3 rounded-xl text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/profile')
                  ? 'bg-red-50 text-red-700'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <div className="relative">
                <User size={20} />
                {isProfileIncomplete && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
                )}
              </div>
              <span className={isProfileIncomplete ? "text-amber-600 font-bold" : ""}>
                個人資料設定
              </span>
            </Link>

            <div className="border-t border-stone-100 my-2 pt-2">
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