import { useState } from 'react'
import { Plus, Search, Package, Eye, Edit2, Trash2 } from 'lucide-react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '../components/ui/Table'
import { Modal, ConfirmModal } from '../components/ui/Modal'
import { Loading } from '../components/ui/Loading'
import { useProducts } from '../hooks/useProducts'
import { formatDate } from '../utils/helpers'
import toast from 'react-hot-toast'

function ProductForm({ product, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    version: product?.version || '',
    sku: product?.sku || '',
    is_active: product?.is_active ?? true
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
        label="產品名稱"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
        placeholder="輸入產品名稱"
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="版本"
          value={formData.version}
          onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
          placeholder="例如: 1.0.0"
        />
        <Input
          label="SKU"
          value={formData.sku}
          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
          placeholder="產品編號"
        />
      </div>

      <Textarea
        label="產品描述"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        placeholder="輸入產品描述"
        rows={4}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">啟用產品</label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button type="submit" loading={loading}>
          {product ? '更新' : '建立'}
        </Button>
      </div>
    </form>
  )
}

function ProductDetailModal({ product, isOpen, onClose }) {
  if (!product) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="產品詳情" size="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Package className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{product.name}</h3>
            {product.version && (
              <p className="text-gray-500">版本 {product.version}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">SKU</p>
            <p className="font-medium">{product.sku || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">狀態</p>
            <Badge variant={product.is_active ? 'success' : 'default'}>
              {product.is_active ? '啟用' : '停用'}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">建立日期</p>
            <p className="font-medium">{formatDate(product.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">更新日期</p>
            <p className="font-medium">{formatDate(product.updated_at)}</p>
          </div>
        </div>

        {product.description && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500 mb-2">產品描述</p>
            <p className="text-gray-700">{product.description}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

export function Products() {
  const { products, loading, createProduct, updateProduct, deleteProduct } = useProducts()
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  const filteredProducts = products.filter(product => {
    const search = searchTerm.toLowerCase()
    return (
      product.name.toLowerCase().includes(search) ||
      product.sku?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search)
    )
  })

  const handleCreate = async (data) => {
    const { error } = await createProduct(data)
    if (error) {
      toast.error('建立產品失敗')
    } else {
      toast.success('產品已建立')
      setShowCreateModal(false)
    }
  }

  const handleUpdate = async (data) => {
    const { error } = await updateProduct(selectedProduct.id, data)
    if (error) {
      toast.error('更新產品失敗')
    } else {
      toast.success('產品已更新')
      setShowEditModal(false)
      setSelectedProduct(null)
    }
  }

  const handleDelete = async () => {
    const { error } = await deleteProduct(selectedProduct.id)
    if (error) {
      toast.error('刪除產品失敗')
    } else {
      toast.success('產品已刪除')
      setShowDeleteModal(false)
      setSelectedProduct(null)
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
          <h1 className="text-2xl font-bold text-gray-900">產品管理</h1>
          <p className="text-gray-500 mt-1">管理所有軟體產品</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增產品
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜尋產品名稱、SKU..."
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
              <TableHead>產品名稱</TableHead>
              <TableHead>版本</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>建立日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState message="暫無產品" icon={Package} />
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {product.version || '-'}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {product.sku || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'success' : 'default'}>
                      {product.is_active ? '啟用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(product.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowDetailModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowEditModal(true)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
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
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="新增產品" size="md">
        <ProductForm
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedProduct(null) }} title="編輯產品" size="md">
        <ProductForm
          product={selectedProduct}
          onSubmit={handleUpdate}
          onClose={() => { setShowEditModal(false); setSelectedProduct(null) }}
        />
      </Modal>

      {/* Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null) }}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedProduct(null) }}
        onConfirm={handleDelete}
        title="刪除產品"
        message={`確定要刪除產品 "${selectedProduct?.name}" 嗎？此操作無法復原。`}
        confirmText="刪除"
      />
    </div>
  )
}
