import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Car, Filter } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { usePermission, PermissionGuard } from '../../../../hooks/usePermission';
import toast from 'react-hot-toast';

export const Vehicles = () => {
  const { vehicles, loading, createVehicle, updateVehicle, deleteVehicle } = useVehicles();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // RBAC 權限檢查
  const { hasPermission: canCreate } = usePermission('car.vehicle.create');
  const { hasPermission: canEdit } = usePermission('car.vehicle.edit');
  const { hasPermission: canDelete } = usePermission('car.vehicle.delete');

  const [formData, setFormData] = useState({
    plate_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    vehicle_type: 'sedan',
    seating_capacity: 5,
    fuel_type: 'gasoline',
    transmission: 'automatic',
    status: 'available',
    location: '',
    notes: '',
  });

  const vehicleTypes = [
    { value: 'sedan', label: '轎車' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '廂型車' },
    { value: 'truck', label: '貨車' },
  ];

  const statusOptions = [
    { value: 'all', label: '全部' },
    { value: 'available', label: '可用', color: 'green' },
    { value: 'rented', label: '租借中', color: 'orange' },
    { value: 'maintenance', label: '維護中', color: 'red' },
    { value: 'retired', label: '已退役', color: 'gray' },
  ];

  const getStatusBadge = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    if (!option || option.value === 'all') return null;

    const colors = {
      green: 'bg-green-100 text-green-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[option.color]}`}>
        {option.label}
      </span>
    );
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch =
      vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleOpenModal = (vehicle = null) => {
    // RBAC 權限檢查
    if (vehicle && !canEdit) {
      toast.error('您沒有編輯車輛的權限');
      return;
    }
    if (!vehicle && !canCreate) {
      toast.error('您沒有新增車輛的權限');
      return;
    }

    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData(vehicle);
    } else {
      setEditingVehicle(null);
      setFormData({
        plate_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        vehicle_type: 'sedan',
        seating_capacity: 5,
        fuel_type: 'gasoline',
        transmission: 'automatic',
        status: 'available',
        location: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVehicle(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = editingVehicle
      ? await updateVehicle(editingVehicle.id, formData)
      : await createVehicle(formData);

    if (result.success) {
      toast.success(editingVehicle ? '車輛已更新' : '車輛已新增');
      handleCloseModal();
    } else {
      toast.error(result.error || '操作失敗');
    }
  };

  const handleDelete = async (id, platNumber) => {
    // RBAC 權限檢查
    if (!canDelete) {
      toast.error('您沒有刪除車輛的權限');
      return;
    }

    if (!confirm(`確定要刪除車輛 ${platNumber} 嗎？`)) return;

    const result = await deleteVehicle(id);
    if (result.success) {
      toast.success('車輛已刪除');
    } else {
      toast.error(result.error || '刪除失敗');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">車輛管理</h1>
          <p className="text-gray-600 mt-1">管理公司所有車輛</p>
        </div>
        <PermissionGuard permission="car.vehicle.create">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增車輛
          </button>
        </PermissionGuard>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜尋車牌、品牌或型號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map(vehicle => (
          <div
            key={vehicle.id}
            className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <Car className="w-6 h-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{vehicle.plate_number}</h3>
                    <p className="text-sm text-gray-500">
                      {vehicle.brand} {vehicle.model}
                    </p>
                  </div>
                </div>
                {getStatusBadge(vehicle.status)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">年份</span>
                  <span className="font-medium">{vehicle.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">顏色</span>
                  <span className="font-medium">{vehicle.color || '未設定'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">座位數</span>
                  <span className="font-medium">{vehicle.seating_capacity} 人</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">停放位置</span>
                  <span className="font-medium">{vehicle.location || '未設定'}</span>
                </div>
              </div>

              {(canEdit || canDelete) && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  {canEdit && (
                    <button
                      onClick={() => handleOpenModal(vehicle)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      編輯
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(vehicle.id, vehicle.plate_number)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      刪除
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有找到車輛</h3>
          <p className="text-gray-600">請調整搜尋條件或新增車輛</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingVehicle ? '編輯車輛' : '新增車輛'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    車牌號碼 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    品牌 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    型號 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年份 *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顏色
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    車輛類型 *
                  </label>
                  <select
                    required
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    {vehicleTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    座位數
                  </label>
                  <input
                    type="number"
                    value={formData.seating_capacity}
                    onChange={(e) => setFormData({...formData, seating_capacity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    狀態
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    {statusOptions.filter(opt => opt.value !== 'all').map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    停放位置
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備註
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                >
                  {editingVehicle ? '更新' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
