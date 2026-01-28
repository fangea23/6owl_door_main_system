import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的組件
import Header from '../../system/erp_system/src/components/Header.jsx';

// 引入子系統的頁面
import Dashboard from '../../system/erp_system/src/pages/Dashboard.jsx';
import ProductRequestNew from '../../system/erp_system/src/pages/ProductRequestNew.jsx';
import ProductRequestDetail from '../../system/erp_system/src/pages/ProductRequestDetail.jsx';
import SupplierList from '../../system/erp_system/src/pages/SupplierList.jsx';
import SupplierRequestNew from '../../system/erp_system/src/pages/SupplierRequestNew.jsx';
import SupplierRequestDetail from '../../system/erp_system/src/pages/SupplierRequestDetail.jsx';

// 受保護路由組件 - 使用主系統認證
const ERPProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 內部佈局組件
const ERPInternalLayout = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function ERPSystemLayout() {
  return (
    <Routes>
      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<ERPProtectedRoute />}>
        <Route element={<ERPInternalLayout />}>
          {/* 預設為 Dashboard */}
          <Route index element={<Dashboard />} />

          {/* 品號申請相關路由 */}
          <Route path="product-request/new" element={<ProductRequestNew />} />
          <Route path="product-request/:id" element={<ProductRequestDetail />} />

          {/* 供應商相關路由 */}
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="supplier-request/new" element={<SupplierRequestNew />} />
          <Route path="supplier-request/:id" element={<SupplierRequestDetail />} />

          {/* 未來擴充頁面 */}
          <Route path="products" element={<Dashboard />} />
          <Route path="categories" element={<Dashboard />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="/systems/erp" replace />} />
    </Routes>
  );
}
