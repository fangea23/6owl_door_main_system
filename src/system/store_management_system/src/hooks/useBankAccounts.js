import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * 門市銀行帳戶管理 Hook
 * @param {number} storeCode - 門市代碼
 */
export function useBankAccounts(storeCode) {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 取得門市的銀行帳戶
  const fetchBankAccounts = useCallback(async () => {
    if (!storeCode) {
      setBankAccounts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('store_bank_accounts')
        .select('*')
        .eq('store_id', storeCode)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setBankAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [storeCode]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  // 新增銀行帳戶
  const addBankAccount = async (accountData) => {
    try {
      const { data, error } = await supabase
        .from('store_bank_accounts')
        .insert([{
          ...accountData,
          store_id: storeCode
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchBankAccounts();
      return { success: true, data };
    } catch (err) {
      console.error('Error adding bank account:', err);
      return { success: false, error: err.message };
    }
  };

  // 更新銀行帳戶
  const updateBankAccount = async (id, accountData) => {
    try {
      const { data, error } = await supabase
        .from('store_bank_accounts')
        .update(accountData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchBankAccounts();
      return { success: true, data };
    } catch (err) {
      console.error('Error updating bank account:', err);
      return { success: false, error: err.message };
    }
  };

  // 刪除銀行帳戶（軟刪除）
  const deleteBankAccount = async (id) => {
    try {
      const { error } = await supabase
        .from('store_bank_accounts')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchBankAccounts();
      return { success: true };
    } catch (err) {
      console.error('Error deleting bank account:', err);
      return { success: false, error: err.message };
    }
  };

  // 設為預設帳戶
  const setDefaultAccount = async (id) => {
    try {
      const { error } = await supabase
        .from('store_bank_accounts')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      await fetchBankAccounts();
      return { success: true };
    } catch (err) {
      console.error('Error setting default account:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    bankAccounts,
    loading,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultAccount,
    refreshBankAccounts: fetchBankAccounts
  };
}
