import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 使用主系統的認證（不再需要獨立的 AuthProvider）
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的組件
import Header from '../../system/payment_system/src/components/Header.jsx';

// 引入子系統的頁面
import Dashboard from '../../system/payment_system/src/pages/Dashboard.jsx';
import ApplyForm from '../../system/payment_system/src/pages/ApplyForm.jsx';
import RequestDetail from '../../system/payment_system/src/pages/RequestDetail.jsx';

// 受保護路由組件 - 使用主系統認證
const PaymentProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      // 修改：bg-gray-50 -> bg-stone-50
      <div className="min-h-screen flex justify-center items-center bg-stone-50">
        {/* 修改：border-indigo-600 -> border-red-700 */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 導回主系統登入頁
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 內部佈局組件
const PaymentInternalLayout = () => {
  return (
    // 修改：bg-gray-50 -> bg-stone-50
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function PaymentSystemLayout() {
  return (
    <Routes>
      {/* 公開路由 - 密碼相關 */}

      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<PaymentProtectedRoute />}>
        <Route element={<PaymentInternalLayout />}>
          {/* 預設跳轉到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="apply" element={<ApplyForm />} />
          <Route path="request/:id" element={<RequestDetail />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}