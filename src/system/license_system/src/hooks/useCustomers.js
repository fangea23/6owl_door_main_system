import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const createCustomer = async (customer) => {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single()

    if (!error) {
      setCustomers(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateCustomer = async (id, updates) => {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (!error) {
      setCustomers(prev => prev.map(c => c.id === id ? data : c))
    }
    return { data, error }
  }

  const deleteCustomer = async (id) => {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (!error) {
      setCustomers(prev => prev.filter(c => c.id !== id))
    }
    return { error }
  }

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
  }
}
