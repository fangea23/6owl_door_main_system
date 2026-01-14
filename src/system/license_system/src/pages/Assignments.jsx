import { useState } from 'react'
import { Plus, Search, UserCheck, Trash2, XCircle, User, Package, Calendar, Monitor } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useLicenseAssignments, useLicenses } from '../hooks/useLicenses'
import { useEmployees } from '../hooks/useEmployees'
import { useDevices } from '../hooks/useDevices'
import { formatDate, getCategoryColor, getCategoryLabel } from '../utils/helpers'
import toast from 'react-hot-toast'

const ASSIGN_TO_OPTIONS = [
  { value: 'employee', label: '員工' },
  { value: 'device', label: '設備' },
  { value: 'both', label: '員工 + 設備' }
]

function AssignmentForm({ licenses, employees, devices, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    license_id: '',
    assign_to: 'employee',
    employee_id: '',
    device_id: '',
    assigned_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [loading, setLoading] = useState(false)

  // 過濾出還有可用額度的授權
  const availableLicenses = licenses.filter(l => {
    const available = l.quantity - (l.assigned_count || 0)
    return available > 0 && l.status === 'active'
  })

  // 過濾出在職員工
  const activeEmployees = employees.filter(e => e.status === 'active')

  // 過濾出可用設備
  const activeDevices = devices.filter(d => d.status === 'active')

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 驗證至少選擇一個分配對象
    if (formData.assign_to === 'employee' && !formData.employee_id) {
      toast.error('請選擇員工')
      return
    }
    if (formData.assign_to === 'device' && !formData.device_id) {
      toast.error('請選擇設備')
      return
    }
    if (formData.assign_to === 'both' && !formData.employee_id && !formData.device_id) {
      toast.error('請至少選擇一個員工或設備')
      return
    }

    setLoading(true)
    await onSubmit({
      license_id: formData.license_id,
      employee_id: formData.employee_id || null,
      device_id: formData.device_id || null,
      assigned_date: formData.assigned_date,
      notes: formData.notes,
      is_active: true
    })
    setLoading(false)
  }

  const selectedLicense = availableLicenses.find(l => l.id === formData.license_id)
  const availableCount = selectedLicense ? selectedLicense.quantity - (selectedLicense.assigned_count || 0) : 0

  const showEmployeeSelect = formData.assign_to === 'employee' || formData.assign_to === 'both'
  const showDeviceSelect = formData.assign_to === 'device' || formData.assign_to === 'both'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="選擇授權"
        value={formData.license_id}
        onChange={(e) => setFormData(prev => ({ ...prev, license_id: e.target.value }))}
        options={availableLicenses.map(l => ({
          value: l.id,
          label: `${l.software?.name || '未知軟體'} - ${l.license_type} (可用: ${l.quantity - (l.assigned_count || 0)})`
        }))}
        placeholder="選擇要分配的授權"
        required
      />

      {selectedLicense && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Package className="h-4 w-4" />
            <span className="font-medium">{selectedLicense.software?.name}</span>
            <Badge className={getCategoryColor(selectedLicense.software?.category)}>
              {getCategoryLabel(selectedLicense.software?.category)}
            </Badge>
          </div>
          <p className="text-sm text-blue-600 mt-1">
            剩餘可分配: {availableCount} / {selectedLicense.quantity}
          </p>
        </div>
      )}

      <Select
        label="分配給"
        value={formData.assign_to}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          assign_to: e.target.value,
          employee_id: e.target.value === 'device' ? '' : prev.employee_id,
          device_id: e.target.value === 'employee' ? '' : prev.device_id
        }))}
        options={ASSIGN_TO_OPTIONS}
      />

      {showEmployeeSelect && (
        <Select
          label="選擇員工"
          value={formData.employee_id}
          onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
          options={activeEmployees.map(e => ({
            value: e.id,
            label: `${e.name} (${e.employee_id || '無編號'}) - ${e.department?.name || '無部門'}`
          }))}
          placeholder="選擇員工"
          required={formData.assign_to === 'employee'}
        />
      )}

      {showDeviceSelect && (
        <Select
          label="選擇設備"
          value={formData.device_id}
          onChange={(e) => setFormData(prev => ({ ...prev, device_id: e.target.value }))}
          options={activeDevices.map(d => ({
            value: d.id,
            label: `${d.name} (${d.serial_number || '無序號'})${d.employee ? ` - ${d.employee.name}` : ''}`
          }))}
          placeholder="選擇設備"
          required={formData.assign_to === 'device'}
        />
      )}

      <Input
        type="date"
        label="分配日期"
        value={formData.assigned_date}
        onChange={(e) => setFormData(prev => ({ ...prev, assigned_date: e.target.value }))}
        required
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
        <Button type="submit" loading={loading}>確認分配</Button>
      </div>
    </form>
  )
}

export function Assignments() {
  const { assignments, loading, assignLicense, unassignLicense, deleteAssignment } = useLicenseAssignments()
  const { licenses } = useLicenses()
  const { employees } = useEmployees()
  const { devices } = useDevices()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUnassignModal, setShowUnassignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  const filteredAssignments = assignments.filter(a => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      a.employee?.name?.toLowerCase().includes(search) ||
      a.employee?.employee_id?.toLowerCase().includes(search) ||
      a.device?.name?.toLowerCase().includes(search) ||
      a.device?.serial_number?.toLowerCase().includes(search) ||
      a.license?.software?.name?.toLowerCase().includes(search)
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active)
    const matchesType = typeFilter === 'all' ||
      (typeFilter === 'employee' && a.employee_id && !a.device_id) ||
      (typeFilter === 'device' && a.device_id && !a.employee_id) ||
      (typeFilter === 'both' && a.employee_id && a.device_id)
    return matchesSearch && matchesStatus && matchesType
  })

  const handleAssign = async (data) => {
    const { error } = await assignLicense(data)
    if (error) {
      toast.error(error.message || '分配授權失敗')
    } else {
      toast.success('授權已分配')
      setShowCreateModal(false)
    }
  }

  const handleUnassign = async () => {
    const { error } = await unassignLicense(selectedAssignment.id)
    if (error) {
      toast.error('取消分配失敗')
    } else {
      toast.success('授權已取消分配')
      setShowUnassignModal(false)
      setSelectedAssignment(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteAssignment(selectedAssignment.id)
    if (error) {
      toast.error('刪除記錄失敗')
    } else {
      toast.success('記錄已刪除')
      setShowDeleteModal(false)
      setSelectedAssignment(null)
    }
  }

  // 取得分配對象的顯示名稱
  const getAssigneeDisplay = (assignment) => {
    const parts = []
    if (assignment.employee) {
      parts.push(assignment.employee.name)
    }
    if (assignment.device) {
      parts.push(assignment.device.name)
    }
    return parts.length > 0 ? parts.join(' / ') : '-'
  }

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  // 統計資訊
  const activeAssignments = assignments.filter(a => a.is_active).length
  const totalAssignments = assignments.length
  const employeeAssignments = assignments.filter(a => a.is_active && a.employee_id).length
  const deviceAssignments = assignments.filter(a => a.is_active && a.device_id).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">授權分配</h1>
          <p className="text-gray-500 mt-1">管理軟體授權的分配（員工/設備）</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增分配
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">使用中</p>
                <p className="text-xl font-bold text-gray-900">{activeAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">員工授權</p>
                <p className="text-xl font-bold text-gray-900">{employeeAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Monitor className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">設備授權</p>
                <p className="text-xl font-bold text-gray-900">{deviceAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">已取消</p>
                <p className="text-xl font-bold text-gray-900">{totalAssignments - activeAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋員工、設備、軟體..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: '全部類型' },
                { value: 'employee', label: '員工' },
                { value: 'device', label: '設備' },
                { value: 'both', label: '員工+設備' }
              ]}
              className="w-36"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: '全部狀態' },
                { value: 'active', label: '使用中' },
                { value: 'inactive', label: '已取消' }
              ]}
              className="w-36"
            />
          </div>
        </CardContent>
      </Card>

      {/* 授權分配卡片網格 */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <UserCheck size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">暫無分配記錄</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            立即新增
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`bg-white rounded-xl border p-5 transition-all hover:shadow-lg ${
                assignment.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* 卡片頭部 */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-gray-400" />
                    <h3 className="font-bold text-gray-800 truncate">
                      {assignment.license?.software?.name || '-'}
                    </h3>
                  </div>
                  {assignment.license?.software?.category && (
                    <Badge className={getCategoryColor(assignment.license.software.category)}>
                      {getCategoryLabel(assignment.license.software.category)}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  {assignment.is_active && (
                    <button
                      onClick={() => { setSelectedAssignment(assignment); setShowUnassignModal(true) }}
                      className="p-2 hover:bg-orange-50 text-gray-500 hover:text-orange-600 rounded-lg transition-colors"
                      title="取消分配"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedAssignment(assignment); setShowDeleteModal(true) }}
                    className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-lg transition-colors"
                    title="刪除記錄"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* 分配對象 */}
              <div className="space-y-2 mb-3">
                {assignment.employee && (
                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                    <User size={16} className="text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-blue-800 truncate">{assignment.employee.name}</p>
                      <p className="text-xs text-blue-600">
                        {assignment.employee.employee_id} · {assignment.employee.department?.name}
                      </p>
                    </div>
                  </div>
                )}
                {assignment.device && (
                  <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
                    <Monitor size={16} className="text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-indigo-800 truncate">{assignment.device.name}</p>
                      {assignment.device.serial_number && (
                        <p className="text-xs text-indigo-600 font-mono">{assignment.device.serial_number}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 狀態和日期 */}
              <div className="flex items-center justify-between text-sm">
                <Badge className={assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {assignment.is_active ? '使用中' : '已取消'}
                </Badge>
                <span className="text-gray-500 flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(assignment.assigned_date)}
                </span>
              </div>

              {/* 取消日期 */}
              {assignment.unassigned_date && (
                <p className="text-xs text-gray-400 mt-2">
                  取消於 {formatDate(assignment.unassigned_date)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增授權分配" size="lg">
        <AssignmentForm
          licenses={licenses}
          employees={employees}
          devices={devices}
          onSubmit={handleAssign}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={showUnassignModal}
        onClose={() => { setShowUnassignModal(false); setSelectedAssignment(null) }}
        onConfirm={handleUnassign}
        title="取消授權分配"
        message={`確定要取消「${getAssigneeDisplay(selectedAssignment || {})}」的「${selectedAssignment?.license?.software?.name}」授權嗎？`}
        confirmText="取消分配"
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedAssignment(null) }}
        onConfirm={handleDelete}
        title="刪除分配記錄"
        message={`確定要刪除此分配記錄嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
