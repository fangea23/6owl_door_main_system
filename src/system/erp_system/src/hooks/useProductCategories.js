import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * 品號類別 Hook
 */
export const useProductCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('erp_product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // 取得食材類別
  const foodCategories = categories.filter(c => c.is_food);

  // 取得非食材類別
  const nonFoodCategories = categories.filter(c => !c.is_food);

  return {
    categories,
    foodCategories,
    nonFoodCategories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

export default useProductCategories;
