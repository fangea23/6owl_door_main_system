import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
// 1. 直接引入設定好的 supabase client
import { supabase } from '../../lib/supabase';

// 取得環境變數 (確保 Vite/Next.js 環境變數名稱正確)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const useProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. 使用 useCallback 避免函式在重繪時變更
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 這裡假設你的 profiles 表有 RLS 策略允許 admin 讀取所有資料
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // 3. 建立新用戶 (修正版)
  const createProfile = async (userData) => {
    try {
      // ⚠️ 關鍵技巧：建立一個臨時的 Client 來執行註冊
      // 這樣可以避免影響當前 Admin 的登入 Session
      const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { 
          autoRefreshToken: false, 
          persistSession: false, // 不要在 localStorage 存 Session
          detectSessionInUrl: false
        }
      });

      // A. 在 Auth 系統註冊
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            // 注意：這裡傳入 role，需要依賴 Trigger 寫入 profiles
            // 或是依賴後面的 update
            role: userData.role || 'user' 
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('無法建立使用者，請檢查 Email 是否已存在');

      // B. 處理 Profile 資料
      // 通常建議：在 Database 設定 Trigger，當 Auth.users 新增時，自動新增 public.profiles
      // 如果你的系統是手動寫入，則執行以下：
      
      // 等待一下以防 Trigger 衝突 (若你有寫 Trigger)
      // 如果沒有 Trigger，這段可以直接執行 update 來確保 role 正確
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          full_name: userData.full_name,
          role: userData.role || 'user'
        })
        .eq('id', authData.user.id);

      // 如果該 User ID 在 profiles 還不存在 (Trigger 延遲或沒寫)，則 Insert
      if (updateError) {
         await supabase.from('profiles').insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role || 'user'
         });
      }

      // 重新載入列表
      await fetchProfiles();
      return { success: true, user: authData.user };
    } catch (err) {
      console.error('Error creating profile:', err);
      return { success: false, error: err.message };
    }
  };

  // 4. 更新角色
  const updateProfileRole = async (userId, newRole) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;
      await fetchProfiles();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 5. 更新資訊
  const updateProfile = async (userId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;
      await fetchProfiles();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 6. 刪除用戶 (必須搭配 SQL RPC)
  const deleteProfile = async (userId) => {
    try {
      const { error: deleteError } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: userId
      });

      if (deleteError) throw deleteError;
      
      // 前端樂觀更新 (UI 比較快反應)
      setProfiles(prev => prev.filter(p => p.id !== userId));
      
      // 確保同步
      await fetchProfiles();
      return { success: true };
    } catch (err) {
      console.error('Error deleting profile:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    profiles,
    loading,
    error,
    refetch: fetchProfiles,
    createProfile,
    updateProfileRole,
    updateProfile,
    deleteProfile,
  };
};