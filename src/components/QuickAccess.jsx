import { getAllSystems } from '../data/systems';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useAuth } from '../contexts/AuthContext';

export default function QuickAccess({ onSystemClick }) {
  const { role } = useAuth();
  const { hasPermission, loading: permissionsLoading } = useUserPermissions();

  // 過濾系統：需要是 active 且用戶有權限訪問
  const systems = getAllSystems().filter(system => {
    if (system.status !== 'active') return false;

    // 權限檢查還在載入中，暫時隱藏
    if (permissionsLoading) return false;

    // 優先檢查系統訪問權限（如果有設定 permissionCode）
    if (system.permissionCode) {
      // 只要有權限就可以看到，不再檢查角色
      return hasPermission(system.permissionCode);
    }

    // 如果沒有 permissionCode，才檢查角色（向後兼容）
    if (system.requiresRole && system.requiresRole.length > 0) {
      return system.requiresRole.includes(role);
    }

    return true;
  });

  if (systems.length === 0) return null;

  return (
    <section className="mb-10 sm:mb-12 relative">
      {/* 標題 - 手機版優化 */}
      <div className="flex items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-800">
            快捷入口
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
            常用系統快速存取
          </p>
        </div>
      </div>

      {/* 快捷按鈕網格 - 手機版優化 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 sm:gap-4">
        {systems.map(system => (
          <button
            key={system.id}
            onClick={() => onSystemClick?.(system)}
            className="
              group relative flex items-center gap-3 px-4 sm:px-5 py-3
              bg-white border border-stone-200 rounded-xl sm:rounded-2xl
              hover:border-red-300 hover:shadow-lg hover:shadow-red-500/10
              active:border-red-400 active:shadow-md
              hover:-translate-y-1 active:translate-y-0
              transition-all duration-300
              overflow-hidden
              touch-manipulation
            "
          >
            {/* 懸停時的背景光暈 */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-amber-50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300" />

            {/* 左側裝飾條 */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-amber-500 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />

            <span className="text-xl sm:text-2xl relative z-10 group-hover:scale-110 group-active:scale-105 transition-transform duration-300 filter drop-shadow-sm">
              {system.icon}
            </span>
            <span className="text-sm sm:text-base font-bold text-stone-700 relative z-10 group-hover:text-red-800 group-active:text-red-900 transition-colors">
              {system.name}
            </span>

            {/* 右側箭頭 (懸停時出現) - 手機版始終顯示 */}
            <svg
              className="w-4 h-4 text-red-400 relative z-10 sm:opacity-0 sm:-translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}