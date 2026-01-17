import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ignoreAuthChange = useRef(false);

  // 取得用戶 profile (獨立封裝，失敗不噴錯，避免卡死)
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.warn('Error fetching profile:', error);
      return null;
    }
  };

  // 輔助：延遲
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    // 1. 密碼重設頁面特例處理 (不跑複雜驗證)
    if (isPasswordResetPage) {
      setIsLoading(false);
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && mounted) setUser(session.user);
      });
      return () => authListener.subscription.unsubscribe();
    }

    // 2. 核心：初始化驗證流程 (移除 waitForNetwork，改為直接執行)
    const initAuth = async () => {
      try {
        // A. 啟動 Supabase 自動刷新
        supabase.auth.startAutoRefresh();

        // B. 嘗試取得 Session (直接讀取 LocalStorage)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // 沒有 Session 或出錯 -> 嘗試 Refresh
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session?.user && mounted) {
             setUser(refreshData.session.user);
             const userProfile = await fetchProfile(refreshData.session.user.id);
             if (mounted) setProfile(userProfile);
          }
        } else if (session?.user && mounted) {
          // Session 有效 -> 設定使用者
          setUser(session.user);
          // 抓取 Profile
          const userProfile = await fetchProfile(session.user.id);
          if (mounted) setProfile(userProfile);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // 出錯時強制登出
        if (mounted) {
           setUser(null);
           setProfile(null);
        }
      } finally {
        // 🔥 關鍵：無論成功失敗，一定要關閉 Loading
        if (mounted) setIsLoading(false);
      }
    };

    // 3. 執行初始化，但加上「超時保險」
    // 🔥 這段是解決問題的核心：如果 initAuth 超過 3 秒沒跑完，強制關閉 loading
    const safeInit = async () => {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 3000));
        const authPromise = initAuth();

        const result = await Promise.race([authPromise, timeoutPromise]);
        
        if (result === 'timeout' && mounted) {
            console.warn('Auth check timed out, forcing UI render.');
            setIsLoading(false); // 🔥 強制解鎖畫面
        }
    };

    safeInit();

    // 4. 監聽狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreAuthChange.current) return;
        if (!mounted) return;

        if (session?.user) {
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
          
          if (!profile) {
             const userProfile = await fetchProfile(session.user.id);
             if (mounted) setProfile(userProfile);
          }
        } else {
          // 登出或無 Session
          if (event === 'SIGNED_OUT') {
             setUser(null);
             setProfile(null);
             localStorage.clear(); // 清除殘留
          }
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
      localStorage.clear();
    }
  };

  // 更新用戶資料
  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: '請先登入' };
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
      return { success: true, user: updatedProfile };
    } catch (error) {
      return { success: false, error: error.message || '更新失敗' };
    }
  };

  // 變更密碼
  const changePassword = async (currentPassword, newPassword) => {
    if (!user?.email) return { success: false, error: '使用者未登入' };
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