import { useState } from 'react'
import { Plus, Search, UserCheck, Trash2, XCircle, User, Package, Calendar } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useLicenseAssignments, useLicenses } from '../hooks/useLicenses'
import { useEmployees } from '../hooks/useEmployees'
import { formatDate, getCategoryColor, getCategoryLabel, getUsagePercentage } from '../utils/helpers'
import toast from 'react-hot-toast'

function AssignmentForm({ licenses, employees, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    license_id: '',
    employee_id: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      ...formData,
      is_active: true
    })
    setLoading(false)
  }

  const selectedLicense = availableLicenses.find(l => l.id === formData.license_id)
  const availableCount = selectedLicense ? selectedLicense.quantity - (selectedLicense.assigned_count || 0) : 0

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
        label="選擇員工"
        value={formData.employee_id}
        onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
        options={activeEmployees.map(e => ({
          value: e.id,
          label: `${e.name} (${e.employee_id || '無編號'}) - ${e.department?.name || '無部門'}`
        }))}
        placeholder="選擇要分配的員工"
        required
      />

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

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUnassignModal, setShowUnassignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState(null)

  const filteredAssignments = assignments.filter(a => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      a.employee?.name?.toLowerCase().includes(search) ||
      a.employee?.employee_id?.toLowerCase().includes(search) ||
      a.license?.software?.name?.toLowerCase().includes(search)
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && a.is_active) ||
      (statusFilter === 'inactive' && !a.is_active)
    return matchesSearch && matchesStatus
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

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  // 統計資訊
  const activeAssignments = assignments.filter(a => a.is_active).length
  const totalAssignments = assignments.length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">授權分配</h1>
          <p className="text-gray-500 mt-1">管理員工的軟體授權分配</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增分配
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-3 gap-4">
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">總記錄數</p>
                <p className="text-xl font-bold text-gray-900">{totalAssignments}</p>
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
                  placeholder="搜尋員工姓名、軟體..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: '全部' },
                { value: 'active', label: '使用中' },
                { value: 'inactive', label: '已取消' }
              ]}
              className="w-36"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>員工</TableHead>
              <TableHead>軟體</TableHead>
              <TableHead>類別</TableHead>
              <TableHead>分配日期</TableHead>
              <TableHead>取消日期</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="暫無分配記錄" icon={UserCheck} />
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{assignment.employee?.name || '-'}</p>
                        <p className="text-sm text-gray-500">
                          {assignment.employee?.employee_id} · {assignment.employee?.department?.name}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{assignment.license?.software?.name || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {assignment.license?.software?.category ? (
                      <Badge className={getCategoryColor(assignment.license.software.category)}>
                        {getCategoryLabel(assignment.license.software.category)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(assignment.assigned_date)}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {assignment.unassigned_date ? formatDate(assignment.unassigned_date) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={assignment.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {assignment.is_active ? '使用中' : '已取消'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {assignment.is_active && (
                        <button
                          onClick={() => { setSelectedAssignment(assignment); setShowUnassignModal(true) }}
                          className="p-1 text-gray-400 hover:text-orange-600 rounded"
                          title="取消分配"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setSelectedAssignment(assignment); setShowDeleteModal(true) }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="刪除記錄"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增授權分配" size="lg">
        <AssignmentForm
          licenses={licenses}
          employees={employees}
          onSubmit={handleAssign}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={showUnassignModal}
        onClose={() => { setShowUnassignModal(false); setSelectedAssignment(null) }}
        onConfirm={handleUnassign}
        title="取消授權分配"
        message={`確定要取消「${selectedAssignment?.employee?.name}」的「${selectedAssignment?.license?.software?.name}」授權嗎？`}
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
