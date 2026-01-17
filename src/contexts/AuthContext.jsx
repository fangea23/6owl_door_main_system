import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
// 1. 引入 React Query hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // sessionUser 只負責存 "Supabase Auth" 的狀態 (票)
  const [sessionUser, setSessionUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const queryClient = useQueryClient();

  // --- 1. 監聽 Supabase Auth 狀態 (負責拿到 User ID) ---
  useEffect(() => {
    let mounted = true;

    // 初始化檢查
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSessionUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth Init Error:', error);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    initSession();

    // 監聽登入/登出事件
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSessionUser(session?.user ?? null);
        
        // 如果登出，立即清除快取，避免下個使用者看到舊資料
        if (!session?.user) {
          queryClient.removeQueries(['myProfile']);
          queryClient.clear();
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // --- 2. 使用 React Query 抓取 Profile (負責拿到 Role/資料) ---
  // 這取代了原本手動的 fetchProfile 和 useEffect 救援機制
  const { 
    data: profile, 
    isLoading: isProfileLoading, 
    refetch: refetchProfile 
  } = useQuery({
    queryKey: ['myProfile', sessionUser?.id], // Key 包含 ID，ID 一變就自動重抓
    queryFn: async () => {
      // console.log('React Query: 正在讀取 Profile...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
      
      if (error) {
        // 忽略 PGRST116 (查無資料) 和 AbortError (組件卸載)
        if (error.code === 'PGRST116') return null;
        if (error.message.includes('AbortError')) return null;
        throw error;
      }
      return data;
    },
    // 🔥 關鍵設定：只有當 sessionUser 存在時才執行，避免無效請求
    enabled: !!sessionUser?.id,
    // 🔥 殭屍 Session 對策：
    // 如果是 401 (JWT失效) 或網路問題，React Query 會自動重試 (預設 3 次)
    // 這給了 Supabase 背景自動刷新 Token 的時間
    retry: (failureCount, error) => {
      if (error.code === 'PGRST116') return false; // 沒資料不用重試
      return failureCount < 2; // 最多重試 2 次
    },
    staleTime: 1000 * 60 * 5, // 資料 5 分鐘內視為新鮮 (減少資料庫請求)
  });

  // --- 3. 組合 User 物件 (Memo 化避免不必要的渲染) ---
  const combinedUser = useMemo(() => {
    if (!sessionUser) return null;
    return {
      ...sessionUser,
      ...profile, // 這裡融合了 DB 的資料 (role, name 等)
      id: sessionUser.id,
      email: sessionUser.email,
      role: profile?.role || 'user', // 若讀取失敗，給予預設權限，防止崩潰
      permissions: profile?.role === 'admin' ? ['all'] : [],
    };
  }, [sessionUser, profile]);

  // 只要 Auth 還在讀取，或是 User 存在但 Profile 還在讀取中，就是 Loading
  const isLoading = isAuthLoading || (!!sessionUser && isProfileLoading);

  // --- 功能函式 ---

  const login = async (credentials) => {
    // setIsLoading(true); // 不需要手動設，React Query 會處理狀態
    try {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) return { success: false, error: error.message };
      
      // 登入成功後，sessionUser 變更會觸發 useQuery 自動執行
      return { success: true };
    } catch (error) {
      return { success: false, error: '登入失敗，請稍後再試' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries(); // 清空所有快取
    setSessionUser(null);
  };

  const updateProfile = async (updates) => {
    if (!sessionUser) return { success: false, error: '請先登入' };
    try {
      const { error } = await supabase.from('profiles').update(updates).eq('id', sessionUser.id);
      if (error) throw error;
      
      // 🔥 更新成功後，告訴 React Query 資料髒了，它會自動重抓
      await refetchProfile();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || '更新失敗' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    // 密碼邏輯與 React Query 無關，保持原樣
    if (!sessionUser?.email) return { success: false, error: '使用者未登入' };
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: sessionUser.email,
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
    }
  };

  const value = {
    user: combinedUser,
    supabaseUser: sessionUser, // 原始的 auth user
    profile,                   // 原始的 profile data
    role: combinedUser?.role,
    isLoading,
    loading: isLoading, // 兼容舊代碼
    isAuthenticated: !!combinedUser,
    login,
    logout,
    updateProfile,
    changePassword,
    refetchProfile, // 暴露手動刷新功能
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