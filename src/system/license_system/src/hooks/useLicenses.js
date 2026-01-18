import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// 1. 授權管理 Hook (維持原樣，因為不涉及跨 Schema 查詢)
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

// 2. 授權分配 Hook (大幅修改：改用 View)
export function useLicenseAssignments(licenseId = null) {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    
    // 🟢 修改：直接查詢 View (assignment_details)，資料已經在 SQL 裡 Join 好了
    let query = supabase
      .from('assignment_details') 
      .select('*')
      .order('created_at', { ascending: false })

    if (licenseId) {
      query = query.eq('license_id', licenseId)
    }

    const { data, error } = await query

    if (!error) {
      setAssignments(data || [])
    } else {
        console.error("Fetch Assignments Error:", error)
    }
    setLoading(false)
  }, [licenseId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  const assignLicense = async (assignment) => {
    // 🟢 修改邏輯：兩步式寫入
    // Step 1: 寫入原始表格 license_assignments
    const { data: insertData, error: insertError } = await supabase
      .from('license_assignments')
      .insert([assignment])
      .select('id') // 只拿 ID 就好
      .single()

    if (insertError) {
      console.error("Assign License Error (Insert):", insertError)
      return { data: null, error: insertError }
    }

    // Step 2: 從 View 查出完整資料 (包含員工姓名、部門、軟體名稱)
    const { data: viewData, error: viewError } = await supabase
      .from('assignment_details')
      .select('*')
      .eq('id', insertData.id)
      .single()

    if (!viewError) {
      setAssignments(prev => [viewData, ...prev])
    } else {
      console.error("Assign License Error (Fetch View):", viewError)
    }
    
    return { data: viewData, error: viewError }
  }

  const unassignLicense = async (assignmentId) => {
    // 🟢 修改邏輯：兩步式更新
    // Step 1: 更新原始表格
    const { error: updateError } = await supabase
      .from('license_assignments')
      .update({
        is_active: false,
        unassigned_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', assignmentId)

    if (updateError) return { error: updateError }

    // Step 2: 從 View 重新抓取該筆資料 (確保狀態同步)
    const { data: viewData, error: viewError } = await supabase
      .from('assignment_details')
      .select('*')
      .eq('id', assignmentId)
      .single()

    if (!viewError) {
      setAssignments(prev => prev.map(a =>
        a.id === assignmentId ? viewData : a
      ))
    }
    return { data: viewData, error: viewError }
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

// 3. 員工授權查詢 (也改用 View 以保持一致性)
export function useEmployeeLicenses(employeeId) {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return

    const fetchEmployeeLicenses = async () => {
      // 🟢 修改：改查 View，這樣如果要顯示軟體名稱或詳細資訊會更方便
      const { data, error } = await supabase
        .from('assignment_details')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('is_active', true)
      
      if(error) {
          console.error("Fetch Employee Licenses Error:", error)
      }

      setLicenses(data || [])
      setLoading(false)
    }

    fetchEmployeeLicenses()
  }, [employeeId])

  return { licenses, loading }
}