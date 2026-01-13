import { useState } from 'react'
import { Plus, Search, Users, Eye, Edit2, Trash2, Mail, Phone, Building } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useEmployees, useDepartments } from '../hooks/useEmployees'
import { formatDate, getEmployeeStatusColor, getEmployeeStatusLabel } from '../utils/helpers'
import toast from 'react-hot-toast'

function EmployeeForm({ employee, departments, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || '',
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department_id: employee?.department_id || '',
    position: employee?.position || '',
    hire_date: employee?.hire_date || '',
    status: employee?.status || 'active',
    notes: employee?.notes || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      ...formData,
      department_id: formData.department_id || null
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="員工編號"
          value={formData.employee_id}
          onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
          placeholder="例如: EMP001"
        />
        <Input
          label="姓名"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="輸入員工姓名"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="email"
          label="電子郵件"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="email@company.com"
        />
        <Input
          label="電話"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="輸入電話號碼"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="部門"
          value={formData.department_id}
          onChange={(e) => setFormData(prev => ({ ...prev, department_id: e.target.value }))}
          options={departments.map(d => ({ value: d.id, label: d.name }))}
          placeholder="選擇部門"
        />
        <Input
          label="職位"
          value={formData.position}
          onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
          placeholder="輸入職位"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="date"
          label="到職日期"
          value={formData.hire_date}
          onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
        />
        <Select
          label="狀態"
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
          options={[
            { value: 'active', label: '在職' },
            { value: 'inactive', label: '停用' },
            { value: 'terminated', label: '已離職' }
          ]}
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
        <Button type="submit" loading={loading}>{employee ? '更新' : '建立'}</Button>
      </div>
    </form>
  )
}

export function Employees() {
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee } = useEmployees()
  const { departments } = useDepartments()
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const filteredEmployees = employees.filter(emp => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = emp.name.toLowerCase().includes(search) ||
      emp.employee_id?.toLowerCase().includes(search) ||
      emp.email?.toLowerCase().includes(search)
    const matchesDept = !departmentFilter || emp.department_id === departmentFilter
    const matchesStatus = !statusFilter || emp.status === statusFilter
    return matchesSearch && matchesDept && matchesStatus
  })

  const handleCreate = async (data) => {
    const { error } = await createEmployee(data)
    if (error) {
      toast.error('建立員工失敗')
    } else {
      toast.success('員工已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateEmployee(selectedEmployee.id, data)
    if (error) {
      toast.error('更新員工失敗')
    } else {
      toast.success('員工已更新')
      setShowEditModal(false)
      setSelectedEmployee(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteEmployee(selectedEmployee.id)
    if (error) {
      toast.error('刪除員工失敗')
    } else {
      toast.success('員工已刪除')
      setShowDeleteModal(false)
      setSelectedEmployee(null)
    }
  }

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">員工管理</h1>
          <p className="text-gray-500 mt-1">管理公司員工資料</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增員工
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋員工姓名、編號、Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              placeholder="所有部門"
              className="w-40"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'active', label: '在職' },
                { value: 'inactive', label: '停用' },
                { value: 'terminated', label: '已離職' }
              ]}
              placeholder="所有狀態"
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>員工編號</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>部門</TableHead>
              <TableHead>職位</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="暫無員工" icon={Users} />
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-gray-600">{emp.employee_id || '-'}</TableCell>
                  <TableCell className="font-medium text-gray-900">{emp.name}</TableCell>
                  <TableCell className="text-gray-600">{emp.department?.name || '-'}</TableCell>
                  <TableCell className="text-gray-600">{emp.position || '-'}</TableCell>
                  <TableCell className="text-gray-600">{emp.email || '-'}</TableCell>
                  <TableCell>
                    <Badge className={getEmployeeStatusColor(emp.status)}>
                      {getEmployeeStatusLabel(emp.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedEmployee(emp); setShowEditModal(true) }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedEmployee(emp); setShowDeleteModal(true) }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增員工" size="lg">
        <EmployeeForm departments={departments} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedEmployee(null) }} title="編輯員工" size="lg">
        <EmployeeForm employee={selectedEmployee} departments={departments} onSubmit={handleUpdate} onClose={() => { setShowEditModal(false); setSelectedEmployee(null) }} />
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedEmployee(null) }}
        onConfirm={handleDelete}
        title="刪除員工"
        message={`確定要刪除員工「${selectedEmployee?.name}」嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
