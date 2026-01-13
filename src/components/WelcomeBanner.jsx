export default function WelcomeBanner() {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-8 mb-10 text-white shadow-2xl shadow-red-900/20 group">
      {/* 背景紋理：六角形圖案 (呼應六扇門) */}
      <div className="absolute inset-0 bg-pattern-hex opacity-20 group-hover:opacity-30 transition-opacity duration-500" />
      
      {/* 動態光暈 */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-500/30 rounded-full blur-[80px]" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-600/20 rounded-full blur-[60px]" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-amber-300 border border-white/10 backdrop-blur-sm">
              INTERNAL PORTAL
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            {getGreeting()}，歡迎回到 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-red-100">六扇門</span>
          </h2>
          <p className="text-red-100/90 text-lg max-w-2xl font-light">
            統一入口讓您的工作更有效率。您可以從下方快速存取財務、IT 與行政服務。
          </p>
        </div>

        {/* 統計資訊 - 增加金色點綴 */}
        <div className="flex gap-6 md:gap-8 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-8">
          <div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
              3 <span className="text-xs font-normal text-amber-300">SYSTEMS</span>
            </div>
            <div className="text-red-200/60 text-xs mt-0.5">可用系統</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white flex items-baseline gap-1">
              24/7 <span className="text-xs font-normal text-amber-300">SERVICE</span>
            </div>
            <div className="text-red-200/60 text-xs mt-0.5">全天候運作</div>
          </div>
        </div>
      </div>
    </div>
  );
}