import Header from '../components/Header';
import WelcomeBanner from '../components/WelcomeBanner';
import QuickAccess from '../components/QuickAccess';
import CategorySection from '../components/CategorySection';
import SearchResults from '../components/SearchResults';
import { categories } from '../data/systems';
import useSearch from '../hooks/useSearch';

export default function Portal() {
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();

  const handleSystemClick = (system) => {
    // 這裡處理系統點擊事件
    // 實際整合時可以使用 React Router 導航
    console.log('點擊系統:', system);

    // 如果有 URL，導航到該系統
    if (system.url) {
      // 使用 React Router: navigate(system.url)
      // 或直接跳轉: window.location.href = system.url
      alert(`將導航至: ${system.name}\n路徑: ${system.url}\n\n請將此路徑替換為實際的系統連結`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
      <footer className="border-t border-slate-200 dark:border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="text-lg">🚪</span>
              <span className="text-sm">六扇門企業服務入口</span>
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} 六扇門股份有限公司. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
