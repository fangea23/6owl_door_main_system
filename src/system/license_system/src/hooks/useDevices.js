import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.log('🚀 [useDevices] 開始抓取設備資料...');

    try {
      // Wrapper 會自動切換到 software_maintenance schema
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          employee:employees!fk_devices_employees(
            id, 
            name, 
            employee_id
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log(`✅ [useDevices] 成功抓取 ${data?.length} 筆設備`);
      setDevices(data || [])
    } catch (err) {
      console.error('🔥 [useDevices] 抓取失敗:', err);
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const createDevice = async (device) => {
    console.log('➕ [createDevice] 新增設備:', device);
    
    const { data, error } = await supabase
      .from('devices')
      .insert([device])
      .select(`
        *,
        employee:employees!fk_devices_employees(
          id, 
          name, 
          employee_id
        )
      `)
      .single()

    if (error) {
      console.error('❌ [createDevice] 新增失敗:', error);
    } else {
      console.log('✅ [createDevice] 新增成功:', data);
      setDevices(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateDevice = async (id, updates) => {
    console.log('📝 [updateDevice] 更新設備 ID:', id);

    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        employee:employees!fk_devices_employees(
          id, 
          name, 
          employee_id
        )
      `)
      .single()

    if (error) {
      console.error('❌ [updateDevice] 更新失敗:', error);
    } else {
      console.log('✅ [updateDevice] 更新成功:', data);
      setDevices(prev => prev.map(d => d.id === id ? data : d))
    }
    return { data, error }
  }

  const deleteDevice = async (id) => {
    console.log('🗑️ [deleteDevice] 刪除設備 ID:', id);
    
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ [deleteDevice] 刪除失敗:', error);
    } else {
      console.log('✅ [deleteDevice] 刪除成功');
      setDevices(prev => prev.filter(d => d.id !== id))
    }
    return { error }
  }

  return {
    devices,
    loading,
    error,
    fetchDevices,
    createDevice,
    updateDevice,
    deleteDevice
  }
}