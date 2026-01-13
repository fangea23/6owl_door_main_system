import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 六扇門 Logo 組件 - 加入金色點綴
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12';
  return (
    <div className={`${sizeClasses} relative overflow-hidden bg-gradient-to-br from-red-800 to-red-950 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/20 group-hover:shadow-red-500/30 transition-shadow`}>
      {/* 內部質感 */}
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 to-transparent" />
      
      <svg viewBox="0 0 40 40" className="w-6 h-6 sm:w-8 sm:h-8 relative z-10">
        <polygon
          points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8"
          fill="none"
          stroke="white"
          strokeWidth="2"
        />
        <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5"/>
        {/* 金色核心 */}
        <circle cx="20" cy="20" r="3" fill="#fbbf24" stroke="none" className="opacity-90"/>
        <line x1="20" y1="12" x2="20" y2="28" stroke="white" strokeWidth="1.5"/>
        <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5"/>
      </svg>
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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo 區域 */}
          <Link to="/" className="group flex items-center gap-3 hover:opacity-100 transition-opacity">
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
          </Link>

          {/* 搜尋框 */}
          <div className="flex-1 max-w-md mx-4 sm:mx-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-stone-400 group-focus-within:text-red-500 transition-colors"
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
                className="block w-full pl-10 pr-10 py-2.5 border border-stone-200 rounded-xl bg-stone-50/50 text-stone-800 placeholder-stone-400 
                focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-400 
                hover:border-stone-300 transition-all duration-300 shadow-sm"
              />
              {searchValue && (
                <button
                  onClick={handleClear}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-red-500 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* 使用者資訊 */}
          <div className="flex items-center gap-2">
            {/* 通知按鈕 */}
            <button className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all relative group">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* 通知紅點 - 加一點光暈 */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" />
            </button>

            {/* 使用者選單 */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                  showUserMenu ? 'bg-red-50 border-red-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                }`}
              >
                <div className="w-9 h-9 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-red-500/20">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-bold text-stone-700">
                    {user?.name || '使用者'}
                  </p>
                  <p className="text-[10px] text-stone-400 font-medium tracking-wide">
                    {user?.department || '六扇門'}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-red-500' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* 下拉選單 - 增加精緻度 */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                  {/* 頂部裝飾條 */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-amber-500" />
                  
                  {/* 用戶資訊 */}
                  <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                    <p className="text-base font-bold text-stone-800">{user?.name}</p>
                    <p className="text-xs text-stone-500 mb-2">{user?.email}</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium bg-red-100 text-red-700 rounded-full border border-red-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      {user?.role === 'admin' ? '系統管理員' : '一般用戶'}
                    </span>
                  </div>

                  {/* 選單項目 */}
                  <div className="p-2 space-y-1">
                    <Link
                      to="/account"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
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
                      className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
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

                  {/* 登出 */}
                  <div className="p-2 border-t border-stone-100">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
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