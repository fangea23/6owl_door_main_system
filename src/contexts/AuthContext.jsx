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
        .from('profiles') // 確保這裡連到的是主系統的 profiles 表
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

  // 清除過期的 localStorage token (僅在明確登出時使用)
  const clearStoredSession = () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      if (projectId) {
        const key = `sb-${projectId}-auth-token`;
        localStorage.removeItem(key);
      }
      // 清除其他相關 token
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('清除 localStorage 時發生錯誤:', error);
    }
  };

  // 檢查連線 (極致寬鬆版)
  const checkConnection = async () => {
    try {
      // 修改：延長至 30 秒，給予極大的寬容度
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wake-up timeout')), 30000)
      );

      await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);

      return true;
    } catch (err) {
      // 就算超時，我們也只紀錄 Warning，絕對不回傳 false 導致登出
      console.warn('網路連線回應較慢 (超過30秒)，保持登入狀態等待恢復...', err);
      return true; // 欺騙系統說連線還活著，避免觸發登出邏輯
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
        // 修改：初始化等待時間也延長至 20 秒
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 20000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('初始化超時，但不強制清除 Session，嘗試保留狀態:', err);
            // 只有在明確是登入頁面且沒有 Token 時才清除，其他頁面保留嘗試機會
            return { data: { session: null } };
          });

        if (session?.user && mounted) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id).catch(() => null);
          if (mounted) setProfile(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // 處理喚醒邏輯
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const isLoginPage = window.location.pathname === '/login';
        if (isLoginPage) return;

        console.log('應用程式喚醒，檢查狀態...');
        
        // 修改：移除所有 destructive 操作 (reload, clearSession)
        // 僅嘗試更新 Session，如果失敗就失敗，等使用者下次操作再說
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.warn('喚醒時 Session 檢查有誤 (忽略):', error);
          } else if (session) {
             console.log('喚醒時 Session 有效');
             // 這裡可以選擇性做一次 checkConnection，但不要根據結果做任何懲罰
             checkConnection(); 
          }
        } catch (e) {
          console.warn('喚醒檢查例外 (忽略):', e);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // 如果正在變更密碼，無視更新
        if (ignoreAuthChange.current) return;

        if (event === 'TOKEN_REFRESHED') {
          console.log('Token 已自動更新');
        }

        if (session?.user && mounted) {
          setUser(session.user);
          // 只有當 profile 為空時才重新抓取，節省流量與避免錯誤
          if (!profile) {
            const userProfile = await fetchProfile(session.user.id);
            if (mounted) setProfile(userProfile);
          }
        } else if (mounted) {
          // 只有在明確收到 SIGNED_OUT 事件時才清空
          if (event === 'SIGNED_OUT') {
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
  }, []); // 移除 profile 依賴

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

  // 登出 (這是唯一會主動清除 Session 的地方)
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