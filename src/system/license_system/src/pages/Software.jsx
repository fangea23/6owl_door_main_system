import { useState } from 'react'
import { Plus, Search, Monitor, Edit2, Trash2, ExternalLink, Package } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Select, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useSoftware, useVendors } from '../hooks/useSoftware'
import { getCategoryColor, getCategoryLabel } from '../utils/helpers'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: '辦公軟體', label: '辦公軟體' },
  { value: '作業系統', label: '作業系統' },
  { value: '設計軟體', label: '設計軟體' },
  { value: '工程軟體', label: '工程軟體' },
  { value: '開發工具', label: '開發工具' },
  { value: '其他', label: '其他' }
]

function SoftwareForm({ item, vendors, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    vendor_id: item?.vendor_id || '',
    version: item?.version || '',
    category: item?.category || '',
    description: item?.description || '',
    website: item?.website || ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSubmit({
      ...formData,
      vendor_id: formData.vendor_id || null
    })
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="軟體名稱"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          placeholder="例如: Microsoft Office 365"
        />
        <Input
          label="版本"
          value={formData.version}
          onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
          placeholder="例如: 2024"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="廠商"
          value={formData.vendor_id}
          onChange={(e) => setFormData(prev => ({ ...prev, vendor_id: e.target.value }))}
          options={vendors.map(v => ({ value: v.id, label: v.name }))}
          placeholder="選擇廠商"
        />
        <Select
          label="類別"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          options={CATEGORIES}
          placeholder="選擇類別"
        />
      </div>

      <Input
        label="官方網站"
        type="url"
        value={formData.website}
        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
        placeholder="https://..."
      />

      <Textarea
        label="描述"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="選填"
        rows={2}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>取消</Button>
        <Button type="submit" loading={loading}>{item ? '更新' : '建立'}</Button>
      </div>
    </form>
  )
}

export function Software() {
  const { software, loading, createSoftware, updateSoftware, deleteSoftware } = useSoftware()
  const { vendors } = useVendors()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [vendorFilter, setVendorFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const filteredSoftware = software.filter(s => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = s.name.toLowerCase().includes(search) ||
      s.description?.toLowerCase().includes(search) ||
      s.vendor?.name?.toLowerCase().includes(search)
    const matchesCategory = !categoryFilter || s.category === categoryFilter
    const matchesVendor = !vendorFilter || s.vendor_id === vendorFilter
    return matchesSearch && matchesCategory && matchesVendor
  })

  const handleCreate = async (data) => {
    const { error } = await createSoftware(data)
    if (error) {
      toast.error('建立軟體失敗')
    } else {
      toast.success('軟體已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateSoftware(selectedItem.id, data)
    if (error) {
      toast.error('更新軟體失敗')
    } else {
      toast.success('軟體已更新')
      setShowEditModal(false)
      setSelectedItem(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteSoftware(selectedItem.id)
    if (error) {
      toast.error('刪除軟體失敗')
    } else {
      toast.success('軟體已刪除')
      setShowDeleteModal(false)
      setSelectedItem(null)
    }
  }

  if (loading) {
    return <div className="p-6"><Loading size="lg" className="min-h-[400px]" /></div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">軟體管理</h1>
          <p className="text-gray-500 mt-1">管理公司使用的軟體產品</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />新增軟體
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜尋軟體名稱、廠商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={CATEGORIES}
              placeholder="所有類別"
              className="w-40"
            />
            <Select
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
              options={vendors.map(v => ({ value: v.id, label: v.name }))}
              placeholder="所有廠商"
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>軟體名稱</TableHead>
              <TableHead>廠商</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>類別</TableHead>
              <TableHead>網站</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSoftware.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="暫無軟體" icon={Monitor} />
                </TableCell>
              </TableRow>
            ) : (
              filteredSoftware.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{s.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{s.vendor?.name || '-'}</TableCell>
                  <TableCell className="text-gray-600">{s.version || '-'}</TableCell>
                  <TableCell>
                    {s.category ? (
                      <Badge className={getCategoryColor(s.category)}>
                        {getCategoryLabel(s.category)}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        連結
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedItem(s); setShowEditModal(true) }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { setSelectedItem(s); setShowDeleteModal(true) }}
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

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增軟體" size="lg">
        <SoftwareForm vendors={vendors} onSubmit={handleCreate} onClose={() => setShowCreateModal(false)} />
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedItem(null) }} title="編輯軟體" size="lg">
        <SoftwareForm item={selectedItem} vendors={vendors} onSubmit={handleUpdate} onClose={() => { setShowEditModal(false); setSelectedItem(null) }} />
      </Modal>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedItem(null) }}
        onConfirm={handleDelete}
        title="刪除軟體"
        message={`確定要刪除軟體「${selectedItem?.name}」嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
