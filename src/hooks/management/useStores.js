import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 門市管理 Hook
 * 管理 public.stores 表
 */
export const useStores = (brandId = null) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取門市列表
  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('stores')
        .select(`
          *,
          brand:brands (
            id,
            code,
            name
          )
        `)
        .order('brand_id', { ascending: true })
        .order('code', { ascending: true });

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setStores(data || []);
    } catch (err) {
      console.error('Error fetching stores:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // 創建門市
  const createStore = async (storeData) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert(storeData)
        .select()
        .single();

      if (error) throw error;
      await fetchStores();
      return { success: true, store: data };
    } catch (err) {
      console.error('Error creating store:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新門市
  const updateStore = async (storeId, updates) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId);

      if (error) throw error;
      await fetchStores();
      return { success: true };
    } catch (err) {
      console.error('Error updating store:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除門市（軟刪除）
  const deleteStore = async (storeId) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_active: false })
        .eq('id', storeId);

      if (error) throw error;
      await fetchStores();
      return { success: true };
    } catch (err) {
      console.error('Error deleting store:', err);
      return { success: false, error: err.message };
    }
  };

  // 依品牌分組
  const storesByBrand = stores.reduce((acc, store) => {
    const brandName = store.brand?.name || '未分類';
    if (!acc[brandName]) {
      acc[brandName] = [];
    }
    acc[brandName].push(store);
    return acc;
  }, {});

  // 統計
  const stats = {
    total: stores.length,
    active: stores.filter(s => s.is_active).length,
    direct: stores.filter(s => s.store_type === 'direct').length,
    franchise: stores.filter(s => s.store_type === 'franchise').length,
  };

  return {
    stores,
    storesByBrand,
    stats,
    loading,
    error,
    refetch: fetchStores,
    createStore,
    updateStore,
    deleteStore,
  };
};
