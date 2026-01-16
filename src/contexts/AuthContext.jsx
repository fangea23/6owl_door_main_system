import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 新增：用來鎖定 Auth 監聽的 Ref
  // 使用 useRef 是因為它的改變不會觸發重新渲染，適合用來解決 Race Condition
  const ignoreAuthChange = useRef(false);

  // 取得用戶 profile（包含 role 等資訊）
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
          console.log('清除殘留的 session token...');
          localStorage.removeItem(key);
        }
      }
      // 也清除可能的其他 supabase 相關 keys
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
      console.warn('偵測到連線凍結或逾時，準備重整頁面...', err);
      return false;
    }
  };

  // 初始化與監聽
  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    if (isPasswordResetPage) {
      console.log('🔒 在 update-password 頁面，跳過 AuthContext 初始化');
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
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Auth init timeout or error:', err);
            const hasAccessToken = window.location.hash.includes('access_token') ||
                                  window.location.hash.includes('type=recovery') ||
                                  window.location.hash.includes('type=invite');
            const isLoginPage = window.location.pathname === '/login';

            if (!hasAccessToken && !isLoginPage) {
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
        const hasAccessToken = window.location.hash.includes('access_token');
        const isLoginPage = window.location.pathname === '/login';

        if (!hasAccessToken && !isLoginPage) {
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

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            const isAlive = await checkConnection();
            if (!isAlive) {
              clearStoredSession();
              window.location.reload();
            }
          }
        } catch (error) {
          clearStoredSession();
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 🔥 修改過的 Auth 狀態監聽器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 🔒 如果正在執行變更密碼，直接無視這次更新，避免打斷執行緒 (解決卡死問題的關鍵)
        if (ignoreAuthChange.current) {
          console.log('🔒 [AuthContext] 檢測到密碼變更中，暫時忽略自動狀態更新');
          return;
        }

        if (session?.user && mounted) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) setProfile(userProfile);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
        }
        if (mounted) setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  // 變更密碼 (修正版：加入 useRef 鎖定機制)
  const changePassword = async (currentPassword, newPassword) => {
    console.log("🔵 [AuthContext] 1. 收到變更密碼請求");
    
    if (!user) {
      console.error("🔴 [AuthContext] 錯誤: 使用者未登入");
      return { success: false, error: '使用者未登入' };
    }

    try {
      console.log("🔵 [AuthContext] 2. 鎖定監聽器，呼叫 updateUser...");
      
      // 1. 上鎖：告訴 onAuthStateChange 不要觸發重繪，避免前端卡死
      ignoreAuthChange.current = true;

      // 2. 執行更新 (Supabase 會在後端處理密碼加密)
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      console.log("🟢 [AuthContext] 3. updateUser 完成，結果:", { data, error });

      if (error) {
        console.error("🔴 [AuthContext] Supabase 回傳錯誤:", error);
        return { success: false, error: error.message };
      }

      return { success: true, message: '密碼已更新成功' };

    } catch (error) {
      console.error('🔴 [AuthContext] 系統發生例外錯誤 (Crash):', error);
      return { success: false, error: '系統發生錯誤，請稍後再試' };
    } finally {
       // 3. 解鎖：恢復正常監聽 (延遲 1 秒以確保 React 狀態穩定)
       setTimeout(() => {
        console.log("🔓 [AuthContext] 解除鎖定");
        ignoreAuthChange.current = false;
      }, 1000);
    }
  };

  // 合併 user 和 profile 資訊
  const combinedUser = user ? {
    ...user,
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || profile?.full_name || user.email,
    role: profile?.role || 'user',
    permissions: profile?.role === 'admin' ? ['all'] : [],
  } : null;

  // 構建 Context Value
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