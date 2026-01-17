import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // 請確保路徑正確

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ignoreAuthChange = useRef(false);

  // --- 1. 強化版 fetchProfile (增加錯誤除錯) ---
  const fetchProfile = async (userId) => {
    try {
      // console.log('正在讀取 Profile, User ID:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // PGRST116 代表 "查無資料" (可能是 RLS 擋住，也可能是真的沒資料)
        if (error.code === 'PGRST116') {
          console.warn('查無 Profile 資料 (PGRST116)');
          return null;
        }
        console.error('Profile 讀取錯誤:', error.message);
        return null;
      }
      return data;
    } catch (error) {
      console.error('fetchProfile 發生未預期錯誤:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    // 密碼重設頁不跑驗證
    if (isPasswordResetPage) {
      setIsLoading(false);
      return;
    }

    // --- 2. 核心初始化邏輯 (含救援機制) ---
    const initAuth = async () => {
      try {
        // A. 啟動自動刷新
        supabase.auth.startAutoRefresh();

        // B. 嘗試從 LocalStorage 拿 Session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          if (mounted) { setUser(null); setProfile(null); }
          return;
        }

        // C. 設定初步使用者狀態 (讓 UI 知道已登入)
        if (mounted) setUser(session.user);

        // D. 嘗試第一次讀取 Profile
        let userProfile = await fetchProfile(session.user.id);

        // 🔥🔥🔥 關鍵修正：自動救援機制 🔥🔥🔥
        // 如果 User 存在但 Profile 是 null，極大機率是 Token 在資料庫層面失效
        if (!userProfile) {
          console.warn('⚠️ 偵測到登入狀態但讀不到 Profile，正在嘗試 Refresh Session...');
          
          // 強制向 Supabase 換一個全新的 Token
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
             console.error('Refresh 失敗，強制登出', refreshError);
             await supabase.auth.signOut();
             localStorage.clear();
             if (mounted) { setUser(null); setProfile(null); }
             return;
          }

          if (refreshData?.session?.user) {
             console.log('Session Refresh 成功，第二次嘗試讀取 Profile...');
             // 更新 User (確保是新的)
             if (mounted) setUser(refreshData.session.user);
             // 用新 Token 再試一次
             userProfile = await fetchProfile(refreshData.session.user.id);
          }
        }

        // E. 設定最終結果
        if (mounted) {
           setProfile(userProfile);
           // 如果經過救援還是 null，可能需要檢查資料庫真的有沒有這筆資料
           if (!userProfile) console.warn('❌ 最終確認：無法取得 Profile，權限可能為 null');
        }

      } catch (err) {
        console.error('Auth Init Error:', err);
        if (mounted) { 
            setUser(null); 
            setProfile(null); 
            localStorage.clear();
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // --- 3. 超時保護 (防止畫面卡死) ---
    const safeInit = async () => {
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 3000));
      const authPromise = initAuth();
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      if (result === 'timeout' && mounted) {
        console.warn('Auth check timed out, forcing UI render.');
        setIsLoading(false);
      }
    };

    safeInit();

    // --- 4. 監聽狀態變化 ---
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreAuthChange.current) return;
        if (!mounted) return;

        if (session?.user) {
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
          
          // 如果還沒有 Profile，去抓一下
          if (!profile) {
             const data = await fetchProfile(session.user.id);
             if (mounted) setProfile(data);
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          // 登出清理
          setUser(null);
          setProfile(null);
          localStorage.clear();
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- 登入 ---
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

  // --- 登出 ---
  const logout = async () => {
    try {
        await supabase.auth.signOut();
    } catch (e) { console.error(e); }
    setUser(null);
    setProfile(null);
    localStorage.clear();
  };

  // --- 更新 ---
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

  // --- 改密碼 ---
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

  // --- 組合 User 物件 ---
  const combinedUser = user ? {
    ...user,
    ...profile,
    id: user.id,
    email: user.email,
    name: profile?.name || profile?.full_name || user.email,
    role: profile?.role || 'user', // 若失敗預設 user，避免崩潰
    permissions: profile?.role === 'admin' ? ['all'] : [],
  } : null;

  const value = {
    user: combinedUser,
    supabaseUser: user,
    profile,
    role: combinedUser?.role, // 確保直接從 combinedUser 拿
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