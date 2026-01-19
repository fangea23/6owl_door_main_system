import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  // ✅ 修改處：指向主系統的登入路徑 (Absolute path)
  // 當未登入時，React Router 會將網址改變為 /login，這時主系統的 Router 會接手處理
  const LOGIN_PATH = '/login'; 

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  return children ? children : <Outlet />;
}