import React, { useState, useEffect } from 'react'; // 1. 引入 useEffect
import { Link, useNavigate } from 'react-router-dom';
import { Store, Plus, Edit2, Trash2, Search, Building2, ToggleLeft, ToggleRight, AlertCircle, User, LogOut } from 'lucide-react';
import { useBrands } from '../hooks/useBrands';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient'; // 2. 引入 supabase
import logoSrc from '../../../../assets/logo.png';

// 六扇門 Logo 組件
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img
        src={logoSrc}
        alt="六扇門 Logo"
        className="w-full h-full object-contain filter drop-shadow-md"
      />
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [editingStore, setEditingStore] = useState(null);

  const { brands, loading: brandsLoading, addBrand, updateBrand, deleteBrand } = useBrands();
  const { stores, loading: storesLoading, addStore, updateStore, deleteStore, toggleStoreStatus } = useStores(selectedBrand?.id);
  const { user, profile } = useAuth();

  // --- 3. 新增：員工姓名狀態與抓取邏輯 ---
  const [employeeName, setEmployeeName] = useState(null);

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (data?.name) {
          setEmployeeName(data.name);
        }
      } catch (err) {
        console.error('Error fetching employee name:', err);
      }
    };

    fetchEmployeeName();
  }, [user]);

  // 4. 修改：獲取顯示名稱（優先順序：employeeName > profile.name > user_metadata...）
  const displayName = employeeName || profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  // -------------------------------------

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

    const result = await deleteStore(store.code);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  const handleToggleStore = async (store) => {
    const result = await toggleStoreStatus(store.code, !store.is_active);
    if (!result.success) {
      alert(`更新失敗：${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal">
      {/* Header - 與主系統統一風格 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-pattern-diagonal opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-3 hover:opacity-100 transition-opacity"
                title="回到入口"
              >
                <Logo />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-stone-800 tracking-tight group-hover:text-red-800 transition-colors">
                    六扇門
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <div className="h-[1px] w-3 bg-amber-500/50"></div>
                    <p className="text-[10px] text-stone-500 font-medium tracking-[0.2em] group-hover:text-amber-600 transition-colors">
                      6OWL DOOR
                    </p>
                  </div>
                </div>
              </button>

              <div className="h-8 w-px bg-stone-200 mx-2" />

              {/* 子系統標題 */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Store size={18} className="text-amber-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">店舖管理</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">STORE MANAGEMENT</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Link
                to="/account"
                className="hidden sm:flex items-center gap-2 hover:bg-stone-50 p-1.5 rounded-lg transition-colors"
                title="個人資料設定"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-red-500/20">
                  {displayName?.charAt(0) || 'U'}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-stone-700">{displayName}</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* 左側：品牌列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm shadow-red-500/10 border border-stone-200">
              <div className="p-3 sm:p-4 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Building2 className="text-red-600 w-4 h-4 sm:w-5 sm:h-5" />
                  <h2 className="font-bold text-stone-900 text-sm sm:text-base">品牌列表</h2>
                </div>
                <button
                  onClick={handleAddBrand}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg hover:from-red-700 hover:to-amber-600 transition-all text-xs sm:text-sm font-medium shadow-lg shadow-red-500/20 touch-manipulation active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">新增</span>
                  <span className="sm:hidden">+</span>
                </button>
              </div>

              <div className="p-3 sm:p-4">
                {brandsLoading ? (
                  <div className="text-center py-6 sm:py-8 text-stone-400 text-sm">載入中...</div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-stone-400">
                    <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">尚無品牌資料</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {brands.map((brand) => (
                      <div
                        key={brand.id}
                        onClick={() => setSelectedBrand(brand)}
                        className={`p-2.5 sm:p-3 rounded-lg border-2 cursor-pointer transition-all touch-manipulation active:scale-98 ${
                          selectedBrand?.id === brand.id
                            ? 'border-red-500 bg-red-50 shadow-md shadow-red-500/10'
                            : 'border-stone-200 hover:border-red-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-stone-900 text-sm sm:text-base truncate">{brand.name}</div>
                            <div className="text-xs text-stone-500 mt-0.5 sm:mt-1 truncate">
                              ID: {brand.id ? String(brand.id).substring(0, 8) + '...' : 'N/A'}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBrand(brand);
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded touch-manipulation active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBrand(brand);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded touch-manipulation active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
            <div className="bg-white rounded-xl shadow-sm shadow-red-500/10 border border-stone-200">
              <div className="p-3 sm:p-4 border-b border-stone-200">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Store className="text-amber-600 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <h2 className="font-bold text-stone-900 text-sm sm:text-base truncate">
                      {selectedBrand ? `${selectedBrand.name} - 店舖列表` : '店舖列表'}
                    </h2>
                  </div>
                  <button
                    onClick={handleAddStore}
                    disabled={!selectedBrand}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 transition-all text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 touch-manipulation active:scale-95 flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">新增店舖</span>
                    <span className="sm:hidden">新增</span>
                  </button>
                </div>

                {/* 搜尋欄 */}
                <div className="relative">
                  <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="搜尋店舖名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base placeholder:text-stone-400"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4">
                {!selectedBrand ? (
                  <div className="text-center py-8 sm:py-12 text-stone-400">
                    <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                    <p className="text-sm">請先選擇左側的品牌</p>
                  </div>
                ) : storesLoading ? (
                  <div className="text-center py-8 sm:py-12 text-stone-400 text-sm">載入中...</div>
                ) : filteredStores.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-stone-400">
                    <Store className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-20" />
                    <p className="text-sm">{searchTerm ? '找不到符合的店舖' : '此品牌尚無店舖資料'}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 sm:space-y-3">
                    {filteredStores.map((store) => (
                      <div
                        key={store.code}
                        className="p-3 sm:p-4 border border-stone-200 rounded-lg hover:shadow-md hover:shadow-red-500/10 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3 className="font-semibold text-stone-900 text-base sm:text-lg">
                                {store.name}
                              </h3>
                              <button
                                onClick={() => handleToggleStore(store)}
                                className="flex items-center gap-1 text-xs sm:text-sm touch-manipulation active:scale-95"
                              >
                                {store.is_active ? (
                                  <ToggleRight className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" />
                                ) : (
                                  <ToggleLeft className="text-stone-400 w-5 h-5 sm:w-6 sm:h-6" />
                                )}
                                <span className={store.is_active ? 'text-green-600' : 'text-stone-500'}>
                                  {store.is_active ? '啟用中' : '已停用'}
                                </span>
                              </button>
                            </div>

                            <div className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1 text-xs sm:text-sm text-stone-600">
                              {store.store_code && (
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                  <span className="font-medium">店舖代碼:</span>
                                  <code className="bg-amber-50 px-2 py-0.5 rounded text-xs text-amber-700 font-semibold">
                                    {store.store_code}
                                  </code>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-medium">店舖 ID:</span>
                                <code className="bg-stone-100 px-2 py-0.5 rounded text-xs break-all">
                                  {store.code}
                                </code>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="font-medium">品牌 ID:</span>
                                <code className="bg-stone-100 px-2 py-0.5 rounded text-xs break-all">
                                  {store.brand_id}
                                </code>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditStore(store)}
                              className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors touch-manipulation active:scale-95"
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStore(store)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation active:scale-95"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
              ? await updateStore(editingStore.code, data)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 sm:p-6 border-b border-stone-200 bg-gradient-to-r from-red-600 to-amber-500">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {brand ? '編輯品牌' : '新增品牌'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              品牌名稱 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              placeholder="請輸入品牌名稱"
              required
            />
          </div>

          <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg hover:from-red-700 hover:to-amber-600 transition-all disabled:opacity-50 text-sm sm:text-base shadow-lg shadow-red-500/20 touch-manipulation active:scale-95"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-4 sm:p-6 border-b border-stone-200 bg-gradient-to-r from-amber-500 to-red-500">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            {store ? '編輯店舖' : '新增店舖'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              店舖名稱 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              placeholder="請輸入店舖名稱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              店舖代碼
            </label>
            <input
              type="text"
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              placeholder="選填，例如: ST001"
            />
            <p className="text-xs text-stone-500 mt-1">
              用於識別店舖的自訂代碼
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-amber-600 border-stone-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-stone-700">啟用此店舖</span>
            </label>
            <p className="text-xs text-stone-500 mt-1 ml-6">
              停用的店舖將不會出現在選單中
            </p>
          </div>

          <div className="flex gap-2 sm:gap-3 mt-5 sm:mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm sm:text-base touch-manipulation active:scale-95"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 transition-all disabled:opacity-50 text-sm sm:text-base shadow-lg shadow-amber-500/20 touch-manipulation active:scale-95"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}