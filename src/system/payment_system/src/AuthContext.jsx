import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true); // 預設一定要是 true

  useEffect(() => {
    let mounted = true;

    // 定義一個處理 Session 的函式
    const handleSession = async (session) => {
      if (session?.user) {
        setUser(session.user);
        // 只有當 user 改變時才去抓 role，避免重複請求
        await fetchRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
      }
      if (mounted) setLoading(false);
    };

    // 1. 初始檢查
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // 2. 監聽變化 (登入、登出、Token 更新)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 抓取 profiles 表中的角色
  const fetchRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (data) {
        setRole(data.role);
      }
    } catch (error) {
      console.error('抓取角色失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 自訂 Hook 方便其他頁面使用
export const useAuth = () => useContext(AuthContext);