import { Link } from 'react-router-dom'
import {
  Key,
  Users,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  Monitor
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Loading } from '../components/ui/Loading'
import { useDashboard } from '../hooks/useDashboard'
import { formatDate, getDaysRemaining, getCategoryColor, getUsagePercentage, getUsageColor } from '../utils/helpers'

function StatCard({ title, value, subValue, icon: Icon, color, description }) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  }

  const bgColors = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    purple: 'bg-purple-100',
    orange: 'bg-orange-100',
    red: 'bg-red-100'
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {subValue && (
              <p className="text-sm text-gray-500 mt-1">{subValue}</p>
            )}
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColors[color]}`}>
            <Icon className={`h-6 w-6 ${iconColors[color]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UsageBar({ label, used, total, color = 'blue' }) {
  const percentage = getUsagePercentage(used, total)
  const barColor = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{used} / {total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

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
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">儀表板</h1>
        <p className="text-gray-500 mt-1">公司軟體授權管理概覽</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="授權總數量"
          value={stats.totalQuantity}
          subValue={`${stats.totalLicenses} 筆授權記錄`}
          icon={Key}
          color="blue"
        />
        <StatCard
          title="已分配"
          value={stats.assignedCount}
          subValue={`使用率 ${getUsagePercentage(stats.assignedCount, stats.totalQuantity)}%`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="可用數量"
          value={stats.availableCount}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="在職員工"
          value={stats.totalEmployees}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Warning Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已過期授權</p>
                <p className="text-2xl font-bold text-red-600">{stats.expiredLicenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">30天內到期</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.expiringLicenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Monitor className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">軟體產品數</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalSoftware}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Stats & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* License by Category */}
        <Card>
          <CardHeader>
            <CardTitle>各類別授權使用情況</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.licensesByCategory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暫無授權資料</p>
            ) : (
              <div className="space-y-4">
                {stats.licensesByCategory.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                      <span className={`text-sm font-medium ${getUsageColor(getUsagePercentage(item.assigned, item.quantity))}`}>
                        {getUsagePercentage(item.assigned, item.quantity)}%
                      </span>
                    </div>
                    <UsageBar
                      label=""
                      used={item.assigned}
                      total={item.quantity}
                    />
                    <p className="text-xs text-gray-500">
                      已分配 {item.assigned} / 總計 {item.quantity}（剩餘 {item.available}）
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring Licenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>即將到期的授權</CardTitle>
            <Link
              to="/licenses"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {stats.expiringLicenses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">無即將到期的授權</p>
              ) : (
                stats.expiringLicenses.map((license) => {
                  const daysLeft = getDaysRemaining(license.expiry_date)
                  return (
                    <div key={license.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {license.software?.name || '未指定軟體'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {license.software?.vendor?.name} • {license.license_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${daysLeft <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {daysLeft} 天後到期
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(license.expiry_date)}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近的授權分配</CardTitle>
          <Link
            to="/assignments"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-200">
            {stats.recentAssignments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暫無分配記錄</p>
            ) : (
              stats.recentAssignments.map((assignment) => (
                <div key={assignment.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {assignment.employee?.name || '未知員工'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {assignment.employee?.department?.name || '未指定部門'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {assignment.license?.software?.name || '未知軟體'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(assignment.assigned_date)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
