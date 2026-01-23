import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * 品牌管理 Hook
 * 管理 public.brands 表
 */
export const useBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 獲取所有品牌
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('brands')
        .select('*')
        .order('code', { ascending: true });

      if (fetchError) throw fetchError;
      setBrands(data || []);
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // 創建品牌
  const createBrand = async (brandData) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single();

      if (error) throw error;
      await fetchBrands();
      return { success: true, brand: data };
    } catch (err) {
      console.error('Error creating brand:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新品牌
  const updateBrand = async (brandId, updates) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', brandId);

      if (error) throw error;
      await fetchBrands();
      return { success: true };
    } catch (err) {
      console.error('Error updating brand:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除品牌
  const deleteBrand = async (brandId) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId);

      if (error) throw error;
      await fetchBrands();
      return { success: true };
    } catch (err) {
      console.error('Error deleting brand:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    brands,
    loading,
    error,
    refetch: fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
  };
};
