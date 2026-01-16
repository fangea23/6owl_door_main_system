import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // 🟢 新增：清除過期的 localStorage token
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

  // 🟢 新增：檢查連線是否還活著 (用來對付瀏覽器休眠後的殭屍狀態)
  const checkConnection = async () => {
    try {
      // 設定一個超短的 2 秒限制
      // 如果 Supabase Client 已經殭屍化，它會無視請求，我們不能讓它無限轉圈
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Wake-up timeout')), 2000)
      );

      // 嘗試取得 Session，看 Client 是否還活著
      await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);

      return true; // 連線正常
    } catch (err) {
      console.warn('偵測到連線凍結或逾時，準備重整頁面...', err);
      return false; // 連線已死
    }
  };

  // 初始化與監聽
  useEffect(() => {
    let mounted = true;

    // 🔥 重要：在 update-password 頁面上完全跳過初始化
    // 因為該頁面有自己的 session 管理，不需要 AuthContext 干預
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    if (isPasswordResetPage) {
      console.log('🔒 在 update-password 頁面，跳過 AuthContext 初始化');
      setIsLoading(false);
      // 仍然監聽 auth 狀態變化，但不執行初始化
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        // 只更新狀態，不做其他操作
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
        // ✅ 修正 1：將超時時間延長至 10 秒 (10000ms)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Auth init timeout or error:', err);

            // 超時或錯誤時，檢查是否在特殊頁面
            const hasAccessToken = window.location.hash.includes('access_token') ||
                                  window.location.hash.includes('type=recovery') ||
                                  window.location.hash.includes('type=invite');

            const isLoginPage = window.location.pathname === '/login';

            // 在登入頁面或有 access_token 時，不清除 session
            if (!hasAccessToken && !isLoginPage) {
              // 只有不在特殊流程時才清除
              clearStoredSession();
            } else {
              console.log('檢測到 access_token 或在登入頁面，不清除 session');
            }

            return { data: { session: null } };
          });

        if (session?.user && mounted) {
          setUser(session.user);
          // 嘗試取得 Profile，如果失敗也不要卡住整個 App
          const userProfile = await fetchProfile(session.user.id).catch(() => null);
          if (mounted) setProfile(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);

        // 發生嚴重錯誤時，檢查是否有 access_token 或在登入頁面
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

    // 🟢 新增：監聽「視窗喚醒」事件 (解決閒置 5 分鐘後卡死的問題)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // console.log('使用者回到視窗，檢查連線健康度...');

        // ⚠️ 在登入頁面不要執行連線檢查，避免干擾登入流程
        const isLoginPage = window.location.pathname === '/login';
        if (isLoginPage) {
          console.log('📍 在登入頁面，跳過連線檢查');
          return;
        }

        // 只有在已登入狀態下才需要檢查
        // 這裡不能直接用 user 變數，因為閉包問題，要直接問 supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const isAlive = await checkConnection();
            if (!isAlive) {
              console.warn('連線已失效，執行自動修復...');
              // 清除可能損壞的 session
              clearStoredSession();
              // 💀 如果連線已死，強制重新整理頁面來復活 Supabase Client
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('檢查連線時發生錯誤:', error);
          // 如果檢查時發生錯誤，也清除並重新加載
          clearStoredSession();
          window.location.reload();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      // 記得移除監聽器
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

      if (error) {
        return { success: false, error: error.message };
      }

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
      // 使用統一的清除函數
      clearStoredSession();
    }
  };

  // 更新用戶資料
  const updateProfile = async (updates) => {
    if (!user) {
      return { success: false, error: '請先登入' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
      return { success: true, user: updatedProfile };
    } catch (error) {
      return { success: false, error: '更新失敗' };
    }
  };

  // 變更密碼
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: '密碼已更新' };
    } catch (error) {
      return { success: false, error: '密碼變更失敗' };
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