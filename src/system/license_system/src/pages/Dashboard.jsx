import React from 'react'
import { Link } from 'react-router-dom'
import {
  Key,
  Users,
  Package, // 📦 用於軟體產品圖示
  Clock,
  ArrowRight,
  CheckCircle,
  AlertOctagon,
  Monitor,
  Laptop,
  Server,
  Cpu,
  AlertTriangle,
  ChevronRight,
  Wrench
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading } from '../components/ui/Loading'
import { useDashboard } from '../hooks/useDashboard'
import { formatDate, getDaysRemaining, getCategoryColor, getUsagePercentage, getUsageColor } from '../utils/helpers'

// 定義基礎路徑，確保連結正確
const BASE_PATH = '/systems/software-license'

// --- 1. 統計卡片組件 ---
function StatCard({ title, value, subValue, icon: Icon, theme = 'blue', onClick }) {
  const themes = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   iconBg: 'bg-blue-100' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    iconBg: 'bg-red-100' },
    yellow: { bg: 'bg-amber-50',  text: 'text-amber-600',  iconBg: 'bg-amber-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', iconBg: 'bg-indigo-100' },
  }

  const t = themes[theme] || themes.blue

  return (
    <Card className={`${t.bg} border-none shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${t.text}`}>{value}</span>
            </div>
            {subValue && <p className="mt-1 text-xs text-gray-500">{subValue}</p>}
          </div>
          <div className={`p-3 rounded-xl ${t.iconBg}`}>
            <Icon className={`h-6 w-6 ${t.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- 2. 使用量條組件 ---
function UsageBar({ label, used, total, available }) {
  const percentage = getUsagePercentage(used, total)
  const barColor = percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="text-right">
          <span className="font-bold text-gray-900">{used}</span>
          <span className="text-gray-400 mx-1">/</span>
          <span className="text-gray-500">{total}</span>
        </div>
      </div>
      <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>使用率 {percentage}%</span>
        <span>剩餘可用: {available}</span>
      </div>
    </div>
  )
}

// --- 3. 到期項目組件 ---
function ExpiringItem({ license }) {
  const daysLeft = getDaysRemaining(license.expiry_date)
  const isUrgent = daysLeft <= 7

  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
      <div className="flex items-start gap-3">
        <div className={`mt-1 h-2 w-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-amber-500'}`} />
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {license.software?.name || '未指定軟體'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {license.software?.vendor?.name} • {license.license_type}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={isUrgent ? 'destructive' : 'warning'} className="mb-1">
          {daysLeft < 0 ? '已過期' : `剩 ${daysLeft} 天`}
        </Badge>
        <p className="text-xs text-gray-400">{formatDate(license.expiry_date)}</p>
      </div>
    </div>
  )
}

// --- 輔助函式 ---
function getDeviceIcon(type) {
  switch (type) {
    case 'laptop': return Laptop;
    case 'server': return Server;
    case 'desktop': return Monitor;
    default: return Cpu;
  }
}

function getDeviceLabel(type) {
    const map = {
        laptop: '筆記型電腦',
        desktop: '桌上型電腦',
        server: '伺服器',
        workstation: '工作站',
        other: '其他'
    }
    return map[type] || type
}

// --- 主儀表板組件 ---
export function Dashboard() {
  const { stats, loading } = useDashboard()

  if (loading) {
    return (
      <div className="p-6">
        <Loading size="lg" className="min-h-[400px]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">儀表板</h1>
          <p className="text-gray-500 mt-1 text-sm">軟體資產與硬體設備總覽</p>
        </div>
        <div className="text-xs text-gray-400">
          最後更新: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* 1. 警示區塊 */}
      {(stats.expiredLicenses > 0 || stats.expiringLicenses.length > 0 || stats.devicesByStatus?.maintenance > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.expiredLicenses > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-red-600">
                <AlertOctagon size={24} />
              </div>
              <div>
                <p className="text-red-900 font-bold text-lg">{stats.expiredLicenses} 筆授權已過期</p>
                <p className="text-red-600 text-sm">請立即處理續約</p>
              </div>
              <Link to={`${BASE_PATH}/licenses?status=expired`} className="ml-auto text-sm bg-white text-red-600 px-3 py-1.5 rounded-lg font-medium shadow-sm hover:bg-red-50">
                查看
              </Link>
            </div>
          )}
          {stats.expiringLicenses.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-amber-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-amber-900 font-bold text-lg">{stats.expiringLicenses.length} 筆授權即將到期</p>
                <p className="text-amber-600 text-sm">30 天內需要關注</p>
              </div>
              <Link to={`${BASE_PATH}/licenses?status=expiring`} className="ml-auto text-sm bg-white text-amber-600 px-3 py-1.5 rounded-lg font-medium shadow-sm hover:bg-amber-50">
                查看
              </Link>
            </div>
          )}
          {stats.devicesByStatus?.maintenance > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-white rounded-full shadow-sm text-orange-600">
                <Wrench size={24} />
              </div>
              <div>
                <p className="text-orange-900 font-bold text-lg">{stats.devicesByStatus.maintenance} 台設備維修中</p>
                <p className="text-orange-600 text-sm">請追蹤維修進度</p>
              </div>
              <Link to={`${BASE_PATH}/devices?status=maintenance`} className="ml-auto text-sm bg-white text-orange-600 px-3 py-1.5 rounded-lg font-medium shadow-sm hover:bg-orange-50">
                查看
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 2. 主要數據概覽 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="總授權數量"
          value={stats.totalQuantity}
          subValue={`${stats.totalLicenses} 筆授權記錄`}
          icon={Key}
          theme="blue"
        />
        <StatCard
          title="已分配授權"
          value={stats.assignedCount}
          subValue={`使用率 ${getUsagePercentage(stats.assignedCount, stats.totalQuantity)}%`}
          icon={CheckCircle}
          theme="green"
        />
        {/* IT 設備總數 */}
        <StatCard
          title="IT 設備總數"
          value={stats.totalDevices}
          subValue={`${stats.devicesByStatus?.active || 0} 台使用中`}
          icon={Monitor}
          theme="indigo"
        />
        {/* 🆕 替換後的卡片：軟體產品總數 */}
        <StatCard
          title="軟體產品總數"
          value={stats.totalSoftware}
          subValue="納管軟體項目"
          icon={Package}
          theme="orange"
        />
      </div>

      {/* 3. 詳細數據區 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* 左側：軟體授權類別使用量 */}
        <Card className="xl:col-span-1 h-full">
          <CardHeader>
            <CardTitle className="text-base">軟體授權分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {stats.licensesByCategory.map((item) => (
                <UsageBar
                  key={item.category}
                  label={item.category}
                  used={item.assigned}
                  total={item.quantity}
                  available={item.available}
                />
              ))}
              {stats.licensesByCategory.length === 0 && (
                <div className="text-center text-gray-400 py-10">尚無資料</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 中間：設備資產分佈 */}
        <Card className="xl:col-span-1 h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu size={18} className="text-indigo-500" />
              設備資產概況
            </CardTitle>
            <Link to={`${BASE_PATH}/devices`} className="text-xs text-gray-500 hover:text-indigo-600 flex items-center">
              全部 <ChevronRight size={14} />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-green-600 mb-1">使用中</p>
                    <p className="text-xl font-bold text-green-700">{stats.devicesByStatus?.active || 0}</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">閒置</p>
                    <p className="text-xl font-bold text-gray-700">{stats.devicesByStatus?.inactive || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-orange-600 mb-1">維修中</p>
                    <p className="text-xl font-bold text-orange-700">{stats.devicesByStatus?.maintenance || 0}</p>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm font-medium text-gray-500">類型分佈</p>
                {stats.devicesByType?.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">尚無設備資料</div>
                ) : (
                    stats.devicesByType?.map((item) => {
                        const TypeIcon = getDeviceIcon(item.type)
                        return (
                            <div key={item.type} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                        <TypeIcon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{getDeviceLabel(item.type)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500" style={{ width: `${item.percentage}%` }}></div>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 w-8 text-right">{item.count}</span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
          </CardContent>
        </Card>

        {/* 右側：最近分配紀錄 */}
        <Card className="xl:col-span-1 h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={18} className="text-blue-500" />
              最近分配動態
            </CardTitle>
            <Link to={`${BASE_PATH}/assignments`} className="text-xs text-gray-500 hover:text-blue-600 flex items-center">
              全部 <ChevronRight size={14} />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <div className="space-y-0 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {stats.recentAssignments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <p>尚無分配記錄</p>
                </div>
              ) : (
                stats.recentAssignments.map((assignment) => {
                  const isDevice = !!assignment.device_id;
                  const targetName = isDevice 
                      ? (assignment.device_name || assignment.device?.name || '未知設備')
                      : (assignment.employee_name || assignment.employee?.name || '未知員工');
                  
                  const Icon = isDevice ? Monitor : Users;
                  const iconBg = isDevice ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600';

                  return (
                    <div key={assignment.id} className="group flex items-start gap-3 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <div className={`h-8 w-8 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                              {targetName}
                          </p>
                          {isDevice && <Badge variant="default" className="text-[10px] px-1 py-0 h-4">設備</Badge>}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {assignment.software_name || assignment.license?.software?.name}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(assignment.assigned_date)}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}