import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useStores(brandId = null) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('stores')
        .select(`
          *,
          brand:brands(id, name)
        `)
        .order('name', { ascending: true });

      if (brandId) {
        query = query.eq('brand_id', brandId);
      }

      const { data, error } = await query;

      if (error) throw error;
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

  const addStore = async (storeData) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .insert([storeData])
        .select(`
          *,
          brand:brands(id, name)
        `)
        .single();

      if (error) throw error;
      await fetchStores();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding store:', err);
      return { success: false, error: err.message };
    }
  };

  const updateStore = async (id, storeData) => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .update(storeData)
        .eq('id', id)
        .select(`
          *,
          brand:brands(id, name)
        `)
        .single();

      if (error) throw error;
      await fetchStores();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating store:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteStore = async (id) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchStores();
      return { success: true };
    } catch (err) {
      console.error('Error deleting store:', err);
      return { success: false, error: err.message };
    }
  };

  const toggleStoreStatus = async (id, isActive) => {
    return await updateStore(id, { is_active: isActive });
  };

  return {
    stores,
    loading,
    error,
    fetchStores,
    addStore,
    updateStore,
    deleteStore,
    toggleStoreStatus,
  };
}
