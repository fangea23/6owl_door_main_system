import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 統一的當前用戶資訊 Hook
 * 使用 employees_with_details VIEW 獲取完整資訊
 *
 * 返回優先順序：
 * - name: employees.name > profiles.full_name > email
 * - avatar: employees.avatar_url > profiles.avatar_url > null
 * - 包含完整的 profile 和 employee 資訊
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 獲取認證用戶
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authUser) {
        setUser(null);
        return;
      }

      // 2. 獲取 profile 資料
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // 3. 獲取 employee 詳細資料（使用 VIEW）
      const { data: employee, error: employeeError } = await supabase
        .from('employees_with_details')
        .select('*')
        .eq('user_id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle(); // 使用 maybeSingle 而不是 single，因為可能沒有員工記錄

      // 如果有錯誤但不是找不到記錄的錯誤，拋出
      if (employeeError && employeeError.code !== 'PGRST116') {
        console.error('Employee fetch error:', employeeError);
      }

      // 4. 組合完整用戶資訊
      const fullUser = {
        // 認證資訊
        id: authUser.id,
        email: authUser.email,

        // Profile 資訊
        profile: profile || {},

        // Employee 資訊（可能為 null）
        employee: employee || null,

        // 智能顯示名稱（優先順序: employee.name > profile.full_name > email）
        displayName: employee?.name || profile?.full_name || authUser.email,

        // 智能頭像 URL（優先順序: employee.avatar_url > profile.avatar_url）
        avatarUrl: employee?.avatar_url || profile?.avatar_url || null,

        // 角色資訊（優先使用 employee.role，次選 profile.role）
        role: employee?.role || profile?.role || 'user',

        // 部門資訊（來自 employee）
        department: employee?.department_name || null,
        departmentCode: employee?.department_code || null,
        departmentId: employee?.department_id || null,

        // 職位資訊
        position: employee?.position || null,
        jobTitle: employee?.job_title || null,

        // 聯絡資訊
        phone: employee?.phone || null,
        mobile: employee?.mobile || null,

        // 狀態
        status: employee?.status || 'active',
        isActive: employee?.is_active ?? true,

        // 員工編號
        employeeId: employee?.employee_id || null,

        // 主管資訊
        supervisor: employee?.supervisor_name || null,

        // 完整性檢查
        hasEmployeeRecord: !!employee,
        isProfileComplete: !!(profile?.full_name),
      };

      setUser(fullUser);
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCurrentUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchCurrentUser,

    // 便捷方法
    isAdmin: user?.role === 'admin',
    isHR: user?.role === 'hr',
    isManager: user?.role === 'manager',
    canManage: ['admin', 'hr'].includes(user?.role),
  };
};

/**
 * 簡化版 Hook - 僅用於顯示用戶基本資訊
 * 適合在 Header 等輕量組件中使用
 */
export const useUserDisplay = () => {
  const { user, loading } = useCurrentUser();

  return {
    displayName: user?.displayName || '訪客',
    avatarUrl: user?.avatarUrl,
    role: user?.role || 'user',
    initials: user?.displayName?.[0] || '?',
    loading,
  };
};
