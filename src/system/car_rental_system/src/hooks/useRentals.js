import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useRentals = (userId = null) => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取租借記錄
  const fetchRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('rentals')
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type,
            color
          ),
          request:request_id (
            id,
            purpose,
            destination
          )
        `)
        .order('created_at', { ascending: false });

      // 如果指定 userId，只獲取該用戶的租借記錄
      if (userId) {
        query = query.eq('renter_id', userId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setRentals(data || []);
    } catch (err) {
      console.error('Error fetching rentals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 創建租借記錄
  const createRental = async (rentalData) => {
    try {
      const { data, error: createError } = await supabase
        .from('rentals')
        .insert([rentalData])
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type,
            color
          )
        `)
        .single();

      if (createError) throw createError;

      // 更新車輛狀態為 rented
      if (rentalData.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'rented' })
          .eq('id', rentalData.vehicle_id);
      }

      setRentals(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error('Error creating rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新租借記錄
  const updateRental = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('rentals')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type,
            color
          )
        `)
        .single();

      if (updateError) throw updateError;

      setRentals(prev =>
        prev.map(r => r.id === id ? data : r)
      );
      return { success: true, data };
    } catch (err) {
      console.error('Error updating rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 取車（開始租借）
  const pickupVehicle = async (id, startMileage) => {
    try {
      const updates = {
        actual_start_time: new Date().toISOString(),
        start_mileage: startMileage,
        status: 'in_progress',
      };

      const result = await updateRental(id, updates);

      if (result.success && result.data.vehicle_id) {
        // 更新車輛狀態
        await supabase
          .from('vehicles')
          .update({ status: 'rented' })
          .eq('id', result.data.vehicle_id);
      }

      return result;
    } catch (err) {
      console.error('Error picking up vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 還車（完成租借）
  const returnVehicle = async (id, endMileage, returnChecklist = null) => {
    try {
      const updates = {
        actual_end_time: new Date().toISOString(),
        end_mileage: endMileage,
        status: 'completed',
      };

      if (returnChecklist) {
        updates.return_checklist = returnChecklist;
      }

      const result = await updateRental(id, updates);

      if (result.success && result.data.vehicle_id) {
        // 更新車輛狀態為可用
        await supabase
          .from('vehicles')
          .update({
            status: 'available',
            current_mileage: endMileage,
          })
          .eq('id', result.data.vehicle_id);
      }

      return result;
    } catch (err) {
      console.error('Error returning vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 取消租借
  const cancelRental = async (id) => {
    try {
      const result = await updateRental(id, { status: 'cancelled' });

      if (result.success && result.data.vehicle_id) {
        // 將車輛狀態改回可用
        await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', result.data.vehicle_id);
      }

      return result;
    } catch (err) {
      console.error('Error cancelling rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 獲取單一租借記錄
  const getRentalById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type,
            color
          ),
          request:request_id (
            id,
            purpose,
            destination,
            estimated_mileage
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 獲取進行中的租借
  const fetchActiveRentals = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select(`
          *,
          vehicle:vehicle_id (
            id,
            plate_number,
            brand,
            model,
            vehicle_type
          )
        `)
        .in('status', ['confirmed', 'in_progress'])
        .order('start_date');

      if (fetchError) throw fetchError;

      setRentals(data || []);
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching active rentals:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [userId]);

  return {
    rentals,
    loading,
    error,
    fetchRentals,
    createRental,
    updateRental,
    pickupVehicle,
    returnVehicle,
    cancelRental,
    getRentalById,
    fetchActiveRentals,
  };
};
