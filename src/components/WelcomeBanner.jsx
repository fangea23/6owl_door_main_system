export default function WelcomeBanner() {
  // 根據時間顯示不同問候語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-8 mb-10 text-white">
      {/* 背景裝飾 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* 內容 */}
      <div className="relative z-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-2">
          {getGreeting()}！歡迎回到六扇門
        </h2>
        <p className="text-white/80 text-lg max-w-2xl">
          在這裡您可以存取公司所有內部系統。使用搜尋功能快速找到您需要的服務，或從下方類別中選擇。
        </p>

        {/* 統計資訊 */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/20">
          <div>
            <div className="text-2xl font-bold">3</div>
            <div className="text-white/70 text-sm">可用系統</div>
          </div>
          <div>
            <div className="text-2xl font-bold">3</div>
            <div className="text-white/70 text-sm">服務類別</div>
          </div>
          <div>
            <div className="text-2xl font-bold">24/7</div>
            <div className="text-white/70 text-sm">全天候服務</div>
          </div>
        </div>
      </div>
    </div>
  );
}
