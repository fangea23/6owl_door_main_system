import { getAllSystems } from '../data/systems';

export default function QuickAccess({ onSystemClick }) {
  const systems = getAllSystems().filter(s => s.status === 'active');

  if (systems.length === 0) return null;

  return (
    <section className="mb-12 relative">
      <div className="flex items-center gap-3 mb-6">
        {/* 圖標改為紅色火焰/閃電感覺 */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-500/20">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-800">
            快捷入口
          </h2>
          <p className="text-sm text-stone-500">
            常用系統快速存取
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {systems.map(system => (
          <button
            key={system.id}
            onClick={() => onSystemClick?.(system)}
            className="
              group relative flex items-center gap-3 px-5 py-3 
              bg-white border border-stone-200 rounded-2xl 
              hover:border-red-300 hover:shadow-lg hover:shadow-red-500/10 
              hover:-translate-y-1 transition-all duration-300
              overflow-hidden
            "
          >
            {/* 懸停時的背景光暈 */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* 左側裝飾條 */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />

            <span className="text-2xl relative z-10 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-sm">
              {system.icon}
            </span>
            <span className="font-bold text-stone-700 relative z-10 group-hover:text-red-800 transition-colors">
              {system.name}
            </span>
            
            {/* 右側箭頭 (懸停時出現) */}
            <svg 
              className="w-4 h-4 text-red-400 relative z-10 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ml-1" 
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