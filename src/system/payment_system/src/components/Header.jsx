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
  Shield // ✅ 補上這個引入
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';

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
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
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
    <header className="bg-emerald-900 text-white shadow-lg sticky top-0 z-40 print:hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        
        {/* ================= 左側：Logo 與標題 ================= */}
        <Link to="/" onClick={closeMenu} className="flex items-center gap-3 hover:opacity-90 transition-opacity select-none">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <Wallet className="text-emerald-800" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide leading-tight">六扇門付款簽核</h1>
            <p className="text-[10px] text-emerald-300 tracking-wider font-medium">FINANCE FLOW</p>
          </div>
        </Link>

        {/* ================= 中間：電腦版導覽選單 ================= */}
        <nav className="hidden md:flex items-center gap-1">
          <Link 
            to="/dashboard" 
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
              isActive('/') 
                ? 'bg-emerald-800 text-white shadow-inner ring-1 ring-emerald-700' 
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }`}
          >
            <LayoutDashboard size={18} />
            總覽看板
          </Link>
          
          <Link 
            to="/apply" 
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
              isActive('/apply') 
                ? 'bg-emerald-800 text-white shadow-inner ring-1 ring-emerald-700' 
                : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
            }`}
          >
            <FilePlus size={18} />
            新增申請
          </Link>

            {(role === 'admin' || role === 'boss') && (
            <Link 
                to="/admin" 
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                isActive('/admin') 
                    ? 'bg-emerald-800 text-white shadow-inner ring-1 ring-emerald-700' 
                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
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
              to="/profile" 
              className={`text-right hidden md:flex items-center gap-3 p-1.5 px-3 rounded-lg transition-all group ${
                isProfileIncomplete 
                  ? 'bg-amber-600 hover:bg-amber-500 text-white ring-2 ring-amber-400 shadow-lg' 
                  : 'hover:bg-emerald-800/50'
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
                    <span className="group-hover:text-emerald-100">{displayName}</span>
                  )}
                </div>

                <div className={`text-xs px-1.5 rounded inline-block mt-0.5 ${
                  isProfileIncomplete 
                    ? 'bg-amber-800/30 text-amber-100 font-medium' 
                    : 'text-emerald-300 font-mono bg-emerald-950/30 group-hover:bg-emerald-950/50'
                }`}>
                  {isProfileIncomplete ? '點此設定' : roleName}
                </div>
              </div>
            </Link>
          )}
          
          {/* 電腦版登出按鈕 */}
          <button 
            onClick={handleLogout}
            className="hidden md:flex items-center justify-center p-2 hover:bg-red-500/20 text-emerald-100 hover:text-red-200 rounded-full transition-all duration-200" 
            title="登出系統"
          >
            <LogOut size={20} />
          </button>

          {/* 手機版：漢堡選單按鈕 */}
          <button 
            className="md:hidden p-2 hover:bg-emerald-800 rounded transition-colors active:scale-95 relative"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="選單"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            
            {/* 手機版紅點 */}
            {isProfileIncomplete && !isMenuOpen && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-emerald-900" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 手機版下拉選單 ================= */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-emerald-900 border-t border-emerald-800 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col p-4 space-y-2">
            
            {/* 手機版使用者資訊卡片 */}
            {user && (
              <Link 
                to="/profile"
                onClick={closeMenu}
                className={`rounded-lg p-3 mb-2 flex items-center gap-3 border transition-colors ${
                  isProfileIncomplete 
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-100' 
                    : 'bg-emerald-800/50 border-emerald-700/50 text-white' 
                }`}
              >
                <div className={`p-2 rounded-full ${isProfileIncomplete ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-emerald-100'}`}>
                  {isProfileIncomplete ? <AlertCircle size={20} /> : <User size={20} />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-sm font-bold truncate">
                    {isProfileIncomplete ? '請設定顯示名稱' : (displayName || user.email)}
                  </div>
                  <div className={`text-xs ${isProfileIncomplete ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {isProfileIncomplete ? '點擊此處完善資料' : `目前身分：${roleName}`}
                  </div>
                </div>
                <div className="text-emerald-400">
                   <Settings size={16} />
                </div>
              </Link>
            )}

            <Link 
              to="/dashboard" 
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/')
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-emerald-100 hover:bg-emerald-800/50'
              }`}
            >
              <LayoutDashboard size={20} />
              總覽看板
            </Link>
            
            <Link 
              to="/apply" 
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/apply') 
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-emerald-100 hover:bg-emerald-800/50'
              }`}
            >
              <FilePlus size={20} />
              新增申請
            </Link>

            <Link 
              to="/profile" 
              onClick={closeMenu}
              className={`px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-colors ${
                isActive('/profile') 
                  ? 'bg-emerald-800 text-white shadow-sm' 
                  : 'text-emerald-100 hover:bg-emerald-800/50'
              }`}
            >
              <div className="relative">
                <User size={20} />
                {isProfileIncomplete && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
                )}
              </div>
              <span className={isProfileIncomplete ? "text-amber-300 font-bold" : ""}>
                個人資料設定
              </span>
            </Link>

            {(role === 'admin' || role === 'boss') && (
                <Link 
                    to="/admin" 
                    onClick={closeMenu}
                    className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                    isActive('/admin') 
                        ? 'bg-emerald-800 text-white shadow-inner ring-1 ring-emerald-700' 
                        : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                    }`}
                >
                    <Shield size={18} />
                    系統管理
                </Link>
                )}

            <div className="border-t border-emerald-800 my-2 pt-2">
              <button 
                onClick={handleLogout}
                className="w-full px-4 py-3 flex items-center gap-3 text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors font-medium"
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