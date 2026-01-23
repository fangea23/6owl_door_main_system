import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import SalaryGrades from './pages/settings/SalaryGrades';
import InsuranceBrackets from './pages/settings/InsuranceBrackets';
import EmployeeSalarySettings from './pages/settings/EmployeeSalarySettings';
import AttendanceInput from './pages/attendance/AttendanceInput';
import AttendanceReview from './pages/attendance/AttendanceReview';
import PayrollList from './pages/payroll/PayrollList';
import PayrollDetail from './pages/payroll/PayrollDetail';
import './App.css';

// 主版面配置
const MainLayout = () => {
  return (
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal text-stone-800 font-sans">
      <Header />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            {/* 總覽 */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* 設定管理 */}
            <Route path="/settings/salary-grades" element={<SalaryGrades />} />
            <Route path="/settings/insurance-brackets" element={<InsuranceBrackets />} />
            <Route path="/settings/employee-salary" element={<EmployeeSalarySettings />} />

            {/* 出勤管理 */}
            <Route path="/attendance/input" element={<AttendanceInput />} />
            <Route path="/attendance/review" element={<AttendanceReview />} />

            {/* 薪資計算 */}
            <Route path="/payroll" element={<PayrollList />} />
            <Route path="/payroll/:id" element={<PayrollDetail />} />

            {/* 預設導向 */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
