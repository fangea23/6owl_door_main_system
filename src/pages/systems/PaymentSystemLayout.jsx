/**
 * 付款簽核系統 Layout
 *
 * 這個 Layout 包裝了 payment_system 的所有頁面，
 * 提供獨立的 AuthProvider（使用 Supabase）
 */
import { Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AuthProvider } from '../../system/payment_system/src/AuthContext';

// 導入付款系統的頁面
import PaymentLogin from '../../system/payment_system/src/pages/Login';
import ForgotPassword from '../../system/payment_system/src/pages/ForgotPassword';
import UpdatePassword from '../../system/payment_system/src/pages/UpdatePassword';
import Dashboard from '../../system/payment_system/src/pages/Dashboard';
import ApplyForm from '../../system/payment_system/src/pages/ApplyForm';
import RequestDetail from '../../system/payment_system/src/pages/RequestDetail';
import UserProfile from '../../system/payment_system/src/pages/UserProfile';
import AdminPanel from '../../system/payment_system/src/pages/AdminPanel';

// 導入付款系統的組件
import PaymentHeader from '../../system/payment_system/src/components/Header';
import PaymentProtectedRoute from '../../system/payment_system/src/components/ProtectedRoute';

// 返回主系統的導航列
function BackToPortal() {
  return (
    <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
      <Link
        to="/"
        className="flex items-center gap-2 hover:text-blue-200 transition-colors"
      >
        <span>←</span>
        <span>返回六扇門入口</span>
      </Link>
      <span className="text-sm opacity-80">付款簽核系統</span>
    </div>
  );
}

// 付款系統的主版面
function PaymentMainLayout() {
  return (
    <>
      <BackToPortal />
      <PaymentHeader />
      <main className="min-h-[calc(100vh-112px)] bg-gray-50">
        <Outlet />
      </main>
    </>
  );
}

// 公開頁面版面（登入頁等）
function PaymentPublicLayout() {
  return (
    <>
      <BackToPortal />
      <Outlet />
    </>
  );
}

export default function PaymentSystemLayout() {
  return (
    <AuthProvider>
      <Routes>
        {/* 公開路由 */}
        <Route element={<PaymentPublicLayout />}>
          <Route path="login" element={<PaymentLogin />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="update-password" element={<UpdatePassword />} />
        </Route>

        {/* 受保護路由 */}
        <Route element={<PaymentProtectedRoute />}>
          <Route element={<PaymentMainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="apply" element={<ApplyForm />} />
            <Route path="request/:id" element={<RequestDetail />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* 未匹配路由導向登入 */}
        <Route path="*" element={<Navigate to="login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
