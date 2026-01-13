import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * 受保護的路由組件
 *
 * 使用方式：
 * <Route path="/protected" element={
 *   <ProtectedRoute>
 *     <ProtectedPage />
 *   </ProtectedRoute>
 * } />
 *
 * 帶權限檢查：
 * <ProtectedRoute requiredPermission="admin">
 *   <AdminPage />
 * </ProtectedRoute>
 */
export default function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // 載入中顯示 Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">載入中...</p>
        </div>
      </div>
    );
  }

  // 未登入則導向登入頁面
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 檢查權限
  if (requiredPermission) {
    const hasPermission =
      user?.permissions?.includes('all') ||
      user?.permissions?.includes(requiredPermission);

    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="text-center max-w-md p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              權限不足
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              您沒有存取此頁面的權限，請聯繫系統管理員
            </p>
            <a
              href="/"
              className="inline-block px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
            >
              返回首頁
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}
