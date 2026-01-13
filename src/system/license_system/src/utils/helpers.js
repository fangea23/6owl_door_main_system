// 格式化日期
export function formatDate(date, includeTime = false) {
  if (!date) return '-'
  const d = new Date(date)
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return d.toLocaleDateString('zh-TW', options)
}

// 計算剩餘天數
export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const expires = new Date(expiresAt)
  expires.setHours(0, 0, 0, 0)
  const diff = expires - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// 授權狀態顏色
export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    expired: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// 授權狀態標籤
export function getStatusLabel(status) {
  const labels = {
    active: '有效',
    inactive: '未啟用',
    expired: '已過期',
    cancelled: '已取消',
    pending: '待處理',
    terminated: '已離職'
  }
  return labels[status] || status
}

// 員工狀態顏色
export function getEmployeeStatusColor(status) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    terminated: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// 員工狀態標籤
export function getEmployeeStatusLabel(status) {
  const labels = {
    active: '在職',
    inactive: '停用',
    terminated: '已離職'
  }
  return labels[status] || status
}

// 授權模式標籤
export function getLicenseModelLabel(model) {
  const labels = {
    subscription: '訂閱制',
    perpetual: '永久授權',
    volume: '大量授權',
    oem: 'OEM 授權',
    free: '免費'
  }
  return labels[model] || model
}

// 授權模式顏色
export function getLicenseModelColor(model) {
  const colors = {
    subscription: 'bg-blue-100 text-blue-800',
    perpetual: 'bg-green-100 text-green-800',
    volume: 'bg-purple-100 text-purple-800',
    oem: 'bg-orange-100 text-orange-800',
    free: 'bg-gray-100 text-gray-800'
  }
  return colors[model] || 'bg-gray-100 text-gray-800'
}

// 授權類型標籤 (用於驗證頁面)
export function getLicenseTypeLabel(type) {
  const labels = {
    standard: '標準版',
    professional: '專業版',
    enterprise: '企業版',
    trial: '試用版'
  }
  return labels[type] || type
}

// 授權類型顏色 (用於驗證頁面)
export function getLicenseTypeColor(type) {
  const colors = {
    standard: 'bg-blue-100 text-blue-800',
    professional: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-green-100 text-green-800',
    trial: 'bg-yellow-100 text-yellow-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

// 軟體類別標籤
export function getCategoryLabel(category) {
  const labels = {
    '辦公軟體': '辦公軟體',
    '作業系統': '作業系統',
    '設計軟體': '設計軟體',
    '工程軟體': '工程軟體'
  }
  return labels[category] || category
}

// 軟體類別顏色
export function getCategoryColor(category) {
  const colors = {
    '辦公軟體': 'bg-blue-100 text-blue-800',
    '作業系統': 'bg-green-100 text-green-800',
    '設計軟體': 'bg-purple-100 text-purple-800',
    '工程軟體': 'bg-orange-100 text-orange-800'
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

// 複製到剪貼簿
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

// 驗證 email
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 截斷文字
export function truncate(str, length = 50) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

// 格式化貨幣
export function formatCurrency(amount, currency = 'TWD') {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount)
}

// 計算使用率百分比
export function getUsagePercentage(assigned, total) {
  if (!total || total === 0) return 0
  return Math.round((assigned / total) * 100)
}

// 獲取使用率顏色
export function getUsageColor(percentage) {
  if (percentage >= 90) return 'text-red-600'
  if (percentage >= 70) return 'text-yellow-600'
  return 'text-green-600'
}
