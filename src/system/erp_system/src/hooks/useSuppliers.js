import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * 廠商管理 Hook
 */
export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('erp_suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;
      setSuppliers(data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const createSupplier = async (supplierData) => {
    try {
      const { data, error } = await supabase
        .from('erp_suppliers')
        .insert(supplierData)
        .select()
        .single();

      if (error) throw error;
      await fetchSuppliers();
      return { success: true, supplier: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateSupplier = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('erp_suppliers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchSuppliers();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    suppliers,
    loading,
    error,
    refetch: fetchSuppliers,
    createSupplier,
    updateSupplier,
  };
};

export default useSuppliers;
