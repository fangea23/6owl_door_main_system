import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import WelcomeBanner from '../components/WelcomeBanner';
import QuickAccess from '../components/QuickAccess';
import CategorySection from '../components/CategorySection';
import SearchResults from '../components/SearchResults';
import PermissionDebugger from '../components/PermissionDebugger';
import { categories } from '../data/systems';
import useSearch from '../hooks/useSearch';
import logoSrc from '../assets/logo.png';

export default function Portal() {
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
  const navigate = useNavigate();

  // 權限調試器開關（按 Ctrl+Shift+D 切換）
  const [showDebugger, setShowDebugger] = useState(() => {
    return localStorage.getItem('showPermissionDebugger') === 'true';
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDebugger(prev => {
          const newValue = !prev;
          localStorage.setItem('showPermissionDebugger', String(newValue));
          return newValue;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSystemClick = (system) => {
    if (system.isExternal) {
      window.open(system.url, '_blank', 'noopener,noreferrer');
    } else {
      navigate(system.url);
    }
  };

  return (
    // 修改：加入 bg-pattern-diagonal 紋理，讓背景有紙張質感
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal">
      <Header onSearch={setSearchQuery} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 歡迎區塊 */}
        <WelcomeBanner />

        {/* 搜尋結果（僅在搜尋時顯示） */}
        {isSearching ? (
          <SearchResults
            results={searchResults}
            searchQuery={searchQuery}
            onSystemClick={handleSystemClick}
          />
        ) : (
          <>
            {/* 快捷入口 */}
            <QuickAccess onSystemClick={handleSystemClick} />

            {/* 系統類別區塊 */}
            {categories.map(category => (
              <CategorySection
                key={category.id}
                category={category}
                onSystemClick={handleSystemClick}
              />
            ))}
          </>
        )}
      </main>

          {/* 頁尾 - 優化質感 */}
    <footer className="border-t border-stone-200/60 mt-auto bg-white/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 text-stone-600">
            {/* 小 Logo 容器 */}
            <div className="w-8 h-8 flex items-center justify-center">
              <img src={logoSrc} alt="Logo" className="w-full h-full object-contain opacity-80" />
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-bold text-stone-800">六扇門企業服務入口</span>
              <span className="text-[10px] text-stone-400 tracking-wider">INTERNAL PORTAL</span>
            </div>
          </div>
            
            <div className="text-sm text-stone-500 font-medium">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. <span className="text-stone-300">|</span> All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* 權限調試器 (按 Ctrl+Shift+D 切換) */}
      {showDebugger && <PermissionDebugger />}
    </div>
  );
}