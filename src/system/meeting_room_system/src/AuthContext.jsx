import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 清除過期的 localStorage token
  const clearStoredSession = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('清除 localStorage 時發生錯誤:', error);
    }
  };

  // 檢查連線是否還活著
  const checkConnection = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wake-up timeout')), 2000)
      );

      await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);

      return true;
    } catch (err) {
      console.warn('偵測到連線凍結或逾時', err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 初始化認證
    const initAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Auth init timeout or error:', err);
            clearStoredSession();
            return { data: { session: null } };
          });

        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        clearStoredSession();
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // 監聽視窗喚醒事件
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const isAlive = await checkConnection();
            if (!isAlive) {
              console.warn('連線已失效，執行自動修復...');
              clearStoredSession();
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('檢查連線時發生錯誤:', error);
          clearStoredSession();
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 監聽登入狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
