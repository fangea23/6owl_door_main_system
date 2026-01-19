import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useDashboard() {
  const [stats, setStats] = useState({
    totalLicenses: 0,
    totalQuantity: 0,
    assignedCount: 0,
    availableCount: 0,
    expiredLicenses: 0,
    totalSoftware: 0,
    totalDevices: 0,        // 🆕 新增
    maintenanceCount: 0,    // 🆕 新增：維修中數量
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

        const [
          licensesResult,
          softwareResult,
          devicesResult,        // 🆕 改查設備
          recentAssignmentsResult,
          expiringLicensesResult
        ] = await Promise.all([
          // 1. 授權統計
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

          // 2. 軟體數量
          supabase
            .from('software')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),

          // 3. 🆕 設備統計 (取代原本的員工查詢)
          // 假設設備表名稱為 'devices'，且有 status 欄位
          supabase
            .from('devices')
            .select('id, status'),

          // 4. 最近分配記錄
          supabase
            .from('assignment_details')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5),

          // 5. 即將到期的授權
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

        // 數據計算
        const licenses = licensesResult.data || []
        const totalQuantity = licenses.reduce((sum, l) => sum + (l.quantity || 0), 0)
        const assignedCount = licenses.reduce((sum, l) => sum + (l.assigned_count || 0), 0)
        
        const expiredLicenses = licenses.filter(l =>
          l.status === 'expired' || (l.expiry_date && l.expiry_date < today)
        ).length

        // 🆕 計算設備數據
        const devices = devicesResult.data || []
        const totalDevices = devices.length
        const maintenanceCount = devices.filter(d => d.status === 'maintenance').length

        // 分類統計
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
          totalSoftware: softwareResult.count || 0,
          totalDevices,           // 🆕
          maintenanceCount,       // 🆕
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