import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// 保險類型對照
export const INSURANCE_TYPES = {
  fire: { label: '火災險', color: 'red', icon: '🔥' },
  liability: { label: '公共意外責任險', color: 'blue', icon: '🛡️' },
  theft: { label: '竊盜險', color: 'purple', icon: '🔒' },
  equipment: { label: '設備綜合險', color: 'amber', icon: '🔧' },
  business_interruption: { label: '營業中斷險', color: 'orange', icon: '⏸️' },
  employee: { label: '員工團體險', color: 'green', icon: '👥' },
  other: { label: '其他', color: 'stone', icon: '📋' }
};

// 付款頻率對照
export const PAYMENT_FREQUENCIES = {
  monthly: '每月',
  quarterly: '每季',
  yearly: '每年'
};

/**
 * 門店保險管理 Hook
 * @param {string} storeCode - 門店代碼（選填，如果提供則只查詢該門店的保險）
 */
export function useInsurances(storeCode = null) {
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 載入保險資料
  const fetchInsurances = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('store_insurances')
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
        .order('end_date', { ascending: true });

      if (storeCode) {
        query = query.eq('store_code', storeCode);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setInsurances(data || []);
    } catch (err) {
      console.error('Error fetching insurances:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeCode]);

  // 初始載入
  useEffect(() => {
    fetchInsurances();
  }, [fetchInsurances]);

  // 新增保險
  const addInsurance = async (insuranceData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('store_insurances')
        .insert({
          ...insuranceData,
          created_by: user?.id,
          updated_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInsurances(); // 重新載入
      return { success: true, data };
    } catch (err) {
      console.error('Error adding insurance:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新保險
  const updateInsurance = async (id, insuranceData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('store_insurances')
        .update({
          ...insuranceData,
          updated_by: user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchInsurances(); // 重新載入
      return { success: true, data };
    } catch (err) {
      console.error('Error updating insurance:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除保險
  const deleteInsurance = async (id) => {
    try {
      const { error } = await supabase
        .from('store_insurances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchInsurances(); // 重新載入
      return { success: true };
    } catch (err) {
      console.error('Error deleting insurance:', err);
      return { success: false, error: err.message };
    }
  };

  // 取得即將到期的保險
  const getExpiringInsurances = (daysThreshold = 30) => {
    const today = new Date();
    return insurances.filter(insurance => {
      if (insurance.status !== 'active') return false;
      const endDate = new Date(insurance.end_date);
      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= daysThreshold && daysUntilExpiry >= 0;
    });
  };

  // 取得已過期的保險
  const getExpiredInsurances = () => {
    const today = new Date();
    return insurances.filter(insurance => {
      if (insurance.status !== 'active') return false;
      const endDate = new Date(insurance.end_date);
      return endDate < today;
    });
  };

  // 依保險類型分組
  const getInsurancesByType = () => {
    return insurances.reduce((acc, insurance) => {
      const type = insurance.insurance_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(insurance);
      return acc;
    }, {});
  };

  return {
    insurances,
    loading,
    error,
    refetch: fetchInsurances,
    addInsurance,
    updateInsurance,
    deleteInsurance,
    getExpiringInsurances,
    getExpiredInsurances,
    getInsurancesByType
  };
}

/**
 * 保險到期提醒 Hook（使用 View）
 */
export function useInsuranceExpiryAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('v_insurance_expiry_alerts')
          .select('*')
          .in('alert_level', ['expired', 'warning'])
          .order('days_until_expiry', { ascending: true });

        if (error) throw error;
        setAlerts(data || []);
      } catch (err) {
        console.error('Error fetching insurance alerts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  return { alerts, loading };
}
