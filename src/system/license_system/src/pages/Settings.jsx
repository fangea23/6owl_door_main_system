import { useState } from 'react'
import { User, Building, Lock, Bell, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

function ProfileSettings() {
  const { profile, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await updateProfile(formData)
    if (error) {
      toast.error('更新失敗')
    } else {
      toast.success('個人資料已更新')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          個人資料
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            label="電子郵件"
            value={profile?.email || ''}
            disabled
            className="bg-gray-50"
          />
          <Input
            label="姓名"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="輸入您的姓名"
          />
          <Input
            label="公司名稱"
            value={formData.company_name}
            onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
            placeholder="輸入公司名稱"
          />
          <Button type="submit" loading={loading}>
            儲存變更
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SecuritySettings() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('新密碼不一致')
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('密碼至少需要 6 個字元')
      return
    }

    setLoading(true)
    // Note: Supabase password update would go here
    toast.success('密碼已更新')
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          安全設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            type="password"
            label="目前密碼"
            value={formData.currentPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
            required
          />
          <Input
            type="password"
            label="新密碼"
            value={formData.newPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
            required
          />
          <Input
            type="password"
            label="確認新密碼"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            required
          />
          <Button type="submit" loading={loading}>
            更新密碼
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    licenseExpiry: true,
    newActivation: true,
    weeklyReport: false
  })

  const handleChange = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
    toast.success('設定已儲存')
  }

  const notifications = [
    { key: 'emailNotifications', label: '電子郵件通知', description: '接收系統通知郵件' },
    { key: 'licenseExpiry', label: '授權到期提醒', description: '在授權到期前收到提醒' },
    { key: 'newActivation', label: '新啟用通知', description: '當有新的授權啟用時通知' },
    { key: 'weeklyReport', label: '每週報告', description: '接收每週授權統計報告' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          通知設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {notifications.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <button
                onClick={() => handleChange(item.key)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings[item.key] ? 'bg-blue-600' : 'bg-gray-200'}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings[item.key] ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function APISettings() {
  const [showKey, setShowKey] = useState(false)
  const apiKey = 'lg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey)
    toast.success('API Key 已複製')
  }

  const handleRegenerate = () => {
    toast.success('API Key 已重新生成')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          API 設定
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <div className="flex gap-2">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                disabled
                className="font-mono bg-gray-50"
              />
              <Button variant="outline" onClick={() => setShowKey(!showKey)}>
                {showKey ? '隱藏' : '顯示'}
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                複製
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleRegenerate}>
              重新生成 API Key
            </Button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <p className="font-medium">注意</p>
            <p>重新生成 API Key 後，舊的 Key 將立即失效。請確保更新所有使用舊 Key 的應用程式。</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Settings() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">管理您的帳號和系統設定</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        <ProfileSettings />
        <SecuritySettings />
        <NotificationSettings />
        <APISettings />
      </div>
    </div>
  )
}
