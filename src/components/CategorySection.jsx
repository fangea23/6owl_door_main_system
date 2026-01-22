import SystemCard from './SystemCard';
import { useAuth } from '../contexts/AuthContext';
import { useUserPermissions } from '../hooks/useUserPermissions';

// 統一使用紅色系品牌色
const colorVariants = {
  rose: 'from-red-500 to-red-600',
  stone: 'from-stone-500 to-stone-700',
  amber: 'from-amber-500 to-red-500',
  blue: 'from-red-600 to-amber-500',
};

export default function CategorySection({ category, onSystemClick }) {
  const { role } = useAuth();
  const { hasPermission, loading: permissionsLoading } = useUserPermissions();
  const gradientColor = colorVariants[category.color] || colorVariants.stone;

  // 根據用戶角色和權限過濾系統
  const visibleSystems = category.systems.filter(system => {
    // 1. 優先檢查權限（如果有設定 permissionCode）
    if (system.permissionCode) {
      // 權限檢查還在載入中，暫時隱藏（避免閃爍，等載入完成後再顯示）
      if (permissionsLoading) {
        return false;
      }
      // 只要有系統訪問權限就可以看到，不再檢查角色
      return hasPermission(system.permissionCode);
    }

    // 2. 如果沒有 permissionCode，才檢查角色（向後兼容）
    if (system.requiresRole && system.requiresRole.length > 0) {
      return system.requiresRole.includes(role);
    }

    // 沒有任何限制，所有人都可以看到
    return true;
  });

  if (visibleSystems.length === 0) {
    return null;
  }

  return (
    <section className="mb-10 sm:mb-12">
      {/* 類別標題 - 手機版優化 */}
      <div className="flex items-end gap-3 sm:gap-4 mb-5 sm:mb-6 relative">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg shadow-red-500/20 transform rotate-3`}>
          <span className="text-xl sm:text-2xl text-white drop-shadow-md transform -rotate-3">{category.icon}</span>
        </div>

        <div className="flex-1 pb-1 border-b-2 border-stone-100 relative">
          <h2 className="text-lg sm:text-2xl font-bold text-stone-800 flex items-center gap-2">
            {category.name}
            {/* 裝飾性的小標籤 - 手機版隱藏 */}
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-normal bg-stone-100 text-stone-500 tracking-wider uppercase">
              Section
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mb-1 leading-relaxed">
            {category.description}
          </p>

          {/* 底部滑動裝飾線 */}
          <div className={`absolute -bottom-[2px] left-0 h-[2px] w-16 sm:w-24 bg-gradient-to-r ${gradientColor}`} />
        </div>
      </div>

      {/* 系統卡片網格 - 手機版優化 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {visibleSystems.map(system => (
          <SystemCard
            key={system.id}
            system={system}
            color={category.color}
            onClick={onSystemClick}
          />
        ))}
      </div>
    </section>
  );
}