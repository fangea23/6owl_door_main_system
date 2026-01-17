import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          employee:employees!fk_devices_employees(id, name, employee_id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDevices(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  const createDevice = async (device) => {
    const { data, error } = await supabase
      .from('devices')
      .insert([device])
      .select(`
        *,
        employee:employees!fk_devices_employees(id, name, employee_id)
      `)
      .single()

    if (!error) {
      setDevices(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateDevice = async (id, updates) => {
    const { data, error } = await supabase
      .from('devices')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        employee:employees!fk_devices_employees(id, name, employee_id)
      `)
      .single()

    if (!error) {
      setDevices(prev => prev.map(d => d.id === id ? data : d))
    }
    return { data, error }
  }

  const deleteDevice = async (id) => {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id)

    if (!error) {
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
