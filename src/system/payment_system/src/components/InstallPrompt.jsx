import React, { useState, useEffect } from 'react';
import { Download, X, Share, CheckCircle } from 'lucide-react'; // 加入 CheckCircle 圖示

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  // --- 動作處理函式 (移到 useEffect 前面或用 useCallback 都可以，這裡放外面方便呼叫) ---
  
  // 設定「暫時不顯示」的時間 (7天)
  const snoozePrompt = () => {
    const days = 7; 
    const date = new Date();
    date.setDate(date.getDate() + days);
    localStorage.setItem('pwa_prompt_snooze', date.getTime());
    setShowPrompt(false);
  };

  useEffect(() => {
    // 1. 檢查是否已經在 PWA 模式 (App 模式) 下執行
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      setShowPrompt(false);
      return; 
    }

    // 2. 檢查勿擾模式
    const doNotShowUntil = localStorage.getItem('pwa_prompt_snooze');
    if (doNotShowUntil && new Date().getTime() < parseInt(doNotShowUntil)) {
      return; 
    }

    // 3. 偵測 iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIosDevice);

    // 4. 攔截 Chrome/Android 安裝事件 (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // 阻止瀏覽器預設的醜醜提示
      setDeferredPrompt(e);
      setShowPrompt(true); // 顯示我們漂亮的提示
    };

    // ✅ [新增] 5. 監聽「安裝成功」事件 (appinstalled)
    // 不管用戶是按我們的按鈕，還是按瀏覽器網址列的安裝，只要裝好了，這裡就會觸發
    const handleAppInstalled = () => {
      console.log('App 已成功安裝！');
      setDeferredPrompt(null);
      snoozePrompt(); // 立即關閉提示並進入勿擾模式
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled); // ✅ 加入監聽

    // 6. iOS 延遲顯示
    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // 清除監聽
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled); // ✅ 記得移除
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        // 注意：這裡不需要手動 snooze，因為上面的 'appinstalled' 事件會幫我們做
      }
    } else if (isIOS) {
      snoozePrompt(); 
    }
  };

  const handleClose = () => {
    snoozePrompt();
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-emerald-900 text-white p-4 rounded-xl shadow-2xl border border-emerald-700 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
            <Download size={20} /> 安裝應用程式
          </h3>
          <p className="text-emerald-100 text-sm mb-3">
            將此系統加入主畫面，體驗更順暢的操作！
          </p>
          
          {isIOS ? (
            <div className="text-sm bg-emerald-800/50 p-2 rounded text-emerald-100 mb-2">
              <p className="flex items-center gap-2 mb-1">
                1. 點擊瀏覽器下方的 <Share size={16} /> 分享按鈕
              </p>
              <p>2. 往下滑找到並點選「加入主畫面」</p>
            </div>
          ) : null}

          <button 
            onClick={handleInstallClick}
            className="bg-white text-emerald-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-50 transition-colors w-full shadow-sm"
          >
            {isIOS ? '好的，我知道了' : '點擊安裝'}
          </button>
        </div>
        
        <button 
          onClick={handleClose} 
          className="text-emerald-400 hover:text-white p-1 ml-2 transition-colors"
          title="關閉"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}