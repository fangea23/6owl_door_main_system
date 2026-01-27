import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * 門店租約管理 Hook
 * @param {string} storeCode - 門店代碼（選填，如果提供則只查詢該門店的租約）
 */
export function useLeases(storeCode = null) {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 載入租約資料
  const fetchLeases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('store_leases')
        .select(`
          *,
          store:stores!store_code (
            code,
            name,
            brand:brands!brand_id (
              id,
              name,
              code
            )
          )
        `)
        .order('lease_end_date', { ascending: true });

      if (storeCode) {
        query = query.eq('store_code', storeCode);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setLeases(data || []);
    } catch (err) {
      console.error('Error fetching leases:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeCode]);

  // 初始載入
  useEffect(() => {
    fetchLeases();
  }, [fetchLeases]);

  // 新增租約
  const addLease = async (leaseData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('store_leases')
        .insert({
          ...leaseData,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLeases(); // 重新載入
      return { success: true, data };
    } catch (err) {
      console.error('Error adding lease:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新租約
  const updateLease = async (id, leaseData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('store_leases')
        .update({
          ...leaseData,
          updated_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchLeases(); // 重新載入
      return { success: true, data };
    } catch (err) {
      console.error('Error updating lease:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除租約
  const deleteLease = async (id) => {
    try {
      const { error } = await supabase
        .from('store_leases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchLeases(); // 重新載入
      return { success: true };
    } catch (err) {
      console.error('Error deleting lease:', err);
      return { success: false, error: err.message };
    }
  };

  // 取得即將到期的租約
  const getExpiringLeases = (daysThreshold = 90) => {
    const today = new Date();
    return leases.filter(lease => {
      if (lease.status !== 'active') return false;
      const endDate = new Date(lease.lease_end_date);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
    });
  };

  // 取得已過期的租約
  const getExpiredLeases = () => {
    const today = new Date();
    return leases.filter(lease => {
      if (lease.status !== 'active') return false;
      const endDate = new Date(lease.lease_end_date);
      return endDate < today;
    });
  };

  return {
    leases,
    loading,
    error,
    refetch: fetchLeases,
    addLease,
    updateLease,
    deleteLease,
    getExpiringLeases,
    getExpiredLeases
  };
}

/**
 * 租約到期提醒 Hook（使用 View）
 */
export function useLeaseExpiryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_lease_expiry_alerts')
          .select('*')
          .in('alert_level', ['expired', 'warning'])
          .order('days_until_expiry', { ascending: true });

        if (error) throw error;
        setAlerts(data || []);
      } catch (err) {
        console.error('Error fetching lease alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return { alerts, loading };
}
