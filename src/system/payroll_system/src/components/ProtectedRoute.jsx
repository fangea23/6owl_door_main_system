import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-red-500" size={40} />
          <p className="text-stone-500">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // 未登入，導向主系統登入頁
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
