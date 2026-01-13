import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSoftware() {
  const [software, setSoftware] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSoftware = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('software')
        .select(`
          *,
          vendor:vendors(id, name, website)
        `)
        .order('category')
        .order('name')

      if (error) throw error
      setSoftware(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSoftware()
  }, [fetchSoftware])

  const createSoftware = async (item) => {
    const { data, error } = await supabase
      .from('software')
      .insert([item])
      .select(`
        *,
        vendor:vendors(id, name, website)
      `)
      .single()

    if (!error) {
      setSoftware(prev => [...prev, data])
    }
    return { data, error }
  }

  const updateSoftware = async (id, updates) => {
    const { data, error } = await supabase
      .from('software')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        vendor:vendors(id, name, website)
      `)
      .single()

    if (!error) {
      setSoftware(prev => prev.map(s => s.id === id ? data : s))
    }
    return { data, error }
  }

  const deleteSoftware = async (id) => {
    const { error } = await supabase
      .from('software')
      .delete()
      .eq('id', id)

    if (!error) {
      setSoftware(prev => prev.filter(s => s.id !== id))
    }
    return { error }
  }

  return {
    software,
    loading,
    error,
    fetchSoftware,
    createSoftware,
    updateSoftware,
    deleteSoftware
  }
}

export function useVendors() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVendors = async () => {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .order('name')

      setVendors(data || [])
      setLoading(false)
    }

    fetchVendors()
  }, [])

  const createVendor = async (vendor) => {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendor])
      .select()
      .single()

    if (!error) {
      setVendors(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    return { data, error }
  }

  return { vendors, loading, createVendor }
}
