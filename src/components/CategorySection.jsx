import SystemCard from './SystemCard';
import { useAuth } from '../contexts/AuthContext';

// 更新為新的品牌色系
const colorVariants = {
  rose: 'from-rose-500 to-red-600',
  stone: 'from-stone-500 to-stone-600',
  amber: 'from-amber-500 to-orange-500',
  // 保留 Blue 但調低飽和度以融入
  blue: 'from-blue-500 to-cyan-500',
};

export default function CategorySection({ category, onSystemClick }) {
  const { role } = useAuth();
  const gradientColor = colorVariants[category.color] || colorVariants.stone;

  // 根據用戶角色過濾系統
  const visibleSystems = category.systems.filter(system => {
    // 如果系統沒有 requiresRole，所有人都可以看到
    if (!system.requiresRole || system.requiresRole.length === 0) {
      return true;
    }
    // 如果有 requiresRole，檢查用戶角色是否匹配
    return system.requiresRole.includes(role);
  });

  if (visibleSystems.length === 0) {
    return null;
  }

  return (
    <section className="mb-12">
      {/* 類別標題 - 增加裝飾細節 */}
      <div className="flex items-end gap-4 mb-6 relative">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg shadow-stone-200 transform rotate-3`}>
          <span className="text-2xl text-white drop-shadow-md transform -rotate-3">{category.icon}</span>
        </div>
        
        <div className="flex-1 pb-1 border-b-2 border-stone-100 relative">
          <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            {category.name}
            {/* 裝飾性的小標籤 */}
            <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-stone-100 text-stone-500 tracking-wider uppercase">
              Section
            </span>
          </h2>
          <p className="text-sm text-stone-500 mb-1">
            {category.description}
          </p>
          
          {/* 底部滑動裝飾線 */}
          <div className={`absolute -bottom-[2px] left-0 h-[2px] w-24 bg-gradient-to-r ${gradientColor}`} />
        </div>
      </div>

      {/* 系統卡片網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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