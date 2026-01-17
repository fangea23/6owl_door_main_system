import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useLicenses() {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLicenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          *,
          software:software(
            id, name, category,
            vendor:vendors(id, name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLicenses(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLicenses()
  }, [fetchLicenses])

  const createLicense = async (license) => {
    const { data, error } = await supabase
      .from('licenses')
      .insert([license])
      .select(`
        *,
        software:software(
          id, name, category,
          vendor:vendors(id, name)
        )
      `)
      .single()

    if (!error) {
      setLicenses(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateLicense = async (id, updates) => {
    const { data, error } = await supabase
      .from('licenses')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        software:software(
          id, name, category,
          vendor:vendors(id, name)
        )
      `)
      .single()

    if (!error) {
      setLicenses(prev => prev.map(l => l.id === id ? data : l))
    }
    return { data, error }
  }

  const deleteLicense = async (id) => {
    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', id)

    if (!error) {
      setLicenses(prev => prev.filter(l => l.id !== id))
    }
    return { error }
  }

  return {
    licenses,
    loading,
    error,
    fetchLicenses,
    createLicense,
    updateLicense,
    deleteLicense
  }
}

export function useLicenseAssignments(licenseId = null) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('license_assignments')
      .select(`
        *,
        license:licenses(
          id, license_key, license_type,
          software:software(id, name, category)
        ),
        employee:employees!fk_assignments_employees(
          id, employee_id, name,
          department:departments(id, name)
        ),
        device:devices!fk_devices_employees(
          id, name, serial_number, device_type
        )
      `)
      .order('created_at', { ascending: false })

    if (licenseId) {
      query = query.eq('license_id', licenseId)
    }

    const { data, error } = await query

    if (!error) {
      setAssignments(data || [])
    }
    setLoading(false)
  }, [licenseId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const assignLicense = async (assignment) => {
    const { data, error } = await supabase
      .from('license_assignments')
      .insert([assignment])
      .select(`
        *,
        license:licenses(
          id, license_key, license_type,
          software:software(id, name, category)
        ),
        employee:employees!fk_assignments_employees(
          id, employee_id, name,
          department:departments(id, name)
        ),
        device:devices!fk_devices_employees(
          id, name, serial_number, device_type
        )
      `)
      .single()

    if (!error) {
      setAssignments(prev => [data, ...prev])
    }
    return { data, error }
  }

  const unassignLicense = async (assignmentId) => {
    const { data, error } = await supabase
      .from('license_assignments')
      .update({
        is_active: false,
        unassigned_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', assignmentId)
      .select()
      .single()

    if (!error) {
      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? { ...a, is_active: false } : a
      ))
    }
    return { data, error }
  }

  const deleteAssignment = async (assignmentId) => {
    const { error } = await supabase
      .from('license_assignments')
      .delete()
      .eq('id', assignmentId)

    if (!error) {
      setAssignments(prev => prev.filter(a => a.id !== assignmentId))
    }
    return { error }
  }

  return {
    assignments,
    loading,
    fetchAssignments,
    assignLicense,
    unassignLicense,
    deleteAssignment
  }
}

// 取得員工的所有授權
export function useEmployeeLicenses(employeeId) {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return

    const fetchEmployeeLicenses = async () => {
      const { data } = await supabase
        .from('license_assignments')
        .select(`
          *,
          license:licenses(
            id, license_key, license_type, expiry_date,
            software:software(id, name, category, vendor:vendors(name))
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true)

      setLicenses(data || [])
      setLoading(false)
    }

    fetchEmployeeLicenses()
  }, [employeeId])

  return { licenses, loading }
}
