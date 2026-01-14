import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 統一的部門管理 Hook
 * 管理 public.departments 表
 */
export const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有部門（含主管和上級部門資訊）
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('departments')
        .select(`
          *,
          manager:manager_id (
            id,
            employee_id,
            name,
            email
          ),
          parent_department:parent_department_id (
            id,
            name,
            code
          )
        `)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    fetchDepartments();
  }, []);

  // 創建新部門
  const createDepartment = async (departmentData) => {
    try {
      const { data, error: insertError } = await supabase
        .from('departments')
        .insert([departmentData])
        .select()
        .single();

      if (insertError) throw insertError;

      // 重新載入列表
      await fetchDepartments();

      return { success: true, department: data };
    } catch (err) {
      console.error('Error creating department:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新部門資訊
  const updateDepartment = async (departmentId, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', departmentId);

      if (updateError) throw updateError;

      // 重新載入列表
      await fetchDepartments();

      return { success: true };
    } catch (err) {
      console.error('Error updating department:', err);
      return { success: false, error: err.message };
    }
  };

  // 軟刪除部門
  const deleteDepartment = async (departmentId) => {
    try {
      const { error: deleteError } = await supabase
        .from('departments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', departmentId);

      if (deleteError) throw deleteError;

      // 重新載入列表
      await fetchDepartments();

      return { success: true };
    } catch (err) {
      console.error('Error deleting department:', err);
      return { success: false, error: err.message };
    }
  };

  // 設定部門主管
  const setDepartmentManager = async (departmentId, managerId) => {
    try {
      const { error: updateError } = await supabase
        .from('departments')
        .update({ manager_id: managerId })
        .eq('id', departmentId);

      if (updateError) throw updateError;

      // 重新載入列表
      await fetchDepartments();

      return { success: true };
    } catch (err) {
      console.error('Error setting department manager:', err);
      return { success: false, error: err.message };
    }
  };

  // 獲取啟用的部門
  const getActiveDepartments = () => {
    return departments.filter(dept => dept.is_active);
  };

  // 獲取頂層部門（沒有上級部門）
  const getTopLevelDepartments = () => {
    return departments.filter(dept => !dept.parent_department_id);
  };

  // 獲取特定部門的子部門
  const getSubDepartments = (parentId) => {
    return departments.filter(dept => dept.parent_department_id === parentId);
  };

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    setDepartmentManager,
    getActiveDepartments,
    getTopLevelDepartments,
    getSubDepartments,
  };
};
