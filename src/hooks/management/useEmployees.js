import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 統一的員工管理 Hook
 * 管理 public.employees 表（員工組織資訊）
 * * 修改重點：
 * - createEmployee 改為呼叫 'invite-employee' Edge Function
 * - 加入邀請機制的錯誤處理
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
          department:department_id (
            id,
            name,
            code
          ),
          supervisor:supervisor_id (
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
  // 修改部分開始：創建新員工 (改為發送邀請)
  // -------------------------------------------------------------------
  const createEmployee = async (employeeData) => {
    try {
      // 呼叫 Edge Function: invite-employee
      // 這會觸發：發送 Email -> 建立 Auth 帳號 -> 觸發 Database Trigger -> 寫入員工資料
      const { data, error } = await supabase.functions.invoke('invite-employee', {
        body: {
          email: employeeData.email,
          name: employeeData.name,
          employee_id: employeeData.employee_id,
          department_id: employeeData.department_id,
          position: employeeData.position,
          role: employeeData.role,
          phone: employeeData.phone,   // 記得把電話也傳過去
          mobile: employeeData.mobile
        }
      });

      if (error) {
        // 解析 Edge Function 回傳的錯誤訊息 (通常是 JSON 格式)
        let errorMessage = error.message;
        try {
           // 嘗試解析回應本體中的錯誤訊息
           if (error.context && typeof error.context.json === 'function') {
             const errorBody = await error.context.json();
             errorMessage = errorBody.error || errorMessage;
           }
        } catch (e) {
          // 解析失敗就用原始訊息
        }
        throw new Error(errorMessage);
      }

      // 成功後，重新載入列表以顯示新員工
      await fetchEmployees();

      return { success: true, employee: data };
    } catch (err) {
      console.error('Error creating/inviting employee:', err);
      return { success: false, error: err.message || '邀請發送失敗' };
    }
  };
  // -------------------------------------------------------------------
  // 修改部分結束
  // -------------------------------------------------------------------

  // 更新員工資訊 (保持不變)
  const updateEmployee = async (employeeId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', employeeId);

      if (updateError) throw updateError;

      // 重新載入列表
      await fetchEmployees();

      return { success: true };
    } catch (err) {
      console.error('Error updating employee:', err);
      return { success: false, error: err.message };
    }
  };

  // 軟刪除員工 (保持不變)
  const deleteEmployee = async (employeeId) => {
    try {
      const { error: deleteError } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', employeeId);

      if (deleteError) throw deleteError;

      // 重新載入列表
      await fetchEmployees();

      return { success: true };
    } catch (err) {
      console.error('Error deleting employee:', err);
      return { success: false, error: err.message };
    }
  };

  // 關聯員工與用戶帳號 (保持不變，雖然有了邀請功能後這個比較少用到了)
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

  // 取消關聯 (保持不變)
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

  // 根據狀態篩選
  const getEmployeesByStatus = (status) => {
    return employees.filter(emp => emp.status === status);
  };

  // 根據部門篩選
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