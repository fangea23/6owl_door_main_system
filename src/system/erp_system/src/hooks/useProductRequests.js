import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * 品號申請單 Hook
 */
export const useProductRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取申請單列表
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('erp_product_requests')
        .select(`
          *,
          items:erp_product_request_items(*),
          applicant:employees!erp_product_requests_applicant_id_fkey(
            id, employee_id, name, department_id
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // 產生申請單號
  const generateRequestNumber = async () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PR-${dateStr}-`;

    // 查詢今天最大的單號
    const { data } = await supabase
      .from('erp_product_requests')
      .select('request_number')
      .like('request_number', `${prefix}%`)
      .order('request_number', { ascending: false })
      .limit(1);

    let seq = 1;
    if (data && data.length > 0) {
      const lastNum = data[0].request_number;
      const lastSeq = parseInt(lastNum.split('-').pop(), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(3, '0')}`;
  };

  // 建立申請單
  const createRequest = async (requestData, items) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('請先登入');

      const requestNumber = await generateRequestNumber();

      // 建立申請單
      const { data: request, error: requestError } = await supabase
        .from('erp_product_requests')
        .insert({
          request_number: requestNumber,
          request_type: requestData.request_type,
          applicant_id: user.id,
          applicant_department_id: requestData.department_id || null,
          companies: requestData.companies || [],
          status: 'pending_purchasing',
          remarks: requestData.remarks || null,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // 建立明細
      if (items && items.length > 0) {
        const itemsToInsert = items.map((item, index) => ({
          request_id: request.id,
          product_code: item.product_code || null,
          product_name: item.product_name,
          specification: item.specification || null,
          unit: item.unit || null,
          supplier_name: item.supplier_name || null,
          supplier_id: item.supplier_id || null,
          is_food: item.is_food ?? true,
          category_code: item.category_code || null,
          inventory_managed: item.inventory_managed ?? true,
          delivery_method: item.delivery_method || 'warehouse',
          tax_type: item.tax_type || 'tax_excluded',
          storage_method: item.storage_method || 'room_temp',
          original_product_id: item.original_product_id || null,
          sort_order: index,
        }));

        const { error: itemsError } = await supabase
          .from('erp_product_request_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchRequests();
      return { success: true, request };
    } catch (err) {
      console.error('Error creating request:', err);
      return { success: false, error: err.message };
    }
  };

  // 簽核申請單
  const approveRequest = async (requestId, stage, action, comments = '') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('請先登入');

      // 取得當前申請單
      const { data: request, error: fetchError } = await supabase
        .from('erp_product_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // 驗證狀態
      const stageMap = {
        purchasing: 'pending_purchasing',
        dept_manager: 'pending_dept_manager',
        review: 'pending_review',
        create: 'pending_create',
      };

      if (request.status !== stageMap[stage]) {
        throw new Error('申請單狀態不符，無法簽核');
      }

      // 記錄簽核
      const { error: approvalError } = await supabase
        .from('erp_product_request_approvals')
        .insert({
          request_id: requestId,
          approval_stage: stage,
          action: action,
          approver_id: user.id,
          comments: comments || null,
        });

      if (approvalError) throw approvalError;

      // 更新申請單狀態
      let updateData = {};

      if (action === 'reject') {
        updateData = {
          status: 'rejected',
          rejection_reason: comments,
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
        };
      } else {
        // 核准 - 進入下一關
        const nextStageMap = {
          purchasing: 'pending_dept_manager',
          dept_manager: 'pending_review',
          review: 'pending_create',
          create: 'completed',
        };

        const approvedFields = {
          purchasing: { purchasing_approved_at: new Date().toISOString(), purchasing_approved_by: user.id },
          dept_manager: { dept_manager_approved_at: new Date().toISOString(), dept_manager_approved_by: user.id },
          review: { review_approved_at: new Date().toISOString(), review_approved_by: user.id },
          create: { created_approved_at: new Date().toISOString(), created_approved_by: user.id },
        };

        updateData = {
          status: nextStageMap[stage],
          ...approvedFields[stage],
        };
      }

      const { error: updateError } = await supabase
        .from('erp_product_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      await fetchRequests();
      return { success: true };
    } catch (err) {
      console.error('Error approving request:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    requests,
    loading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
  };
};

export default useProductRequests;
