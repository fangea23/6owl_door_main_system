import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WelcomeBanner from '../components/WelcomeBanner';
import QuickAccess from '../components/QuickAccess';
import CategorySection from '../components/CategorySection';
import SearchResults from '../components/SearchResults';
import { categories } from '../data/systems';
import useSearch from '../hooks/useSearch';

export default function Portal() {
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
  const navigate = useNavigate();

  const handleSystemClick = (system) => {
    if (system.isExternal) {
      // 外部連結在新視窗開啟
      window.open(system.url, '_blank', 'noopener,noreferrer');
    } else {
      // 內部路由導航
      navigate(system.url);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
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

      {/* 頁尾 */}
      <footer className="border-t border-stone-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-stone-500">
              <div className="w-6 h-6 bg-red-800 rounded flex items-center justify-center">
                <svg viewBox="0 0 40 40" className="w-4 h-4">
                  <polygon points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8" fill="none" stroke="white" strokeWidth="3"/>
                </svg>
              </div>
              <span className="text-sm">六扇門企業服務入口</span>
            </div>
            <div className="text-sm text-stone-400">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
