import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Account from './pages/Account';
import './App.css';

// 子系統 Layout
import PaymentSystemLayout from './pages/systems/PaymentSystemLayout';
import LicenseSystemLayout from './pages/systems/LicenseSystemLayout';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開路由 */}
          <Route path="/login" element={<Login />} />

          {/* 受保護路由 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* ========================================
              子系統路由 - 直接整合（不使用 iframe）
              每個子系統有自己的 Layout 和認證系統
              ======================================== */}

          {/* 付款簽核系統 */}
          <Route
            path="/systems/payment-approval/*"
            element={<PaymentSystemLayout />}
          />

          {/* 軟體授權系統 */}
          <Route
            path="/systems/software-license/*"
            element={<LicenseSystemLayout />}
          />

          {/* 會議室租借系統（預留） */}
          <Route
            path="/systems/meeting-room/*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h1 className="text-2xl font-bold">會議室租借系統</h1>
                  <p className="text-gray-500 mt-2">即將推出</p>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
