const colorVariants = {
  rose: {
    bg: 'bg-white',
    border: 'border-stone-100',
    icon: 'bg-rose-50 text-rose-600',
    hover: 'hover:border-rose-200 hover:shadow-rose-500/10',
    accent: 'group-hover:text-rose-600'
  },
  stone: {
    bg: 'bg-white',
    border: 'border-stone-100',
    icon: 'bg-stone-100 text-stone-600',
    hover: 'hover:border-stone-300 hover:shadow-stone-500/10',
    accent: 'group-hover:text-stone-800'
  },
  amber: {
    bg: 'bg-white',
    border: 'border-stone-100',
    icon: 'bg-amber-50 text-amber-600',
    hover: 'hover:border-amber-200 hover:shadow-amber-500/10',
    accent: 'group-hover:text-amber-600'
  }
};

const statusBadge = {
  active: null,
  'coming-soon': {
    text: '即將推出',
    class: 'bg-stone-100 text-stone-500 border border-stone-200',
  },
  maintenance: {
    text: '維護中',
    class: 'bg-red-50 text-red-600 border border-red-100',
  },
};

export default function SystemCard({ system, color = 'stone', onClick }) {
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
        group relative w-full text-left p-6 rounded-2xl transition-all duration-300
        bg-white border
        ${isDisabled
          ? 'opacity-60 cursor-not-allowed border-stone-100'
          : `cursor-pointer hover:-translate-y-1 hover:shadow-xl ${colors.hover} border-stone-100`
        }
      `}
    >
      {/* 裝飾：卡片頂部的彩色線條 (打破純白單調) */}
      {!isDisabled && (
        <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-${color === 'rose' ? 'red' : color === 'amber' ? 'amber' : 'stone'}-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      )}

      {/* 狀態標籤 */}
      {badge && (
        <span className={`absolute top-4 right-4 px-2.5 py-1 text-[10px] font-medium rounded-full ${badge.class}`}>
          {badge.text}
        </span>
      )}

      {/* 圖標區塊 */}
      <div className={`
        w-14 h-14 rounded-2xl ${colors.icon} flex items-center justify-center mb-5
        group-hover:scale-110 transition-transform duration-300 shadow-sm
      `}>
        <span className="text-2xl filter drop-shadow-sm">{system.icon}</span>
      </div>

      {/* 內容區塊 */}
      <div>
        <h3 className={`text-lg font-bold text-stone-800 mb-2 transition-colors ${!isDisabled && colors.accent}`}>
          {system.name}
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
          {system.description}
        </p>
      </div>

      {/* 互動箭頭 (右下角) */}
      {!isDisabled && (
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
          <svg className={`w-5 h-5 ${color === 'rose' ? 'text-red-500' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      )}
    </button>
  );
}