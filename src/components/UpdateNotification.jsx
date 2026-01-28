import { RefreshCw } from 'lucide-react';
import { useVersionCheck } from '../hooks/useVersionCheck';

/**
 * 更新提示組件
 * 當檢測到新版本時顯示刷新提示
 */
export default function UpdateNotification() {
  const { updateAvailable, forceRefresh } = useVersionCheck(5); // 每 5 分鐘檢查一次

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-sm">
        <div className="flex-1">
          <p className="font-bold text-sm">發現新版本</p>
          <p className="text-xs text-blue-100 mt-0.5">請刷新頁面以獲得最新功能</p>
        </div>
        <button
          onClick={forceRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>
    </div>
  );
}
