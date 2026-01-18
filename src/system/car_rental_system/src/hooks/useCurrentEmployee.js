import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to get current employee information
 * 根據當前登入用戶獲取員工資訊
 */
export const useCurrentEmployee = () => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentEmployee();
  }, []);

  const fetchCurrentEmployee = async () => {
    try {
      setLoading(true);
      setError(null);

      // 獲取當前登入用戶
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setEmployee(null);
        return;
      }

      // 從 public.employees 查詢員工資訊
      const { data, error: fetchError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_id,
          name,
          email,
          phone,
          department:departments!employees_department_id_fkey (
            id,
            name,
            code
          ),
          position,
          role,
          status
        `) 
        // 👆 修改重點：加上 !employees_department_id_fkey
        // 這是 Postgres 預設的標準命名，也是我們資料庫整理後保留的名稱
        .eq('user_id', user.id)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();

      if (fetchError) {
        // 如果找不到員工記錄，這是正常的（可能還沒建立員工資料）
        if (fetchError.code === 'PGRST116') {
          console.warn('No employee record found for current user');
          setEmployee(null);
          return;
        }
        throw fetchError;
      }

      setEmployee(data);
    } catch (err) {
      console.error('Error fetching current employee:', err);
      setError(err.message);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  };

  return {
    employee,
    loading,
    error,
    refetch: fetchCurrentEmployee,
    isAdmin: employee?.role === 'admin' || employee?.role === 'hr',
  };
};