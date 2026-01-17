import { useState, useEffect } from 'react'
// 引用你定義好 Wrapper 的那個檔案
import { supabase } from '../lib/supabase' 

export function useDashboard() {
  const [stats, setStats] = useState({
    totalLicenses: 0,
    totalQuantity: 0,
    assignedCount: 0,
    availableCount: 0,
    expiredLicenses: 0,
    totalEmployees: 0,
    totalSoftware: 0,
    recentAssignments: [],
    expiringLicenses: [],
    licensesByCategory: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // 獲取統計數據 - 並行請求
        const [
          licensesResult,
          employeesResult,
          softwareResult,
          recentAssignmentsResult,
          expiringLicensesResult
        ] = await Promise.all([
          
          // 1. 授權統計
          // 你的 Wrapper 會自動把它導向 software_maintenance
          supabase
            .from('licenses') 
            .select(`
              status, 
              quantity, 
              assigned_count, 
              expiry_date,
              software_id,
              software:software(category) 
            `),

          // 2. 員工數量
          // 你的 Wrapper 會自動把它導向 public
          supabase
            .from('employees')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),

          // 3. 軟體數量
          // 自動導向 software_maintenance
          supabase
            .from('software')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),

          // 4. 最近分配記錄
          // 自動導向 software_maintenance
          supabase
            .from('license_assignments')
            .select(`
              *,
              license:licenses(
                license_type,
                software:software(name, category)
              ),
              employee:employees!fk_assignments_employees(
                name, 
                department:departments!fk_employees_department(name)
              )
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5),

          // 5. 即將到期的授權
          // 自動導向 software_maintenance
          supabase
            .from('licenses')
            .select(`
              *,
              software:software(name, category, vendor:vendors(name))
            `)
            .eq('status', 'active')
            .not('expiry_date', 'is', null)
            .gte('expiry_date', today)
            .lte('expiry_date', thirtyDaysLater)
            .order('expiry_date', { ascending: true })
            .limit(5)
        ])

        // --- 數據處理邏輯 (保持不變) ---
        const licenses = licensesResult.data || []
        const totalQuantity = licenses.reduce((sum, l) => sum + (l.quantity || 0), 0)
        const assignedCount = licenses.reduce((sum, l) => sum + (l.assigned_count || 0), 0)
        
        const expiredLicenses = licenses.filter(l =>
          l.status === 'expired' || (l.expiry_date && l.expiry_date < today)
        ).length

        const categoryStats = {}
        
        licenses.forEach(license => {
          const category = license.software?.category || 'Uncategorized'
          
          if (!categoryStats[category]) {
            categoryStats[category] = { quantity: 0, assigned: 0 }
          }
          categoryStats[category].quantity += license.quantity || 0
          categoryStats[category].assigned += license.assigned_count || 0
        })

        const licensesByCategory = Object.entries(categoryStats).map(([category, data]) => ({
          category,
          quantity: data.quantity,
          assigned: data.assigned,
          available: data.quantity - data.assigned
        }))

        setStats({
          totalLicenses: licenses.length,
          totalQuantity,
          assignedCount,
          availableCount: totalQuantity - assignedCount,
          expiredLicenses,
          totalEmployees: employeesResult.count || 0,
          totalSoftware: softwareResult.count || 0,
          recentAssignments: recentAssignmentsResult.data || [],
          expiringLicenses: expiringLicensesResult.data || [],
          licensesByCategory
        })

      } catch (error) {
        console.error('🔥 [useDashboard] Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return { stats, loading }
}