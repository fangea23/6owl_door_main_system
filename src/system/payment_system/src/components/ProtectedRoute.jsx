import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 1. 關鍵：如果還在檢查身分 (loading 為 true)，顯示全螢幕載入動畫
  // 這會阻止 React 渲染下方的頁面，避免誤判
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">系統驗證中...</p>
      </div>
    );
  }

  // 2. 檢查完畢，如果真的沒有 user，才導向登入頁
  // replace: 替換歷史紀錄，讓使用者按上一頁不會又回到這裡
  // state: 記住他原本想去哪，登入後可以導回去 (選用功能)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. 驗證通過，顯示子路由 (Dashboard, ApplyForm...)
  return <Outlet />;
}