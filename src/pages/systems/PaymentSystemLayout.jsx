import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 引入子系統的 Context (加上 .jsx 副檔名)
import { AuthProvider } from '../../system/payment_system/src/AuthContext.jsx';

// 引入子系統的組件 (加上 .jsx 副檔名)
import Header from '../../system/payment_system/src/components/Header.jsx';
import ProtectedRoute from '../../system/payment_system/src/components/ProtectedRoute.jsx';

// 引入子系統的頁面 (加上 .jsx 副檔名)
import Login from '../../system/payment_system/src/pages/Login.jsx';
import Dashboard from '../../system/payment_system/src/pages/Dashboard.jsx';
import ApplyForm from '../../system/payment_system/src/pages/ApplyForm.jsx';
import RequestDetail from '../../system/payment_system/src/pages/RequestDetail.jsx';
import AdminPanel from '../../system/payment_system/src/pages/AdminPanel.jsx';
import UserProfile from '../../system/payment_system/src/pages/UserProfile.jsx';
import UpdatePassword from '../../system/payment_system/src/pages/UpdatePassword.jsx';
import ForgotPassword from '../../system/payment_system/src/pages/ForgotPassword.jsx';

// 內部佈局組件：負責顯示子系統專用的 Header
const PaymentInternalLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      {/* 這裡使用子系統的 Header */}
      <Header /> 
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function PaymentSystemLayout() {
  return (
    /* 角色 1: Context Provider 邊界
      這裡包裹 AuthProvider，確保只有此路徑下的組件能存取付款系統的 User 狀態。
      這解決了 "主系統登入 vs 子系統登入" 的衝突。
    */
    <AuthProvider>
      <Routes>
        {/* 角色 2: 路由轉接
          這裡定義的 path 都是「相對路徑」。
          例如 path="login" 實際上對應瀏覽器的 /systems/payment-approval/login
        */}
        
        {/* 公開路由 */}
        <Route path="login" element={<Login />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="update-password" element={<UpdatePassword />} />

        {/* 受保護路由 (需要子系統登入) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<PaymentInternalLayout />}>
            {/* 預設跳轉到 dashboard */}
            <Route index element={<Navigate to="dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="apply" element={<ApplyForm />} />
            <Route path="request/:id" element={<RequestDetail />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>
        </Route>

        {/* 處理 404: 如果在子系統內亂打網址，跳回 dashboard 或 login */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}