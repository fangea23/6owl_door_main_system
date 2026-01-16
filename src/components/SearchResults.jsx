import SystemCard from './SystemCard';

export default function SearchResults({ results, searchQuery, onSystemClick }) {
  if (!searchQuery) return null;

  return (
    <section className="mb-10 sm:mb-12 animate-in fade-in duration-300">
      {/* 標題 - 手機版優化 */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-500/20">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-stone-800">
            搜尋結果
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 leading-relaxed truncate">
            找到 {results.length} 個符合「{searchQuery}」的系統
          </p>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {results.map(system => (
            <SystemCard
              key={system.id}
              system={system}
              color="stone"
              onClick={onSystemClick}
            />
          ))}
        </div>
      ) : (
        /* 空狀態 - 手機版優化 */
        <div className="text-center py-12 sm:py-16 bg-white/50 border-2 border-dashed border-red-100 rounded-xl sm:rounded-2xl px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-stone-700 mb-1 sm:mb-2">找不到相關系統</h3>
          <p className="text-sm sm:text-base text-stone-500 leading-relaxed">
            我們找不到與「<span className="text-red-600 font-medium break-all">{searchQuery}</span>」相符的結果
          </p>
          <p className="text-xs sm:text-sm text-stone-400 mt-3 sm:mt-4">建議您：檢查錯別字 或 嘗試使用較短的關鍵字</p>
        </div>
      )}
    </section>
  );
}