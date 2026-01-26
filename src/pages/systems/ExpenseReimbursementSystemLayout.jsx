import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的組件
import Header from '../../system/expense_reimbursement_system/src/components/Header.jsx';

// 引入子系統的頁面
import Dashboard from '../../system/expense_reimbursement_system/src/pages/Dashboard.jsx';
import ApplyForm from '../../system/expense_reimbursement_system/src/pages/ApplyForm.jsx';
import RequestDetail from '../../system/expense_reimbursement_system/src/pages/RequestDetail.jsx';

// 受保護路由組件 - 使用主系統認證
const ExpenseProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
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
const ExpenseInternalLayout = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function ExpenseReimbursementSystemLayout() {
  return (
    <Routes>
      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<ExpenseProtectedRoute />}>
        <Route element={<ExpenseInternalLayout />}>
          {/* 預設跳轉到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="apply" element={<ApplyForm />} />
          <Route path="apply/:id" element={<ApplyForm />} />
          <Route path="request/:id" element={<RequestDetail />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
