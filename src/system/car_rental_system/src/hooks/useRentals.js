import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRentals = (userId = null) => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. 獲取租借記錄 (查詢 View)
  const fetchRentals = useCallback(async () => {
    try {
      // 只有在第一次載入時設定 loading，避免 Realtime 更新時畫面閃爍
      // setLoading(true); 
      setError(null);

      // ✅ 修改: 改查 View，直接 select *
      let query = supabase
        .from('rentals_view')
        .select('*')
        .order('created_at', { ascending: false });

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
  }, [userId]);

  // 2. 初始化與 Realtime 訂閱
  useEffect(() => {
    setLoading(true);
    fetchRentals().finally(() => setLoading(false));

    // 訂閱資料庫變更 (即時更新)
    const channel = supabase
      .channel('rentals_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 監聽所有事件
          schema: 'car_rental',
          table: 'rentals',
          // 如果有 userId，過濾只監聽相關的 (選擇性)
          filter: userId ? `renter_id=eq.${userId}` : undefined
        },
        (payload) => {
          console.log('📡 租借紀錄更新:', payload);
          fetchRentals(); // 資料變動時重新撈取 View
        }
      )
      .subscribe();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [userId, fetchRentals]);

  // 3. 創建租借記錄
  const createRental = async (rentalData) => {
    try {
      // ✅ 步驟 A: 寫入原始 Table
      const { data: insertedData, error: createError } = await supabase
        .from('rentals')
        .insert([rentalData])
        .select('id')
        .single();

      if (createError) throw createError;

      // 步驟 B: 更新車輛狀態為 'rented' (如果是直接建立租借單)
      if (rentalData.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'rented' })
          .eq('id', rentalData.vehicle_id);
      }

      // ✅ 步驟 C: 從 View 讀取完整資料回傳以更新 UI
      const { data: viewData, error: viewError } = await supabase
        .from('rentals_view')
        .select('*')
        .eq('id', insertedData.id)
        .single();

      if (viewError) throw viewError;

      setRentals(prev => [viewData, ...prev]);
      return { success: true, data: viewData };
    } catch (err) {
      console.error('Error creating rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 4. 更新租借記錄 (通用函式)
  const updateRental = async (id, updates) => {
    try {
      // ✅ 步驟 A: 更新原始 Table
      const { error: updateError } = await supabase
        .from('rentals')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      // ✅ 步驟 B: 從 View 讀取完整資料
      const { data: viewData, error: viewError } = await supabase
        .from('rentals_view')
        .select('*')
        .eq('id', id)
        .single();

      if (viewError) throw viewError;

      setRentals(prev =>
        prev.map(r => r.id === id ? viewData : r)
      );
      return { success: true, data: viewData };
    } catch (err) {
      console.error('Error updating rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 5. 確認取車 (Pickup)
  const pickupVehicle = async (id, startMileage = null) => {
    try {
      // 準備更新資料
      const updates = {
        status: 'in_progress', // 狀態變更為進行中
        // 如果資料庫有 actual_start_time 欄位，建議加上這行：
        // actual_start_time: new Date().toISOString(), 
      };

      if (startMileage) {
        updates.start_mileage = startMileage;
      }

      // 更新租借單
      const result = await updateRental(id, updates);

      // 連動更新車輛狀態 -> rented
      if (result.success && result.data.vehicle_id) {
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

  // 6. 確認還車 (Return)
  const returnVehicle = async (id, endMileage = null, returnChecklist = null) => {
    try {
      // 準備更新資料
      const updates = {
        status: 'completed', // 狀態變更為已完成
        // 如果資料庫有 actual_end_time 欄位：
        // actual_end_time: new Date().toISOString(),
      };
      
      if (endMileage) {
        updates.end_mileage = endMileage;
      }

      if (returnChecklist) {
        updates.return_checklist = returnChecklist;
      }

      // 更新租借單
      const result = await updateRental(id, updates);

      // 連動更新車輛狀態 -> available (釋放車輛)
      if (result.success && result.data.vehicle_id) {
        const vehicleUpdates = { status: 'available' };
        if (endMileage) {
            vehicleUpdates.current_mileage = endMileage; // 更新車輛當前里程
        }

        await supabase
          .from('vehicles')
          .update(vehicleUpdates)
          .eq('id', result.data.vehicle_id);
      }
      return result;
    } catch (err) {
      console.error('Error returning vehicle:', err);
      return { success: false, error: err.message };
    }
  };

  // 7. 取消租借
  const cancelRental = async (id) => {
    try {
      const result = await updateRental(id, { status: 'cancelled' });
      
      // 連動更新車輛狀態 -> available (釋放車輛)
      if (result.success && result.data.vehicle_id) {
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

  // 8. 獲取單一租借記錄
  const getRentalById = async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rentals_view')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching rental:', err);
      return { success: false, error: err.message };
    }
  };

  // 9. 獲取進行中的租借 (用於檢查衝突或列表顯示)
  const fetchActiveRentals = async () => {
    try {
      // 這裡不設定 global loading，避免影響主列表
      const { data, error: fetchError } = await supabase
        .from('rentals_view')
        .select('*')
        .in('status', ['confirmed', 'in_progress'])
        .order('start_date');

      if (fetchError) throw fetchError;
      return { success: true, data };
    } catch (err) {
      console.error('Error fetching active rentals:', err);
      return { success: false, error: err.message };
    }
  };

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