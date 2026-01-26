import React, { useState, useEffect, useRef } from 'react'; // 1. 引入 useEffect, useRef
import { Link, useNavigate } from 'react-router-dom';
import { Store, Plus, Edit2, Trash2, Search, Building2, ToggleLeft, ToggleRight, AlertCircle, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useBrands } from '../hooks/useBrands';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient'; // 2. 引入 supabase
import { usePermission } from '../../../../hooks/usePermission'; // 3. 引入權限 hook
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
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStoreDetail, setShowStoreDetail] = useState(null);
  const userMenuRef = useRef(null);

  const { brands, loading: brandsLoading, addBrand, updateBrand, deleteBrand } = useBrands();
  const { stores, loading: storesLoading, addStore, updateStore, deleteStore, toggleStoreStatus } = useStores(selectedBrand?.id);
  const { user, profile, logout } = useAuth();

  // 權限檢查 - 獲取 loading 狀態
  const { hasPermission: canViewStores, loading: loadingViewStores } = usePermission('store.view');
  const { hasPermission: canCreateStore } = usePermission('store.create');
  const { hasPermission: canEditStore } = usePermission('store.edit');
  const { hasPermission: canDeleteStore } = usePermission('store.delete');
  const { hasPermission: canViewBrands, loading: loadingViewBrands } = usePermission('brand.view');
  const { hasPermission: canCreateBrand } = usePermission('brand.create');
  const { hasPermission: canEditBrand } = usePermission('brand.edit');
  const { hasPermission: canDeleteBrand } = usePermission('brand.delete');

  // 檢查權限是否都載入完成
  const permissionsLoading = loadingViewStores || loadingViewBrands;

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

  // 點擊外部關閉用戶選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. 修改：獲取顯示名稱（優先順序：employeeName > profile.name > user_metadata...）
  const displayName = employeeName || profile?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  // 🔒 權限載入中 - 顯示 loading 而不是無權限頁面
  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Store className="animate-pulse text-amber-500 mb-3" size={32} />
          <p className="text-stone-400">載入中...</p>
        </div>
      </div>
    );
  }

  // 權限檢查：沒有任何查看權限則無法使用此系統
  if (!canViewStores && !canViewBrands) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">權限不足</h2>
          <p className="text-stone-600 mb-6">
            您沒有訪問門店管理系統的權限
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg hover:from-red-700 hover:to-amber-600 transition-all shadow-lg"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // 登出處理
  const handleLogout = async () => {
    const confirmLogout = window.confirm("確定要登出系統嗎？");
    if (!confirmLogout) return;
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
    }
  };
  // -------------------------------------

  // 過濾店舖
  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 處理品牌操作
  const handleAddBrand = () => {
    if (!canCreateBrand) {
      alert('⚠️ 權限不足\n\n您沒有新增品牌的權限（brand.create）。');
      return;
    }
    setEditingBrand(null);
    setShowBrandModal(true);
  };

  const handleEditBrand = (brand) => {
    if (!canEditBrand) {
      alert('⚠️ 權限不足\n\n您沒有編輯品牌的權限（brand.edit）。');
      return;
    }
    setEditingBrand(brand);
    setShowBrandModal(true);
  };

  const handleDeleteBrand = async (brand) => {
    if (!canDeleteBrand) {
      alert('⚠️ 權限不足\n\n您沒有刪除品牌的權限（brand.delete）。');
      return;
    }
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
    if (!canCreateStore) {
      alert('⚠️ 權限不足\n\n您沒有新增店舖的權限（store.create）。');
      return;
    }
    if (!selectedBrand) {
      alert('請先選擇品牌');
      return;
    }
    setEditingStore(null);
    setShowStoreModal(true);
  };

  const handleEditStore = (store) => {
    if (!canEditStore) {
      alert('⚠️ 權限不足\n\n您沒有編輯店舖的權限（store.edit）。');
      return;
    }
    setEditingStore(store);
    setShowStoreModal(true);
  };

  const handleDeleteStore = async (store) => {
    if (!canDeleteStore) {
      alert('⚠️ 權限不足\n\n您沒有刪除店舖的權限（store.delete）。');
      return;
    }
    if (!confirm(`確定要刪除店舖「${store.name}」嗎？`)) return;

    const result = await deleteStore(store.code);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  const handleToggleStore = async (store) => {
    if (!canEditStore) {
      alert('⚠️ 權限不足\n\n您沒有編輯店舖狀態的權限（store.edit）。');
      return;
    }
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
              <div className="relative hidden sm:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-xl transition-all border ${
                    showUserMenu ? 'bg-green-50 border-green-200' : 'border-transparent hover:bg-stone-100 hover:border-stone-200'
                  }`}
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-green-500/20">
                    {displayName?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-stone-700">
                      {displayName}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-stone-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180 text-green-500' : ''}`}
                  />
                </button>

                {/* 下拉選單 */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-100 py-2 z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-teal-500" />

                    <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
                      <p className="text-base font-bold text-stone-800 truncate">{displayName}</p>
                      <p className="text-xs text-stone-500 mb-2 truncate">{user?.email}</p>
                    </div>

                    <div className="p-2 space-y-1">
                      <Link
                        to="/account"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-green-700 hover:bg-green-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                          <Settings size={16} />
                        </span>
                        帳戶設定
                      </Link>
                    </div>

                    <div className="p-2 border-t border-stone-100">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-stone-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors group"
                      >
                        <span className="p-1.5 bg-stone-100 text-stone-500 rounded-lg group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                          <LogOut size={16} />
                        </span>
                        登出系統
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                {canCreateBrand && (
                  <button
                    onClick={handleAddBrand}
                    className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-red-600 to-amber-500 text-white rounded-lg hover:from-red-700 hover:to-amber-600 transition-all text-xs sm:text-sm font-medium shadow-lg shadow-red-500/20 touch-manipulation active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">新增</span>
                    <span className="sm:hidden">+</span>
                  </button>
                )}
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
                            <div className="flex items-center gap-2">
                              {brand.code && (
                                <code className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  brand.brand_type === 'supplier'
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {brand.code}
                                </code>
                              )}
                              <div className="font-semibold text-stone-900 text-sm sm:text-base truncate">{brand.name}</div>
                            </div>
                            {brand.brand_type && (
                              <div className="text-xs text-stone-500 mt-0.5 sm:mt-1">
                                {brand.brand_type === 'supplier' ? '供應商' : '品牌'}
                              </div>
                            )}
                          </div>
                          {(canEditBrand || canDeleteBrand) && (
                            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                              {canEditBrand && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBrand(brand);
                                  }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded touch-manipulation active:scale-95"
                                >
                                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                              {canDeleteBrand && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBrand(brand);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded touch-manipulation active:scale-95"
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                              )}
                            </div>
                          )}
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
                  {canCreateStore && (
                    <button
                      onClick={handleAddStore}
                      disabled={!selectedBrand}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 transition-all text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 touch-manipulation active:scale-95 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">新增店舖</span>
                      <span className="sm:hidden">新增</span>
                    </button>
                  )}
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
                        className="p-3 sm:p-4 border border-stone-200 rounded-lg hover:shadow-md hover:shadow-red-500/10 transition-all cursor-pointer"
                        onClick={() => setShowStoreDetail(store)}
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3 className="font-semibold text-stone-900 text-base sm:text-lg">
                                {store.name}
                              </h3>
                              {canEditStore ? (
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
                              ) : (
                                <div className="flex items-center gap-1 text-xs sm:text-sm">
                                  {store.is_active ? (
                                    <ToggleRight className="text-green-500 w-5 h-5 sm:w-6 sm:h-6" />
                                  ) : (
                                    <ToggleLeft className="text-stone-400 w-5 h-5 sm:w-6 sm:h-6" />
                                  )}
                                  <span className={store.is_active ? 'text-green-600' : 'text-stone-500'}>
                                    {store.is_active ? '啟用中' : '已停用'}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-1.5 sm:mt-2 flex items-center gap-2 flex-wrap">
                              {store.code && (
                                <code className="bg-amber-50 px-2 py-0.5 rounded text-xs text-amber-700 font-semibold">
                                  {store.code}
                                </code>
                              )}
                              {store.store_type && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  store.store_type === 'direct'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-green-50 text-green-700'
                                }`}>
                                  {store.store_type === 'direct' ? '直營店' : '加盟店'}
                                </span>
                              )}
                              {store.opening_date && (
                                <span className="text-xs text-stone-500">
                                  開店: {store.opening_date}
                                </span>
                              )}
                              <span className="text-xs text-blue-600 font-medium">點擊查看詳細資訊 →</span>
                            </div>
                          </div>

                          {(canEditStore || canDeleteStore) && (
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              {canEditStore && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditStore(store);
                                  }}
                                  className="p-1.5 sm:p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors touch-manipulation active:scale-95"
                                >
                                  <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              )}
                              {canDeleteStore && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStore(store);
                                  }}
                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-manipulation active:scale-95"
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              )}
                            </div>
                          )}
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

      {/* 店舖詳細資訊 Modal */}
      {showStoreDetail && (
        <StoreDetailModal
          store={showStoreDetail}
          onClose={() => setShowStoreDetail(null)}
        />
      )}
    </div>
  );
}

// 品牌 Modal 組件
function BrandModal({ brand, onClose, onSave }) {
  const [name, setName] = useState(brand?.name || '');
  const [brandType, setBrandType] = useState(brand?.brand_type || 'brand');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入品牌名稱');
      return;
    }

    setSaving(true);
    await onSave({
      name: name.trim(),
      brand_type: brandType
    });
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              類型 *
            </label>
            <select
              value={brandType}
              onChange={(e) => setBrandType(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              required
            >
              <option value="brand">品牌（編碼 01-89）</option>
              <option value="supplier">供應商（編碼 90-99）</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              品牌編碼將自動生成，不可修改
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
  const [storeType, setStoreType] = useState(store?.store_type || 'franchise');
  const [isActive, setIsActive] = useState(store?.is_active ?? true);
  const [openingDate, setOpeningDate] = useState(store?.opening_date || '');
  const [closingDate, setClosingDate] = useState(store?.closing_date || '');
  const [laborInsuranceNumber, setLaborInsuranceNumber] = useState(store?.labor_insurance_number || '');
  const [healthInsuranceNumber, setHealthInsuranceNumber] = useState(store?.health_insurance_number || '');
  const [foodSafetyCertificateNumber, setFoodSafetyCertificateNumber] = useState(store?.food_safety_certificate_number || '');
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
      brand_id: brandId,
      store_type: storeType,
      is_active: isActive,
      opening_date: openingDate || null,
      closing_date: closingDate || null,
      labor_insurance_number: laborInsuranceNumber.trim() || null,
      health_insurance_number: healthInsuranceNumber.trim() || null,
      food_safety_certificate_number: foodSafetyCertificateNumber.trim() || null,
      // code 會由後端自動生成，不需要傳送
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
              店家類型 *
            </label>
            <select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              required
            >
              <option value="franchise">加盟店</option>
              <option value="direct">直營店</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              店家代碼將自動生成（格式：品牌ID + 流水號）
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              開店日期
            </label>
            <input
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              關店日期
            </label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
            />
            <p className="text-xs text-stone-500 mt-1">
              僅在店舖永久關閉時填寫
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              勞保證號
            </label>
            <input
              type="text"
              value={laborInsuranceNumber}
              onChange={(e) => setLaborInsuranceNumber(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              placeholder="選填"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              健保證號
            </label>
            <input
              type="text"
              value={healthInsuranceNumber}
              onChange={(e) => setHealthInsuranceNumber(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              placeholder="選填"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              食品安全證號
            </label>
            <input
              type="text"
              value={foodSafetyCertificateNumber}
              onChange={(e) => setFoodSafetyCertificateNumber(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base"
              placeholder="選填"
            />
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

// 店舖詳細資訊 Modal 組件
function StoreDetailModal({ store, onClose }) {
  if (!store) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 sm:p-6 border-b border-stone-200 bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {store.name}
            </h3>
            <p className="text-sm text-white/90 mt-1">店舖詳細資訊</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* 基本資訊 */}
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-bold text-stone-800 mb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" />
              基本資訊
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-stone-500 mb-1">店舖名稱</div>
                <div className="font-medium text-stone-900">{store.name}</div>
              </div>
              {store.code && (
                <div>
                  <div className="text-xs text-stone-500 mb-1">店舖代碼</div>
                  <code className="bg-amber-50 px-3 py-1 rounded text-sm text-amber-700 font-bold">
                    {store.code}
                  </code>
                </div>
              )}
              {store.store_type && (
                <div>
                  <div className="text-xs text-stone-500 mb-1">店家類型</div>
                  <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    store.store_type === 'direct'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-green-50 text-green-700'
                  }`}>
                    {store.store_type === 'direct' ? '直營店' : '加盟店'}
                  </span>
                </div>
              )}
              <div>
                <div className="text-xs text-stone-500 mb-1">狀態</div>
                <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  store.is_active
                    ? 'bg-green-50 text-green-700'
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {store.is_active ? '✓ 啟用中' : '✗ 已停用'}
                </span>
              </div>
            </div>
          </div>

          {/* 日期資訊 */}
          {(store.opening_date || store.closing_date) && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-bold text-stone-800 mb-3">營業日期</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {store.opening_date && (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">開店日期</div>
                    <div className="font-medium text-stone-900">{store.opening_date}</div>
                  </div>
                )}
                {store.closing_date && (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">關店日期</div>
                    <div className="font-medium text-red-600">{store.closing_date}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 證號資訊 */}
          {(store.labor_insurance_number || store.health_insurance_number || store.food_safety_certificate_number) && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-bold text-stone-800 mb-3">證照資訊</h4>
              <div className="space-y-3">
                {store.labor_insurance_number && (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">勞保證號</div>
                    <code className="bg-white border border-blue-200 px-3 py-2 rounded text-sm text-blue-700 font-mono block">
                      {store.labor_insurance_number}
                    </code>
                  </div>
                )}
                {store.health_insurance_number && (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">健保證號</div>
                    <code className="bg-white border border-green-200 px-3 py-2 rounded text-sm text-green-700 font-mono block">
                      {store.health_insurance_number}
                    </code>
                  </div>
                )}
                {store.food_safety_certificate_number && (
                  <div>
                    <div className="text-xs text-stone-500 mb-1">食品安全證號</div>
                    <code className="bg-white border border-purple-200 px-3 py-2 rounded text-sm text-purple-700 font-mono block">
                      {store.food_safety_certificate_number}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 p-4 sm:p-6 border-t border-stone-200 bg-white">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-colors font-medium"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}