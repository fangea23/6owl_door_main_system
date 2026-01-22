import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export function useExpenseRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchRequests = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('expense_reimbursement_requests')
        .select(`
          *,
          applicant:employees!applicant_id(id, name, employee_id),
          items:expense_reimbursement_items(*),
          approvals:expense_approvals(*)
        `)
        .eq('applicant_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching expense requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (requestData) => {
    try {
      const { data, error: createError } = await supabase
        .from('expense_reimbursement_requests')
        .insert([{
          ...requestData,
          applicant_id: user.id,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchRequests();
      return { success: true, data };
    } catch (err) {
      console.error('Error creating expense request:', err);
      return { success: false, error: err.message };
    }
  };

  const updateRequest = async (id, requestData) => {
    try {
      const { data, error: updateError } = await supabase
        .from('expense_reimbursement_requests')
        .update(requestData)
        .eq('id', id)
        .eq('status', 'draft') // 只能更新草稿狀態
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchRequests();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating expense request:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteRequest = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('expense_reimbursement_requests')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'draft'); // 只能刪除草稿

      if (deleteError) throw deleteError;

      await fetchRequests();
      return { success: true };
    } catch (err) {
      console.error('Error deleting expense request:', err);
      return { success: false, error: err.message };
    }
  };

  const submitRequest = async (id) => {
    try {
      // 先獲取申請資料以判斷金額
      const { data: request, error: fetchError } = await supabase
        .from('expense_reimbursement_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 根據金額決定簽核流程
      const totalAmount = parseFloat(request.total_amount);
      const nextStatus = totalAmount >= 30000 ? 'pending_ceo' : 'pending_boss';

      // 更新申請狀態
      const { error: updateError } = await supabase
        .from('expense_reimbursement_requests')
        .update({
          status: nextStatus,
          submitted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchRequests();
      return { success: true };
    } catch (err) {
      console.error('Error submitting expense request:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    submitRequest,
  };
}
