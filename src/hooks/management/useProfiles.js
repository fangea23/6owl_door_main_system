import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

/**
 * 統一的用戶帳號管理 Hook
 * 管理 public.profiles 表（認證系統）
 */
export const useProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有用戶帳號
  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);

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
  };

  // 初始載入
  useEffect(() => {
    fetchProfiles();
  }, []);

  // 創建新用戶
  const createProfile = async (userData) => {
    try {
      // 使用獨立的 Supabase client 來註冊新用戶
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // 1. 在 auth.users 中創建用戶
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role || 'user'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('無法建立使用者');

      // 2. 確保 profile 已創建（通常由觸發器自動完成）
      // 等待一小段時間讓觸發器執行
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. 驗證 profile 是否已創建
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // 如果 profile 不存在，手動創建
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role || 'user'
          });

        if (insertError) throw insertError;
      }

      // 重新載入列表
      await fetchProfiles();

      return { success: true, user: authData.user };
    } catch (err) {
      console.error('Error creating profile:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新用戶角色
  const updateProfileRole = async (userId, newRole) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 重新載入列表
      await fetchProfiles();

      return { success: true };
    } catch (err) {
      console.error('Error updating profile role:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新用戶資訊
  const updateProfile = async (userId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      // 重新載入列表
      await fetchProfiles();

      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除用戶（需要 RPC 函數）
  const deleteProfile = async (userId) => {
    try {
      // 注意：這需要在資料庫中創建 delete_user_by_admin 函數
      const { error: deleteError } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: userId
      });

      if (deleteError) throw deleteError;

      // 重新載入列表
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
