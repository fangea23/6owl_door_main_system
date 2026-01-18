import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export const useRentalRequests = (userId = null) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. 獲取租借申請 (使用 useCallback 以便在 useEffect 中依賴)
  const fetchRequests = useCallback(async () => {
    try {
      // 不設定 setLoading(true) 以免 Realtime 更新時畫面閃爍
      // 僅在第一次載入時由 useEffect 控制 loading
      setError(null);

      let query = supabase
        .from('rental_requests_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('requester_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching rental requests:', err);
      setError(err.message);
    }
  }, [userId]);

  // 2. 初始化與 Realtime 訂閱
useEffect(() => {
    // 初始載入
    setLoading(true);
    fetchRequests().finally(() => setLoading(false));

    // ✅ 修正點：定義 channel 變數以便後續操作
    const channel = supabase
      .channel('rental_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'car_rental',
          table: 'rental_requests',
          filter: userId ? `requester_id=eq.${userId}` : undefined
        },
        (payload) => {
          console.log('📡 收到更新:', payload);
          fetchRequests();
        }
      )
      .subscribe();

    // ✅ 修正點：正確的取消訂閱方式
    // 不使用 supabase.removeChannel(subscription)，而是直接用 channel.unsubscribe()
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [userId, fetchRequests]);

  // 3. 創建租借申請
  const createRequest = async (requestData) => {
    try {
      // A. 寫入原始 Table
      const { data: insertedData, error: createError } = await supabase
        .from('rental_requests')
        .insert([requestData])
        .select('id')
        .single();

      if (createError) throw createError;

      // B. 寫入後，從 View 撈取完整資料更新 UI (雖然 Realtime 會跑，但手動更新反應較快)
      const { data: viewData, error: viewError } = await supabase
        .from('rental_requests_view')
        .select('*')
        .eq('id', insertedData.id)
        .single();

      if (viewError) throw viewError;

      setRequests(prev => [viewData, ...prev]);
      return { success: true, data: viewData };
    } catch (err) {
      console.error('Error creating rental request:', err);
      return { success: false, error: err.message };
    }
  };

  // 4. 更新申請 (通用)
  const updateRequest = async (id, updates) => {
    try {
      const { error: updateError } = await supabase
        .from('rental_requests')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // 更新 UI (Realtime 會處理，但為了即時回饋先做一次)
      const { data: viewData } = await supabase
        .from('rental_requests_view')
        .select('*')
        .eq('id', id)
        .single();

      if (viewData) {
        setRequests(prev => prev.map(r => r.id === id ? viewData : r));
      }
      return { success: true, data: viewData };
    } catch (err) {
      console.error('Error updating request:', err);
      return { success: false, error: err.message };
    }
  };

  // 5. 審核申請 (整合 RPC)
  const reviewRequest = async (id, status, reviewerId, comment = '') => {
    try {
      let resultData = null;

      if (status === 'approved') {
        // 核准：走 RPC 交易 (檢查車輛 + 建立租借單)
        const { error } = await supabase.rpc('approve_rental_request', {
          p_request_id: id,
          p_reviewer_id: reviewerId,
          p_review_comment: comment
        });

        if (error) throw new Error(error.message || '核准失敗');

      } else {
        // 拒絕：走一般更新 (加上樂觀鎖)
        const updates = {
          status,
          reviewer_id: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_comment: comment,
        };

        const { error } = await supabase
          .from('rental_requests')
          .update(updates)
          .eq('id', id)
          .eq('status', 'pending'); // 確保狀態沒被改過

        if (error) {
           if (error.code === 'PGRST116') throw new Error('操作失敗：申請單狀態已變更。');
           throw error;
        }
      }

      // 重新讀取最新狀態
      const { data: viewData } = await supabase
        .from('rental_requests_view')
        .select('*')
        .eq('id', id)
        .single();
        
      if (viewData) {
        setRequests(prev => prev.map(r => r.id === id ? viewData : r));
        resultData = viewData;
      }

      return { success: true, data: resultData };

    } catch (err) {
      console.error('Error reviewing request:', err);
      return { success: false, error: err.message };
    }
  };

  // 6. 取消申請 (智慧判斷：待審核 vs 已核准)
  const cancelRequest = async (id) => {
    try {
      // 先查詢目前這筆申請的狀態
      const { data: currentRequest, error: fetchError } = await supabase
        .from('rental_requests')
        .select('status')
        .eq('id', id)
        .single();

      if (fetchError || !currentRequest) throw new Error('找不到該申請單');

      // 情境 A: 狀態是 approved (已核准) -> 走複雜取消流程 (釋放車輛)
      if (currentRequest.status === 'approved') {
        const { error } = await supabase.rpc('cancel_approved_request', {
          p_request_id: id
        });
        if (error) throw error;
      }
      // 情境 B: 狀態是 pending (待審核) -> 直接改狀態
      else if (currentRequest.status === 'pending') {
        const { error } = await supabase
          .from('rental_requests')
          .update({ status: 'cancelled' })
          .eq('id', id);
        if (error) throw error;
      } 
      // 情境 C: 其他狀態 (已完成/已取消) -> 不可取消
      else {
        throw new Error('無法取消：該申請已完成或已取消');
      }

      // 成功後更新 UI
      const { data: viewData } = await supabase
        .from('rental_requests_view')
        .select('*')
        .eq('id', id)
        .single();

      if (viewData) {
        setRequests(prev => prev.map(r => r.id === id ? viewData : r));
      }

      return { success: true };

    } catch (err) {
      console.error('Error cancelling request:', err);
      return { success: false, error: err.message };
    }
  };

  // 7. 獲取單一申請
  const getRequestById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rental_requests_view')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching request:', err);
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
    reviewRequest,
    cancelRequest,
    getRequestById,
  };
};