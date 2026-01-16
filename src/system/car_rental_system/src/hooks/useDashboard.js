import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useDashboard = () => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    maintenanceVehicles: 0,
    pendingRequests: 0,
    activeRentals: 0,
    completedRentalsThisMonth: 0,
    upcomingRentals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // 並行查詢所有統計資料
      const [
        vehiclesResult,
        requestsResult,
        rentalsResult,
      ] = await Promise.all([
        // 車輛統計
        supabase
          .from('vehicles')
          .select('status', { count: 'exact' })
          .is('deleted_at', null),

        // 待審核申請
        supabase
          .from('rental_requests')
          .select('id', { count: 'exact' })
          .eq('status', 'pending'),

        // 租借記錄
        supabase
          .from('rentals')
          .select('status, created_at, start_date', { count: 'exact' }),
      ]);

      if (vehiclesResult.error) throw vehiclesResult.error;
      if (requestsResult.error) throw requestsResult.error;
      if (rentalsResult.error) throw rentalsResult.error;

      // 處理車輛統計
      const vehicles = vehiclesResult.data || [];
      const totalVehicles = vehicles.length;
      const availableVehicles = vehicles.filter(v => v.status === 'available').length;
      const rentedVehicles = vehicles.filter(v => v.status === 'rented').length;
      const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;

      // 待審核申請數
      const pendingRequests = requestsResult.count || 0;

      // 處理租借統計
      const rentals = rentalsResult.data || [];
      const activeRentals = rentals.filter(r =>
        ['confirmed', 'in_progress'].includes(r.status)
      ).length;

      // 本月完成的租借
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const completedRentalsThisMonth = rentals.filter(r =>
        r.status === 'completed' &&
        new Date(r.created_at) >= startOfMonth
      ).length;

      // 即將到來的租借（未來7天內）
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const upcomingRentals = rentals.filter(r => {
        const startDate = new Date(r.start_date);
        return r.status === 'confirmed' &&
               startDate >= now &&
               startDate <= weekFromNow;
      }).length;

      setStats({
        totalVehicles,
        availableVehicles,
        rentedVehicles,
        maintenanceVehicles,
        pendingRequests,
        activeRentals,
        completedRentalsThisMonth,
        upcomingRentals,
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 獲取近期活動
  const fetchRecentActivities = async (limit = 10) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select(`
          id,
          created_at,
          status,
          renter_name,
          vehicle:vehicles!vehicle_id (
            plate_number,
            brand,
            model
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  return {
    stats,
    loading,
    error,
    fetchDashboardStats,
    fetchRecentActivities,
  };
};
