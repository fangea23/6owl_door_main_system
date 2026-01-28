import { useState, useEffect, useCallback } from 'react'; // 建議補上 useCallback
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
/**
 * 統一的員工管理 Hook
 * 管理 public.employees 表（員工組織資訊）
 */
export const useEmployees = () => {
  const queryClient = useQueryClient();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有員工（含部門和主管資訊）
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments!employees_department_id_fkey (
            id,
            name,
            code
          ),
          supervisor:employees!supervisor_id (
            id,
            employee_id,
            name
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchEmployees();
  }, []);

  // -------------------------------------------------------------------
  // 創建新員工
  // - 有 Email 且需要發邀請 → 調用 invite-employee Edge Function
  // - 沒有 Email 或不發邀請 → 直接插入 employees 表
  // -------------------------------------------------------------------
  const createEmployee = async (employeeData, options = { sendInvite: false }) => {
    try {
      // 如果有 Email 且要發送邀請
      if (employeeData.email && options.sendInvite) {
        const { data, error } = await supabase.functions.invoke('invite-employee', {
          body: {
            email: employeeData.email,
            name: employeeData.name,
            employee_id: employeeData.employee_id,
            login_id: employeeData.login_id,
            department_id: employeeData.department_id,
            position: employeeData.position,
            role: employeeData.role,
            phone: employeeData.phone,
            mobile: employeeData.mobile
          }
        });

        if (error) {
          let errorMessage = error.message;
          try {
            if (error.context && typeof error.context.json === 'function') {
              const errorBody = await error.context.json();
              errorMessage = errorBody.error || errorMessage;
            }
          } catch (e) {
            // 解析失敗就用原始訊息
          }
          throw new Error(errorMessage);
        }

        await fetchEmployees();
        return { success: true, employee: data };
      }

      // 否則直接插入 employees 表
      const { data, error: insertError } = await supabase
        .from('employees')
        .insert({
          employee_id: employeeData.employee_id,
          login_id: employeeData.login_id || employeeData.employee_id,
          name: employeeData.name,
          email: employeeData.email || null,
          phone: employeeData.phone || null,
          mobile: employeeData.mobile || null,
          org_type: employeeData.org_type || 'headquarters',
          department_id: employeeData.department_id || null,
          store_id: employeeData.store_id || null,
          store_code: employeeData.store_code || null,
          position_code: employeeData.position_code || null,
          employment_type_new: employeeData.employment_type_new || 'fulltime',
          status: employeeData.status || 'active',
          hire_date: employeeData.hire_date || null,
          manager_id: employeeData.manager_id || null,
          bank_name: employeeData.bank_name || null,
          bank_code: employeeData.bank_code || null,
          branch_name: employeeData.branch_name || null,
          branch_code: employeeData.branch_code || null,
          bank_account: employeeData.bank_account || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchEmployees();
      return { success: true, employee: data };
    } catch (err) {
      console.error('Error creating employee:', err);
      return { success: false, error: err.message || '建立員工失敗' };
    }
  };

  // 更新員工資訊
const updateEmployee = async (employeeId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId);

      if (updateError) throw updateError;
      
      // 1. 原本的：重新載入員工列表 (本地 useState)
      await fetchEmployees();

      // 2. 【新增這行】：通知 React Query 'management_profiles' 這把鑰匙對應的資料髒了，下次要重抓
      queryClient.invalidateQueries({ queryKey: ['management_profiles'] });
      return { success: true };
    } catch (err) {
      console.error('Error updating employee:', err);
      return { success: false, error: err.message };
    }
  };

  // 軟刪除員工
  const deleteEmployee = async (employeeId) => {
    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', employeeId);

      if (deleteError) throw deleteError;
      await fetchEmployees();
      return { success: true };
    } catch (err) {
      console.error('Error deleting employee:', err);
      return { success: false, error: err.message };
    }
  };

  // 關聯員工與用戶帳號
  const linkEmployeeToUser = async (employeeId, userId) => {
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employeeId);

      if (updateError) throw updateError;
      await fetchEmployees();
      return { success: true };
    } catch (err) {
      console.error('Error linking employee to user:', err);
      return { success: false, error: err.message };
    }
  };

  // 取消關聯
  const unlinkEmployeeFromUser = async (employeeId) => {
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({ user_id: null })
        .eq('id', employeeId);

      if (updateError) throw updateError;
      await fetchEmployees();
      return { success: true };
    } catch (err) {
      console.error('Error unlinking employee:', err);
      return { success: false, error: err.message };
    }
  };

  // 篩選輔助函式
  const getEmployeesByStatus = (status) => {
    return employees.filter(emp => emp.status === status);
  };

  const getEmployeesByDepartment = (departmentId) => {
    return employees.filter(emp => emp.department_id === departmentId);
  };

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    linkEmployeeToUser,
    unlinkEmployeeFromUser,
    getEmployeesByStatus,
    getEmployeesByDepartment,
  };
};