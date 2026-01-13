import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEmployees(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const createEmployee = async (employee) => {
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select(`
        *,
        department:departments(id, name)
      `)
      .single()

    if (!error) {
      setEmployees(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateEmployee = async (id, updates) => {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name)
      `)
      .single()

    if (!error) {
      setEmployees(prev => prev.map(e => e.id === id ? data : e))
    }
    return { data, error }
  }

  const deleteEmployee = async (id) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (!error) {
      setEmployees(prev => prev.filter(e => e.id !== id))
    }
    return { error }
  }

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee
  }
}

export function useDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setDepartments(data || [])
      setLoading(false)
    }

    fetchDepartments()
  }, [])

  const createDepartment = async (department) => {
    const { data, error } = await supabase
      .from('departments')
      .insert([department])
      .select()
      .single()

    if (!error) {
      setDepartments(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    return { data, error }
  }

  return { departments, loading, createDepartment }
}
