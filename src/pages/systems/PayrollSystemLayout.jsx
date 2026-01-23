import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// 使用主系統的認證
import { useAuth } from '../../contexts/AuthContext';

// 引入子系統的組件
import Header from '../../system/payroll_system/src/components/Header.jsx';

// 引入子系統的頁面
import Dashboard from '../../system/payroll_system/src/pages/Dashboard.jsx';
import SalaryGrades from '../../system/payroll_system/src/pages/settings/SalaryGrades.jsx';
import InsuranceBrackets from '../../system/payroll_system/src/pages/settings/InsuranceBrackets.jsx';
import EmployeeSalarySettings from '../../system/payroll_system/src/pages/settings/EmployeeSalarySettings.jsx';
import AttendanceInput from '../../system/payroll_system/src/pages/attendance/AttendanceInput.jsx';
import AttendanceReview from '../../system/payroll_system/src/pages/attendance/AttendanceReview.jsx';
import PayrollList from '../../system/payroll_system/src/pages/payroll/PayrollList.jsx';
import PayrollDetail from '../../system/payroll_system/src/pages/payroll/PayrollDetail.jsx';

// 受保護路由組件 - 使用主系統認證
const PayrollProtectedRoute = () => {
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
const PayrollInternalLayout = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function PayrollSystemLayout() {
  return (
    <Routes>
      {/* 受保護路由 (需要主系統登入) */}
      <Route element={<PayrollProtectedRoute />}>
        <Route element={<PayrollInternalLayout />}>
          {/* 預設跳轉到 dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* 總覽 */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* 設定管理 */}
          <Route path="settings/salary-grades" element={<SalaryGrades />} />
          <Route path="settings/insurance-brackets" element={<InsuranceBrackets />} />
          <Route path="settings/employee-salary" element={<EmployeeSalarySettings />} />

          {/* 出勤管理 */}
          <Route path="attendance/input" element={<AttendanceInput />} />
          <Route path="attendance/review" element={<AttendanceReview />} />

          {/* 薪資計算 */}
          <Route path="payroll" element={<PayrollList />} />
          <Route path="payroll/:id" element={<PayrollDetail />} />
        </Route>
      </Route>

      {/* 處理 404 */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
