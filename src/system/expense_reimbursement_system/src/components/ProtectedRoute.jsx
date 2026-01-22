import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 如果還在檢查身分，顯示全螢幕載入動畫
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-amber-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">系統驗證中...</p>
      </div>
    );
  }

  // 檢查完畢，如果沒有 user，導向登入頁
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 驗證通過，顯示子路由
  return <Outlet />;
}
