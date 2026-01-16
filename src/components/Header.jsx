import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoSrc from '../assets/logo.png';
// 六扇門 Logo 組件 - 加入金色點綴
// 2. 修改 Logo 組件
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

export default function Header({ onSearch }) {
  const [searchValue, setSearchValue] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch?.('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
      {/* 背景紋理：極淡的斜紋，增加紙張質感 */}
      <div className="absolute inset-0 bg-pattern-diagonal opacity-50 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
          {/* Logo 區域 - 手機版優化 */}
          <Link to="/" className="group flex items-center gap-2 sm:gap-3 hover:opacity-100 transition-opacity">
            <Logo />
            <div className="hidden sm:block">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-stone-800 tracking-tight group-hover:text-red-800 transition-colors">
                六扇門
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="h-[1px] w-3 bg-amber-500/50"></div>
                <p className="text-[10px] text-stone-500 font-medium tracking-[0.2em] group-hover:text-amber-600 transition-colors">
                  6OWL DOOR
                </p>
              </div>
            </div>
          </Link>

          {/* 搜尋框 - 手機版優化 */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4 lg:mx-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-2.5 sm:pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-stone-400 group-focus-within:text-red-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder="搜尋系統..."
                className="block w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 sm:py-2.5 text-sm sm:text-base border border-stone-200 rounded-lg sm:rounded-xl bg-stone-50/50 text-stone-800 placeholder-stone-400
                focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-400
                hover:border-stone-300 transition-all duration-300 shadow-sm"
              />
              {searchValue && (
                <button
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-stone-400 hover:text-red-500 active:text-red-600 transition-colors touch-manipulation"
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 使用者資訊 - 手機版優化 */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* 通知按鈕 - 手機版優化 */}
            <button className="p-1.5 sm:p-2 text-stone-500 hover:text-red-600 active:text-red-700 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all relative group touch-manipulation">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* 通知紅點 - 手機版優化 */}
              <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
            </button>

            {/* 使用者選單 - 手機版優化 */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all border touch-manipulation ${
                  showUserMenu ? 'bg-red-50 border-red-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                }`}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-xs sm:text-sm shadow-md shadow-red-500/20">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-stone-700">
                    {user?.name || '使用者'}
                  </p>
                  <p className="text-[10px] text-stone-400 font-medium tracking-wide">
                    {user?.department || '六扇門'}
                  </p>
                </div>
                <svg
                  className={`hidden sm:block w-4 h-4 text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-red-500' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉選單 - 手機版優化 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                  {/* 頂部裝飾條 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500" />

                  {/* 用戶資訊 - 手機版優化 */}
                  <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-stone-100 bg-stone-50/50">
                    <p className="text-sm sm:text-base font-bold text-stone-800 truncate">{user?.name}</p>
                    <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded-full border border-red-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      {user?.role === 'admin' ? '系統管理員' : '一般用戶'}
                    </span>
                  </div>

                  {/* 選單項目 - 手機版優化 */}
                  <div className="p-2 space-y-1">
                    <Link
                      to="/account"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 rounded-lg sm:rounded-xl transition-colors group touch-manipulation"
                    >
                      <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      個人資料
                    </Link>
                    <Link
                      to="/account"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 rounded-lg sm:rounded-xl transition-colors group touch-manipulation"
                    >
                      <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                      帳戶設定
                    </Link>
                  </div>

                  {/* 登出 - 手機版優化 */}
                  <div className="p-2 border-t border-stone-100">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 sm:gap-3 w-full px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 active:text-red-800 hover:bg-red-50 active:bg-red-100 rounded-lg sm:rounded-xl transition-colors group touch-manipulation"
                    >
                      <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
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
  );
}