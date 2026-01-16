import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 用來鎖定 Auth 監聽的 Ref
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 如果正在執行變更密碼，直接無視這次更新，避免打斷執行緒 (解決卡死問題的關鍵)
        if (ignoreAuthChange.current) {
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

  // 變更密碼 (乾淨版：保留鎖定與舊密碼驗證邏輯)
  const changePassword = async (currentPassword, newPassword) => {
    if (!user || !user.email) {
      return { success: false, error: '使用者未登入' };
    }

    try {
      // 1. 上鎖：無視接下來所有的 Auth 狀態變化
      ignoreAuthChange.current = true;

      // 2. 驗證舊密碼
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: '目前密碼輸入錯誤，請重新確認' };
      }

      // 3. 執行更新
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
      // 4. 解鎖：延遲一下再恢復監聽
      setTimeout(() => {
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