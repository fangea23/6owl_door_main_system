import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Plus, Edit2, Trash2, Search, Building2, ToggleLeft, ToggleRight, AlertCircle, User, LogOut } from 'lucide-react';
import { useBrands } from '../hooks/useBrands';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editingStore, setEditingStore] = useState(null);

  const { brands, loading: brandsLoading, addBrand, updateBrand, deleteBrand } = useBrands();
  const { stores, loading: storesLoading, addStore, updateStore, deleteStore, toggleStoreStatus } = useStores(selectedBrand?.id);
  const { user, profile } = useAuth();

  // 獲取顯示名稱（優先順序：profile.name > user_metadata.name > email）
  const displayName = profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  // 過濾店舖
  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 處理品牌操作
  const handleAddBrand = () => {
    setEditingBrand(null);
    setShowBrandModal(true);
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setShowBrandModal(true);
  };

  const handleDeleteBrand = async (brand) => {
    if (!confirm(`確定要刪除品牌「${brand.name}」嗎？這將影響所有相關店舖。`)) return;

    const result = await deleteBrand(brand.id);
    if (result.success) {
      if (selectedBrand?.id === brand.id) {
        setSelectedBrand(null);
      }
    } else {
      alert(`刪除失敗：${result.error}`);
    }
  };

  // 處理店舖操作
  const handleAddStore = () => {
    if (!selectedBrand) {
      alert('請先選擇品牌');
      return;
    }
    setEditingStore(null);
    setShowStoreModal(true);
  };

  const handleEditStore = (store) => {
    setEditingStore(store);
    setShowStoreModal(true);
  };

  const handleDeleteStore = async (store) => {
    if (!confirm(`確定要刪除店舖「${store.name}」嗎？`)) return;

    const result = await deleteStore(store.id);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  const handleToggleStore = async (store) => {
    const result = await toggleStoreStatus(store.id, !store.is_active);
    if (!result.success) {
      alert(`更新失敗：${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store size={32} />
              <div>
                <h1 className="text-3xl font-bold">店舖管理系統</h1>
                <p className="text-purple-100 mt-1">管理品牌與店舖資料</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 使用者資訊 */}
              {user && (
                <Link
                  to="/account"
                  className="flex items-center gap-2 px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-medium shadow-sm">
                    {displayName?.charAt(0) || <User size={18} />}
                  </div>
                  <span className="font-medium">{displayName}</span>
                </Link>
              )}

              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                返回主系統
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：品牌列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="text-purple-600" size={20} />
                  <h2 className="font-bold text-gray-900">品牌列表</h2>
                </div>
                <button
                  onClick={handleAddBrand}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  新增
                </button>
              </div>

              <div className="p-4">
                {brandsLoading ? (
                  <div className="text-center py-8 text-gray-400">載入中...</div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Building2 size={48} className="mx-auto mb-2 opacity-20" />
                    <p>尚無品牌資料</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div
                        key={brand.id}
                        onClick={() => setSelectedBrand(brand)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedBrand?.id === brand.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{brand.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {brand.id ? String(brand.id).substring(0, 8) + '...' : 'N/A'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBrand(brand);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBrand(brand);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側：店舖列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Store className="text-blue-600" size={20} />
                    <h2 className="font-bold text-gray-900">
                      {selectedBrand ? `${selectedBrand.name} - 店舖列表` : '店舖列表'}
                    </h2>
                  </div>
                  <button
                    onClick={handleAddStore}
                    disabled={!selectedBrand}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                    新增店舖
                  </button>
                </div>

                {/* 搜尋欄 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="搜尋店舖名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-4">
                {!selectedBrand ? (
                  <div className="text-center py-12 text-gray-400">
                    <Building2 size={48} className="mx-auto mb-3 opacity-20" />
                    <p>請先選擇左側的品牌</p>
                  </div>
                ) : storesLoading ? (
                  <div className="text-center py-12 text-gray-400">載入中...</div>
                ) : filteredStores.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Store size={48} className="mx-auto mb-3 opacity-20" />
                    <p>{searchTerm ? '找不到符合的店舖' : '此品牌尚無店舖資料'}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredStores.map((store) => (
                      <div
                        key={store.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900 text-lg">
                                {store.name}
                              </h3>
                              <button
                                onClick={() => handleToggleStore(store)}
                                className="flex items-center gap-1 text-sm"
                              >
                                {store.is_active ? (
                                  <ToggleRight className="text-green-500" size={24} />
                                ) : (
                                  <ToggleLeft className="text-gray-400" size={24} />
                                )}
                                <span className={store.is_active ? 'text-green-600' : 'text-gray-500'}>
                                  {store.is_active ? '啟用中' : '已停用'}
                                </span>
                              </button>
                            </div>

                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              {store.store_code && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">店舖代碼:</span>
                                  <code className="bg-blue-50 px-2 py-0.5 rounded text-xs text-blue-700 font-semibold">
                                    {store.store_code}
                                  </code>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-medium">店舖 ID:</span>
                                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                  {store.id}
                                </code>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">品牌 ID:</span>
                                <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                                  {store.brand_id}
                                </code>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => handleEditStore(store)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteStore(store)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 品牌 Modal */}
      {showBrandModal && (
        <BrandModal
          brand={editingBrand}
          onClose={() => setShowBrandModal(false)}
          onSave={async (data) => {
            const result = editingBrand
              ? await updateBrand(editingBrand.id, data)
              : await addBrand(data);

            if (result.success) {
              setShowBrandModal(false);
            } else {
              alert(`操作失敗：${result.error}`);
            }
          }}
        />
      )}

      {/* 店舖 Modal */}
      {showStoreModal && (
        <StoreModal
          store={editingStore}
          brandId={selectedBrand?.id}
          onClose={() => setShowStoreModal(false)}
          onSave={async (data) => {
            const result = editingStore
              ? await updateStore(editingStore.id, data)
              : await addStore(data);

            if (result.success) {
              setShowStoreModal(false);
            } else {
              alert(`操作失敗：${result.error}`);
            }
          }}
        />
      )}
    </div>
  );
}

// 品牌 Modal 組件
function BrandModal({ brand, onClose, onSave }) {
  const [name, setName] = useState(brand?.name || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入品牌名稱');
      return;
    }

    setSaving(true);
    await onSave({ name: name.trim() });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {brand ? '編輯品牌' : '新增品牌'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品牌名稱 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="請輸入品牌名稱"
              required
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 店舖 Modal 組件
function StoreModal({ store, brandId, onClose, onSave }) {
  const [name, setName] = useState(store?.name || '');
  const [storeCode, setStoreCode] = useState(store?.store_code || '');
  const [isActive, setIsActive] = useState(store?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入店舖名稱');
      return;
    }

    setSaving(true);
    await onSave({
      name: name.trim(),
      store_code: storeCode.trim() || null,
      brand_id: brandId,
      is_active: isActive,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {store ? '編輯店舖' : '新增店舖'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              店舖名稱 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="請輸入店舖名稱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              店舖代碼
            </label>
            <input
              type="text"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="選填，例如: ST001"
            />
            <p className="text-xs text-gray-500 mt-1">
              用於識別店舖的自訂代碼
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">啟用此店舖</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              停用的店舖將不會出現在選單中
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
