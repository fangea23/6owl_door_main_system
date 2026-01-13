import { useState } from 'react'
import { Plus, Search, Users, Eye, Edit2, Trash2, Mail, Phone, Building } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useCustomers } from '../hooks/useCustomers'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

function CustomerForm({ customer, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    company: customer?.company || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    is_active: customer?.is_active ?? true
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit(formData)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="客戶名稱"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
        placeholder="輸入客戶名稱"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="email"
          label="電子郵件"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="email@example.com"
        />
        <Input
          label="電話"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="輸入電話號碼"
        />
      </div>

      <Input
        label="公司名稱"
        value={formData.company}
        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
        placeholder="輸入公司名稱"
      />

      <Input
        label="地址"
        value={formData.address}
        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        placeholder="輸入地址"
      />

      <Textarea
        label="備註"
        value={formData.notes}
        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        placeholder="選填"
        rows={3}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">啟用客戶</label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" loading={loading}>
          {customer ? '更新' : '建立'}
        </Button>
      </div>
    </form>
  )
}

function CustomerDetailModal({ customer, isOpen, onClose }) {
  if (!customer) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="客戶詳情" size="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{customer.name}</h3>
            {customer.company && (
              <p className="text-gray-500">{customer.company}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{customer.phone}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-gray-400" />
              <span className="text-gray-700">{customer.address}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">狀態</p>
            <Badge variant={customer.is_active ? 'success' : 'default'}>
              {customer.is_active ? '啟用' : '停用'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">建立日期</p>
            <p className="font-medium">{formatDate(customer.created_at)}</p>
          </div>
        </div>

        {customer.notes && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">備註</p>
            <p className="text-gray-700">{customer.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function Customers() {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useCustomers()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const filteredCustomers = customers.filter(customer => {
    const search = searchTerm.toLowerCase()
    return (
      customer.name.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.company?.toLowerCase().includes(search)
    )
  })

  const handleCreate = async (data) => {
    const { error } = await createCustomer(data)
    if (error) {
      toast.error('建立客戶失敗')
    } else {
      toast.success('客戶已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateCustomer(selectedCustomer.id, data)
    if (error) {
      toast.error('更新客戶失敗')
    } else {
      toast.success('客戶已更新')
      setShowEditModal(false)
      setSelectedCustomer(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteCustomer(selectedCustomer.id)
    if (error) {
      toast.error('刪除客戶失敗')
    } else {
      toast.success('客戶已刪除')
      setShowDeleteModal(false)
      setSelectedCustomer(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loading size="lg" className="min-h-[400px]" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客戶管理</h1>
          <p className="text-gray-500 mt-1">管理所有客戶資料</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增客戶
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋客戶名稱、電子郵件、公司..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>客戶名稱</TableHead>
              <TableHead>電子郵件</TableHead>
              <TableHead>公司</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState message="暫無客戶" icon={Users} />
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-gray-900">
                    {customer.name}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {customer.email || '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {customer.company || '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {customer.phone || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'success' : 'default'}>
                      {customer.is_active ? '啟用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(customer.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setShowDetailModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setShowEditModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setShowDeleteModal(true)
                        }}
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

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增客戶" size="md">
        <CustomerForm
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedCustomer(null) }} title="編輯客戶" size="md">
        <CustomerForm
          customer={selectedCustomer}
          onSubmit={handleUpdate}
          onClose={() => { setShowEditModal(false); setSelectedCustomer(null) }}
        />
      </Modal>

      {/* Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedCustomer(null) }}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedCustomer(null) }}
        onConfirm={handleDelete}
        title="刪除客戶"
        message={`確定要刪除客戶 "${selectedCustomer?.name}" 嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
