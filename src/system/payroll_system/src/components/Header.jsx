import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calculator,
  Settings,
  Users,
  Calendar,
  FileText,
  ChevronDown,
  DollarSign,
  Shield,
  Clock
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { usePermission } from '../../../../hooks/usePermission';

// 薪資系統的基礎路徑
const BASE_PATH = '/systems/payroll';

export default function Header() {
  const location = useLocation();
  const { user } = useAuth();

  // 權限檢查
  const { hasPermission: canManageGrades } = usePermission('payroll.salary_grades.manage');
  const { hasPermission: canManageInsurance } = usePermission('payroll.insurance.manage');
  const { hasPermission: canManageSettings } = usePermission('payroll.employee_settings.manage');
  const { hasPermission: canInputAttendance } = usePermission('payroll.attendance.input');
  const { hasPermission: canApproveAttendance } = usePermission('payroll.attendance.approve');
  const { hasPermission: canCalculate } = usePermission('payroll.payroll.calculate');
  const { hasPermission: canReview } = usePermission('payroll.payroll.review');

  const isActive = (path) => location.pathname.includes(path);

  // 導航項目
  const navItems = [
    {
      label: '總覽',
      path: `${BASE_PATH}/dashboard`,
      icon: Home,
      show: true
    },
    {
      label: '出勤管理',
      icon: Clock,
      show: canInputAttendance || canApproveAttendance,
      children: [
        { label: '出勤輸入', path: `${BASE_PATH}/attendance/input`, show: canInputAttendance },
        { label: '出勤審核', path: `${BASE_PATH}/attendance/review`, show: canApproveAttendance },
      ].filter(item => item.show)
    },
    {
      label: '薪資計算',
      path: `${BASE_PATH}/payroll`,
      icon: Calculator,
      show: canCalculate || canReview
    },
    {
      label: '設定',
      icon: Settings,
      show: canManageGrades || canManageInsurance || canManageSettings,
      children: [
        { label: '薪資級距', path: `${BASE_PATH}/settings/salary-grades`, show: canManageGrades },
        { label: '勞健保級距', path: `${BASE_PATH}/settings/insurance-brackets`, show: canManageInsurance },
        { label: '員工薪資設定', path: `${BASE_PATH}/settings/employee-salary`, show: canManageSettings },
      ].filter(item => item.show)
    },
  ].filter(item => item.show);

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={`${BASE_PATH}/dashboard`} className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-amber-500 rounded-xl text-white shadow-lg shadow-red-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-stone-800 text-lg leading-tight">薪資管理系統</h1>
              <p className="text-xs text-stone-400">Payroll Management</p>
            </div>
          </Link>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item, index) => (
              <div key={index} className="relative group">
                {item.children ? (
                  // 有子選單
                  <>
                    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      item.children.some(child => isActive(child.path))
                        ? 'bg-red-50 text-red-600'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}>
                      <item.icon size={16} />
                      {item.label}
                      <ChevronDown size={14} />
                    </button>
                    {/* 下拉選單 */}
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-stone-200 py-2 min-w-[160px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      {item.children.map((child, childIndex) => (
                        <Link
                          key={childIndex}
                          to={child.path}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive(child.path)
                              ? 'bg-red-50 text-red-600'
                              : 'text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  // 無子選單
                  <Link
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path)
                        ? 'bg-red-50 text-red-600'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-stone-400 hover:text-stone-600 text-sm flex items-center gap-1"
            >
              <Home size={14} />
              返回 Portal
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex gap-1 pb-3 overflow-x-auto custom-scrollbar">
          {navItems.map((item, index) => (
            <React.Fragment key={index}>
              {item.children ? (
                item.children.map((child, childIndex) => (
                  <Link
                    key={childIndex}
                    to={child.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive(child.path)
                        ? 'bg-red-500 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive(item.path)
                      ? 'bg-red-500 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}
