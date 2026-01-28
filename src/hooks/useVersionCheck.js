import { useEffect, useCallback, useState, useRef } from 'react';

// 當前版本（建置時會被替換）
const CURRENT_VERSION = __BUILD_TIME__;
const VERSION_KEY = 'app_known_version';

/**
 * 版本檢查 Hook
 * 定期檢查是否有新版本，如果有就提示用戶刷新
 */
export const useVersionCheck = (intervalMinutes = 5) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialCheckDone = useRef(false);

  const checkVersion = useCallback(async () => {
    try {
      // 加上時間戳避免快取
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data.version;

      if (!serverVersion) return;

      // 取得已知版本（上次刷新後記錄的）
      const knownVersion = localStorage.getItem(VERSION_KEY);

      // 首次載入時，記錄當前伺服器版本
      if (!initialCheckDone.current) {
        initialCheckDone.current = true;

        // 如果沒有記錄過版本，或版本與伺服器一致，記錄並返回
        if (!knownVersion || knownVersion === serverVersion) {
          localStorage.setItem(VERSION_KEY, serverVersion);
          console.log('[Version Check] 版本已同步:', serverVersion);
          return;
        }
      }

      // 如果伺服器版本比已知版本新，顯示更新提示
      if (knownVersion && serverVersion !== knownVersion) {
        console.log('[Version Check] 發現新版本:', serverVersion);
        console.log('[Version Check] 已知版本:', knownVersion);
        setUpdateAvailable(true);
      }
    } catch (error) {
      // 靜默失敗，不影響用戶體驗
      console.debug('[Version Check] 檢查失敗:', error.message);
    }
  }, []);

  // 強制刷新頁面
  const forceRefresh = useCallback(async () => {
    try {
      // 先取得最新版本號並記錄
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.version) {
          localStorage.setItem(VERSION_KEY, data.version);
        }
      }
    } catch (e) {
      // 忽略錯誤
    }

    // 清除所有快取
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    }

    // 強制從伺服器重新載入
    window.location.reload();
  }, []);

  useEffect(() => {
    // 初次檢查（延遲一下確保頁面載入完成）
    const initTimer = setTimeout(checkVersion, 1000);

    // 定期檢查
    const interval = setInterval(checkVersion, intervalMinutes * 60 * 1000);

    // 當頁面重新獲得焦點時也檢查
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkVersion, intervalMinutes]);

  return { updateAvailable, forceRefresh, checkVersion };
};

export default useVersionCheck;
