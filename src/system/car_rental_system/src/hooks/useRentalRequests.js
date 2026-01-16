import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRentalRequests = (userId = null) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取租借申請（可選擇只獲取特定用戶的申請）
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('rental_requests')
        .select(`
          *,
          vehicle:vehicles!vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type
          ),
          requester:employees!requester_id (
            id,
            employee_id,
            name,
            email,
            phone,
            department:departments!department_id (
              id,
              name
            ),
            position
          ),
          reviewer:employees!reviewer_id (
            id,
            employee_id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      // 如果指定 userId，只獲取該用戶的申請
      if (userId) {
        query = query.eq('requester_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching rental requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 創建租借申請
  const createRequest = async (requestData) => {
    try {
      const { data, error: createError } = await supabase
        .from('rental_requests')
        .insert([requestData])
        .select(`
          *,
          vehicle:vehicles!vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type
          ),
          requester:employees!requester_id (
            id,
            employee_id,
            name,
            email,
            phone,
            department:departments!department_id (
              id,
              name
            ),
            position
          )
        `)
        .single();

      if (createError) throw createError;

      setRequests(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error('Error creating rental request:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新申請
  const updateRequest = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('rental_requests')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicles!vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type
          )
        `)
        .single();

      if (updateError) throw updateError;

      setRequests(prev =>
        prev.map(r => r.id === id ? data : r)
      );
      return { success: true, data };
    } catch (err) {
      console.error('Error updating rental request:', err);
      return { success: false, error: err.message };
    }
  };

  // 審核申請
  const reviewRequest = async (id, status, reviewerId, comment = '') => {
    try {
      const updates = {
        status,
        reviewer_id: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
      };

      const { data, error: updateError } = await supabase
        .from('rental_requests')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicles!vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type
          )
        `)
        .single();

      if (updateError) throw updateError;

      // 如果審核通過，自動創建租借記錄
      if (status === 'approved' && data.vehicle_id) {
        await createRentalFromRequest(data);
      }

      setRequests(prev =>
        prev.map(r => r.id === id ? data : r)
      );
      return { success: true, data };
    } catch (err) {
      console.error('Error reviewing rental request:', err);
      return { success: false, error: err.message };
    }
  };

  // 從申請創建租借記錄
  const createRentalFromRequest = async (request) => {
    try {
      const rentalData = {
        request_id: request.id,
        vehicle_id: request.vehicle_id,
        renter_id: request.requester_id,
        start_date: request.start_date,
        end_date: request.end_date,
        status: 'confirmed',
      };

      const { error: createError } = await supabase
        .from('rentals')
        .insert([rentalData]);

      if (createError) throw createError;

      return { success: true };
    } catch (err) {
      console.error('Error creating rental from request:', err);
      return { success: false, error: err.message };
    }
  };

  // 取消申請
  const cancelRequest = async (id) => {
    return await updateRequest(id, { status: 'cancelled' });
  };

  // 獲取單一申請
  const getRequestById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rental_requests')
        .select(`
          *,
          vehicle:vehicles!vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type,
            color
          ),
          requester:employees!requester_id (
            id,
            employee_id,
            name,
            email,
            phone,
            department:departments!department_id (
              id,
              name
            ),
            position
          ),
          reviewer:employees!reviewer_id (
            id,
            employee_id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching rental request:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userId]);

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
