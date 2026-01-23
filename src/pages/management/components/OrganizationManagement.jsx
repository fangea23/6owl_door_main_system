import React, { useState } from 'react';
import { useBrands } from '../../../hooks/management/useBrands';
import { useStores } from '../../../hooks/management/useStores';
import { usePermission } from '../../../hooks/usePermission';
import Badge, { StatusBadge } from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import {
  Building, Store, Plus, Search, Loader2, Edit2, Trash2, Save, X,
  ChevronDown, ChevronRight, MapPin, Phone, Users, Shield
} from 'lucide-react';

/**
 * 組織架構管理 - 品牌與門市管理
 */
export default function OrganizationManagement() {
  const { brands, loading: brandsLoading, createBrand, updateBrand, deleteBrand } = useBrands();
  const { stores, stats, loading: storesLoading, createStore, updateStore, deleteStore } = useStores();

  // 權限檢查
  const { hasPermission: canEdit } = usePermission('employee.edit');

  const [activeTab, setActiveTab] = useState('brands');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBrands, setExpandedBrands] = useState({});
  const [processing, setProcessing] = useState(false);

  // Modal 狀態
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editingStore, setEditingStore] = useState(null);

  // 表單資料
  const [brandForm, setBrandForm] = useState({ code: '', name: '', description: '' });
  const [storeForm, setStoreForm] = useState({
    brand_id: '',
    code: '',
    name: '',
    store_type: 'direct',
    address: '',
    phone: '',
    is_active: true,
  });

  const loading = brandsLoading || storesLoading;

  // 依品牌分組的門市
  const storesByBrand = stores.reduce((acc, store) => {
    const brandId = store.brand_id;
    if (!acc[brandId]) acc[brandId] = [];
    acc[brandId].push(store);
    return acc;
  }, {});

  // 搜尋過濾
  const filteredBrands = brands.filter(brand =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStores = stores.filter(store =>
    store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 切換展開
  const toggleBrandExpand = (brandId) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  // 品牌表單操作
  const openBrandModal = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({ code: brand.code || '', name: brand.name, description: brand.description || '' });
    } else {
      setEditingBrand(null);
      setBrandForm({ code: '', name: '', description: '' });
    }
    setShowBrandModal(true);
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!canEdit) return alert('您沒有編輯權限');

    setProcessing(true);
    try {
      let result;
      if (editingBrand) {
        result = await updateBrand(editingBrand.id, brandForm);
      } else {
        result = await createBrand(brandForm);
      }

      if (result.success) {
        setShowBrandModal(false);
        alert(editingBrand ? '✅ 品牌更新成功' : '✅ 品牌建立成功');
      } else {
        alert('❌ 操作失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteBrand = async (brand) => {
    if (!canEdit) return alert('您沒有刪除權限');
    if (!window.confirm(`確定要刪除品牌「${brand.name}」嗎？此操作無法復原。`)) return;

    setProcessing(true);
    const result = await deleteBrand(brand.id);
    setProcessing(false);

    if (result.success) {
      alert('✅ 品牌已刪除');
    } else {
      alert('❌ 刪除失敗: ' + result.error);
    }
  };

  // 門市表單操作
  const openStoreModal = (store = null, brandId = null) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        brand_id: store.brand_id,
        code: store.code || '',
        name: store.name,
        store_type: store.store_type || 'direct',
        address: store.address || '',
        phone: store.phone || '',
        is_active: store.is_active !== false,
      });
    } else {
      setEditingStore(null);
      setStoreForm({
        brand_id: brandId || '',
        code: '',
        name: '',
        store_type: 'direct',
        address: '',
        phone: '',
        is_active: true,
      });
    }
    setShowStoreModal(true);
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!canEdit) return alert('您沒有編輯權限');

    setProcessing(true);
    try {
      let result;
      if (editingStore) {
        result = await updateStore(editingStore.id, storeForm);
      } else {
        result = await createStore(storeForm);
      }

      if (result.success) {
        setShowStoreModal(false);
        alert(editingStore ? '✅ 門市更新成功' : '✅ 門市建立成功');
      } else {
        alert('❌ 操作失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteStore = async (store) => {
    if (!canEdit) return alert('您沒有刪除權限');
    if (!window.confirm(`確定要停用門市「${store.name}」嗎？`)) return;

    setProcessing(true);
    const result = await deleteStore(store.id);
    setProcessing(false);

    if (result.success) {
      alert('✅ 門市已停用');
    } else {
      alert('❌ 操作失敗: ' + result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{brands.length}</p>
              <p className="text-sm text-gray-500">品牌數</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Store size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">總門市數</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Store size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.direct}</p>
              <p className="text-sm text-gray-500">直營店</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Store size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.franchise}</p>
              <p className="text-sm text-gray-500">加盟店</p>
            </div>
          </div>
        </div>
      </div>

      {/* 操作列 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋品牌或門市..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => openBrandModal()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              新增品牌
            </button>
            <button
              onClick={() => openStoreModal()}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              新增門市
            </button>
          </div>
        )}
      </div>

      {/* 品牌與門市列表 */}
      <div className="space-y-4">
        {filteredBrands.map((brand) => {
          const brandStores = storesByBrand[brand.id] || [];
          const isExpanded = expandedBrands[brand.id];

          return (
            <div key={brand.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 品牌標頭 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleBrandExpand(brand.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">{brand.name}</h3>
                      <span className="text-sm text-gray-500 font-mono">({brand.code})</span>
                    </div>
                    <p className="text-sm text-gray-500">{brandStores.length} 家門市</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openBrandModal(brand); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>

              {/* 門市列表 */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {brandStores.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Store size={40} className="mx-auto mb-2 opacity-30" />
                      <p>尚無門市</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {brandStores.map((store) => (
                        <div key={store.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${store.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                              <Store size={20} className={store.is_active ? 'text-green-600' : 'text-gray-400'} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">{store.name}</span>
                                <span className="text-sm text-gray-500 font-mono">({store.code})</span>
                                <StatusBadge status={store.store_type} />
                                {!store.is_active && <Badge variant="neutral">已停用</Badge>}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                {store.address && (
                                  <span className="flex items-center gap-1">
                                    <MapPin size={14} /> {store.address}
                                  </span>
                                )}
                                {store.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone size={14} /> {store.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openStoreModal(store)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteStore(store)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 新增門市按鈕 */}
                  {canEdit && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => openStoreModal(null, brand.id)}
                        className="w-full py-2 text-blue-600 hover:bg-blue-100 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        新增門市到 {brand.name}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 品牌 Modal */}
      <Modal
        isOpen={showBrandModal}
        onClose={() => setShowBrandModal(false)}
        title={editingBrand ? '編輯品牌' : '新增品牌'}
        size="md"
      >
        <form onSubmit={handleSaveBrand} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">品牌代碼 *</label>
              <input
                type="text"
                required
                placeholder="01"
                value={brandForm.code}
                onChange={(e) => setBrandForm({ ...brandForm, code: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">品牌名稱 *</label>
              <input
                type="text"
                required
                placeholder="六扇門"
                value={brandForm.name}
                onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">描述</label>
            <textarea
              placeholder="品牌描述..."
              value={brandForm.description}
              onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {editingBrand ? '更新' : '建立'}
            </button>
            <button
              type="button"
              onClick={() => setShowBrandModal(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>

      {/* 門市 Modal */}
      <Modal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        title={editingStore ? '編輯門市' : '新增門市'}
        size="lg"
      >
        <form onSubmit={handleSaveStore} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">所屬品牌 *</label>
              <select
                required
                value={storeForm.brand_id}
                onChange={(e) => setStoreForm({ ...storeForm, brand_id: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">請選擇品牌</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">門市代碼 *</label>
              <input
                type="text"
                required
                placeholder="001"
                value={storeForm.code}
                onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">門市名稱 *</label>
              <input
                type="text"
                required
                placeholder="台北信義店"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">經營類型 *</label>
              <select
                value={storeForm.store_type}
                onChange={(e) => setStoreForm({ ...storeForm, store_type: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="direct">直營</option>
                <option value="franchise">加盟</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">地址</label>
            <input
              type="text"
              placeholder="台北市信義區..."
              value={storeForm.address}
              onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">電話</label>
              <input
                type="tel"
                placeholder="02-1234-5678"
                value={storeForm.phone}
                onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storeForm.is_active}
                  onChange={(e) => setStoreForm({ ...storeForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">營業中</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {editingStore ? '更新' : '建立'}
            </button>
            <button
              type="button"
              onClick={() => setShowStoreModal(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
