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
      // 🟢 修改：改查 View (device_details)
      // View 已經處理好跨 Schema 的員工與部門資料
      const { data, error } = await supabase
        .from('device_details') // <--- 改成 View
        .select('*')
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
    
    // Step 1: 寫入原始表格 (devices)
    const { data: insertData, error: insertError } = await supabase
      .from('devices')
      .insert([device])
      .select('id')
      .single()

    if (insertError) {
      console.error('❌ [createDevice] 新增失敗:', insertError);
      return { data: null, error: insertError }
    }

    // Step 2: 從 View 撈取完整資料 (包含員工姓名等)
    const { data: viewData, error: viewError } = await supabase
      .from('device_details')
      .select('*')
      .eq('id', insertData.id)
      .single()

    if (!viewError) {
      console.log('✅ [createDevice] 新增成功 (View):', viewData);
      setDevices(prev => [viewData, ...prev])
    }
    
    return { data: viewData, error: viewError }
  }

  const updateDevice = async (id, updates) => {
    console.log('📝 [updateDevice] 更新設備 ID:', id);

    // Step 1: 更新原始表格 (devices)
    const { error: updateError } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('❌ [updateDevice] 更新失敗:', updateError);
      return { data: null, error: updateError }
    }

    // Step 2: 從 View 撈取最新資料
    const { data: viewData, error: viewError } = await supabase
      .from('device_details')
      .select('*')
      .eq('id', id)
      .single()

    if (!viewError) {
      console.log('✅ [updateDevice] 更新成功 (View):', viewData);
      setDevices(prev => prev.map(d => d.id === id ? viewData : d))
    }
    
    return { data: viewData, error: viewError }
  }

  const deleteDevice = async (id) => {
    console.log('🗑️ [deleteDevice] 刪除設備 ID:', id);
    
    // 刪除直接操作原始表格即可
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