import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subSystemConfig } from '../data/subsystems';

/**
 * 子系統載入器
 *
 * 這個組件負責載入和顯示子系統
 * 支援兩種整合模式：
 * 1. iframe 模式 - 將子系統嵌入 iframe 中
 * 2. 外部連結模式 - 直接跳轉到子系統
 */
export default function SubSystemLoader() {
  const { systemId } = useParams();
  const { user } = useAuth();

  const systemConfig = subSystemConfig[systemId];

  // 系統未配置
  if (!systemConfig) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            系統建置中
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            此系統 ({systemId}) 尚未配置完成，請稍後再試或聯繫系統管理員
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  // 系統維護中
  if (systemConfig.status === 'maintenance') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🛠️</div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
            系統維護中
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {systemConfig.name} 目前正在進行維護，預計 {systemConfig.maintenanceEnd || '稍後'} 恢復服務
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    );
  }

  // 構建子系統 URL，傳遞認證 Token
  const buildSubSystemUrl = () => {
    const baseUrl = systemConfig.url;
    const params = new URLSearchParams();

    // 傳遞認證資訊給子系統
    if (systemConfig.authMethod === 'token') {
      params.set('token', localStorage.getItem('sixdoor_token') || '');
    }

    // 傳遞用戶資訊
    if (systemConfig.passUserInfo) {
      params.set('userId', user?.id || '');
      params.set('userName', user?.name || '');
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col">
      {/* 頂部導航 */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回首頁</span>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-xl">{systemConfig.icon}</span>
              <h1 className="font-semibold text-slate-800 dark:text-white">
                {systemConfig.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {systemConfig.allowNewWindow && (
              <a
                href={buildSubSystemUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                新視窗開啟
              </a>
            )}
          </div>
        </div>
      </header>

      {/* iframe 容器 */}
      <div className="flex-1 relative">
        <iframe
          src={buildSubSystemUrl()}
          title={systemConfig.name}
          className="absolute inset-0 w-full h-full border-0"
          allow="clipboard-write; clipboard-read"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
}
