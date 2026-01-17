import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase'; // 請確保路徑正確

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const ignoreAuthChange = useRef(false);

  // 取得用戶 profile (獨立封裝)
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

  useEffect(() => {
    let mounted = true;
    const isPasswordResetPage = window.location.pathname.includes('update-password');

    // 1. 密碼重設頁面特例處理 (不跑複雜驗證，避免干擾重設流程)
    if (isPasswordResetPage) {
      setIsLoading(false);
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && mounted) setUser(session.user);
      });
      return () => authListener.subscription.unsubscribe();
    }

    // 2. 核心：初始化驗證流程 (修正版：解決殭屍 Session 問題)
    const initAuth = async () => {
      try {
        // A. 啟動 Supabase 自動刷新
        supabase.auth.startAutoRefresh();

        // B. 初步檢查：本地是否有 Session (快速檢查)
        // 這裡只讀硬碟，不聯網，目的是如果完全沒登入過，就不用浪費時間去問伺服器
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          // 本地完全沒資料 -> 視為未登入
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        // C. 深度檢查：向伺服器確認 Token 有效性 (解決問題的關鍵)
        // getUser() 會發送 Request 到 Supabase Auth Server
        const { data: { user: serverUser }, error: userError } = await supabase.auth.getUser();

        if (userError || !serverUser) {
          // ★ 狀況發生：本地有 Session 但伺服器說無效 (殭屍 Session)
          console.warn('偵測到無效的 Session，強制清理...', userError?.message);
          
          // 強制登出並清除髒資料
          await supabase.auth.signOut();
          localStorage.clear(); // 確保瀏覽器儲存空間乾淨
          
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          return;
        }

        // D. 驗證通過，這是個活生生的用戶
        if (mounted) setUser(serverUser);

        // E. 抓取 Profile (這時候 Token 已確認有效，失敗率極低)
        const userProfile = await fetchProfile(serverUser.id);
        if (mounted) setProfile(userProfile);

      } catch (err) {
        console.error('Auth initialization error:', err);
        // 發生未預期錯誤時，為了安全起見，重置狀態
        if (mounted) {
          setUser(null);
          setProfile(null);
          localStorage.clear(); // 避免錯誤資料殘留
        }
      } finally {
        // 🔥 關鍵：無論成功失敗，一定要關閉 Loading
        if (mounted) setIsLoading(false);
      }
    };

    // 3. 執行初始化，加上「超時保險」
    // 防止網路極差時畫面一直卡在 Loading
    const safeInit = async () => {
      // 設定 3 秒超時
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve('timeout'), 3000));
      const authPromise = initAuth();

      const result = await Promise.race([authPromise, timeoutPromise]);
      
      if (result === 'timeout' && mounted) {
        console.warn('Auth check timed out, forcing UI render.');
        setIsLoading(false); // 🔥 強制解鎖畫面，避免白屏
      }
    };

    safeInit();

    // 4. 監聽狀態變化 (登入、登出、Token 刷新)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (ignoreAuthChange.current) return;
        if (!mounted) return;

        // 除錯用：觀察狀態變化
        // console.log('Auth State Change:', event);

        if (session?.user) {
          // 如果 User ID 變了，或者是剛登入，才更新狀態
          setUser(prev => (prev?.id === session.user.id ? prev : session.user));
          
          // 如果還沒有 Profile，去抓一下
          if (!profile) {
            const userProfile = await fetchProfile(session.user.id);
            if (mounted) setProfile(userProfile);
          }
        } else {
          // 登出或 Session 過期
          if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            setUser(null);
            setProfile(null);
            localStorage.clear(); // 清除殘留
            setIsLoading(false);
          }
        }
        
        // 確保某些特殊事件後 Loading 會關閉
        if (event === 'INITIAL_SESSION') {
             setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // 依賴陣列為空，只執行一次

  // --- 以下功能函式保持不變 ---

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
      // 建議：登出後可強制重整頁面或跳轉
      // window.location.href = '/login'; 
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