import { useState, useEffect } from 'react'
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
          // 授權統計
          supabase.from('licenses').select('status, quantity, assigned_count, expiry_date'),
          // 員工數量
          supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          // 軟體數量
          supabase.from('software').select('id', { count: 'exact', head: true }).eq('is_active', true),
          // 最近分配記錄
          supabase
            .from('license_assignments')
            .select(`
              *,
              license:licenses(
                license_type,
                software:software(name, category)
              ),
              employee:employees(name, department:departments(name))
            `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5),
          // 即將到期的授權
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

        const licenses = licensesResult.data || []
        const totalQuantity = licenses.reduce((sum, l) => sum + (l.quantity || 0), 0)
        const assignedCount = licenses.reduce((sum, l) => sum + (l.assigned_count || 0), 0)
        const expiredLicenses = licenses.filter(l =>
          l.status === 'expired' || (l.expiry_date && l.expiry_date < today)
        ).length

        // 按軟體類別統計
        const categoryStats = {}
        for (const license of licenses) {
          const sw = await supabase
            .from('software')
            .select('category')
            .eq('id', license.software_id)
            .single()

          if (sw.data?.category) {
            if (!categoryStats[sw.data.category]) {
              categoryStats[sw.data.category] = { quantity: 0, assigned: 0 }
            }
            categoryStats[sw.data.category].quantity += license.quantity || 0
            categoryStats[sw.data.category].assigned += license.assigned_count || 0
          }
        }

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
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return { stats, loading }
}
