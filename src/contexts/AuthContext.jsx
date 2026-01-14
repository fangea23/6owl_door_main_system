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

  // 初始化時檢查登入狀態
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // 設定 3 秒超時限制，避免因 LocalStorage 損壞而無限轉圈
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );

        const sessionPromise = supabase.auth.getSession();

        // 競賽：看是先取得 Session 還是先超時
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
          .catch(async (err) => {
            console.warn('Auth init timeout or error, forcing cleanup...', err);
            // 如果超時或出錯，強制登出以清除壞掉的 cache
            await supabase.auth.signOut(); 
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
        // 發生嚴重錯誤時確保狀態重置
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

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
      // 清除可能殘留的 LocalStorage (針對 Supabase)
      localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
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