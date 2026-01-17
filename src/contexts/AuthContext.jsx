import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ignoreAuthChange = useRef(false);

  // 取得用戶 profile
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.debug('Profile fetch info:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.debug('Error fetching profile:', error.message);
      return null;
    }
  };

  // 輔助函式：等待網路連線
  const waitForNetwork = async () => {
    if (navigator.onLine) return true;
    
    return new Promise((resolve) => {
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve(true);
      };
      window.addEventListener('online', handleOnline);
      // 🔥 優化：將保險時間從 10 秒縮短為 2 秒，避免使用者在無網路時空等太久
      setTimeout(() => {
        window.removeEventListener('online', handleOnline);
        resolve(navigator.onLine);
      }, 2000);
    });
  };

  // 輔助函式：延遲 (Sleep)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 初始化與監聽
  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    // 密碼重設頁面邏輯
    if (isPasswordResetPage) {
      setIsLoading(false);
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (session?.user) setUser(session.user);
      });
      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    // 核心：嘗試恢復 Session (含重試與強制清理邏輯)
    const recoverSession = async (retryCount = 0) => {
      try {
        // 1. 先確認網路是否通暢
        await waitForNetwork().catch(() => true);

        // 2. 恢復自動刷新機制
        supabase.auth.startAutoRefresh();

        // 3. 取得 Session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // 如果失敗，且重試次數少於 3 次，等待後重試
          if (retryCount < 3) {
            console.debug(`Session 恢復失敗，第 ${retryCount + 1} 次重試...`);
            await delay(500 * (retryCount + 1)); // 優化：縮短重試間隔
            return recoverSession(retryCount + 1);
          }
          
          // 真的救不回來，嘗試強制刷新最後一次
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshData.session && mounted) {
             setUser(refreshData.session.user);
             const userProfile = await fetchProfile(refreshData.session.user.id);
             if (mounted) setProfile(userProfile);
          } else {
             // 🔥 關鍵修正：如果連 refresh 都失敗，必須「強制登出」並「清除殘留資料」
             console.warn('Session 無法恢復且刷新失敗，執行強制清理。', refreshError);
             
             await supabase.auth.signOut(); 
             // 🔥 強制清除 LocalStorage，這是解決「殭屍 Session」最重要的一步
             localStorage.clear(); 

             if (mounted) {
               setUser(null);
               setProfile(null);
             }
          }
        } else if (session?.user && mounted) {
          // 成功
          setUser(session.user);
          // 只有當沒有 profile 時才抓取，避免浪費流量
          if (!profile) {
              const userProfile = await fetchProfile(session.user.id);
              if (mounted) setProfile(userProfile);
          }
        }
      } catch (err) {
        console.error('Recover session exception:', err);
        // 發生預期外錯誤時，也強制清理以策安全
        await supabase.auth.signOut();
        localStorage.clear();
        if (mounted) {
           setUser(null);
           setProfile(null);
        }
      }
    };

    const initAuth = async () => {
      try {
        await recoverSession();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    // 處理喚醒與網路恢復邏輯
    const handleReconnection = async () => {
       if (document.visibilityState === 'visible' && navigator.onLine) {
          const isLoginPage = window.location.pathname === '/login';
          if (isLoginPage) return;

          // console.log('網路/畫面恢復，檢查連線狀態...');
          await recoverSession();
       }
    };

    window.addEventListener('visibilitychange', handleReconnection);
    window.addEventListener('online', handleReconnection);

    // Supabase 狀態監聽
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreAuthChange.current) return;

        if (session?.user && mounted) {
          setUser(session.user);
          if (!profile) {
            const userProfile = await fetchProfile(session.user.id);
            if (mounted) setProfile(userProfile);
          }
        } else if (mounted) {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            // 登出時也確保清除乾淨
            localStorage.clear();
          }
        }
        if (mounted) setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleReconnection);
      window.removeEventListener('online', handleReconnection);
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
      // 強制清除 Storage 確保乾淨
      localStorage.clear();
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
    if (!user || !user.email) return { success: false, error: '使用者未登入' };

    try {
      ignoreAuthChange.current = true;
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) return { success: false, error: '目前密碼輸入錯誤' };

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) return { success: false, error: updateError.message };

      return { success: true, message: '密碼已更新成功' };

    } catch (error) {
      return { success: false, error: '系統發生錯誤' };
    } finally {
      setTimeout(() => { ignoreAuthChange.current = false; }, 1000);
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}