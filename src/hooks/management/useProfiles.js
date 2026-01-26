import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// 取得環境變數
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

/**
 * 用於 React Query 的資料抓取函式
 */
const fetchProfilesData = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const useProfiles = () => {
  const queryClient = useQueryClient();
  const QUERY_KEY = ['management_profiles']; // 定義唯一的 Query Key

  // --- 1. 讀取資料 (Query) ---
  const { 
    data: profiles = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchProfilesData,
    staleTime: 1000 * 60, // 1 分鐘內視為新鮮資料
    refetchOnWindowFocus: true, // 切換視窗回來時自動更新
  });

  // --- 2. 建立新用戶 (Mutation) ---
  // 支援兩種模式：
  // A. 傳統 Email 模式：userData.email 存在
  // B. 員工編號模式：userData.employee_id 存在，系統自動生成虛擬 email
  // 使用 Edge Function 來建立已確認的帳號，避免 email 驗證問題
  const createMutation = useMutation({
    mutationFn: async (userData) => {
      // 取得當前 session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('請先登入');
      }

      // 呼叫 Edge Function 建立帳號
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-employee-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_KEY,
        },
        body: JSON.stringify({
          employee_id: userData.employee_id || null,
          email: userData.email || null,
          password: userData.password,
          full_name: userData.full_name,
          role: userData.role || 'user',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '建立帳號失敗');
      }

      return result.user;
    },
    onSuccess: () => {
      // 成功後，讓 React Query 標記資料過期，自動觸發重新抓取
      queryClient.invalidateQueries(QUERY_KEY);
    },
  });

  // --- 3. 更新角色 (Mutation) ---
  // 同時更新 profiles.role、employees.role 和 rbac.user_roles
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      // 1. 更新 profiles 表
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      if (profileError) throw profileError;

      // 2. 更新 employees 表（如果有關聯）
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ role: newRole })
        .eq('user_id', userId);
      // employees 可能不存在該用戶，忽略錯誤
      if (employeeError && employeeError.code !== 'PGRST116') {
        console.warn('Update employee role warning:', employeeError);
      }

      // 3. 取得新角色的 role_id
      const { data: roleData, error: roleError } = await supabase
        .schema('rbac')
        .from('roles')
        .select('id')
        .eq('code', newRole)
        .is('deleted_at', null)
        .single();

      if (roleError || !roleData) {
        console.warn('Role not found in RBAC:', newRole);
        return; // 角色不存在於 RBAC，跳過
      }

      // 4. 刪除該用戶的所有舊角色
      await supabase
        .schema('rbac')
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // 5. 新增新角色
      const { error: userRoleError } = await supabase
        .schema('rbac')
        .from('user_roles')
        .insert({
          user_id: userId,
          role_id: roleData.id
        });

      if (userRoleError) {
        console.warn('Insert user_role error:', userRoleError);
      }
    },
    onSuccess: () => queryClient.invalidateQueries(QUERY_KEY),
  });

  // --- 4. 更新資訊 (Mutation) ---
  const updateInfoMutation = useMutation({
    mutationFn: async ({ userId, updates }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(QUERY_KEY),
  });

  // --- 5. 刪除用戶 (Mutation) ---
  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      // 呼叫後端 RPC
      const { error } = await supabase.rpc('delete_user_by_admin', {
        target_user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(QUERY_KEY),
  });

  // --- 6. 封裝回傳介面 (保持與原本 Hook 回傳格式一致) ---
  
  const createProfile = async (userData) => {
    try {
      const user = await createMutation.mutateAsync(userData);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateProfileRole = async (userId, newRole) => {
    try {
      await updateRoleMutation.mutateAsync({ userId, newRole });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateProfile = async (userId, updates) => {
    try {
      await updateInfoMutation.mutateAsync({ userId, updates });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteProfile = async (userId) => {
    try {
      await deleteMutation.mutateAsync(userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    profiles,
    loading,
    error: queryError?.message || null,
    refetch,
    createProfile,
    updateProfileRole,
    updateProfile,
    deleteProfile,
    // 進階：也可以直接回傳 mutation 狀態給 UI 做 loading 效果
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};