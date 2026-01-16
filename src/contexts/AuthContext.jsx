import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 用來鎖定 Auth 監聽的 Ref
  const ignoreAuthChange = useRef(false);

  // 取得用戶 profile
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profile fetch warning:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // 清除過期的 localStorage token
  const clearStoredSession = () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) {
        const key = `sb-${projectId}-auth-token`;
        const stored = localStorage.getItem(key);
        if (stored) {
          localStorage.removeItem(key);
        }
      }
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('清除 localStorage 時發生錯誤:', error);
    }
  };

  // 檢查連線是否還活著 (放寬版)
  const checkConnection = async () => {
    try {
      // 修改：將逾時時間從 2000ms 延長至 10000ms (10秒)，避免網路波動誤判
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wake-up timeout')), 10000)
      );

      await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);

      return true;
    } catch (err) {
      console.warn('連線檢查回應較慢，但暫不強制登出...', err);
      // 修改：即使逾時也回傳 true (或 false 但後續不處理)，讓 Supabase SDK 自己去重試
      return false;
    }
  };

  // 初始化與監聽
  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    if (isPasswordResetPage) {
      setIsLoading(false);
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          setUser(session.user);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    const initAuth = async () => {
      try {
        // 修改：放寬初始化逾時至 15 秒
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 15000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Auth init timeout or error:', err);
            // 只有在真的沒有 Token 的情況下才考慮清除，否則保留讓它重試
            const hasAccessToken = window.location.hash.includes('access_token');
            const isLoginPage = window.location.pathname === '/login';

            if (!hasAccessToken && !isLoginPage) {
               // 這裡保留清除邏輯，因為是初始化失敗
               clearStoredSession();
            }
            return { data: { session: null } };
          });

        if (session?.user && mounted) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id).catch(() => null);
          if (mounted) setProfile(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // 發生錯誤時，不要太積極清除 Session，除非確定是登入頁
        const isLoginPage = window.location.pathname === '/login';
        if (isLoginPage) {
          clearStoredSession();
        }

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const isLoginPage = window.location.pathname === '/login';
        if (isLoginPage) return;

        // 修改：完全移除「喚醒時強制重整與登出」的邏輯
        // 改為「溫和地嘗試重新整理 Session」，失敗了也不打擾使用者
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
             // 只有明確收到錯誤或沒有 session 時才記錄，但不強制踢人
             // Supabase 的 onAuthStateChange 會處理真正的登出事件
             console.log('喚醒後 Session 狀態檢查:', error ? 'Error' : 'No Session');
          } else {
             // 如果 Session 存在，嘗試一個簡單的 ping (可選)
             await checkConnection(); 
          }
        } catch (error) {
          console.warn('喚醒檢查發生錯誤，忽略:', error);
          // 絕對不要在這裡呼叫 clearStoredSession() 或 reload()
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreAuthChange.current) {
          return;
        }

        // 增加 TOKEN_REFRESHED 事件的處理，確保介面同步
        if (event === 'TOKEN_REFRESHED') {
           console.log('Token 已自動更新');
        }

        if (session?.user && mounted) {
          setUser(session.user);
          // 避免每次 token 刷新都重新抓 profile，除非 profile 是空的
          if (!profile) {
              const userProfile = await fetchProfile(session.user.id);
              if (mounted) setProfile(userProfile);
          }
        } else if (mounted) {
          // 只有當 session 明確變為 null (例如 SIGN_OUT) 時才清空狀態
          if (!session && event === 'SIGNED_OUT') {
              setUser(null);
              setProfile(null);
          }
        }
        if (mounted) setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // 移除 profile 依賴，避免無限迴圈

  // 登入
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const { email, password } = credentials;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        setUser(data.user);
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
        return { success: true };
      }
      return { success: false, error: '登入失敗' };
    } catch (error) {
      return { success: false, error: '登入失敗，請稍後再試' };
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setProfile(null);
      clearStoredSession();
      // 登出後可以選擇導向登入頁，這裡交由外層路由保護處理
    }
  };

  // 更新用戶資料
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: '請先登入' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) return { success: false, error: error.message };

      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
      return { success: true, user: updatedProfile };
    } catch (error) {
      return { success: false, error: '更新失敗' };
    }
  };

  // 變更密碼
  const changePassword = async (currentPassword, newPassword) => {
    if (!user || !user.email) {
      return { success: false, error: '使用者未登入' };
    }

    try {
      ignoreAuthChange.current = true;

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: '目前密碼輸入錯誤，請重新確認' };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, message: '密碼已更新成功' };

    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: '系統發生錯誤，請稍後再試' };
    } finally {
      setTimeout(() => {
        ignoreAuthChange.current = false;
      }, 1000);
    }
  };

  const combinedUser = user ? {
    ...user,
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || profile?.full_name || user.email,
    role: profile?.role || 'user',
    permissions: profile?.role === 'admin' ? ['all'] : [],
  } : null;

  const value = {
    user: combinedUser,
    supabaseUser: user,
    profile,
    role: profile?.role,
    isLoading,
    loading: isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}