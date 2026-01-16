import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
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

  const addBrand = async (brandData) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([brandData])
        .select()
        .single();

      if (error) throw error;
      await fetchBrands();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding brand:', err);
      return { success: false, error: err.message };
    }
  };

  const updateBrand = async (id, brandData) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .update(brandData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchBrands();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating brand:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteBrand = async (id) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

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
    fetchBrands,
    addBrand,
    updateBrand,
    deleteBrand,
  };
}
