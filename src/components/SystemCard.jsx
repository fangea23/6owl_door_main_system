const colorVariants = {
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    icon: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
    hover: 'hover:border-rose-400 hover:shadow-rose-500/10',
  },
  stone: {
    bg: 'bg-stone-50 dark:bg-stone-800/50',
    border: 'border-stone-200 dark:border-stone-700',
    icon: 'bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300',
    hover: 'hover:border-stone-400 hover:shadow-stone-500/10',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    hover: 'hover:border-amber-400 hover:shadow-amber-500/10',
  },
  // 保留 Blue 作為備用或特定強調色
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-400 hover:shadow-blue-500/10',
  },
};

const statusBadge = {
  active: null,
  'coming-soon': {
    text: '即將推出',
    class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  maintenance: {
    text: '維護中',
    class: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
};

export default function SystemCard({ system, color = 'stone', onClick }) {
  // 預設使用 stone，如果找不到對應顏色也使用 stone
  const colors = colorVariants[color] || colorVariants.stone;
  const badge = statusBadge[system.status];
  const isDisabled = system.status !== 'active';

  const handleClick = () => {
    if (isDisabled) return;

    if (system.isExternal) {
      window.open(system.url, '_blank', 'noopener,noreferrer');
    } else {
      onClick?.(system);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        group relative w-full text-left p-5 rounded-2xl border-2 transition-all duration-300
        ${colors.border} ${colors.hover}
        ${isDisabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'
        }
        bg-white dark:bg-slate-800
      `}
    >
      {/* 狀態標籤 */}
      {badge && (
        <span className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${badge.class}`}>
          {badge.text}
        </span>
      )}

      {/* 圖標 */}
      <div className={`
        w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center mb-4
        group-hover:scale-110 transition-transform duration-300
      `}>
        <span className="text-2xl">{system.icon}</span>
      </div>

      {/* 標題 */}
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
        {system.name}
      </h3>

      {/* 描述 */}
      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
        {system.description}
      </p>

      {/* 箭頭指示 */}
      {!isDisabled && (
        <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </button>
  );
}