/**
 * 軟體授權系統 Layout
 * 整合授權系統到六扇門企業入口的單一入口 (SSO)
 */
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的布局組件
import { LicenseSidebar } from '../../system/license_system/src/components/layout/LicenseSidebar';

// 引入子系統的頁面
import { Dashboard } from '../../system/license_system/src/pages/Dashboard';
import { Licenses } from '../../system/license_system/src/pages/Licenses';
import { Assignments } from '../../system/license_system/src/pages/Assignments';
import { Employees } from '../../system/license_system/src/pages/Employees';
import { Software } from '../../system/license_system/src/pages/Software';
import { Settings } from '../../system/license_system/src/pages/Settings';
import { VerifyLicense } from '../../system/license_system/src/pages/VerifyLicense';

// 受保護路由組件 - 使用主系統認證
const LicenseProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
const LicenseInternalLayout = () => {
  return (
    <div className="flex h-screen bg-stone-100">
      <LicenseSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

export default function LicenseSystemLayout() {
  return (
    <Routes>
      {/* 公開路由 - 授權驗證工具 */}
      <Route path="verify" element={<VerifyLicense />} />

      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<LicenseProtectedRoute />}>
        <Route element={<LicenseInternalLayout />}>
          {/* 預設跳轉到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="employees" element={<Employees />} />
          <Route path="software" element={<Software />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
