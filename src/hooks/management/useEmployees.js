import { useState, useEffect, useCallback } from 'react'; // 建議補上 useCallback
import { supabase } from '../../lib/supabase';

/**
 * 統一的員工管理 Hook
 * 管理 public.employees 表（員工組織資訊）
 */
export const useEmployees = () => {
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
  // 創建新員工 (改為發送邀請)
  // -------------------------------------------------------------------
  const createEmployee = async (employeeData) => {
    try {
      // 呼叫 Edge Function: invite-employee
      const { data, error } = await supabase.functions.invoke('invite-employee', {
        body: {
          email: employeeData.email,
          name: employeeData.name,
          employee_id: employeeData.employee_id,
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
    } catch (err) {
      console.error('Error creating/inviting employee:', err);
      return { success: false, error: err.message || '邀請發送失敗' };
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
      await fetchEmployees();
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