import { useState } from 'react'
import { Plus, Search, Key, Copy, Eye, Edit2, Trash2, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useLicenses } from '../hooks/useLicenses'
import { useSoftware } from '../hooks/useSoftware'
import {
  formatDate,
  getDaysRemaining,
  getStatusColor,
  getStatusLabel,
  getLicenseModelLabel,
  getLicenseModelColor,
  copyToClipboard,
  getUsagePercentage,
  getUsageColor
} from '../utils/helpers'
import toast from 'react-hot-toast'

const LICENSE_MODELS = [
  { value: 'subscription', label: '訂閱制' },
  { value: 'perpetual', label: '永久授權' },
  { value: 'volume', label: '大量授權' },
  { value: 'oem', label: 'OEM 授權' },
  { value: 'free', label: '免費' }
]

const LICENSE_TYPES = [
  { value: 'standard', label: '標準版' },
  { value: 'professional', label: '專業版' },
  { value: 'enterprise', label: '企業版' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: '有效' },
  { value: 'inactive', label: '未啟用' },
  { value: 'expired', label: '已過期' },
  { value: 'cancelled', label: '已取消' }
]

function LicenseForm({ license, softwareList, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    software_id: license?.software_id || '',
    license_key: license?.license_key || '',
    license_model: license?.license_model || 'subscription',
    license_type: license?.license_type || 'standard',
    quantity: license?.quantity || 1,
    purchase_date: license?.purchase_date || '',
    expiry_date: license?.expiry_date || '',
    purchase_price: license?.purchase_price || '',
    renewal_price: license?.renewal_price || '',
    vendor_contact: license?.vendor_contact || '',
    status: license?.status || 'active',
    notes: license?.notes || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      ...formData,
      software_id: formData.software_id || null,
      quantity: parseInt(formData.quantity) || 1,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      renewal_price: formData.renewal_price ? parseFloat(formData.renewal_price) : null,
      purchase_date: formData.purchase_date || null,
      expiry_date: formData.expiry_date || null
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="軟體"
          value={formData.software_id}
          onChange={(e) => setFormData(prev => ({ ...prev, software_id: e.target.value }))}
          options={softwareList.map(s => ({ value: s.id, label: `${s.name} ${s.version || ''}`.trim() }))}
          placeholder="選擇軟體"
          required
        />
        <Input
          label="授權金鑰"
          value={formData.license_key}
          onChange={(e) => setFormData(prev => ({ ...prev, license_key: e.target.value }))}
          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
          className="font-mono"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="授權模式"
          value={formData.license_model}
          onChange={(e) => setFormData(prev => ({ ...prev, license_model: e.target.value }))}
          options={LICENSE_MODELS}
        />
        <Select
          label="授權類型"
          value={formData.license_type}
          onChange={(e) => setFormData(prev => ({ ...prev, license_type: e.target.value }))}
          options={LICENSE_TYPES}
        />
        <Input
          type="number"
          label="授權數量"
          value={formData.quantity}
          onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
          min="1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          label="購買日期"
          value={formData.purchase_date}
          onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
        />
        <Input
          type="date"
          label="到期日期"
          value={formData.expiry_date}
          onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="number"
          label="購買價格 (TWD)"
          value={formData.purchase_price}
          onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: e.target.value }))}
          placeholder="0"
          min="0"
          step="1"
        />
        <Input
          type="number"
          label="續約價格 (TWD)"
          value={formData.renewal_price}
          onChange={(e) => setFormData(prev => ({ ...prev, renewal_price: e.target.value }))}
          placeholder="0"
          min="0"
          step="1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="廠商聯絡資訊"
          value={formData.vendor_contact}
          onChange={(e) => setFormData(prev => ({ ...prev, vendor_contact: e.target.value }))}
          placeholder="聯絡人、電話或 Email"
        />
        <Select
          label="狀態"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          options={STATUS_OPTIONS}
        />
      </div>

      <Textarea
        label="備註"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        placeholder="選填"
        rows={2}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>{license ? '更新' : '建立'}</Button>
      </div>
    </form>
  )
}

function LicenseDetailModal({ license, isOpen, onClose }) {
  if (!license) return null

  const handleCopy = async () => {
    if (license.license_key) {
      const success = await copyToClipboard(license.license_key)
      if (success) {
        toast.success('已複製到剪貼簿')
      }
    }
  }

  const usagePercent = getUsagePercentage(license.assigned_count, license.quantity)
  const daysRemaining = getDaysRemaining(license.expiry_date)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="授權詳情" size="lg">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">軟體</p>
              <p className="text-lg font-bold">{license.software?.name || '-'}</p>
              <p className="text-sm text-gray-500">{license.software?.vendor?.name}</p>
            </div>
            <Badge className={getStatusColor(license.status)}>
              {getStatusLabel(license.status)}
            </Badge>
          </div>
        </div>

        {license.license_key && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">授權金鑰</p>
                <p className="text-sm font-mono font-bold">{license.license_key}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> 複製
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">授權模式</p>
            <Badge className={getLicenseModelColor(license.license_model)}>
              {getLicenseModelLabel(license.license_model)}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">授權類型</p>
            <p className="font-medium">{LICENSE_TYPES.find(t => t.value === license.license_type)?.label || license.license_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">授權數量</p>
            <p className="font-medium">{license.quantity} 份</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">已分配</p>
            <p className={`font-medium ${getUsageColor(usagePercent)}`}>
              {license.assigned_count} / {license.quantity} ({usagePercent}%)
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">購買日期</p>
            <p className="font-medium">{formatDate(license.purchase_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">到期日期</p>
            <p className={`font-medium ${daysRemaining !== null && daysRemaining <= 30 ? 'text-red-600' : ''}`}>
              {license.expiry_date ? formatDate(license.expiry_date) : '永久'}
              {daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0 && (
                <span className="text-sm ml-1">({daysRemaining} 天後到期)</span>
              )}
              {daysRemaining !== null && daysRemaining <= 0 && (
                <span className="text-sm ml-1">(已過期)</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">購買價格</p>
            <p className="font-medium">{license.purchase_price ? `NT$ ${license.purchase_price.toLocaleString()}` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">續約價格</p>
            <p className="font-medium">{license.renewal_price ? `NT$ ${license.renewal_price.toLocaleString()}` : '-'}</p>
          </div>
        </div>

        {license.vendor_contact && (
          <div>
            <p className="text-sm text-gray-500">廠商聯絡資訊</p>
            <p className="text-gray-700 mt-1">{license.vendor_contact}</p>
          </div>
        )}

        {license.notes && (
          <div>
            <p className="text-sm text-gray-500">備註</p>
            <p className="text-gray-700 mt-1">{license.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function Licenses() {
  const { licenses, loading, createLicense, updateLicense, deleteLicense } = useLicenses()
  const { software } = useSoftware()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState(null)

  const filteredLicenses = licenses.filter(license => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      license.license_key?.toLowerCase().includes(search) ||
      license.software?.name?.toLowerCase().includes(search) ||
      license.software?.vendor?.name?.toLowerCase().includes(search)
    const matchesStatus = !statusFilter || license.status === statusFilter
    const matchesModel = !modelFilter || license.license_model === modelFilter
    return matchesSearch && matchesStatus && matchesModel
  })

  const handleCreate = async (data) => {
    const { error } = await createLicense(data)
    if (error) {
      toast.error('建立授權失敗')
    } else {
      toast.success('授權已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateLicense(selectedLicense.id, data)
    if (error) {
      toast.error('更新授權失敗')
    } else {
      toast.success('授權已更新')
      setShowEditModal(false)
      setSelectedLicense(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteLicense(selectedLicense.id)
    if (error) {
      toast.error('刪除授權失敗')
    } else {
      toast.success('授權已刪除')
      setShowDeleteModal(false)
      setSelectedLicense(null)
    }
  }

  const handleCopyKey = async (key) => {
    if (key) {
      const success = await copyToClipboard(key)
      if (success) {
        toast.success('已複製到剪貼簿')
      }
    }
  }

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">授權管理</h1>
          <p className="text-gray-500 mt-1">管理公司軟體授權</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增授權
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋軟體名稱、授權金鑰..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="所有狀態"
              className="w-36"
            />
            <Select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              options={LICENSE_MODELS}
              placeholder="所有模式"
              className="w-36"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>軟體</TableHead>
              <TableHead>授權金鑰</TableHead>
              <TableHead>授權模式</TableHead>
              <TableHead>使用狀況</TableHead>
              <TableHead>到期日</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="暫無授權" icon={Key} />
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses.map((license) => {
                const usagePercent = getUsagePercentage(license.assigned_count, license.quantity)
                const daysRemaining = getDaysRemaining(license.expiry_date)
                const isExpiringSoon = daysRemaining !== null && daysRemaining <= 30 && daysRemaining > 0
                const isExpired = daysRemaining !== null && daysRemaining <= 0

                return (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{license.software?.name || '-'}</p>
                        <p className="text-sm text-gray-500">{license.software?.vendor?.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {license.license_key ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]">
                            {license.license_key}
                          </code>
                          <button
                            onClick={() => handleCopyKey(license.license_key)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getLicenseModelColor(license.license_model)}>
                        {getLicenseModelLabel(license.license_model)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className={getUsageColor(usagePercent)}>
                          {license.assigned_count} / {license.quantity}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(isExpiringSoon || isExpired) && (
                          <AlertCircle className={`h-4 w-4 ${isExpired ? 'text-red-500' : 'text-yellow-500'}`} />
                        )}
                        <span className={isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-600'}>
                          {license.expiry_date ? formatDate(license.expiry_date) : '永久'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(license.status)}>
                        {getStatusLabel(license.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedLicense(license); setShowDetailModal(true) }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedLicense(license); setShowEditModal(true) }}
                          className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedLicense(license); setShowDeleteModal(true) }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增授權" size="lg">
        <LicenseForm softwareList={software} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedLicense(null) }} title="編輯授權" size="lg">
        <LicenseForm license={selectedLicense} softwareList={software} onSubmit={handleUpdate} onClose={() => { setShowEditModal(false); setSelectedLicense(null) }} />
      </Modal>

      <LicenseDetailModal
        license={selectedLicense}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedLicense(null) }}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedLicense(null) }}
        onConfirm={handleDelete}
        title="刪除授權"
        message={`確定要刪除「${selectedLicense?.software?.name}」的授權嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
