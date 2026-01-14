import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有車輛
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setVehicles(data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 獲取可用車輛
  const fetchAvailableVehicles = async (startDate, endDate) => {
    try {
      setLoading(true);
      setError(null);

      // 基本查詢：狀態為 available 且未刪除
      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('status', 'available')
        .is('deleted_at', null);

      const { data, error: fetchError } = await query.order('plate_number');

      if (fetchError) throw fetchError;

      // 如果有指定日期，需要進一步過濾已被預約的車輛
      if (startDate && endDate && data) {
        const { data: conflictRentals, error: rentalError } = await supabase
          .from('rentals')
          .select('vehicle_id')
          .in('status', ['confirmed', 'in_progress'])
          .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

        if (rentalError) throw rentalError;

        const conflictVehicleIds = conflictRentals?.map(r => r.vehicle_id) || [];
        const availableData = data.filter(v => !conflictVehicleIds.includes(v.id));

        setVehicles(availableData);
      } else {
        setVehicles(data || []);
      }
    } catch (err) {
      console.error('Error fetching available vehicles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 創建車輛
  const createVehicle = async (vehicleData) => {
    try {
      const { data, error: createError } = await supabase
        .from('vehicles')
        .insert([vehicleData])
        .select()
        .single();

      if (createError) throw createError;

      setVehicles(prev => [data, ...prev]);
      return { success: true, data };
    } catch (err) {
      console.error('Error creating vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新車輛
  const updateVehicle = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setVehicles(prev =>
        prev.map(v => v.id === id ? data : v)
      );
      return { success: true, data };
    } catch (err) {
      console.error('Error updating vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 軟刪除車輛
  const deleteVehicle = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('vehicles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;

      setVehicles(prev => prev.filter(v => v.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 獲取單一車輛
  const getVehicleById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    loading,
    error,
    fetchVehicles,
    fetchAvailableVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleById,
  };
};
