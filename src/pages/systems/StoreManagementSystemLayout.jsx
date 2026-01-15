import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的頁面
import Dashboard from '../../system/store_management_system/src/pages/Dashboard.jsx';

// 受保護路由組件 - 使用主系統認證
const StoreProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 導回主系統登入頁
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default function StoreManagementSystemLayout() {
  return (
    <Routes>
      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<StoreProtectedRoute />}>
        {/* 預設跳轉到 dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
