import SystemCard from './SystemCard';

const colorVariants = {
  rose: 'from-rose-500 to-red-600',
  stone: 'from-stone-500 to-stone-600', // 新增中性色漸層
  amber: 'from-amber-500 to-orange-500',
  blue: 'from-blue-500 to-cyan-500',
  emerald: 'from-emerald-500 to-teal-500',
};

export default function CategorySection({ category, onSystemClick }) {
  const gradientColor = colorVariants[category.color] || colorVariants.stone;

  if (category.systems.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      {/* 類別標題 */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradientColor} flex items-center justify-center shadow-lg`}>
          <span className="text-xl text-white">{category.icon}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {category.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {category.description}
          </p>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-stone-200 dark:from-stone-700 to-transparent ml-4" />
      </div>

      {/* 系統卡片網格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {category.systems.map(system => (
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