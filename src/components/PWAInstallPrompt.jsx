import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

/**
 * PWA 安裝提示組件
 * 在支援的瀏覽器上顯示「安裝到主畫面」的提示
 */
export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 檢查是否已經安裝
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      console.log('✅ PWA is already installed');
      return;
    }

    // 監聽 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e) => {
      // 防止自動顯示瀏覽器的安裝提示
      e.preventDefault();
      console.log('📱 PWA install prompt ready');

      // 保存事件以便稍後觸發
      setDeferredPrompt(e);

      // 檢查用戶是否之前關閉過提示
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      const dismissedTime = localStorage.getItem('pwa-install-dismissed-time');

      // 如果用戶關閉了提示，7天後再次顯示
      if (dismissed && dismissedTime) {
        const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed < 7) {
          console.log(`⏳ PWA install prompt dismissed ${daysSinceDismissed.toFixed(1)} days ago`);
          return;
        }
      }

      // 延遲3秒顯示，避免干擾用戶
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    // 監聽成功安裝事件
    const handleAppInstalled = () => {
      console.log('🎉 PWA was installed successfully!');
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-install-dismissed');
      localStorage.removeItem('pwa-install-dismissed-time');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ No install prompt available');
      return;
    }

    setIsInstalling(true);

    try {
      // 顯示瀏覽器的安裝提示
      deferredPrompt.prompt();

      // 等待用戶選擇
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`👤 User choice: ${outcome}`);

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      // 清除 deferredPrompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error showing install prompt:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString());
    console.log('👋 User dismissed the PWA install prompt');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <>
      {/* 背景遮罩 - 手機版優化 */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998] animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* 安裝提示卡片 - 手機版優化 */}
      <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 z-[9999] animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-500">
        <div className="bg-gradient-to-br from-white to-stone-50 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-stone-900/20 border border-stone-200 overflow-hidden">
          {/* 頂部裝飾條 */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

          {/* 內容區域 - 手機版優化 */}
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              {/* 圖標 - 手機版優化 */}
              <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>

              {/* 文字內容 - 手機版優化 */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-stone-800 mb-1 sm:mb-1.5">
                  安裝到主畫面
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed mb-4">
                  將六扇門企業服務入口安裝到您的裝置，享受更快速、流暢的使用體驗！
                </p>

                {/* 功能亮點 - 手機版優化 */}
                <div className="space-y-1.5 sm:space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>離線也能瀏覽</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>快速啟動不卡頓</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>全螢幕沉浸體驗</span>
                  </div>
                </div>

                {/* 按鈕組 - 手機版優化 */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:from-red-800 active:to-red-900 text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 active:shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
                  >
                    {isInstalling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>安裝中...</span>
                      </>
                    ) : (
                      <>
                        <Download size={18} className="sm:w-5 sm:h-5" />
                        <span>立即安裝</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="p-2.5 sm:p-3 text-stone-400 hover:text-stone-600 active:text-stone-700 hover:bg-stone-100 active:bg-stone-200 rounded-xl transition-all touch-manipulation"
                    aria-label="關閉"
                  >
                    <X size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 底部說明 - 手機版優化 */}
          <div className="px-5 py-3 sm:px-6 sm:py-4 bg-stone-100/50 border-t border-stone-200">
            <p className="text-[10px] sm:text-xs text-stone-500 text-center leading-relaxed">
              💡 安裝後可在主畫面找到圖示，點擊即可快速開啟
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
