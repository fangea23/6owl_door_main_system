import { getAllSystems } from '../data/systems';

export default function QuickAccess({ onSystemClick }) {
  // 取得所有 active 狀態的系統作為快捷入口
  const systems = getAllSystems().filter(s => s.status === 'active');

  if (systems.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            快捷入口
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            常用系統快速存取
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {systems.map(system => (
          <button
            key={system.id}
            onClick={() => onSystemClick?.(system)}
            className="group flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-300"
          >
            <span className="text-lg group-hover:scale-110 transition-transform">{system.icon}</span>
            <span className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {system.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
