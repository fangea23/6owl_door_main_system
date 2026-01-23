import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 督導管理 Hook
 * 管理督導與門市的指派關係
 */
export const useSupervisors = () => {
  const [supervisors, setSupervisors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unassignedStores, setUnassignedStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有督導（擁有 area_supervisor 角色的員工）
  const fetchSupervisors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 取得有 area_supervisor 角色的用戶
      const { data: supervisorData, error: supError } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          employee_id,
          name,
          email,
          mobile,
          status
        `)
        .eq('status', 'active')
        .not('user_id', 'is', null);

      if (supError) throw supError;

      // 取得每位督導的門市指派
      const supervisorsWithAssignments = await Promise.all(
        (supervisorData || []).map(async (sup) => {
          const { data: storeAssignments } = await supabase
            .from('user_store_assignments')
            .select(`
              id,
              store_id,
              assignment_type,
              assigned_at,
              store:stores (
                id,
                code,
                name,
                brand:brands (
                  id,
                  code,
                  name
                )
              )
            `)
            .eq('user_id', sup.user_id)
            .eq('assignment_type', 'supervisor');

          return {
            ...sup,
            store_assignments: storeAssignments || [],
            store_count: (storeAssignments || []).length,
          };
        })
      );

      // 只保留有督導指派的
      const actualSupervisors = supervisorsWithAssignments.filter(
        s => s.store_count > 0
      );

      setSupervisors(actualSupervisors);

      // 取得未指派督導的門市
      const { data: unassigned, error: unassignedError } = await supabase
        .rpc('get_unassigned_stores');

      if (!unassignedError) {
        setUnassignedStores(unassigned || []);
      }

    } catch (err) {
      console.error('Error fetching supervisors:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  // 指派門市給督導
  const assignStoresToSupervisor = async (supervisorUserId, storeIds) => {
    try {
      // 批次插入
      const insertData = storeIds.map(storeId => ({
        user_id: supervisorUserId,
        store_id: storeId,
        assignment_type: 'supervisor',
      }));

      const { error } = await supabase
        .from('user_store_assignments')
        .upsert(insertData, {
          onConflict: 'user_id,store_id,assignment_type',
        });

      if (error) throw error;
      await fetchSupervisors();
      return { success: true };
    } catch (err) {
      console.error('Error assigning stores:', err);
      return { success: false, error: err.message };
    }
  };

  // 移除督導的門市指派
  const removeStoresFromSupervisor = async (supervisorUserId, storeIds) => {
    try {
      const { error } = await supabase
        .from('user_store_assignments')
        .delete()
        .eq('user_id', supervisorUserId)
        .eq('assignment_type', 'supervisor')
        .in('store_id', storeIds);

      if (error) throw error;
      await fetchSupervisors();
      return { success: true };
    } catch (err) {
      console.error('Error removing stores:', err);
      return { success: false, error: err.message };
    }
  };

  // 取得門市的督導
  const getStoreSupervisor = async (storeId) => {
    try {
      const { data, error } = await supabase
        .from('user_store_assignments')
        .select(`
          user_id,
          employee:employees!user_id (
            id,
            name,
            employee_id
          )
        `)
        .eq('store_id', storeId)
        .eq('assignment_type', 'supervisor')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, supervisor: data };
    } catch (err) {
      console.error('Error getting store supervisor:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    supervisors,
    unassignedStores,
    loading,
    error,
    refetch: fetchSupervisors,
    assignStoresToSupervisor,
    removeStoresFromSupervisor,
    getStoreSupervisor,
  };
};
