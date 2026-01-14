import { useState } from 'react'
import { Plus, Search, Monitor, Laptop, Server, Edit2, Trash2, User, Hash, Calendar } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useDevices } from '../hooks/useDevices'
import { useEmployees } from '../hooks/useEmployees'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

const DEVICE_TYPES = [
  { value: 'desktop', label: '桌上型電腦' },
  { value: 'laptop', label: '筆記型電腦' },
  { value: 'server', label: '伺服器' },
  { value: 'workstation', label: '工作站' },
  { value: 'other', label: '其他' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: '使用中' },
  { value: 'inactive', label: '閒置' },
  { value: 'maintenance', label: '維修中' },
  { value: 'retired', label: '已報廢' }
]

function getDeviceTypeIcon(type) {
  switch (type) {
    case 'laptop':
      return Laptop
    case 'server':
      return Server
    default:
      return Monitor
  }
}

function getDeviceTypeLabel(type) {
  return DEVICE_TYPES.find(t => t.value === type)?.label || type
}

function getStatusColor(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'inactive':
      return 'bg-gray-100 text-gray-800'
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800'
    case 'retired':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.label || status
}

function DeviceForm({ device, employees, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: device?.name || '',
    device_type: device?.device_type || 'desktop',
    serial_number: device?.serial_number || '',
    mac_address: device?.mac_address || '',
    ip_address: device?.ip_address || '',
    employee_id: device?.employee_id || '',
    location: device?.location || '',
    purchase_date: device?.purchase_date || '',
    status: device?.status || 'active',
    notes: device?.notes || ''
  })
  const [loading, setLoading] = useState(false)

  const activeEmployees = employees.filter(e => e.status === 'active')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      ...formData,
      employee_id: formData.employee_id || null
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="設備名稱"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="例如: PC-001, Laptop-A32"
        />
        <Select
          label="設備類型"
          value={formData.device_type}
          onChange={(e) => setFormData(prev => ({ ...prev, device_type: e.target.value }))}
          options={DEVICE_TYPES}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="序號"
          value={formData.serial_number}
          onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
          placeholder="設備序號"
        />
        <Input
          label="MAC 地址"
          value={formData.mac_address}
          onChange={(e) => setFormData(prev => ({ ...prev, mac_address: e.target.value }))}
          placeholder="例如: AA:BB:CC:DD:EE:FF"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="IP 地址"
          value={formData.ip_address}
          onChange={(e) => setFormData(prev => ({ ...prev, ip_address: e.target.value }))}
          placeholder="例如: 192.168.1.100"
        />
        <Input
          label="放置位置"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="例如: 3F 辦公區"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="使用者"
          value={formData.employee_id}
          onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
          options={activeEmployees.map(e => ({
            value: e.id,
            label: `${e.name} (${e.employee_id || '無編號'})`
          }))}
          placeholder="選擇使用者（選填）"
        />
        <Select
          label="狀態"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          options={STATUS_OPTIONS}
        />
      </div>

      <Input
        type="date"
        label="購入日期"
        value={formData.purchase_date}
        onChange={(e) => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
      />

      <Textarea
        label="備註"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        placeholder="選填"
        rows={2}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>{device ? '更新' : '建立'}</Button>
      </div>
    </form>
  )
}

export function Devices() {
  const { devices, loading, createDevice, updateDevice, deleteDevice } = useDevices()
  const { employees } = useEmployees()

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)

  const filteredDevices = devices.filter(device => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      device.name?.toLowerCase().includes(search) ||
      device.serial_number?.toLowerCase().includes(search) ||
      device.mac_address?.toLowerCase().includes(search) ||
      device.employee?.name?.toLowerCase().includes(search)
    const matchesType = !typeFilter || device.device_type === typeFilter
    const matchesStatus = !statusFilter || device.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const handleCreate = async (data) => {
    const { error } = await createDevice(data)
    if (error) {
      toast.error('建立設備失敗')
    } else {
      toast.success('設備已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateDevice(selectedDevice.id, data)
    if (error) {
      toast.error('更新設備失敗')
    } else {
      toast.success('設備已更新')
      setShowEditModal(false)
      setSelectedDevice(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteDevice(selectedDevice.id)
    if (error) {
      toast.error('刪除設備失敗')
    } else {
      toast.success('設備已刪除')
      setShowDeleteModal(false)
      setSelectedDevice(null)
    }
  }

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設備管理</h1>
          <p className="text-gray-500 mt-1">管理公司電腦與設備</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增設備
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋設備名稱、序號、使用者..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={DEVICE_TYPES}
              placeholder="所有類型"
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="所有狀態"
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* 設備卡片網格 */}
      {filteredDevices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Monitor size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暫無設備</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            立即新增
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const DeviceIcon = getDeviceTypeIcon(device.device_type)

            return (
              <div
                key={device.id}
                className={`bg-white rounded-xl border p-5 transition-all hover:shadow-lg ${
                  device.status === 'active' ? 'border-gray-200' : 'border-gray-100 opacity-70'
                }`}
              >
                {/* 卡片頭部 */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                      <DeviceIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-lg truncate">{device.name}</h3>
                      <p className="text-sm text-gray-500">{getDeviceTypeLabel(device.device_type)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setSelectedDevice(device); setShowEditModal(true) }}
                      className="p-2 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => { setSelectedDevice(device); setShowDeleteModal(true) }}
                      className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* 狀態標籤 */}
                <div className="mb-3">
                  <Badge className={getStatusColor(device.status)}>
                    {getStatusLabel(device.status)}
                  </Badge>
                </div>

                {/* 設備資訊 */}
                <div className="space-y-2 text-sm text-gray-600">
                  {device.serial_number && (
                    <p className="flex items-center gap-2">
                      <Hash size={16} className="text-gray-400 shrink-0" />
                      <span className="font-mono truncate">{device.serial_number}</span>
                    </p>
                  )}
                  {device.employee && (
                    <p className="flex items-center gap-2">
                      <User size={16} className="text-gray-400 shrink-0" />
                      {device.employee.name}
                    </p>
                  )}
                  {device.location && (
                    <p className="flex items-center gap-2 text-gray-500">
                      位置：{device.location}
                    </p>
                  )}
                  {device.purchase_date && (
                    <p className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400 shrink-0" />
                      購入 {formatDate(device.purchase_date)}
                    </p>
                  )}
                </div>

                {/* MAC/IP 資訊 */}
                {(device.mac_address || device.ip_address) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 space-y-1">
                    {device.mac_address && <p>MAC: {device.mac_address}</p>}
                    {device.ip_address && <p>IP: {device.ip_address}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增設備" size="lg">
        <DeviceForm employees={employees} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedDevice(null) }} title="編輯設備" size="lg">
        <DeviceForm device={selectedDevice} employees={employees} onSubmit={handleUpdate} onClose={() => { setShowEditModal(false); setSelectedDevice(null) }} />
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedDevice(null) }}
        onConfirm={handleDelete}
        title="刪除設備"
        message={`確定要刪除設備「${selectedDevice?.name}」嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
