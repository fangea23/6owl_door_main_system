import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEmployees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    console.log('🚀 [useEmployees] 開始抓取員工資料...');

    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          department:departments!fk_employees_department(id, name)
        `) // 👈 修改重點 1：加上 !fk_employees_department
        .order('created_at', { ascending: false })

      console.log('📡 [useEmployees] Supabase 回傳結果:', { 
        data, 
        error, 
        count: data?.length || 0 
      });

      if (error) {
        console.error('❌ [useEmployees] 抓取失敗:', error);
        throw error
      }

      if (data && data.length > 0) {
        console.log('✅ [useEmployees] 成功讀取到資料:', data);
      } else {
        console.warn('⚠️ [useEmployees] 查詢成功但沒有資料 (空陣列)');
      }

      setEmployees(data || [])
    } catch (err) {
      console.error('🔥 [useEmployees] 發生例外錯誤:', err);
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const createEmployee = async (employee) => {
    console.log('➕ [createEmployee] 嘗試新增員工:', employee);
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
      .select(`
        *,
        department:departments!fk_employees_department(id, name)
      `) // 👈 修改重點 2：這裡也要改
      .single()

    if (error) {
      console.error('❌ [createEmployee] 新增失敗:', error);
    } else {
      console.log('✅ [createEmployee] 新增成功:', data);
      setEmployees(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateEmployee = async (id, updates) => {
    console.log('📝 [updateEmployee] 嘗試更新員工 ID:', id, '內容:', updates);
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        department:departments!fk_employees_department(id, name)
      `) // 👈 修改重點 3：這裡也要改
      .single()

    if (error) {
      console.error('❌ [updateEmployee] 更新失敗:', error);
    } else {
      console.log('✅ [updateEmployee] 更新成功:', data);
      setEmployees(prev => prev.map(e => e.id === id ? data : e))
    }
    return { data, error }
  }

  const deleteEmployee = async (id) => {
    console.log('🗑️ [deleteEmployee] 嘗試刪除員工 ID:', id);
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ [deleteEmployee] 刪除失敗:', error);
    } else {
      console.log('✅ [deleteEmployee] 刪除成功');
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

// useDepartments 不需要改，因為它只是單純撈部門表，沒有關聯查詢
export function useDepartments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDepartments = async () => {
      console.log('🚀 [useDepartments] 開始抓取部門資料...');
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('name')

      console.log('📡 [useDepartments] Supabase 回傳結果:', { data, error });

      if (error) {
        console.error('❌ [useDepartments] 抓取失敗:', error);
      } else {
        console.log(`✅ [useDepartments] 成功抓取 ${data?.length} 筆部門資料`);
      }

      setDepartments(data || [])
      setLoading(false)
    }

    fetchDepartments()
  }, [])

  const createDepartment = async (department) => {
    console.log('➕ [createDepartment] 嘗試新增部門:', department);
    const { data, error } = await supabase
      .from('departments')
      .insert([department])
      .select()
      .single()

    if (error) {
      console.error('❌ [createDepartment] 新增失敗:', error);
    } else {
      console.log('✅ [createDepartment] 新增成功:', data);
      setDepartments(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    return { data, error }
  }

  return { departments, loading, createDepartment }
}